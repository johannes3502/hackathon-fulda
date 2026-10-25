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

import hashlib
import logging
import tempfile
from pathlib import Path
from typing import Callable
from uuid import UUID

import httpx
import psycopg
from pydantic import ValidationError

from app.events import Event, merge_timeline
from app.factcheck.llm import ChatModel, LLMError, structured_json
from app.factcheck.drafts import AnswerJudgment, QuestionDraft, QuestionDrafts
from app.factcheck.models import ClaimResult, Evidence
from app.factcheck.pipeline import Passage, upload_passages, verified_evidence
from app.factcheck.transcript import Sentence, clock, sentences
from app.prompt_safety import untrusted_block
from app.questions import rounds
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
        # Strict per-item validation rejects unknown control fields while a
        # malformed entry is skipped instead of steering the whole result.
        try:
            draft = QuestionDraft.model_validate(item)
        except ValidationError:
            continue
        text = draft.question.strip()[:500]
        if not text or text.casefold() in seen:
            continue
        kind: QuestionKind = draft.kind if draft.kind in PRIORITY else "clarification"
        finding_no = draft.finding
        finding = claims[finding_no - 1] if isinstance(finding_no, int) and 1 <= finding_no <= len(claims) else None
        refs = sorted({by_number[n] for n in draft.sentences if n in by_number}, key=lambda s: s.number)
        evidence: Evidence | None = None
        claim: str | None = None
        if kind in ("contradiction", "unsupported"):
            if finding is not None and FINDING_KIND.get(finding.verdict) == kind:
                evidence, claim = finding.evidence, finding.claim
            else:
                kind = "clarification"  # No matching finding: the model's label is not trusted.
        elif kind == "gap":
            evidence = verified_evidence(draft.quote, draft.passage, passages, min_quote_chars)
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
                       ready_sources: Callable[[UUID], int] | None = None,
                       round_factory: Callable[..., rounds.QuestionRound] | None = None) -> QuestionResult:
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
    user = "\n\n".join([
        "Transkript (Satznummer, Zeit, Satz):\n" + untrusted_block("transcript", transcript),
        "Faktencheck-Befunde (Nummer, Zeit, Urteil, Behauptung):\n"
        + untrusted_block("findings", _numbered_findings(request.claims)),
        "Quellenauszüge (Nummer, Quelle, Text):\n" + untrusted_block("source-passages", context),
    ])
    answer = structured_json(
        llm,
        QUESTION_PROMPT.replace("{persona}", role_prompt(request.persona, request.presentation_mode))
                       .replace("{limit}", str(config.max_questions)),
        user, QuestionDrafts,
    )
    questions = parse_questions(answer, items, request.claims, passages, config.max_questions,
                                config.min_quote_chars)
    events = [Event(t_ms=q.t_ms, duration_ms=q.duration_ms, type="question", severity=SEVERITY[q.kind],
                    source="agent", payload=q.model_dump(mode="json", exclude={"t_ms", "duration_ms"}))
              for q in questions if q.t_ms is not None]
    if not questions:
        notices.append("Das Modell hat keine belastbaren Rückfragen vorgeschlagen.")
    create = round_factory or rounds.create_round
    state = create(questions=questions, config=config, collection_id=request.collection_id,
                   persona=request.persona, presentation_mode=request.presentation_mode)
    return QuestionResult(round_id=state.round_id, questions=questions, events=merge_timeline(events),
                          persona=request.persona, presentation_mode=request.presentation_mode,
                          model=llm.model, sources_used=bool(passages), config=config, notices=notices)


def evidence_passage(evidence: Evidence) -> Passage:
    return Passage(evidence.kind, evidence.label, evidence.passage)


def _question_and_round(request: AnswerRequest | VoiceAnswerRequest) -> tuple[Question, rounds.QuestionRound | None]:
    """Canonical question from the server-issued round, or the internal take path."""
    if request.round_id is not None:
        state = rounds.get_round(request.round_id)
        return rounds.find_question(state, request.question_id), state
    if request.question is not None:
        # Internal take-review worker only; the HTTP API rejects this shape.
        return request.question, None
    raise ValueError("Answer review needs a server-issued round_id and question_id")


def _answer_hash(answer: str) -> str:
    return hashlib.sha256(answer.encode("utf-8")).hexdigest()


def _review_impl(question: Question, answer: str, *, config, persona: Persona, presentation_mode: PresentationMode,
                 collection_id: UUID | None, llm: ChatModel,
                 retrieve: Callable[[UUID, str, int], list[SourceHit]] | None) -> tuple[AnswerReview, bool]:
    """Return the review and whether the model call failed technically."""
    passages: list[Passage] = []
    checked = []
    notes: list[str] = []
    if question.evidence is not None:
        passages.append(evidence_passage(question.evidence))
        checked.append(question.evidence.kind)
    if collection_id is not None and retrieve is not None:
        try:
            hits = retrieve(collection_id, f"{question.query} {answer[:500]}", config.top_k)
            known = {retrieval.normalize(p.text) for p in passages}
            passages += [p for p in upload_passages(hits) if retrieval.normalize(p.text) not in known]
            if "upload" not in checked:
                checked.append("upload")
        except (psycopg.Error, ValueError) as error:
            log.warning("Answer source lookup failed (%s)", type(error).__name__)
            notes.append("Abruf der Quellen fehlgeschlagen.")
    fallback = FALLBACK_REPLY[persona]
    if not passages:
        return AnswerReview(verdict="unchecked", explanation="", checked=checked, reply=fallback, model=llm.model,
                            notes=notes + ["Keine Quellenauszüge zum Vergleich vorhanden."]), False
    context = "\n\n".join(f"[{i}] {p.label}:\n{p.text}" for i, p in enumerate(passages, 1))
    user = "\n\n".join([
        "Server-issued question (reference only):\n"
        + untrusted_block("question", f"{question.question}\nAnlass: {question.reason}"),
        *(["Spoken passage in the talk (reference only):\n"
           + untrusted_block("transcript", question.transcript)] if question.transcript else []),
        "Answer to evaluate (untrusted):\n" + untrusted_block("answer", answer),
        "Source passages (untrusted):\n" + untrusted_block("source-passages", context),
    ])
    try:
        raw = structured_json(llm, ANSWER_PROMPT.replace(
            "{persona}", role_prompt(persona, presentation_mode)), user, AnswerJudgment)
    except (LLMError, httpx.HTTPError) as error:
        log.warning("Answer review failed (%s)", type(error).__name__)
        return AnswerReview(verdict="unchecked", explanation="", checked=checked, reply=fallback, model=llm.model,
                            notes=notes + ["Sprachmodell nicht erreichbar."]), True
    try:
        answer_judgment = AnswerJudgment.model_validate(raw)
    except ValidationError:
        log.warning("Answer review returned an invalid schema")
        return AnswerReview(verdict="unchecked", explanation="", checked=checked, reply=fallback, model=llm.model,
                            notes=notes + ["Modellantwort entsprach nicht dem Schema."]), False
    verdict = answer_judgment.verdict
    explanation = answer_judgment.explanation.strip()[:500]
    reply = answer_judgment.reply.strip()[:500] or fallback
    evidence = None
    if verdict != "not_found":
        evidence = verified_evidence(answer_judgment.quote, answer_judgment.passage, passages,
                                     config.min_quote_chars)
        if evidence is None:
            verdict, explanation, reply = "unchecked", "", fallback
            notes.append("Zitat des Modells steht nicht wörtlich im Auszug; Urteil verworfen.")
    follow_text = answer_judgment.follow_up.strip()[:500] if verdict != "unchecked" else ""
    follow_up = Question(
        id=f"{question.id}.f", kind="follow_up", question=follow_text,
        reason=f"Nachfrage zur Antwort auf: {question.question}"[:300], t_ms=question.t_ms,
        duration_ms=question.duration_ms, transcript=question.transcript, claim=question.claim,
        evidence=question.evidence, query=question.query,
    ) if follow_text else None
    return AnswerReview(verdict=verdict, explanation=explanation, evidence=evidence, checked=checked,
                        follow_up=follow_up, reply=reply, model=llm.model, notes=notes), False


def review_answer(request: AnswerRequest, llm: ChatModel,
                  retrieve: Callable[[UUID, str, int], list[SourceHit]] | None = retrieval.search) -> AnswerReview:
    """Compare the answer with the canonical question's evidence and upload passages; no score."""
    question, state = _question_and_round(request)
    if state is None:
        # Internal take path: the question was loaded by the server from the take.
        review, _ = _review_impl(
            question, request.answer, config=request.config, persona=request.persona,
            presentation_mode=request.presentation_mode, collection_id=request.collection_id,
            llm=llm, retrieve=retrieve,
        )
        return review

    answer_hash = _answer_hash(request.answer)
    cached = rounds.claim_turn(state.round_id, question.id, answer_hash)
    if cached is not None:
        return cached
    try:
        review, model_failed = _review_impl(
            question, request.answer, config=state.config, persona=state.persona,
            presentation_mode=state.presentation_mode, collection_id=state.collection_id,
            llm=llm, retrieve=retrieve,
        )
        if model_failed:
            rounds.fail_turn(state.round_id, question.id, answer_hash)
            return review
        return rounds.complete_turn(state.round_id, question.id, answer_hash, review)
    except BaseException:
        rounds.fail_turn(state.round_id, question.id, answer_hash)
        raise


def review_voice_answer(request: VoiceAnswerRequest, recording: Path, transcriber: Transcriber, llm: ChatModel,
                        retrieve: Callable[[UUID, str, int], list[SourceHit]] | None = retrieval.search
                        ) -> AnswerReview:
    """Transcribe a spoken answer, then review it like a typed one."""
    question, state = _question_and_round(request)
    input_hash = request.audio_sha256 or f"voice:{question.id}"
    if state is not None:
        cached = rounds.claim_turn(state.round_id, question.id, input_hash)
        if cached is not None:
            return cached
    try:
        with tempfile.TemporaryDirectory() as workdir:
            words = transcriber.transcribe(extract_audio(recording, Path(workdir) / "answer.wav"))
        text = " ".join(w.word for w in words).strip()[:4000]
        if not text:
            if state is not None:
                rounds.fail_turn(state.round_id, question.id, input_hash)
            return AnswerReview(verdict="unchecked", explanation="", checked=[], reply=UNHEARD_REPLY[request.persona],
                                answer="", model=llm.model, notes=["Keine Sprache in der Antwort erkannt."])
        review, model_failed = _review_impl(
            question, text,
            config=state.config if state is not None else request.config,
            persona=state.persona if state is not None else request.persona,
            presentation_mode=state.presentation_mode if state is not None else request.presentation_mode,
            collection_id=state.collection_id if state is not None else request.collection_id,
            llm=llm, retrieve=retrieve,
        )
        review = review.model_copy(update={"answer": text})
        if state is not None:
            if model_failed:
                rounds.fail_turn(state.round_id, question.id, input_hash)
                return review
            return rounds.complete_turn(state.round_id, question.id, input_hash, review)
        return review
    except BaseException:
        if state is not None:
            rounds.fail_turn(state.round_id, question.id, input_hash)
        raise
