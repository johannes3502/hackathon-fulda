"""Retention tests: pure date math plus synthetic PostgreSQL integration."""

from __future__ import annotations

import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from psycopg.types.json import Jsonb

from app.main import app
from app.progress import db as progress_db
from app.retention import outbox, policy, service
from app.retention.service import sweep

DB = pytest.mark.skipif(not os.getenv("POSTGRES_HOST"), reason="Needs PostgreSQL (docker compose)")
NOW = datetime(2026, 10, 25, 2, 0, tzinfo=timezone.utc)


def profile_body(name="Synthetisches Retention-Profil", retention=None):
    consent = {"granted": True, "at": NOW.isoformat(), "version": "retention-test",
               "scope": "long-term-progress"}
    if retention is not None:
        consent["retentionUntil"] = retention.isoformat()
    return {"displayName": name, "locale": "de", "consent": consent}


def create_profile(client, *, name="Synthetisches Retention-Profil", retention=None):
    response = client.post("/profiles", json=profile_body(name, retention),
                           headers={"Idempotency-Key": str(uuid4())})
    assert response.status_code == 201, response.text
    body = response.json()
    return body["token"], UUID(body["profile"]["profileId"])


def linked_session(client, token, profile_id, *, title="Synthetische Retention-Session"):
    response = client.post("/sessions", json={
        "title": title, "profileId": str(profile_id), "presentationMode": "startup",
        "capture": {"deviceKey": str(uuid4())},
        "consent": {"granted": True, "at": NOW.isoformat(), "version": "test",
                    "scope": "local-analysis"},
    }, headers={"Idempotency-Key": str(uuid4()), "X-Profile-Token": token})
    assert response.status_code == 201, response.text
    return UUID(response.json()["session"]["sessionId"])


def anonymous_session(client, title="Synthetische Retention-Session ohne Profil"):
    response = client.post("/sessions", json={
        "title": title,
        "consent": {"granted": True, "at": NOW.isoformat(), "version": "test",
                    "scope": "local-analysis"},
    }, headers={"Idempotency-Key": str(uuid4())})
    assert response.status_code == 201, response.text
    return UUID(response.json()["session"]["sessionId"])


def create_take(client, token, session_id, recorded_at, *, duration_ms=60_000):
    response = client.post(f"/sessions/{session_id}/takes", json={
        "durationMs": duration_ms, "mimeType": "video/webm",
        "recordedAt": recorded_at.isoformat(),
        "timebase": {"onstartPerfMs": 1},
        "coverage": [{"tMs": 0, "durationMs": duration_ms, "evaluable": True}],
    }, headers={"Idempotency-Key": str(uuid4()), "X-Profile-Token": token})
    assert response.status_code == 201, response.text
    return UUID(response.json()["take"]["takeId"])


def pose_event(duration_ms=30_000):
    return {
        "eventId": "retention:pose:1", "tMs": 0, "peakMs": 0, "durationMs": duration_ms,
        "type": "posture", "severity": "hint", "source": "browser", "stage": "final",
        "payload": {
            "schema": "pose.event.v1", "category": "posture", "kind": "trunk-lateral",
            "metric": {"metricId": "trunkLean", "valueAtPeak": 14.2, "baseline": 2.1,
                       "delta": 12.1, "unit": "deg"},
            "rule": {"ruleId": "R1", "version": 7, "evidence": "C", "confidence": "medium",
                     "thresholdsStatus": "heuristic-unvalidated"},
            "evidence": {"sampleCount": 20, "validRatio": 0.96},
            "message": {"key": "posture.trunk-lateral", "params": {"deltaDeg": 12.1}},
        },
    }


def add_event(client, take_id, token=None):
    headers = {"Idempotency-Key": str(uuid4())}
    if token:
        headers["X-Profile-Token"] = token
    response = client.post(f"/takes/{take_id}/events", json={"events": [pose_event()]},
                           headers=headers)
    assert response.status_code == 200, response.text
    assert response.json()["accepted"] == 1


def clean_session(client, session_id):
    assert client.delete(f"/sessions/{session_id}").status_code == 204


def test_date_math_and_environment(monkeypatch):
    assert policy.profile_until(None, NOW) == NOW + timedelta(days=365)
    explicit = NOW + timedelta(days=3)
    assert policy.profile_until(explicit, NOW) == explicit
    assert policy.session_until(None, NOW) == NOW + timedelta(days=365)
    assert policy.session_until(explicit, NOW) == explicit
    assert policy.extend_until(None, NOW) == NOW + timedelta(days=365)
    assert policy.extend_until(NOW + timedelta(days=400), NOW) == NOW + timedelta(days=400)
    assert policy.terminal_job_cutoff(NOW) == NOW - timedelta(days=30)
    assert policy.stale_job_cutoff(NOW) == NOW - timedelta(hours=2)
    assert policy.retry_at(NOW, 1) == NOW + timedelta(minutes=2)
    assert policy.retry_at(NOW, 99) == NOW + timedelta(minutes=60)

    monkeypatch.setenv("RETENTION_PROFILE_DAYS", "30")
    monkeypatch.setenv("RETENTION_SESSION_DAYS", "10")
    monkeypatch.setenv("RETENTION_JOB_DAYS", "7")
    monkeypatch.setenv("RETENTION_STALE_JOB_HOURS", "3")
    monkeypatch.setenv("RETENTION_BATCH", "25")
    assert policy.profile_until(None, NOW) == NOW + timedelta(days=30)
    assert policy.session_until(None, NOW) == NOW + timedelta(days=10)
    assert policy.terminal_job_cutoff(NOW) == NOW - timedelta(days=7)
    assert policy.stale_job_cutoff(NOW) == NOW - timedelta(hours=3)
    assert policy.batch_size() == 25

    monkeypatch.setenv("RETENTION_BATCH", "invalid")
    assert policy.batch_size() == policy.DEFAULT_BATCH


def test_celery_beat_and_compose_have_a_single_scheduler():
    from app.celery_app import celery_app
    from app.tasks import retention_sweep

    schedule = celery_app.conf.beat_schedule["retention-sweep"]
    assert schedule["task"] == "app.tasks.retention_sweep"
    assert schedule["schedule"].hour == {3} and schedule["schedule"].minute == {15}
    assert celery_app.conf.timezone == "UTC" and celery_app.conf.enable_utc is True
    assert retention_sweep.acks_late is True
    assert retention_sweep.max_retries == 3
    assert retention_sweep.expires == 3600
    assert retention_sweep.soft_time_limit == 240 and retention_sweep.time_limit == 300

    compose_path = Path(__file__).resolve().parents[2] / "compose.yaml"
    if not compose_path.exists():
        pytest.skip("compose.yaml is outside the test mount")
    compose = compose_path.read_text(encoding="utf-8")
    assert "\n  beat:" in compose
    assert 'beat", "--loglevel=info"' in compose
    assert '"-B"' not in compose
    for variable in ("RETENTION_PROFILE_DAYS", "RETENTION_SESSION_DAYS", "RETENTION_JOB_DAYS",
                     "RETENTION_STALE_JOB_HOURS", "RETENTION_BATCH"):
        assert variable in compose


@DB
def test_profile_creation_sets_origin_and_extends_only_default_profiles():
    client = TestClient(app)
    token, profile_id = create_profile(
        client, retention=datetime.now(timezone.utc) + timedelta(days=10))
    session_id = linked_session(client, token, profile_id)
    with progress_db.connect() as connection:
        row = connection.execute(
            "SELECT retention_origin, retention_until FROM speaker_profiles WHERE id=%s",
            (profile_id,)).fetchone()
        assert row["retention_origin"] == "user"
        before = row["retention_until"]
    create_take(client, token, session_id, datetime.now(timezone.utc) + timedelta(minutes=2))
    with progress_db.connect() as connection:
        row = connection.execute(
            "SELECT retention_origin, retention_until FROM speaker_profiles WHERE id=%s",
            (profile_id,)).fetchone()
        assert row["retention_origin"] == "user"
        assert row["retention_until"] == before
    assert client.delete(f"/profiles/{profile_id}?deleteSessions=true",
                         headers={"X-Profile-Token": token,
                                  "Idempotency-Key": str(uuid4())}).status_code == 204

    token, profile_id = create_profile(client)
    session_id = linked_session(client, token, profile_id)
    with progress_db.connect() as connection:
        row = connection.execute(
            "SELECT retention_origin, retention_until FROM speaker_profiles WHERE id=%s",
            (profile_id,)).fetchone()
        assert row["retention_origin"] == "default"
        before = row["retention_until"]
    recorded = datetime.now(timezone.utc) + timedelta(minutes=2)
    create_take(client, token, session_id, recorded)
    with progress_db.connect() as connection:
        row = connection.execute(
            "SELECT retention_until FROM speaker_profiles WHERE id=%s",
            (profile_id,)).fetchone()
        assert row["retention_until"] >= recorded + timedelta(days=365)
        assert row["retention_until"] > before
    profile = client.get(f"/profiles/{profile_id}", headers={"X-Profile-Token": token}).json()["profile"]
    assert profile["consent"]["retentionUntil"] is not None
    assert client.delete(f"/profiles/{profile_id}?deleteSessions=true",
                         headers={"X-Profile-Token": token,
                                  "Idempotency-Key": str(uuid4())}).status_code == 204


@DB
def test_sweep_expires_profile_but_keeps_linked_session_take_and_events(caplog):
    client = TestClient(app)
    display_name = f"Synthetisch Retention {uuid4()}"
    token, profile_id = create_profile(client, name=display_name)
    session_id = linked_session(client, token, profile_id, title=f"Synthetisch {uuid4()}")
    take_id = create_take(client, token, session_id, datetime.now(timezone.utc))
    add_event(client, take_id, token)
    assert client.put(f"/profiles/{profile_id}/goals/pose.posture_share",
                      json={"direction": "decrease", "targetValue": 0.3},
                      headers={"Idempotency-Key": str(uuid4()),
                               "X-Profile-Token": token}).status_code == 200
    assert client.get(f"/profiles/{profile_id}/progress",
                      params={"window": "all"},
                      headers={"X-Profile-Token": token}).status_code == 200
    now = datetime.now(timezone.utc)
    expired = now - timedelta(seconds=1)
    with progress_db.connect() as connection, connection.transaction():
        connection.execute("UPDATE speaker_profiles SET retention_until=%s WHERE id=%s",
                           (expired, profile_id))
        connection.execute("UPDATE sessions SET retention_until=%s WHERE id=%s",
                           (now + timedelta(days=30), session_id))
        connection.execute(
            "INSERT INTO progress_runs(id,profile_id,status) VALUES (%s,%s,'queued')",
            (uuid4(), profile_id))
        connection.execute(
            "INSERT INTO progress_change_points(id,profile_id,metric_id,metric_version,take_id,"
            "change_started_at_take_id,kind,confidence,evidence_take_ids,algorithm_version)"
            " VALUES (%s,%s,'pose.posture_share',1,%s,%s,'step_up','low',%s,'test')",
            (uuid4(), profile_id, take_id, take_id, [take_id]))
        assert connection.execute("SELECT count(*) AS n FROM take_metrics WHERE take_id=%s",
                                  (take_id,)).fetchone()["n"] > 0
        assert connection.execute("SELECT count(*) AS n FROM take_quality WHERE take_id=%s",
                                  (take_id,)).fetchone()["n"] == 1
        assert connection.execute("SELECT count(*) AS n FROM progress_snapshots WHERE profile_id=%s",
                                  (profile_id,)).fetchone()["n"] > 0

    expired_read = client.get(f"/profiles/{profile_id}",
                              headers={"X-Profile-Token": token})
    assert expired_read.status_code == 410
    caplog.set_level("INFO")
    result = sweep(now=now, batch=100)
    assert result["status"] == "completed", result
    assert result["counts"]["profilesDeleted"] >= 1
    with progress_db.connect() as connection:
        assert connection.execute("SELECT id FROM speaker_profiles WHERE id=%s",
                                  (profile_id,)).fetchone() is None
        session = connection.execute("SELECT profile_id, retention_until FROM sessions WHERE id=%s",
                                     (session_id,)).fetchone()
        take = connection.execute("SELECT profile_id FROM takes WHERE id=%s", (take_id,)).fetchone()
        assert session is not None and session["profile_id"] is None
        assert take is not None and take["profile_id"] is None
        assert connection.execute("SELECT count(*) AS n FROM events WHERE take_id=%s",
                                  (take_id,)).fetchone()["n"] == 1
        for table, condition in (("take_quality", "take_id"), ("take_metrics", "take_id"),
                                 ("progress_snapshots", "profile_id"),
                                 ("progress_change_points", "profile_id"),
                                 ("profile_goals", "profile_id"),
                                 ("progress_runs", "profile_id"),
                                 ("profile_tokens", "profile_id"),
                                 ("profile_idempotency", "profile_id")):
            assert connection.execute(
                f"SELECT count(*) AS n FROM {table} WHERE {condition}=%s",
                (take_id if condition == "take_id" else profile_id,)).fetchone()["n"] == 0
        run = connection.execute("SELECT status, counts, error_code FROM retention_runs WHERE id=%s",
                                 (result["runId"],)).fetchone()
        assert run["status"] == "completed" and run["error_code"] is None
        assert set(run["counts"]).issubset(set(service._counts()))
        assert str(profile_id) not in json.dumps(run["counts"])
        assert display_name not in json.dumps(run["counts"])
    assert display_name not in caplog.text

    second = sweep(now=now, batch=1)
    assert second["status"] == "completed"
    assert second["counts"]["profilesDeleted"] == 0
    clean_session(client, session_id)


@DB
def test_full_profile_delete_removes_sessions_takes_events_and_queues_blobs(monkeypatch):
    client = TestClient(app)
    token, profile_id = create_profile(client)
    session_id = linked_session(client, token, profile_id)
    take_id = create_take(client, token, session_id, datetime.now(timezone.utc))
    add_event(client, take_id, token)
    assert client.get(f"/profiles/{profile_id}/progress",
                      headers={"X-Profile-Token": token}).status_code == 200
    key = f"review-audio/{session_id}/{take_id}/{uuid4()}/upload"
    with progress_db.connect() as connection, connection.transaction():
        connection.execute(
            "INSERT INTO jobs(id,take_id,kind,status,progress,input,object_key)"
            " VALUES (%s,%s,'audio_analyze','failed',0,%s,%s)",
            (uuid4(), take_id, Jsonb({}), key))
    deleted = []
    monkeypatch.setattr("app.review.media.delete", lambda object_key: deleted.append(object_key))
    response = client.delete(f"/profiles/{profile_id}?deleteSessions=true",
                             headers={"X-Profile-Token": token,
                                      "Idempotency-Key": str(uuid4())})
    assert response.status_code == 204, response.text
    assert client.get(f"/sessions/{session_id}").status_code == 404
    assert client.get(f"/takes/{take_id}").status_code == 404
    assert key in deleted
    with progress_db.connect() as connection:
        assert connection.execute("SELECT id FROM speaker_profiles WHERE id=%s",
                                  (profile_id,)).fetchone() is None
        assert connection.execute("SELECT count(*) AS n FROM sessions WHERE id=%s",
                                  (session_id,)).fetchone()["n"] == 0
        assert connection.execute("SELECT count(*) AS n FROM events WHERE take_id=%s",
                                  (take_id,)).fetchone()["n"] == 0
        assert connection.execute("SELECT count(*) AS n FROM blob_deletions WHERE object_key=%s",
                                  (key,)).fetchone()["n"] == 0


@DB
def test_session_delete_keeps_s3_failure_in_the_retry_outbox(monkeypatch):
    from app.review import media, service as review_service
    client = TestClient(app)
    session_id = anonymous_session(client)
    response = client.post(f"/sessions/{session_id}/takes", json={
        "durationMs": 10_000, "mimeType": "video/webm", "timebase": {"onstartPerfMs": 1}},
        headers={"Idempotency-Key": str(uuid4())})
    assert response.status_code == 201, response.text
    take_id = UUID(response.json()["take"]["takeId"])
    key = f"review-audio/{session_id}/{take_id}/{uuid4()}/upload"
    with progress_db.connect() as connection, connection.transaction():
        connection.execute(
            "INSERT INTO jobs(id,take_id,kind,status,progress,input,object_key)"
            " VALUES (%s,%s,'audio_analyze','failed',0,%s,%s)",
            (uuid4(), take_id, Jsonb({}), key))
    original = media.delete

    def unavailable(object_key):
        raise RuntimeError("Synthetic storage failure")

    monkeypatch.setattr(media, "delete", unavailable)
    assert client.delete(f"/sessions/{session_id}").status_code == 204
    with progress_db.connect() as connection:
        row = connection.execute(
            "SELECT attempts,last_error_code FROM blob_deletions WHERE object_key=%s",
            (key,)).fetchone()
        assert row["attempts"] == 1 and row["last_error_code"] == outbox.ERROR_CODE
        assert connection.execute("SELECT id FROM sessions WHERE id=%s",
                                  (session_id,)).fetchone() is None
    monkeypatch.setattr(media, "delete", original)
    flushed = outbox.flush(now=datetime.now(timezone.utc) + timedelta(hours=2))
    assert flushed == {"blobsDeleted": 1, "blobsFailed": 0}
    with progress_db.connect() as connection:
        assert connection.execute("SELECT count(*) AS n FROM blob_deletions WHERE object_key=%s",
                                  (key,)).fetchone()["n"] == 0


@DB
def test_stale_and_terminal_jobs_and_expired_idempotency_are_cleaned():
    client = TestClient(app)
    session_id = anonymous_session(client)
    take_id = create_take(client, "", session_id, datetime.now(timezone.utc))
    now = datetime.now(timezone.utc)
    stale_id, recent_id, terminal_id = uuid4(), uuid4(), uuid4()
    stale_key = f"review-audio/{session_id}/{take_id}/{stale_id}/upload"
    with progress_db.connect() as connection, connection.transaction():
        connection.execute(
            "INSERT INTO jobs(id,take_id,kind,status,progress,input,object_key,updated_at)"
            " VALUES (%s,%s,'audio_analyze','queued',0,%s,%s,%s)",
            (stale_id, take_id, Jsonb({"private": "synthetic"}), stale_key,
             now - timedelta(hours=3)))
        connection.execute(
            "INSERT INTO jobs(id,take_id,kind,status,progress,input,updated_at)"
            " VALUES (%s,%s,'review_generate','queued',0,%s,%s)",
            (recent_id, take_id, Jsonb({}), now))
        connection.execute(
            "INSERT INTO jobs(id,take_id,kind,status,progress,input,updated_at)"
            " VALUES (%s,%s,'factcheck','completed',100,%s,%s)",
            (terminal_id, take_id, Jsonb({}), now - timedelta(days=31)))
        connection.execute(
            "INSERT INTO profile_idempotency(scope,key,request_hash,status,response,expires_at)"
            " VALUES ('synthetic',%s,'hash',204,'{}',%s)",
            (str(uuid4()), now - timedelta(hours=1)))
        connection.execute(
            "INSERT INTO review_idempotency(scope,key,request_hash,session_id,status,response,expires_at)"
            " VALUES ('synthetic',%s,'hash',%s,204,'{}',%s)",
            (str(uuid4()), session_id, now - timedelta(hours=1)))
    result = sweep(now=now, batch=100)
    assert result["status"] == "completed", result
    with progress_db.connect() as connection:
        stale = connection.execute(
            "SELECT status,error,input,object_key FROM jobs WHERE id=%s", (stale_id,)).fetchone()
        assert stale["status"] == "failed" and stale["error"]["code"] == "E_JOB_STALE"
        assert stale["input"] == {} and stale["object_key"] is None
        assert connection.execute("SELECT status FROM jobs WHERE id=%s",
                                  (recent_id,)).fetchone()["status"] == "queued"
        assert connection.execute("SELECT id FROM jobs WHERE id=%s",
                                  (terminal_id,)).fetchone() is None
        assert connection.execute("SELECT count(*) AS n FROM profile_idempotency WHERE key IS NOT NULL"
                                  " AND expires_at <= %s", (now,)).fetchone()["n"] == 0
        assert connection.execute("SELECT count(*) AS n FROM review_idempotency WHERE expires_at <= %s",
                                  (now,)).fetchone()["n"] == 0
        assert connection.execute("SELECT count(*) AS n FROM blob_deletions WHERE object_key=%s",
                                  (stale_key,)).fetchone()["n"] == 0
    client.delete(f"/sessions/{session_id}")


@DB
def test_advisory_lock_prevents_overlapping_sweeps():
    now = datetime.now(timezone.utc)
    with progress_db.connect() as lock_connection:
        assert lock_connection.execute(
            "SELECT pg_try_advisory_lock(hashtext(%s)) AS locked",
            (service.LOCK_KEY,)).fetchone()["locked"] is True
        result = sweep(now=now)
        assert result["status"] == "skipped"
        assert result["counts"] == {"reason": "advisory-lock-busy"}
        lock_connection.execute("SELECT pg_advisory_unlock(hashtext(%s))", (service.LOCK_KEY,))
        lock_connection.commit()
