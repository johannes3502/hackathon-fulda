"""Follow-up questions from transcript, fact-check findings and uploads.

Generation:
1. The model sees numbered sentences, numbered fact-check findings and, if
   sources are uploaded, numbered upload passages related to the talk.
2. It proposes questions and references findings, sentences or passages by
   number. Timestamps and evidence are taken from those references in code,
   never from the model's answer.
3. A `gap` question needs a verbatim quote from its passage; otherwise it is
   kept as a `clarification` without evidence. A `contradiction` or
   `unsupported` question needs a matching finding.

Answer review: the answer is compared with the question's evidence and fresh
upload passages, judged with a verbatim quote like a fact-check claim. The
persona's spoken reply is replaced by a neutral line whenever the verdict is
not backed by a verified quote, so the voice never states unchecked content.
Spoken answers are transcribed first with the configured ASR.
"""

import logging
import tempfile
from pathlib import Path
from typing import Callable
from uuid import UUID

import httpx
import psycopg

from app.events import Event, merge_timeline
from app.factcheck.llm import ChatModel, LLMError, structured_json
from app.factcheck.drafts import AnswerJudgment, QuestionDrafts
from app.factcheck.models import ClaimResult, Evidence
from app.factcheck.pipeline import Passage, upload_passages, verified_evidence
from app.factcheck.transcript import Sentence, clock, sentences
from app.questions.models import (
    AnswerRequest, AnswerReview, Persona, Question, QuestionKind, QuestionRequest, QuestionResult,
    VoiceAnswerRequest,
)
from app.sources import retrieval
from app.sources.models import SourceHit
from app.questions.styles import PRESENTATION_STYLES, PresentationMode
from app.transcription.pipeline import extract_audio
from app.transcription.transcriber import Transcriber

log = logging.getLogger(__name__)

PERSONAS: dict[Persona, str] = {
    "student": "Du bist ein neugieriger Studierender im ersten Semester. Du hast den Vortrag gerade gehört und \
kennst die Vorlesungsunterlagen (die Quellenauszüge), verstehst das Thema aber noch nicht gut. Du sprichst \
einfach und direkt, duzt die vortragende Person und fragst nach Begriffen, Begründungen und Beispielen, die dir \
nicht klar geworden sind. Steht in den Unterlagen etwas anderes, sagst du das ehrlich und fragst, was nun stimmt.",
    "tutor": "Du bist Lehrperson des Fachs (Professur oder Tutorium) und kennst die Vorlesungsunterlagen \
(die Quellenauszüge). Du fragst fachlich präzise, kritisch und fair, siezt die vortragende Person und \
verlangst Begründungen, Belege und saubere Abgrenzungen. Bei Widersprüchen nennst du die Quelle.",
}
FALLBACK_REPLY: dict[Persona, str] = {
    "student": "Okay, danke! Dazu habe ich in den Unterlagen aber nichts Eindeutiges gefunden.",
    "tutor": "Danke. Dazu finde ich in den Unterlagen keine eindeutige Stelle.",
}
UNHEARD_REPLY: dict[Persona, str] = {
    "student": "Sorry, ich habe dich akustisch nicht verstanden. Kannst du das nochmal sagen?",
    "tutor": "Ich habe Ihre Antwort akustisch nicht verstanden. Bitte wiederholen Sie sie.",
}

def role_prompt(persona: Persona, mode: PresentationMode) -> str:
    # A pitch investor must not also be instructed to act as a university professor.
    voice = PERSONAS[persona] + "\n" if mode == "thesis" else ""
    return voice + PRESENTATION_STYLES[mode]


QUESTION_PROMPT = """{persona}
Du stellst nach dem Vortrag gezielte Rückfragen an die vortragende Person. Vorrang in dieser Reihenfolge:
1. "contradiction": eine Quelle widerspricht einer Aussage (Befund mit Urteil "widerspricht"). Gib den Befund an.
2. "unsupported": eine Aussage ist in den Quellen nicht belegt (Befund mit Urteil "nicht gefunden"). Gib den Befund an.
3. "gap": ein wichtiger Inhalt eines Quellenauszugs fehlt im Vortrag oder wird nur angerissen. \
Gib den Auszug und ein wörtliches Zitat daraus an (exakt kopiert, höchstens ein Satz).
4. "clarification": eine vage, unbegründete oder unklare Stelle im Transkript. Gib die Satznummern an.
Jede Frage ist kurz, konkret, in der Sprache des Transkripts und in wenigen Sätzen beantwortbar. \
Sie wird vorgelesen: ganze Sätze, keine Aufzählungen, Klammern oder Abkürzungen. \
Verrate nicht die Antwort aus der Quelle. Keine Wertung der Person, keine Punkte, keine Noten.
Jede Frage muss tatsächlich etwas fragen, keine reine Feststellung. Erzeuge weniger Fragen,
wenn keine weitere sinnvolle Frage belegt ist. Bereits behandelte Quelleninhalte sind keine Lücke.
Antworte nur mit JSON:
{"questions": [{"kind": "contradiction|unsupported|gap|clarification", "question": "<Frage>", \
"reason": "<ein Satz: worauf sich die Frage stützt>", "finding": <Befundnummer oder null>, \
"sentences": [<Satznummern>], "passage": <Auszugsnummer oder null>, "quote": "<Zitat bei gap, sonst leer>", \
"query": "<kurze Suchanfrage, um eine Antwort in den Quellen zu prüfen>"}]}
Höchstens {limit} Fragen, die wichtigsten zuerst."""

ANSWER_PROMPT = """{persona}
Du vergleichst die Antwort auf deine Rückfrage nach dem Vortrag mit nummerierten Auszügen. \
Urteile ausschließlich anhand der Auszüge, nicht mit eigenem Wissen.
Bewerte ausschließlich die NEUE ANTWORT, nicht die frühere Aussage im Vortrag.
Korrigiert die Antwort einen früheren Fehler und stimmt nun mit der Quelle überein,
ist das Urteil "supports". Die frühere Aussage ist nur Kontext für die Frage.
Urteil und Erklärung müssen denselben Vergleich der neuen Antwort beschreiben.
- "supports": ein Auszug bestätigt den Kern der Antwort.
- "contradicts": ein Auszug widerspricht der Antwort ausdrücklich, z. B. andere Zahl, anderes Datum, andere Person.
- "not_found": die Auszüge behandeln das nicht eindeutig, oder die Antwort enthält keine prüfbare Aussage.
Bei "supports" und "contradicts" gib die Nummer des Auszugs und ein wörtliches Zitat an: \
ein zusammenhängendes Stück aus genau diesem Auszug, exakt kopiert, höchstens zwei Sätze.
Begründe in einem Satz in der Sprache der Antwort, ohne Wertung der Person, ohne Punkte oder Noten.
Lässt die Antwort die Frage offen oder widerspricht sie den Auszügen, stelle eine kurze Nachfrage, sonst leer.
Formuliere außerdem deine gesprochene Reaktion in deiner Rolle: ein bis zwei Sätze, die vorgelesen werden, \
passend zum Urteil, inhaltlich nur aus den Auszügen, ohne die Nachfrage zu wiederholen, ohne Lob in Punkten \
oder Noten und ohne Bewertung der Person.
Antworte nur mit JSON:
{"verdict": "supports|contradicts|not_found", "passage": <Nummer oder null>, "quote": "<Zitat oder leer>", \
"explanation": "<ein Satz>", "reply": "<gesprochene Reaktion>", "follow_up": "<Nachfrage oder leer>"}"""

FINDING_LABELS = {"contradicts": "widerspricht", "not_found": "nicht gefunden", "supports": "stützt",
                  "unchecked": "nicht geprüft"}
FINDING_KIND = {"contradicts": "contradiction", "not_found": "unsupported"}
PRIORITY = {"contradiction": 0, "unsupported": 1, "gap": 2, "clarification": 3, "follow_up": 4}
SEVERITY = {"contradiction": "warning", "unsupported": "hint", "gap": "info", "clarification": "info",
            "follow_up": "info"}
MAX_TRANSCRIPT_CHARS = 12000


def _numbered_transcript(items: list[Sentence]) -> tuple[str, bool]:
    lines, size = [], 0
    for s in items:
        line = f"[{s.number}] ({clock(s.start_ms)}) {s.text}"
        if lines and size + len(line) > MAX_TRANSCRIPT_CHARS:
            return "\n".join(lines), True
        lines.append(line)
        size += len(line) + 1
    return "\n".join(lines), False


def _numbered_findings(claims: list[ClaimResult]) -> str:
    lines = []
    for i, c in enumerate(claims, 1):
        line = f"[{i}] ({clock(c.t_ms)}) {FINDING_LABELS[c.verdict]}: {c.claim}"
        if c.evidence:
            line += f" | Quelle {c.evidence.label}: „{c.evidence.quote}“"
        if c.explanation:
            line += f" | {c.explanation}"
        lines.append(line)
    return "\n".join(lines) or "(kein Faktencheck vorhanden)"


def _int_list(value: object) -> list[int]:
    return [n for n in value if isinstance(n, int)] if isinstance(value, list) else []


def _text(item: dict, name: str, limit: int) -> str:
    value = item.get(name)
    return value.strip()[:limit] if isinstance(value, str) else ""


def parse_questions(answer: dict, items: list[Sentence], claims: list[ClaimResult], passages: list[Passage],
                    limit: int, min_quote_chars: int) -> list[Question]:
    raw = answer.get("questions")
    if not isinstance(raw, list):
        raise LLMError("Model answer has no questions list")
    by_number = {s.number: s for s in items}
    questions: list[Question] = []
    seen: set[str] = set()
    for item in raw:
        if not isinstance(item, dict):
            continue
        text = _text(item, "question", 500)
        if not text or text.casefold() in seen:
            continue
        kind: QuestionKind = item.get("kind") if item.get("kind") in PRIORITY else "clarification"
        finding_no = item.get("finding")
        finding = claims[finding_no - 1] if isinstance(finding_no, int) and 1 <= finding_no <= len(claims) else None
        refs = sorted({by_number[n] for n in _int_list(item.get("sentences")) if n in by_number},
                      key=lambda s: s.number)
        evidence: Evidence | None = None
        claim: str | None = None
        if kind in ("contradiction", "unsupported"):
            if finding is not None and FINDING_KIND.get(finding.verdict) == kind:
                evidence, claim = finding.evidence, finding.claim
            else:
                kind = "clarification"  # No matching finding: the model's label is not trusted.
        elif kind == "gap":
            evidence = verified_evidence(item.get("quote"), item.get("passage"), passages, min_quote_chars)
            if evidence is None:
                kind = "clarification"
        elif kind == "follow_up":
            kind = "clarification"
        if finding is not None and claim is not None:
            t_ms, duration_ms, transcript = finding.t_ms, finding.duration_ms, finding.transcript
        elif refs:
            t_ms = refs[0].start_ms
            duration_ms = max(0, max(s.end_ms for s in refs) - t_ms)
            transcript = " ".join(s.text for s in refs)
        else:
            t_ms, duration_ms, transcript = None, 0, None
        if kind == "clarification" and transcript is None:
            continue  # Neither a source nor a spoken passage behind it.
        seen.add(text.casefold())
        questions.append(Question(
            id="", kind=kind, question=text, reason=_text(item, "reason", 300), t_ms=t_ms,
            duration_ms=duration_ms, transcript=transcript, claim=claim, evidence=evidence,
            query=_text(item, "query", 300) or claim or text,
        ))
    questions.sort(key=lambda q: (PRIORITY[q.kind], q.t_ms if q.t_ms is not None else 1 << 62))
    questions = questions[:limit]
    for index, question in enumerate(questions, 1):
        question.id = f"q{index}"
    return questions


def generate_questions(request: QuestionRequest, llm: ChatModel,
                       retrieve: Callable[[UUID, str, int], list[SourceHit]] | None = retrieval.search,
                       ready_sources: Callable[[UUID], int] | None = None) -> QuestionResult:
    """`retrieve` is used only if the collection has ready sources."""
    if ready_sources is None:
        from app.sources import db
        ready_sources = lambda collection: sum(s.status == "ready" for s in db.list_sources(collection))  # noqa: E731
    config = request.config
    items = sentences(request.words)
    transcript, truncated = _numbered_transcript(items)
    role = {"startup": "Investor", "thesis": "Studierender" if request.persona == "student" else "Lehrperson",
            "school": "Lehrperson", "nonprofit": "Unterstützer"}[request.presentation_mode]
    notices = [f"Fragen stammen vom Sprachmodell {llm.model} in der Rolle {role}; "
               "sie sind Übungsfragen, keine Bewertung.",
               "Antworten werden nur mit den Quellen verglichen, es gibt keine Punkte oder Noten."]
    if truncated:
        notices.append("Langes Transkript: nur der Anfang wurde für die Fragen verwendet.")
    if not request.claims:
        notices.append("Ohne Faktencheck beruhen die Fragen nur auf Transkript und Quellen.")
    passages: list[Passage] = []
    has_sources = request.collection_id is not None and ready_sources(request.collection_id) > 0
    if has_sources and retrieve is not None and config.source_passages:
        try:
            query = " ".join(s.text for s in items)[:2000]
            passages = upload_passages(retrieve(request.collection_id, query, config.source_passages))
        except (psycopg.Error, ValueError) as error:
            log.warning("Question source lookup failed (%s)", type(error).__name__)
            notices.append("Quellen konnten nicht abgerufen werden; keine Fragen zu fehlenden Inhalten.")
    elif not has_sources:
        notices.append("Keine fertig verarbeiteten Quellen: keine Fragen zu fehlenden Inhalten.")
    context = "\n\n".join(f"[{i}] {p.label}:\n{p.text}" for i, p in enumerate(passages, 1)) or "(keine Auszüge)"
    answer = structured_json(llm,
        QUESTION_PROMPT.replace("{persona}", role_prompt(request.persona, request.presentation_mode))
                       .replace("{limit}", str(config.max_questions)),
        f"Transkript (Satznummer, Zeit, Satz):\n{transcript}\n\n"
        f"Faktencheck-Befunde (Nummer, Zeit, Urteil, Behauptung):\n{_numbered_findings(request.claims)}\n\n"
        f"Quellenauszüge:\n{context}", QuestionDrafts,
    )
    questions = parse_questions(answer, items, request.claims, passages, config.max_questions,
                                config.min_quote_chars)
    events = [Event(t_ms=q.t_ms, duration_ms=q.duration_ms, type="question", severity=SEVERITY[q.kind],
                    source="agent", payload=q.model_dump(mode="json", exclude={"t_ms", "duration_ms"}))
              for q in questions if q.t_ms is not None]
    if not questions:
        notices.append("Das Modell hat keine belastbaren Rückfragen vorgeschlagen.")
    return QuestionResult(questions=questions, events=merge_timeline(events), persona=request.persona,
                          presentation_mode=request.presentation_mode,
                          model=llm.model, sources_used=bool(passages), config=config, notices=notices)


def evidence_passage(evidence: Evidence) -> Passage:
    return Passage(evidence.kind, evidence.label, evidence.passage)


def review_answer(request: AnswerRequest, llm: ChatModel,
                  retrieve: Callable[[UUID, str, int], list[SourceHit]] | None = retrieval.search) -> AnswerReview:
    """Compare the answer with the question's evidence and upload passages; no score."""
    question = request.question
    passages: list[Passage] = []
    checked = []
    notes: list[str] = []
    if question.evidence is not None:
        passages.append(evidence_passage(question.evidence))
        checked.append(question.evidence.kind)
    if request.collection_id is not None and retrieve is not None:
        try:
            hits = retrieve(request.collection_id, f"{question.query} {request.answer[:500]}", request.config.top_k)
            known = {retrieval.normalize(p.text) for p in passages}
            passages += [p for p in upload_passages(hits) if retrieval.normalize(p.text) not in known]
            if "upload" not in checked:
                checked.append("upload")
        except (psycopg.Error, ValueError) as error:
            log.warning("Answer source lookup failed (%s)", type(error).__name__)
            notes.append("Abruf der Quellen fehlgeschlagen.")
    fallback = FALLBACK_REPLY[request.persona]
    if not passages:
        return AnswerReview(verdict="unchecked", explanation="", checked=checked, reply=fallback, model=llm.model,
                            notes=notes + ["Keine Quellenauszüge zum Vergleich vorhanden."])
    context = "\n\n".join(f"[{i}] {p.label}:\n{p.text}" for i, p in enumerate(passages, 1))
    said = f"\nGesagt im Vortrag: {question.transcript}" if question.transcript else ""
    try:
        answer = structured_json(llm, ANSWER_PROMPT.replace("{persona}", role_prompt(request.persona, request.presentation_mode)), f"Frage: {question.question}\nAnlass: {question.reason}{said}\n\n"
                                                  f"Antwort: {request.answer}\n\nAuszüge:\n{context}", AnswerJudgment)
    except (LLMError, httpx.HTTPError) as error:
        log.warning("Answer review failed (%s)", type(error).__name__)
        return AnswerReview(verdict="unchecked", explanation="", checked=checked, reply=fallback, model=llm.model,
                            notes=notes + ["Sprachmodell nicht erreichbar."])
    verdict = answer.get("verdict")
    explanation = _text(answer, "explanation", 500)
    reply = _text(answer, "reply", 500) or fallback
    evidence = None
    if verdict not in ("supports", "contradicts", "not_found"):
        verdict, explanation, reply = "unchecked", "", fallback
        notes.append("Modellantwort ohne gültiges Urteil verworfen.")
    elif verdict != "not_found":
        evidence = verified_evidence(answer.get("quote"), answer.get("passage"), passages,
                                     request.config.min_quote_chars)
        if evidence is None:
            verdict, explanation, reply = "unchecked", "", fallback
            notes.append("Zitat des Modells steht nicht wörtlich im Auszug; Urteil verworfen.")
    follow_text = _text(answer, "follow_up", 500) if verdict != "unchecked" else ""
    follow_up = Question(
        id=f"{question.id}.f", kind="follow_up", question=follow_text,
        reason=f"Nachfrage zur Antwort auf: {question.question}"[:300], t_ms=question.t_ms,
        duration_ms=question.duration_ms, transcript=question.transcript, claim=question.claim,
        evidence=question.evidence, query=question.query,
    ) if follow_text else None
    return AnswerReview(verdict=verdict, explanation=explanation, evidence=evidence, checked=checked,
                        follow_up=follow_up, reply=reply, model=llm.model, notes=notes)


def review_voice_answer(request: VoiceAnswerRequest, recording: Path, transcriber: Transcriber, llm: ChatModel,
                        retrieve: Callable[[UUID, str, int], list[SourceHit]] | None = retrieval.search
                        ) -> AnswerReview:
    """Transcribe a spoken answer, then review it like a typed one."""
    with tempfile.TemporaryDirectory() as workdir:
        words = transcriber.transcribe(extract_audio(recording, Path(workdir) / "answer.wav"))
    text = " ".join(w.word for w in words).strip()[:4000]
    if not text:
        return AnswerReview(verdict="unchecked", explanation="", checked=[], reply=UNHEARD_REPLY[request.persona],
                            answer="", model=llm.model, notes=["Keine Sprache in der Antwort erkannt."])
    review = review_answer(AnswerRequest(answer=text, **request.model_dump()), llm, retrieve)
    return review.model_copy(update={"answer": text})
