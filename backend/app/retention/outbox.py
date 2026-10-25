"""Database outbox for object-storage deletions.

Rows are written in the same transaction that removes their metadata. The
actual S3 call happens after that transaction commits, and failures stay queued
for the daily retention sweep. Only counts and error codes are logged.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from app.retention import policy

log = logging.getLogger(__name__)

ERROR_CODE = "E_S3_DELETE_FAILED"


def enqueue(connection, object_keys, *, now: datetime | None = None) -> int:
    keys = sorted({key for key in object_keys if key})
    now = policy.as_utc(now or datetime.now(timezone.utc))
    queued = 0
    for key in keys:
        queued += connection.execute(
            "INSERT INTO blob_deletions(object_key,next_attempt_at) VALUES (%s,%s)"
            " ON CONFLICT(object_key) DO NOTHING", (key, now)).rowcount
    return queued


def flush(*, now: datetime | None = None, limit: int | None = None, deleter=None) -> dict[str, int]:
    """Delete due objects and update attempts. Call only after metadata commit."""
    from app.review import media

    now = policy.as_utc(now or datetime.now(timezone.utc))
    limit = limit or policy.batch_size()
    delete = deleter or media.delete
    counts = {"blobsDeleted": 0, "blobsFailed": 0}
    from app.progress import db as progress_db

    with progress_db.connect() as connection, connection.transaction():
        rows = connection.execute(
            "SELECT object_key, attempts FROM blob_deletions"
            " WHERE next_attempt_at <= %s ORDER BY next_attempt_at, created_at"
            " LIMIT %s FOR UPDATE SKIP LOCKED", (now, limit)).fetchall()
        for row in rows:
            try:
                delete(row["object_key"])
            except Exception:
                attempts = row["attempts"] + 1
                connection.execute(
                    "UPDATE blob_deletions SET attempts=%s,next_attempt_at=%s,last_error_code=%s"
                    " WHERE object_key=%s",
                    (attempts, policy.retry_at(now, attempts), ERROR_CODE, row["object_key"]))
                counts["blobsFailed"] += 1
            else:
                connection.execute("DELETE FROM blob_deletions WHERE object_key=%s",
                                   (row["object_key"],))
                counts["blobsDeleted"] += 1
    return counts


def flush_quietly(**kwargs) -> dict[str, int]:
    """Best-effort post-commit cleanup; the outbox remains the source of truth."""
    try:
        return flush(**kwargs)
    except Exception as error:
        log.warning("Blob outbox flush deferred (%s)", type(error).__name__)
        return {"blobsDeleted": 0, "blobsFailed": 0}
