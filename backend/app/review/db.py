"""PostgreSQL persistence and transaction-scoped idempotency for review routes."""

import hashlib
import json
from contextlib import contextmanager
from datetime import datetime, timezone
from uuid import uuid4

from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from app.connections import connect_db
from app.review.errors import ReviewError
from app.review.models import Job, ReviewEvent, Session, SessionCreate, Take, TakeCreate

SCHEMA = """
CREATE TABLE IF NOT EXISTS sessions (
    id uuid PRIMARY KEY, title text NOT NULL, collection_id uuid,
    status text NOT NULL CHECK (status IN ('created','analyzing','review_ready','failed','deleted')),
    consent jsonb NOT NULL, capture jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS takes (
    id uuid PRIMARY KEY, session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    status text NOT NULL CHECK (status IN ('created','audio_processing','events_ready','review_ready','failed')),
    duration_ms integer NOT NULL CHECK (duration_ms BETWEEN 0 AND 86400000), mime_type text NOT NULL,
    timebase jsonb NOT NULL, coverage jsonb NOT NULL DEFAULT '[]', audio_probe jsonb,
    warnings jsonb NOT NULL DEFAULT '[]', analysis jsonb NOT NULL DEFAULT '{}',
    revision integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS takes_session_idx ON takes(session_id, created_at);
CREATE TABLE IF NOT EXISTS events (
    id text NOT NULL, take_id uuid NOT NULL REFERENCES takes(id) ON DELETE CASCADE,
    t_ms integer NOT NULL, peak_ms integer NOT NULL, duration_ms integer NOT NULL,
    type text NOT NULL CHECK (type IN ('posture','head','hands','framing','data-quality','gesture',
        'filler','pause','pace','volume','pitch','fact','question')),
    severity text NOT NULL CHECK (severity IN ('info','hint','warning')),
    source text NOT NULL CHECK (source IN ('browser','asr','speech','factcheck','agent')),
    stage text NOT NULL CHECK (stage IN ('live','final')), payload jsonb NOT NULL,
    dedupe_key text NOT NULL CHECK (length(dedupe_key) > 0), rule_version text,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (take_id, id), UNIQUE (take_id, dedupe_key),
    CHECK (t_ms >= 0 AND duration_ms >= 0 AND peak_ms >= t_ms AND peak_ms <= t_ms + duration_ms),
    CHECK (t_ms::bigint + duration_ms <= 86400000)
);
CREATE INDEX IF NOT EXISTS events_take_time_idx ON events(take_id, t_ms);
CREATE TABLE IF NOT EXISTS reviews (
    id uuid PRIMARY KEY, take_id uuid NOT NULL UNIQUE REFERENCES takes(id) ON DELETE CASCADE,
    status text NOT NULL CHECK (status IN ('pending','running','ready','failed')),
    report jsonb NOT NULL, generator jsonb NOT NULL, verification jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS jobs (
    id uuid PRIMARY KEY, take_id uuid NOT NULL REFERENCES takes(id) ON DELETE CASCADE,
    kind text NOT NULL CHECK (kind IN ('audio_analyze','review_generate','factcheck','questions_generate','answer_review')),
    status text NOT NULL CHECK (status IN ('queued','running','completed','failed')),
    progress integer NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    error jsonb, result jsonb, input jsonb NOT NULL, object_key text, upload_ready boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jobs_take_idx ON jobs(take_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS jobs_one_active_kind_idx ON jobs(take_id, kind)
    WHERE status IN ('queued', 'running');
CREATE TABLE IF NOT EXISTS review_idempotency (
    scope text NOT NULL, key text NOT NULL, request_hash text NOT NULL,
    session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    status integer NOT NULL, response jsonb NOT NULL,
    expires_at timestamptz NOT NULL DEFAULT now() + interval '24 hours', PRIMARY KEY (scope, key)
);
CREATE INDEX IF NOT EXISTS review_idempotency_expiry_idx ON review_idempotency(expires_at);
"""

_schema_ready = False


def connect():
    global _schema_ready
    connection = connect_db()
    connection.row_factory = dict_row
    if not _schema_ready:
        try:
            with connection.transaction():
                connection.execute("SELECT pg_advisory_xact_lock(hashtext('review-schema-v1'))")
                connection.execute(SCHEMA)
            _schema_ready = True
        except BaseException:
            connection.close()
            raise
    return connection


def digest(value) -> str:
    return "sha256:" + hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False,
        separators=(",", ":"), allow_nan=False).encode()).hexdigest()


@contextmanager
def mutation(scope: str, key: str, request_hash: str):
    """Serialize the entire mutation; failed transactions never reserve a key."""
    with connect() as connection, connection.transaction():
        connection.execute("SELECT pg_advisory_xact_lock(hashtextextended(%s, 0))", (scope + ":" + key,))
        connection.execute("DELETE FROM review_idempotency WHERE expires_at <= now()")
        previous = connection.execute("SELECT * FROM review_idempotency WHERE scope=%s AND key=%s",
                                      (scope, key)).fetchone()
        if previous and previous["request_hash"] != request_hash:
            raise ReviewError(409, "E_IDEMPOTENCY_CONFLICT", "Idempotency-Key wurde für eine andere Anfrage verwendet.")
        yield connection, previous


def remember(connection, scope, key, request_hash, session_id, status, response):
    connection.execute("INSERT INTO review_idempotency(scope,key,request_hash,session_id,status,response)"
        " VALUES (%s,%s,%s,%s,%s,%s)", (scope, key, request_hash, session_id, status, Jsonb(response)))


def session_from(row) -> Session:
    return Session(session_id=row["id"], title=row["title"], collection_id=row["collection_id"],
        status=row["status"], consent=row["consent"], capture=row["capture"], created_at=row["created_at"])


def take_from(row) -> Take:
    return Take(take_id=row["id"], **{key: row[key] for key in (
        "session_id", "status", "duration_ms", "mime_type", "timebase", "coverage", "audio_probe", "analysis", "warnings", "created_at")})


def require_session(connection, session_id, *, lock=False):
    row = connection.execute("SELECT * FROM sessions WHERE id=%s" + (" FOR UPDATE" if lock else ""),
                             (session_id,)).fetchone()
    if row is None:
        raise ReviewError(404, "E_SESSION_NOT_FOUND", "Session nicht gefunden.")
    return row


def require_take(connection, take_id, *, lock=False):
    # Always lock parent before child, including deletion and worker saves.
    parent = connection.execute("SELECT session_id FROM takes WHERE id=%s", (take_id,)).fetchone()
    if parent is None:
        raise ReviewError(404, "E_TAKE_NOT_FOUND", "Take nicht gefunden.")
    require_session(connection, parent["session_id"], lock=lock)
    row = connection.execute("SELECT * FROM takes WHERE id=%s" + (" FOR UPDATE" if lock else ""),
                             (take_id,)).fetchone()
    if row is None:
        raise ReviewError(404, "E_TAKE_NOT_FOUND", "Take nicht gefunden.")
    return row


def create_session(connection, request: SessionCreate) -> Session:
    row = connection.execute("INSERT INTO sessions(id,title,collection_id,status,consent,capture)"
        " VALUES (%s,%s,%s,'created',%s,%s) RETURNING *", (uuid4(), request.title, request.collection_id,
        Jsonb(request.consent.model_dump(mode="json", by_alias=True)),
        Jsonb(request.capture.model_dump(mode="json", by_alias=True)))).fetchone()
    return session_from(row)


def create_take(connection, session_id, request: TakeCreate) -> Take:
    require_session(connection, session_id, lock=True)
    warnings = []
    if request.timebase.container_duration_ms is not None and abs(request.timebase.container_duration_ms - request.duration_ms) > 2000:
        warnings.append("E_DURATION_MISMATCH")
    if request.timebase.av_offset_ms is not None and abs(request.timebase.av_offset_ms) > 500:
        warnings.append("E_AV_OFFSET_IMPLAUSIBLE")
    row = connection.execute("INSERT INTO takes(id,session_id,status,duration_ms,mime_type,timebase,coverage,warnings)"
        " VALUES (%s,%s,'created',%s,%s,%s,%s,%s) RETURNING *", (uuid4(), session_id,
        request.duration_ms, request.mime_type, Jsonb(request.timebase.model_dump(mode="json", by_alias=True, exclude_unset=True)),
        Jsonb([item.model_dump(mode="json", by_alias=True) for item in request.coverage]), Jsonb(warnings))).fetchone()
    return take_from(row)


def events(connection, take_id) -> list[ReviewEvent]:
    rows = connection.execute("SELECT * FROM events WHERE take_id=%s ORDER BY t_ms,peak_ms,id", (take_id,)).fetchall()
    return [ReviewEvent(event_id=row["id"], **{k: row[k] for k in (
        "t_ms", "peak_ms", "duration_ms", "type", "severity", "source", "stage", "payload", "dedupe_key", "rule_version")}) for row in rows]


def upsert_events(connection, take_id, incoming: list[ReviewEvent]):
    """Parent is locked by caller. Preserve an event's first ID across dedupe upserts."""
    changed = False
    for event in incoming:
        row = connection.execute("SELECT dedupe_key FROM events WHERE take_id=%s AND id=%s",
                                 (take_id, event.event_id)).fetchone()
        if row and row["dedupe_key"] != event.dedupe_key:
            raise ReviewError(409, "E_EVENT_ID_CONFLICT", "Event-ID verweist auf einen anderen Dedupe-Key.",
                              {"eventId": event.event_id})
        cursor = connection.execute("INSERT INTO events(id,take_id,t_ms,peak_ms,duration_ms,type,severity,source,stage,payload,dedupe_key,rule_version)"
            " VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT(take_id,dedupe_key) DO UPDATE SET"
            " t_ms=EXCLUDED.t_ms,peak_ms=EXCLUDED.peak_ms,duration_ms=EXCLUDED.duration_ms,type=EXCLUDED.type,"
            " severity=EXCLUDED.severity,source=EXCLUDED.source,stage=EXCLUDED.stage,payload=EXCLUDED.payload,rule_version=EXCLUDED.rule_version"
            " WHERE NOT(events.stage='final' AND EXCLUDED.stage='live') AND"
            " (events.t_ms,events.peak_ms,events.duration_ms,events.type,events.severity,events.source,events.stage,events.payload,events.rule_version)"
            " IS DISTINCT FROM (EXCLUDED.t_ms,EXCLUDED.peak_ms,EXCLUDED.duration_ms,EXCLUDED.type,EXCLUDED.severity,EXCLUDED.source,EXCLUDED.stage,EXCLUDED.payload,EXCLUDED.rule_version)",
            (event.event_id, take_id, event.t_ms, event.peak_ms, event.duration_ms, event.type, event.severity,
             event.source, event.stage, Jsonb(event.payload), event.dedupe_key, event.rule_version))
        changed = changed or cursor.rowcount > 0
    if changed:
        invalidate(connection, take_id)


def invalidate(connection, take_id):
    connection.execute("UPDATE takes SET revision=revision+1,status='events_ready' WHERE id=%s", (take_id,))
    connection.execute("UPDATE reviews SET status='pending',updated_at=now() WHERE take_id=%s", (take_id,))
    connection.execute("UPDATE sessions SET status='analyzing' WHERE id=(SELECT session_id FROM takes WHERE id=%s)", (take_id,))


def job_from(row) -> Job:
    return Job(job_id=row["id"], **{key: row[key] for key in (
        "take_id", "kind", "status", "progress", "error", "result")})


def require_job(connection, job_id):
    row = connection.execute("SELECT * FROM jobs WHERE id=%s", (job_id,)).fetchone()
    if row is None:
        raise ReviewError(404, "E_JOB_NOT_FOUND", "Job nicht gefunden.")
    return row


def insert_job(connection, take_id, kind, options, object_key=None):
    active = connection.execute("SELECT id FROM jobs WHERE take_id=%s AND status IN ('queued','running')", (take_id,)).fetchone()
    if active:
        raise ReviewError(409, "E_JOB_IN_PROGRESS", "Für diesen Take läuft bereits ein Job.", {"jobId": str(active["id"])})
    job_id = uuid4()
    if kind == "audio_analyze":
        parent = require_take(connection, take_id)
        object_key = f"review-audio/{parent['session_id']}/{take_id}/{job_id}/upload"
    connection.execute("INSERT INTO jobs(id,take_id,kind,status,input,object_key) VALUES (%s,%s,%s,'queued',%s,%s)",
                       (job_id, take_id, kind, Jsonb(options), object_key))
    return job_id


def finish_job(connection, job_id, *, error=None, result=None):
    connection.execute("UPDATE jobs SET status=%s,progress=%s,error=%s,result=%s,input='{}',updated_at=now() WHERE id=%s",
                       ("failed" if error else "completed", 0 if error else 100, Jsonb(error), Jsonb(result), job_id))


def now():
    return datetime.now(timezone.utc)
