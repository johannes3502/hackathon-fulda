"""Fact-check of a transcript against uploaded sources first, the web second.

1. The model extracts checkable claims and names the sentences they come from.
2. Per claim, hybrid retrieval returns the top passages of the uploads (RAG).
3. The model judges only from those passages and quotes one verbatim.
4. Code checks that the quote really is in the passage (`quote_in_text`);
   otherwise the judgment is discarded.
5. Claims the uploads do not settle go through the same steps with web
   passages, if a web provider is configured and the request allows it.
"""

import logging
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from typing import Callable
from uuid import UUID

import httpx
import psycopg

from app.events import Event, merge_timeline
from app.factcheck.llm import ChatModel, LLMError, structured_json
from app.factcheck.drafts import ExtractedClaim, ExtractedClaims, Judgment
from app.factcheck.models import (
    ClaimResult, Evidence, EvidenceKind, FactCheckConfig, FactCheckRequest, FactCheckResult,
)
from app.factcheck.transcript import Sentence, clock, sentences, windows
from app.factcheck.web import WebPassage, WebSearcher
from app.prompt_safety import safe_http_url, untrusted_block
from app.sources import retrieval
from app.sources.models import SourceHit
from app.sources.quotes import quote_match

log = logging.getLogger(__name__)

EXTRACT_PROMPT = """Du hilfst beim Faktencheck eines Vortrags. Extrahiere aus dem Transkript \
prüfbare Tatsachenbehauptungen: Zahlen, Daten, Namen, Definitionen, Ursachen, Vergleiche.
Ignoriere Meinungen, Absichten, Begrüßungen, Fragen, Gliederungshinweise und Füllwörter.
Formuliere jede Behauptung als eigenständigen Satz in der Sprache des Transkripts \
(Pronomen auflösen) und füge nichts hinzu, was nicht gesagt wurde.
Antworte nur mit JSON:
{"claims": [{"sentences": [<Satznummern>], "claim": "<Behauptung>", "query": "<kurze Suchanfrage mit den Schlüsselbegriffen>"}]}
Höchstens {limit} Behauptungen, die wichtigsten zuerst. Keine Behauptungen: {"claims": []}."""

JUDGE_PROMPT = """Du vergleichst eine Behauptung aus einem Vortrag mit nummerierten Auszügen. \
Urteile ausschließlich anhand der Auszüge, nicht mit eigenem Wissen.
- "supports": ein Auszug bestätigt den Kern der Behauptung.
- "contradicts": ein Auszug widerspricht ihr ausdrücklich, z. B. andere Zahl, anderes Datum, andere Person.
- "not_found": die Auszüge behandeln das nicht oder nicht eindeutig.
Bei "supports" und "contradicts" gib die Nummer des Auszugs und ein wörtliches Zitat an: \
ein zusammenhängendes Stück aus genau diesem Auszug, exakt kopiert, höchstens zwei Sätze.
Begründe in einem Satz in der Sprache der Behauptung, ohne Wertung der Person.
Antworte nur mit JSON:
{"verdict": "supports|contradicts|not_found", "passage": <Nummer oder null>, "quote": "<Zitat oder leer>", "explanation": "<ein Satz>"}"""

SEVERITY = {"contradicts": "warning", "not_found": "hint", "supports": "info", "unchecked": "info"}


@dataclass(frozen=True)
class Claim:
    text: str
    query: str
    sentences: tuple[Sentence, ...]


@dataclass(frozen=True)
class Passage:
    """Uploaded chunk or web passage in one shape for the judge prompt."""

    kind: EvidenceKind
    label: str
    text: str
    hit: SourceHit | None = None
    web: WebPassage | None = None


def extract_claims(llm: ChatModel, items: list[Sentence], limit: int) -> list[Claim]:
    by_number = {s.number: s for s in items}
    claims: list[Claim] = []
    seen: set[str] = set()
    for batch in windows(items):
        if len(claims) >= limit:
            break
        transcript = "\n".join(f"[{s.number}] ({clock(s.start_ms)}) {s.text}" for s in batch)
        answer = structured_json(
            llm, EXTRACT_PROMPT.replace("{limit}", str(limit - len(claims))),
            "Transkript (Satznummer, Zeit, Satz):\n" + untrusted_block("transcript", transcript),
            ExtractedClaims,
        )
        raw = answer.get("claims")
        if not isinstance(raw, list):
            raise LLMError("Model answer has no claims list")
        for item in raw:
            try:
                draft = ExtractedClaim.model_validate(item)
            except ValueError:
                continue
            text = draft.claim.strip()[:500]
            refs = sorted({by_number[n] for n in draft.sentences if n in by_number}, key=lambda s: s.number)
            # Claims without a valid sentence reference cannot be placed on the timeline.
            if not text or not refs or text.casefold() in seen:
                continue
            seen.add(text.casefold())
            query = draft.query.strip() or text
            claims.append(Claim(text, query[:300], tuple(refs)))
            if len(claims) >= limit:
                break
    return claims


def upload_passages(hits: list[SourceHit]) -> list[Passage]:
    return [Passage("upload", f"{hit.filename}, {retrieval.location_label(hit.location)}", hit.text, hit=hit)
            for hit in hits]


def web_passages(found: list[WebPassage], provider: str) -> list[Passage]:
    name = "Wikipedia" if provider == "wikipedia" else "Web"
    return [Passage("web", f"{name}: {page.title}", page.text, web=page) for page in found]


def verified_evidence(quote: object, preferred: object, passages: list[Passage], min_chars: int) -> Evidence | None:
    """Evidence only if the model's quote is verbatim in a passage; the named passage is tried first."""
    quote = quote if isinstance(quote, str) else ""
    if len(retrieval.normalize(quote).strip(" \"'.…")) < min_chars:
        return None
    # A declared location is binding; never move a quote to another source/page.
    if isinstance(preferred, int) and not isinstance(preferred, bool):
        if not 1 <= preferred <= len(passages):
            return None
        order = [preferred - 1]
    else:
        order = list(range(len(passages)))
    for index in order:
        match = "exact" if retrieval.quote_in_text(quote, passages[index].text) else quote_match(quote, passages[index].text)
        if match:
            passage = passages[index]
            hit, web = passage.hit, passage.web
            return Evidence(
                kind=passage.kind, label=passage.label, quote=quote.strip(), passage=passage.text,
                filename=hit.filename if hit else None, source_id=hit.source_id if hit else None,
                location=hit.location if hit else None,
                url=web.url if web and safe_http_url(web.url) else None, quote_verified=match,
            )
    return None


def judge(llm: ChatModel, claim: Claim, passages: list[Passage], config: FactCheckConfig) -> tuple[str, str, Evidence | None, list[str]]:
    """Return verdict, explanation, verified evidence and notes."""
    context = "\n\n".join(f"[{i}] {p.label}:\n{p.text}" for i, p in enumerate(passages, 1))
    user = "\n\n".join([
        "Behauptung (untrusted):\n" + untrusted_block("claim", claim.text),
        "Auszüge (untrusted):\n" + untrusted_block("passages", context),
    ])
    answer = structured_json(llm, JUDGE_PROMPT, user, Judgment)
    try:
        judgment = Judgment.model_validate(answer)
    except ValueError:
        return "unchecked", "", None, ["Modellantwort entsprach nicht dem Schema."]
    if judgment.verdict == "not_found":
        return "not_found", judgment.explanation.strip(), None, []
    evidence = verified_evidence(judgment.quote, judgment.passage, passages, config.min_quote_chars)
    if evidence is not None:
        return judgment.verdict, judgment.explanation.strip(), evidence, []
    return "unchecked", "", None, ["Zitat des Modells steht nicht wörtlich im Auszug; Urteil verworfen."]


def check_claim(claim: Claim, request: FactCheckRequest, llm: ChatModel, searcher: WebSearcher | None,
                retrieve: Callable[[UUID, str, int], list[SourceHit]] | None) -> ClaimResult:
    start, end = claim.sentences[0].start_ms, max(s.end_ms for s in claim.sentences)
    result = ClaimResult(claim=claim.text, transcript=" ".join(s.text for s in claim.sentences), t_ms=start,
                         duration_ms=max(0, end - start), verdict="not_found", explanation="", checked=[])
    lookups: list[tuple[EvidenceKind, Callable[[], list[Passage]]]] = []
    if retrieve is not None:
        lookups.append(("upload", lambda: upload_passages(retrieve(request.collection_id, claim.query, request.config.top_k))))
    if searcher is not None:
        lookups.append(("web", lambda: web_passages(searcher.search(claim.query, request.config.web_results), searcher.name)))
    failures = 0
    for kind, lookup in lookups:
        try:
            passages = lookup()
            result.checked.append(kind)
            if not passages:
                continue
            verdict, explanation, evidence, notes = judge(llm, claim, passages, request.config)
        except (LLMError, httpx.HTTPError, psycopg.Error, ValueError, KeyError) as error:
            # Expected outages; the message never contains transcript or provider bodies.
            log.warning("Fact-check %s lookup failed (%s)", kind, type(error).__name__)
            failures += 1
            result.notes.append("Websuche fehlgeschlagen." if kind == "web" else "Prüfung gegen die Quellen fehlgeschlagen.")
            continue
        result.notes.extend(notes)
        if verdict == "unchecked":
            failures += 1
        result.explanation = explanation or result.explanation
        if evidence is not None:
            result.verdict, result.evidence = verdict, evidence
            return result
    if failures and failures == len(lookups):
        result.verdict = "unchecked"
    return result


def run_fact_check(request: FactCheckRequest, llm: ChatModel, searcher: WebSearcher | None,
                   retrieve: Callable[[UUID, str, int], list[SourceHit]] | None = retrieval.search,
                   ready_sources: Callable[[UUID], int] | None = None, workers: int = 4) -> FactCheckResult:
    """`retrieve` is used only if the collection has ready sources."""
    if ready_sources is None:
        from app.sources import db
        ready_sources = lambda collection: sum(s.status == "ready" for s in db.list_sources(collection))  # noqa: E731
    has_sources = request.collection_id is not None and ready_sources(request.collection_id) > 0
    searcher = searcher if request.use_web else None
    notices = [f"Urteile stammen vom Sprachmodell {llm.model}. Code prüft nur, dass das Zitat wörtlich in der "
               "Quelle steht, nicht die Bewertung selbst.",
               "„Nicht gefunden“ heißt: in den geprüften Quellen nicht belegt, nicht „falsch“."]
    if not has_sources:
        notices.append("Keine fertig verarbeiteten Quellen hochgeladen; Aussagen nur im Web gesucht."
                       if searcher else "Keine Quellen und keine Websuche: Aussagen konnten nicht geprüft werden.")
    if searcher:
        notices.append(f"Websuche ({searcher.name}) nur, wenn die hochgeladenen Quellen eine Aussage nicht belegen; "
                       "Suchanfragen verlassen dabei das System.")
    claims = extract_claims(llm, sentences(request.words), request.config.max_claims)
    with ThreadPoolExecutor(max_workers=max(1, workers)) as pool:
        results = list(pool.map(lambda claim: check_claim(
            claim, request, llm, searcher, retrieve if has_sources else None), claims))
    results.sort(key=lambda r: r.t_ms)
    events = [Event(t_ms=r.t_ms, duration_ms=r.duration_ms, type="fact", severity=SEVERITY[r.verdict],
                    source="factcheck", payload=r.model_dump(mode="json", exclude={"t_ms", "duration_ms"}))
              for r in results]
    if not claims:
        notices.append("Keine prüfbaren Tatsachenbehauptungen im Transkript gefunden.")
    return FactCheckResult(claims=results, events=merge_timeline(events), model=llm.model,
                           web_provider=searcher.name if searcher else None, sources_checked=has_sources,
                           config=request.config, notices=notices)
