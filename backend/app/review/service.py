"""Atomic API operations. Slow model/media work is reserved for Celery."""

from pydantic import ValidationError

from app.review import db
from app.review.errors import ReviewError
from app.review.models import (TakeJobAccepted, EventsAccepted, RejectedEvent, ReviewEvent, ReviewRequest,
                               SessionDetail, SessionResponse, TakeResponse, Timeline, TimelineResponse)
from app.review.timeline import aggregates, coverage, merge_events, validate_event
from app.review.writer import pack_hash


def json_model(value):
    return value.model_dump(mode="json", by_alias=True)


def idempotent(scope, key, data, operation):
    try:
        request_hash = db.digest(data)
    except ValueError as error:
        raise ReviewError(422, "E_NON_FINITE_JSON", "JSON darf keine nicht-endlichen Zahlen enthalten.") from error
    with db.mutation(scope, key, request_hash) as (connection, previous):
        if previous:
            return previous["status"], previous["response"]
        status, response, session_id = operation(connection)
        db.remember(connection, scope, key, request_hash, session_id, status, response)
        return status, response


def create_session(request, key):
    def operation(connection):
        session = db.create_session(connection, request)
        return 201, json_model(SessionResponse(session=session)), session.session_id
    return idempotent("sessions:create", key, json_model(request), operation)


def session_detail(session_id):
    with db.connect() as connection:
        session = db.session_from(db.require_session(connection, session_id))
        takes = connection.execute("SELECT * FROM takes WHERE session_id=%s ORDER BY created_at,id", (session_id,)).fetchall()
        return SessionDetail(session=session, takes=[db.take_from(row) for row in takes])


def create_take(session_id, request, key):
    def operation(connection):
        take = db.create_take(connection, session_id, request)
        return 201, json_model(TakeResponse(take=take)), session_id
    return idempotent(f"{session_id}:takes:create", key, json_model(request), operation)


def take_detail(take_id):
    with db.connect() as connection:
        return TakeResponse(take=db.take_from(db.require_take(connection, take_id)))


def save_events(take_id, batch, key):
    def operation(connection):
        take = db.require_take(connection, take_id, lock=True)
        accepted, rejected = [], []
        for index, raw in enumerate(batch.events):
            if not isinstance(raw, dict):
                rejected.append(RejectedEvent(index=index, code="E_EVENT_SCHEMA_INVALID", message="Event muss ein Objekt sein."))
                continue
            try:
                event = ReviewEvent.model_validate(raw)
                accepted.append(validate_event(event, take["duration_ms"], browser=True))
            except (ValidationError, ReviewError) as error:
                code = error.code if isinstance(error, ReviewError) else "E_EVENT_SCHEMA_INVALID"
                if isinstance(error, ValidationError):
                    fields = {str(item["loc"][0]) for item in error.errors() if item["loc"]}
                    code = "E_DEDUPE_KEY_MISSING" if fields & {"dedupeKey", "dedupe_key"} else code
                identifier = raw.get("eventId")
                rejected.append(RejectedEvent(index=index, event_id=identifier if isinstance(identifier, str) else None,
                    code=code, message="Event wurde nicht gespeichert; Schema, Zeitachse und Evidenz prüfen."))
        db.upsert_events(connection, take_id, accepted)
        return 200, json_model(EventsAccepted(accepted=len(accepted), rejected=rejected)), take["session_id"]
    return idempotent(f"{take_id}:events", key, json_model(batch), operation)


def load_timeline(connection, take_id) -> Timeline:
    row = db.require_take(connection, take_id)
    take = db.take_from(row)
    events = merge_events(db.events(connection, take_id))
    return Timeline(session=db.session_from(db.require_session(connection, take.session_id)), take=take,
                    events=events, aggregates=aggregates(events, take.duration_ms), coverage=coverage(take, events))


def timeline(take_id):
    with db.connect() as connection:
        connection.execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ")
        return TimelineResponse(timeline=load_timeline(connection, take_id))


def review(take_id):
    with db.connect() as connection:
        db.require_take(connection, take_id)
        row = connection.execute("SELECT report FROM reviews WHERE take_id=%s AND status='ready'", (take_id,)).fetchone()
        if row is None:
            raise ReviewError(404, "E_REVIEW_NOT_READY", "Review wurde noch nicht erzeugt.", {"takeId": str(take_id)})
        return {"review": row["report"]}


def reserve_job(take_id, kind, options, key, fingerprint=None, preflight=None):
    """DB outbox: a repeated request can re-publish the same queued job after a queue outage."""
    def operation(connection):
        take = db.require_take(connection, take_id, lock=True)
        if kind == "review_generate":
            report = connection.execute("SELECT id,verification FROM reviews WHERE take_id=%s AND status='ready'", (take_id,)).fetchone()
            event_hash = pack_hash(load_timeline(connection, take_id), ReviewRequest.model_validate(options))
            if report and report["verification"].get("eventPackHash") == event_hash:
                return 200, {"reviewId": str(report["id"])}, take["session_id"]
        if preflight:
            preflight()
        if kind in {"factcheck", "questions_generate"} and not take["analysis"].get("words"):
            raise ReviewError(409, "E_TRANSCRIPT_NOT_READY", "Für diesen Take liegt kein Transkript vor.")
        if kind == "answer_review":
            questions = (take["analysis"].get("questions") or {}).get("questions", [])
            if not any(question["id"] == options["questionId"] for question in questions):
                raise ReviewError(404, "E_QUESTION_NOT_FOUND", "Frage gehört nicht zu diesem Take.")
        job_id = db.insert_job(connection, take_id, kind, options)
        if kind == "audio_analyze":
            connection.execute("UPDATE takes SET status='audio_processing' WHERE id=%s", (take_id,))
        connection.execute("UPDATE sessions SET status='analyzing' WHERE id=%s", (take["session_id"],))
        return 202, json_model(TakeJobAccepted(job_id=job_id, status_url=f"/api/jobs/{job_id}")), take["session_id"]
    return idempotent(f"{take_id}:{kind}", key, fingerprint or options, operation)


def queued_job(job_id):
    with db.connect() as connection:
        return db.require_job(connection, job_id)


def prepare_upload(job_id, file):
    from app.review import media
    with db.connect() as connection, connection.transaction():
        job = db.require_job(connection, job_id)
        db.require_take(connection, job["take_id"], lock=True)
        job = db.require_job(connection, job_id)
        if job["status"] != "queued" or job["upload_ready"]:
            return
        try:
            media.upload(file, job["object_key"])
            connection.execute("UPDATE jobs SET upload_ready=true WHERE id=%s", (job_id,))
        except BaseException:
            media.delete(job["object_key"])
            raise


def fail_job(job_id, code, *, clear_object=False):
    with db.connect() as connection:
        db.finish_job(connection, job_id, error={"code": code, "message": "Verarbeitung fehlgeschlagen; Eingaben und Dienste prüfen."})
        if clear_object:
            connection.execute("UPDATE jobs SET object_key=NULL WHERE id=%s", (job_id,))


def evaluation(take_id):
    with db.connect() as connection:
        db.require_take(connection, take_id)
        row = connection.execute("SELECT verification FROM reviews WHERE take_id=%s AND status='ready'", (take_id,)).fetchone()
        failures = connection.execute("SELECT kind,error FROM jobs WHERE take_id=%s AND status='failed' ORDER BY created_at,id", (take_id,)).fetchall()
        return {"evaluation": {"verification": row["verification"] if row else None,
            "failedJobs": failures, "humanLabeledClaims": None,
            "limitations": ["Verifier support is a code check, not a human quality evaluation."]}}


def delete_session(session_id):
    from app.retention import outbox
    with db.connect() as connection, connection.transaction():
        result = db.delete_session_rows(connection, session_id)
    if result["deleted"]:
        outbox.flush_quietly()
    return result
