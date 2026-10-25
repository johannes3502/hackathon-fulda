"""Daily retention sweep: profiles, sessions, jobs, idempotency and blobs.

The sweep is intentionally boring: one advisory-locked run, explicit
timestamps, bounded batches, per-item savepoints and an audit row with counts
only. It never touches browser data and never deletes sessions when a profile
expires.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from uuid import uuid4

from psycopg.types.json import Jsonb

from app.progress import db as progress_db
from app.retention import outbox, policy
from app.review import db as review_db

log = logging.getLogger(__name__)
LOCK_KEY = "retention-sweep-v1"
STALE_JOB_ERROR = {
    "code": "E_JOB_STALE",
    "message": "Job was still queued or running past the retention limit and was marked failed.",
}


def _counts() -> dict[str, int]:
    return {
        "profilesDeleted": 0,
        "sessionsDeleted": 0,
        "takesDeleted": 0,
        "sessionsUnlinked": 0,
        "takesUnlinked": 0,
        "takeDataDeleted": 0,
        "jobsFailed": 0,
        "jobsDeleted": 0,
        "idempotencyDeleted": 0,
        "blobsQueued": 0,
        "blobsDeleted": 0,
        "blobsFailed": 0,
        "errors": 0,
    }


def _merge(target: dict[str, int], values: dict[str, int], mapping: dict[str, str]):
    for source, destination in mapping.items():
        target[destination] += values.get(source, 0)


def _sweep_profiles(connection, now, batch):
    counts = _counts()
    with connection.transaction():
        rows = connection.execute(
            "SELECT id FROM speaker_profiles"
            " WHERE retention_until IS NOT NULL AND retention_until <= %s"
            " ORDER BY retention_until, id LIMIT %s FOR UPDATE SKIP LOCKED",
            (now, batch)).fetchall()
        for row in rows:
            try:
                with connection.transaction():
                    result = progress_db.delete_profile(connection, row["id"], delete_sessions=False,
                                                        now=now)
            except Exception:
                counts["errors"] += 1
                continue
            if not result["deleted"]:
                continue
            counts["profilesDeleted"] += 1
            _merge(counts, result, {
                "sessionsUnlinked": "sessionsUnlinked",
                "takesUnlinked": "takesUnlinked",
                "takeDataDeleted": "takeDataDeleted",
                "blobsQueued": "blobsQueued",
            })
    return counts


def _sweep_sessions(connection, now, batch):
    counts = _counts()
    with connection.transaction():
        rows = connection.execute(
            "SELECT id FROM sessions"
            " WHERE retention_until IS NOT NULL AND retention_until <= %s"
            " ORDER BY retention_until, id LIMIT %s FOR UPDATE SKIP LOCKED",
            (now, batch)).fetchall()
        for row in rows:
            try:
                with connection.transaction():
                    result = review_db.delete_session_rows(connection, row["id"], now=now)
            except Exception:
                counts["errors"] += 1
                continue
            if not result["deleted"]:
                continue
            counts["sessionsDeleted"] += result["sessions"]
            counts["takesDeleted"] += result["takes"]
            counts["blobsQueued"] += result["blobsQueued"]
    return counts


def _queue_job_keys(connection, rows, now):
    return outbox.enqueue(connection, (row["object_key"] for row in rows), now=now)


def _sweep_stale_jobs(connection, now, batch):
    counts = _counts()
    cutoff = policy.stale_job_cutoff(now)
    with connection.transaction():
        rows = connection.execute(
            "SELECT id, object_key FROM jobs"
            " WHERE status IN ('queued','running') AND updated_at <= %s"
            " ORDER BY updated_at, id LIMIT %s FOR UPDATE SKIP LOCKED",
            (cutoff, batch)).fetchall()
        for row in rows:
            try:
                with connection.transaction():
                    counts["blobsQueued"] += _queue_job_keys(connection, [row], now)
                    changed = connection.execute(
                        "UPDATE jobs SET status='failed',progress=0,error=%s,input='{}',result=NULL,"
                        "object_key=NULL,updated_at=%s WHERE id=%s"
                        " AND status IN ('queued','running')",
                        (Jsonb(STALE_JOB_ERROR), now, row["id"])).rowcount
            except Exception:
                counts["errors"] += 1
                continue
            counts["jobsFailed"] += changed
    return counts


def _sweep_terminal_jobs(connection, now, batch):
    counts = _counts()
    cutoff = policy.terminal_job_cutoff(now)
    with connection.transaction():
        rows = connection.execute(
            "SELECT id, object_key FROM jobs"
            " WHERE status IN ('completed','failed') AND updated_at <= %s"
            " ORDER BY updated_at, id LIMIT %s FOR UPDATE SKIP LOCKED",
            (cutoff, batch)).fetchall()
        for row in rows:
            try:
                with connection.transaction():
                    counts["blobsQueued"] += _queue_job_keys(connection, [row], now)
                    deleted = connection.execute("DELETE FROM jobs WHERE id=%s", (row["id"],)).rowcount
            except Exception:
                counts["errors"] += 1
                continue
            counts["jobsDeleted"] += deleted
    return counts


def _sweep_idempotency(connection, now):
    counts = _counts()
    with connection.transaction():
        counts["idempotencyDeleted"] += connection.execute(
            "DELETE FROM profile_idempotency WHERE expires_at <= %s", (now,)).rowcount
        counts["idempotencyDeleted"] += connection.execute(
            "DELETE FROM review_idempotency WHERE expires_at <= %s", (now,)).rowcount
    return counts


CATEGORIES = (
    ("profiles", _sweep_profiles),
    ("sessions", _sweep_sessions),
    ("staleJobs", _sweep_stale_jobs),
    ("terminalJobs", _sweep_terminal_jobs),
    ("idempotency", _sweep_idempotency),
)


def _preview(connection, now, batch):
    counts = _counts()
    with connection.transaction():
        counts["profilesDeleted"] = connection.execute(
            "SELECT count(*) AS n FROM speaker_profiles"
            " WHERE retention_until IS NOT NULL AND retention_until <= %s", (now,)).fetchone()["n"]
        counts["sessionsDeleted"] = connection.execute(
            "SELECT count(*) AS n FROM sessions"
            " WHERE retention_until IS NOT NULL AND retention_until <= %s", (now,)).fetchone()["n"]
        counts["jobsFailed"] = connection.execute(
            "SELECT count(*) AS n FROM jobs WHERE status IN ('queued','running')"
            " AND updated_at <= %s", (policy.stale_job_cutoff(now),)).fetchone()["n"]
        counts["jobsDeleted"] = connection.execute(
            "SELECT count(*) AS n FROM jobs WHERE status IN ('completed','failed')"
            " AND updated_at <= %s", (policy.terminal_job_cutoff(now),)).fetchone()["n"]
        counts["idempotencyDeleted"] = connection.execute(
            "SELECT count(*) AS n FROM profile_idempotency WHERE expires_at <= %s",
            (now,)).fetchone()["n"] + connection.execute(
            "SELECT count(*) AS n FROM review_idempotency WHERE expires_at <= %s",
            (now,)).fetchone()["n"]
        counts["blobsDeleted"] = connection.execute(
            "SELECT count(*) AS n FROM blob_deletions WHERE next_attempt_at <= %s",
            (now,)).fetchone()["n"]
        # The dry-run total is bounded by the same batch as the real sweep.
        for key in ("profilesDeleted", "sessionsDeleted", "jobsFailed", "jobsDeleted", "blobsDeleted"):
            counts[key] = min(counts[key], batch)
    return counts


def _record_run(connection, run_id, now, status, counts, error_code=None):
    connection.execute(
        "INSERT INTO retention_runs(id,started_at,finished_at,status,counts,error_code)"
        " VALUES (%s,%s,%s,%s,%s,%s)",
        (run_id, now, now, status, Jsonb(counts), error_code))


def _finish_run(connection, run_id, now, status, counts, error_code):
    connection.execute(
        "UPDATE retention_runs SET finished_at=%s,status=%s,counts=%s,error_code=%s"
        " WHERE id=%s", (now, status, Jsonb(counts), error_code, run_id))


def sweep(now: datetime | None = None, dry_run: bool = False, batch: int | None = None) -> dict:
    now = policy.as_utc(now or datetime.now(timezone.utc))
    batch = batch or policy.batch_size()
    run_id = uuid4()
    with progress_db.connect() as connection:
        locked = connection.execute(
            "SELECT pg_try_advisory_lock(hashtext(%s)) AS locked", (LOCK_KEY,)).fetchone()["locked"]
        connection.commit()
        if not locked:
            if not dry_run:
                with connection.transaction():
                    _record_run(connection, run_id, now, "skipped",
                                {"reason": "advisory-lock-busy"}, None)
            log.info("Retention sweep skipped: another sweep holds the lock")
            return {"runId": str(run_id), "status": "skipped", "counts": {"reason": "advisory-lock-busy"}}
        counts = _counts()
        try:
            if dry_run:
                with connection.transaction():
                    preview = _preview(connection, now, batch)
                return {"runId": None, "status": "dry-run", "counts": preview}
            with connection.transaction():
                _record_run(connection, run_id, now, "running", _counts(), None)
            for name, operation in CATEGORIES:
                try:
                    result = operation(connection, now, batch) if name not in {"idempotency"} \
                        else operation(connection, now)
                except Exception as error:
                    log.warning(
                        "Retention sweep run=%s category=%s failed (%s)",
                        run_id, name, type(error).__name__)
                    connection.rollback()
                    counts["errors"] += 1
                    continue
                for key, value in result.items():
                    counts[key] += value
            try:
                flushed = outbox.flush(now=now)
            except Exception as error:
                log.warning("Retention sweep run=%s blob flush failed (%s)",
                            run_id, type(error).__name__)
                connection.rollback()
                flushed = {"blobsDeleted": 0, "blobsFailed": 0}
                counts["errors"] += 1
            counts["blobsDeleted"] += flushed["blobsDeleted"]
            counts["blobsFailed"] += flushed["blobsFailed"]
            error_code = "E_PARTIAL" if counts["errors"] else None
            with connection.transaction():
                _finish_run(connection, run_id, now, "completed", counts, error_code)
            log.info("Retention sweep run=%s status=completed profiles=%s sessions=%s"
                     " jobs_failed=%s jobs_deleted=%s blobs_deleted=%s errors=%s",
                     run_id, counts["profilesDeleted"], counts["sessionsDeleted"],
                     counts["jobsFailed"], counts["jobsDeleted"], counts["blobsDeleted"],
                     counts["errors"])
            return {"runId": str(run_id), "status": "completed", "counts": counts}
        except Exception as error:
            connection.rollback()
            try:
                with connection.transaction():
                    _finish_run(connection, run_id, now, "failed", _counts(), "E_SWEEP_FAILED")
            except Exception:
                connection.rollback()
            log.warning("Retention sweep run=%s failed (%s)", run_id, type(error).__name__)
            return {"runId": str(run_id), "status": "failed",
                    "counts": _counts(), "errorCode": "E_SWEEP_FAILED"}
        finally:
            connection.execute("SELECT pg_advisory_unlock(hashtext(%s))", (LOCK_KEY,))
            connection.commit()
