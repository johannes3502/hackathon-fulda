"""Durable take jobs. All writes re-check parents so deletion cannot resurrect data."""

import logging
import tempfile
from pathlib import Path

from psycopg.types.json import Jsonb

from app.review import db, media, service
from app.review.errors import ReviewError
from app.review.models import ReviewEvent, ReviewRequest
from app.review.timeline import validate_event

log = logging.getLogger(__name__)


def pipeline_events(events, take, offset=0, prefix=""):
    result = []
    for index, event in enumerate(events):
        start = event.t_ms + offset
        identifier = f"{prefix}{event.source}:{event.type}:{event.t_ms}:{index}"
        if start < 0:
            raise ReviewError(422, "E_EVENT_OUT_OF_RANGE", "Audio-Offset erzeugt einen negativen Timestamp.")
        payload = {"schema": f"{event.source}.event.v1", **event.payload}
        payload["peakBasis"] = "event-start-no-peak-sample"
        if event.source in {"speech", "asr"}:
            payload["thresholdsStatus"] = "heuristic-unvalidated"
        result.append(validate_event(ReviewEvent(event_id=identifier, t_ms=start, peak_ms=start,
            duration_ms=event.duration_ms, type=event.type, severity=event.severity, source=event.source,
            stage="final", payload=payload, dedupe_key=identifier), take["duration_ms"]))
    return result


def analyze_audio(job, take):
    from app.speech.job_models import AnalysisOptions
    from app.speech.pipeline import run_analysis
    from app.transcription.models import Word

    options = AnalysisOptions.model_validate(job["input"])
    with tempfile.TemporaryDirectory(prefix="review-audio-") as directory:
        recording = Path(directory) / "recording"
        media.download(job["object_key"], recording)
        probed = media.probe(recording)
        result = run_analysis(recording, options)
    offset = media.offset_ms(probed, take["timebase"])
    log.info("Audio timebase job=%s take=%s offset_ms=%s", job["id"], take["id"], offset)
    word_offset = 0 if options.live_transcript else offset
    words = []
    for word in result.words:
        start, end = word.start_ms + word_offset, word.end_ms + word_offset
        if start < 0 or end > take["duration_ms"] + 1000:
            raise ReviewError(422, "E_EVENT_OUT_OF_RANGE", "Wort-Timestamps liegen außerhalb der Take-Zeitachse.")
        words.append(Word(word=word.word, start_ms=start, end_ms=end))
    speech = pipeline_events(result.audio.events, take, offset)
    word_events = pipeline_events(result.transcription.events, take, word_offset) if result.transcription else []
    analysis = {"words": [word.model_dump() for word in words], "audioSummary": result.audio.summary.model_dump(),
                "wordSummary": result.transcription.summary.model_dump() if result.transcription else None,
                "asrProvider": result.asr_provider, "syntheticDemo": result.synthetic_demo, "notices": result.notices}
    return {"analysis": analysis, "probe": probed, "events": [*speech, *word_events], "offset": offset}


def model_job(job, take):
    from app.factcheck.llm import configured_llm
    from app.factcheck.models import ClaimResult, FactCheckRequest
    from app.factcheck.pipeline import run_fact_check
    from app.factcheck.web import configured_web_searcher
    from app.questions.models import AnswerRequest, Question, QuestionRequest
    from app.questions.pipeline import generate_questions, review_answer
    from app.transcription.models import Word

    llm, analysis, options = configured_llm(), take["analysis"], job["input"]
    with db.connect() as connection:
        session = db.require_session(connection, take["session_id"])
    words = [Word.model_validate(word) for word in analysis.get("words", [])]
    if job["kind"] == "factcheck":
        request = FactCheckRequest(words=words, collection_id=session["collection_id"], use_web=options.get("useWeb", False))
        result = run_fact_check(request, llm, configured_web_searcher() if request.use_web else None)
        return "factcheck", result.model_dump(mode="json"), pipeline_events(result.events, take, prefix="fact:")
    if job["kind"] == "questions_generate":
        claims = [ClaimResult.model_validate(claim) for claim in (analysis.get("factcheck") or {}).get("claims", [])]
        result = generate_questions(QuestionRequest(words=words, claims=claims, collection_id=session["collection_id"],
                                                    persona=options.get("persona", "tutor")), llm)
        return "questions", result.model_dump(mode="json"), pipeline_events(result.events, take, prefix="question:")
    raw = next((question for question in (analysis.get("questions") or {}).get("questions", [])
                if question["id"] == options["questionId"]), None)
    if raw is None:
        raise ReviewError(404, "E_QUESTION_NOT_FOUND", "Frage gehört nicht zu diesem Take.")
    result = review_answer(AnswerRequest(question=Question.model_validate(raw), answer=options["answer"],
        collection_id=session["collection_id"], persona=options.get("persona", "tutor")), llm)
    return "answer", result.model_dump(mode="json"), []


def execute(job_id):
    """Caller holds the Redis job lease; terminal jobs only retry pending cleanup."""
    with db.connect() as connection:
        job = connection.execute("SELECT * FROM jobs WHERE id=%s", (job_id,)).fetchone()
        if job is None:
            return
        take = db.require_take(connection, job["take_id"])
        if job["status"] in {"completed", "failed"}:
            media.delete(job["object_key"])
            connection.execute("UPDATE jobs SET object_key=NULL WHERE id=%s", (job_id,))
            return
        connection.execute("UPDATE jobs SET status='running',progress=10,updated_at=now() WHERE id=%s", (job_id,))
    value, error = None, None
    try:
        if job["kind"] == "audio_analyze":
            value = analyze_audio(job, take)
        elif job["kind"] == "review_generate":
            from app.factcheck.llm import configured_llm
            from app.review.writer import build_review
            with db.connect() as connection:
                connection.execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ")
                timeline = service.load_timeline(connection, take["id"])
                # Event upload can race job startup; compare against this exact snapshot.
                revision = db.require_take(connection, take["id"])["revision"]
            options = ReviewRequest.model_validate(job["input"])
            value = (*build_review(timeline, options, configured_llm() if options.mode == "llm" else None), revision)
        else:
            value = model_job(job, take)
    except Exception as failure:
        code = failure.code if isinstance(failure, ReviewError) else "E_JOB_FAILED"
        error = {"code": code, "message": "Verarbeitung fehlgeschlagen; Eingaben und Dienste prüfen."}
        log.warning("Review job=%s failed code=%s", job_id, code)
    finally:
        # Do not mark an audio job completed until deletion has actually succeeded.
        try:
            media.delete(job["object_key"])
        except Exception:
            service.fail_job(job_id, "E_AUDIO_CLEANUP_FAILED")
            raise
    with db.connect() as connection, connection.transaction():
        try:
            current = db.require_take(connection, take["id"], lock=True)
        except ReviewError:
            return  # Session deletion won the race. No derived data can be re-created.
        if connection.execute("SELECT id FROM jobs WHERE id=%s", (job_id,)).fetchone() is None:
            return
        connection.execute("UPDATE jobs SET object_key=NULL WHERE id=%s", (job_id,))
        if error:
            db.finish_job(connection, job_id, error=error)
            connection.execute("UPDATE takes SET status='failed' WHERE id=%s", (take["id"],))
            connection.execute("UPDATE sessions SET status='failed' WHERE id=%s", (take["session_id"],))
            return
        result, job_error = None, None
        if job["kind"] == "audio_analyze":
            connection.execute("DELETE FROM events WHERE take_id=%s AND source IN ('speech','asr','factcheck','agent')", (take["id"],))
            db.upsert_events(connection, take["id"], value["events"])
            warnings = [code for code in current["warnings"] if code not in {"E_DURATION_MISMATCH", "E_AV_OFFSET_IMPLAUSIBLE"}]
            if abs(value["offset"]) > 500:
                warnings.append("E_AV_OFFSET_IMPLAUSIBLE")
            if value["probe"].get("duration_ms") is not None and abs(value["probe"]["duration_ms"] - take["duration_ms"]) > 2000:
                warnings.append("E_DURATION_MISMATCH")
            connection.execute("UPDATE takes SET audio_probe=%s,analysis=%s,warnings=%s WHERE id=%s",
                (Jsonb(value["probe"]), Jsonb(value["analysis"]), Jsonb(warnings), take["id"]))
            db.invalidate(connection, take["id"])
        elif job["kind"] == "review_generate":
            report, verification, revision = value
            if revision != current["revision"]:
                db.finish_job(connection, job_id, error={"code": "E_EVENTS_CHANGED", "message": "Events wurden während der Review verändert. Review erneut starten."})
                return
            connection.execute("INSERT INTO reviews(id,take_id,status,report,generator,verification)"
                " VALUES (%s,%s,'ready',%s,%s,%s) ON CONFLICT(take_id) DO UPDATE SET id=EXCLUDED.id,status='ready',"
                " report=EXCLUDED.report,generator=EXCLUDED.generator,verification=EXCLUDED.verification,updated_at=now()",
                (report.review_id, take["id"], Jsonb(service.json_model(report)), Jsonb(service.json_model(report.generator)), Jsonb(verification)))
            connection.execute("UPDATE takes SET status='review_ready' WHERE id=%s", (take["id"],))
            connection.execute("UPDATE sessions SET status='review_ready' WHERE id=%s AND NOT EXISTS"
                " (SELECT 1 FROM takes WHERE session_id=%s AND status != 'review_ready')", (take["session_id"], take["session_id"]))
            result = {"reviewId": str(report.review_id)}
            if verification["degraded"]:
                job_error = {"code": "E_REVIEW_VERIFICATION", "message": "LLM-Verifikation überschreitet die Fallback-Grenze. Geprüfte Template-Review ist verfügbar."}
        else:
            name, result, events = value
            if name in {"factcheck", "questions"}:
                connection.execute("DELETE FROM events WHERE take_id=%s AND source=%s", (take["id"], "factcheck" if name == "factcheck" else "agent"))
                db.upsert_events(connection, take["id"], events)
                # Updating a fact-check invalidates questions based on the previous verdicts.
                analysis = {**current["analysis"], name: result}
                if name == "factcheck":
                    analysis.pop("questions", None)
                    connection.execute("DELETE FROM events WHERE take_id=%s AND source='agent'", (take["id"],))
                connection.execute("UPDATE takes SET analysis=%s WHERE id=%s", (Jsonb(analysis), take["id"]))
                db.invalidate(connection, take["id"])
        db.finish_job(connection, job_id, error=job_error, result=result)
