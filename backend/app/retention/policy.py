"""Pure retention date math and environment configuration.

The functions take an explicit `now` so tests and the sweeper never depend on
PostgreSQL `now()` or wall-clock time.
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

DEFAULT_PROFILE_DAYS = 365
DEFAULT_SESSION_DAYS = 365
DEFAULT_JOB_DAYS = 30
DEFAULT_STALE_JOB_HOURS = 2
DEFAULT_BATCH = 100


def _positive_int(name: str, default: int) -> int:
    try:
        value = int(os.getenv(name, str(default)))
    except ValueError:
        return default
    return value if value > 0 else default


def profile_days() -> int:
    return _positive_int("RETENTION_PROFILE_DAYS", DEFAULT_PROFILE_DAYS)


def session_days() -> int:
    return _positive_int("RETENTION_SESSION_DAYS", DEFAULT_SESSION_DAYS)


def job_days() -> int:
    return _positive_int("RETENTION_JOB_DAYS", DEFAULT_JOB_DAYS)


def stale_job_hours() -> int:
    return _positive_int("RETENTION_STALE_JOB_HOURS", DEFAULT_STALE_JOB_HOURS)


def batch_size() -> int:
    return _positive_int("RETENTION_BATCH", DEFAULT_BATCH)


def as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def profile_until(consent_until: datetime | None, now: datetime, *, days: int | None = None) -> datetime:
    if consent_until is not None:
        return as_utc(consent_until)
    return as_utc(now) + timedelta(days=days or profile_days())


def session_until(profile_retention: datetime | None, now: datetime, *, days: int | None = None) -> datetime:
    if profile_retention is not None:
        return as_utc(profile_retention)
    return as_utc(now) + timedelta(days=days or session_days())


def extend_until(current: datetime | None, recorded_at: datetime, *, days: int | None = None) -> datetime:
    candidate = as_utc(recorded_at) + timedelta(days=days or profile_days())
    if current is None:
        return candidate
    return max(as_utc(current), candidate)


def terminal_job_cutoff(now: datetime, *, days: int | None = None) -> datetime:
    return as_utc(now) - timedelta(days=days or job_days())


def stale_job_cutoff(now: datetime, *, hours: int | None = None) -> datetime:
    return as_utc(now) - timedelta(hours=hours or stale_job_hours())


def retry_at(now: datetime, attempts: int) -> datetime:
    """Exponential retry, capped at one hour; `attempts` is the new count."""
    minutes = min(2 ** min(max(attempts, 1), 6), 60)
    return as_utc(now) + timedelta(minutes=minutes)
