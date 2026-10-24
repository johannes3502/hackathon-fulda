"""Synthetic tests for long-term progress. No human accuracy labels."""

from datetime import datetime, timedelta, timezone
import os
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.progress import db, jobs

pytestmark = pytest.mark.skipif(not os.getenv("POSTGRES_HOST"), reason="Needs PostgreSQL (docker compose)")


def pose_event(index, duration_ms, *, kind="trunk-lateral", valid=0.96, rule_version=7):
    return {
        "eventId": f"progress:pose:{index}",
        "tMs": 0,
        "peakMs": 0,
        "durationMs": duration_ms,
        "type": "posture" if kind == "trunk-lateral" else "head",
        "severity": "hint",
        "source": "browser",
        "stage": "final",
        "payload": {
            "schema": "pose.event.v1",
            "category": "posture" if kind == "trunk-lateral" else "head",
            "kind": kind,
            "metric": {"metricId": "trunkLean", "valueAtPeak": 14.2, "baseline": 2.1,
                       "delta": 12.1, "unit": "deg"},
            "rule": {"ruleId": "R1", "version": rule_version, "evidence": "C", "confidence": "medium",
                     "thresholdsStatus": "heuristic-unvalidated"},
            "evidence": {"sampleCount": 20, "validRatio": valid},
            "message": {"key": "posture.trunk-lateral", "params": {"deltaDeg": 12.1}},
        },
    }


def profile_body():
    return {
        "displayName": "Synthetisches Fortschrittsprofil",
        "locale": "de",
        "consent": {"granted": True, "at": datetime.now(timezone.utc).isoformat(),
                    "version": "test", "scope": "long-term-progress"},
    }


@pytest.fixture
def profile(monkeypatch):
    from app.progress import router
    from app.review import router as review_router
    async def enqueue(*args):
        return "synthetic-publish"
    monkeypatch.setattr(router, "enqueue_task", enqueue)
    monkeypatch.setattr(review_router, "enqueue_task", enqueue)
    client = TestClient(app)
    response = client.post("/profiles", json=profile_body(),
                           headers={"Idempotency-Key": str(uuid4())})
    assert response.status_code == 201, response.text
    body = response.json()
    token, profile_id = body["token"], UUID(body["profile"]["profileId"])
    client.headers["X-Profile-Token"] = token
    yield client, token, profile_id
    client.delete(f"/profiles/{profile_id}", headers={
        "X-Profile-Token": token, "Idempotency-Key": str(uuid4())})
    # Deleting a profile deliberately leaves its sessions under their own consent.
    with db.connect() as connection:
        sessions = connection.execute("SELECT id FROM sessions WHERE title='Synthetische Progress-Session'"
                                      " AND profile_id IS NULL").fetchall()
    for row in sessions:
        client.delete(f"/sessions/{row['id']}")


def linked_session(client, token, profile_id, *, presentation_mode="startup", device_key=None):
    response = client.post("/sessions", json={
        "title": "Synthetische Progress-Session",
        "profileId": str(profile_id),
        "presentationMode": presentation_mode,
        "capture": {"deviceKey": str(device_key or uuid4())},
        "consent": {"granted": True, "at": datetime.now(timezone.utc).isoformat(),
                    "version": "test", "scope": "local-analysis"},
    }, headers={"Idempotency-Key": str(uuid4()), "X-Profile-Token": token})
    assert response.status_code == 201, response.text
    return UUID(response.json()["session"]["sessionId"])


def create_take(client, token, session_id, recorded_at, *, coverage_ms=60_000):
    response = client.post(f"/sessions/{session_id}/takes", json={
        "durationMs": 60_000, "mimeType": "video/webm",
        "recordedAt": recorded_at.isoformat(),
        "timebase": {"onstartPerfMs": 1},
        "coverage": [{"tMs": 0, "durationMs": coverage_ms, "evaluable": True}],
    }, headers={"Idempotency-Key": str(uuid4()), "X-Profile-Token": token})
    assert response.status_code == 201, response.text
    return UUID(response.json()["take"]["takeId"])


def add_event(client, take_id, index, duration_ms, **kwargs):
    response = client.post(f"/takes/{take_id}/events",
                           json={"events": [pose_event(index, duration_ms, **kwargs)]},
                           headers={"Idempotency-Key": str(uuid4())})
    assert response.status_code == 200, response.text
    assert response.json()["accepted"] == 1


def test_profile_creation_retry_does_not_reveal_the_token_again():
    client = TestClient(app)
    key = str(uuid4())
    body = profile_body()
    first = client.post("/profiles", json=body, headers={"Idempotency-Key": key})
    assert first.status_code == 201 and first.json()["token"].startswith("pp_")
    second = client.post("/profiles", json=body, headers={"Idempotency-Key": key})
    assert second.status_code == 200
    assert second.json()["token"] is None and second.json()["tokenIssued"] is False
    profile_id = first.json()["profile"]["profileId"]
    client.delete(f"/profiles/{profile_id}", headers={
        "X-Profile-Token": first.json()["token"], "Idempotency-Key": str(uuid4())})


def test_profile_token_idempotency_and_goal_progress(profile):
    client, token, profile_id = profile
    session_id = linked_session(client, token, profile_id)
    start = datetime.now(timezone.utc) - timedelta(days=20)
    for index in range(20):
        take_id = create_take(client, token, session_id, start + timedelta(days=index))
        add_event(client, take_id, index, int(60_000 * (0.6 - 0.02 * index)))

    response = client.get(f"/profiles/{profile_id}/progress", params={
        "metrics": "pose.posture_share", "window": "all"},
        headers={"X-Profile-Token": token})
    assert response.status_code == 200, response.text
    series = response.json()["series"][0]
    assert series["metricId"] == "pose.posture_share"
    assert len(series["points"]) == 20
    assert series["quality"]["eligiblePoints"] == 20
    assert series["trend"]["status"] == "trend_down"
    assert series["changePoints"] == []
    assert all(point["eligible"] for point in series["points"])
    assert "overallScore" not in response.text

    filtered = client.get(f"/profiles/{profile_id}/progress", params={
        "metrics": "pose.posture_share", "window": "last_5",
        "presentationMode": "startup"},
        headers={"X-Profile-Token": token})
    assert filtered.status_code == 200, filtered.text
    assert [point["sequence"] for point in filtered.json()["series"][0]["points"]] == [16, 17, 18, 19, 20]

    goal = client.put(f"/profiles/{profile_id}/goals/pose.posture_share", json={
        "direction": "decrease", "targetValue": 0.3},
        headers={"Idempotency-Key": str(uuid4()), "X-Profile-Token": token})
    assert goal.status_code == 200, goal.text
    response = client.get(f"/profiles/{profile_id}/progress", params={
        "metrics": "pose.posture_share", "window": "all"},
        headers={"X-Profile-Token": token})
    assert response.json()["series"][0]["goalStatus"] == "on_track"


def test_excluded_point_stays_visible_and_delete_unlinks_session(profile):
    client, token, profile_id = profile
    session_id = linked_session(client, token, profile_id)
    good = create_take(client, token, session_id, datetime.now(timezone.utc) - timedelta(days=2))
    add_event(client, good, 1, 30_000)
    bad = create_take(client, token, session_id, datetime.now(timezone.utc) - timedelta(days=1),
                      coverage_ms=1_000)
    add_event(client, bad, 2, 30_000)

    response = client.get(f"/profiles/{profile_id}/progress", params={
        "metrics": "pose.posture_share", "window": "all"},
        headers={"X-Profile-Token": token})
    assert response.status_code == 200, response.text
    points = response.json()["series"][0]["points"]
    assert len(points) == 2
    assert points[1]["eligible"] is False
    assert "pose-coverage-low" in points[1]["exclusionReasons"]

    deleted = client.delete(f"/profiles/{profile_id}", headers={
        "X-Profile-Token": token, "Idempotency-Key": str(uuid4())})
    assert deleted.status_code == 204
    session = client.get(f"/sessions/{session_id}")
    assert session.status_code == 200
    assert session.json()["session"]["profileId"] is None
    with db.connect() as connection:
        assert connection.execute("SELECT count(*) AS n FROM take_metrics WHERE take_id=%s",
                                  (good,)).fetchone()["n"] == 0
        assert connection.execute("SELECT count(*) AS n FROM progress_snapshots WHERE profile_id=%s",
                                  (profile_id,)).fetchone()["n"] == 0
    client.delete(f"/sessions/{session_id}")


def test_auxiliary_endpoints_and_export(profile):
    client, token, profile_id = profile
    session_id = linked_session(client, token, profile_id)
    take_id = create_take(client, token, session_id, datetime.now(timezone.utc) - timedelta(days=1))
    assert client.get(f"/takes/{take_id}").json()["take"]["recordedAtSource"] == "client"
    add_event(client, take_id, 1, 30_000)
    detail = client.get(f"/profiles/{profile_id}/progress/pose.posture_share",
                        headers={"X-Profile-Token": token})
    assert detail.status_code == 200 and detail.json()["series"]["metricId"] == "pose.posture_share"
    goal = client.put(f"/profiles/{profile_id}/goals/pose.posture_share",
                      json={"direction": "decrease", "targetValue": 0.4},
                      headers={"Idempotency-Key": str(uuid4()), "X-Profile-Token": token})
    assert goal.status_code == 200
    assert client.get(f"/profiles/{profile_id}/goals",
                      headers={"X-Profile-Token": token}).json()["goals"][0]["metricId"] == "pose.posture_share"
    takes = client.get(f"/profiles/{profile_id}/takes", headers={"X-Profile-Token": token})
    assert takes.status_code == 200 and takes.json()["takes"][0]["takeId"] == str(take_id)
    exported = client.get(f"/profiles/{profile_id}/export?format=csv",
                          headers={"X-Profile-Token": token})
    assert exported.status_code == 200 and "pose.posture_share" in exported.text
    recomputed = client.post(f"/profiles/{profile_id}/progress/recompute",
                             headers={"Idempotency-Key": str(uuid4()), "X-Profile-Token": token})
    assert recomputed.status_code == 202
    run_id = UUID(recomputed.json()["runId"])
    jobs.execute(run_id)
    run = client.get(recomputed.json()["statusUrl"].removeprefix("/api"))
    assert run.status_code == 200 and run.json()["status"] == "completed"
    assert client.delete(f"/profiles/{profile_id}/goals/pose.posture_share",
                         headers={"Idempotency-Key": str(uuid4()), "X-Profile-Token": token}).status_code == 204


def test_token_rotation_invalidates_the_old_token():
    client = TestClient(app)
    first = client.post("/profiles", json=profile_body(), headers={"Idempotency-Key": str(uuid4())})
    body = first.json()
    old_token, profile_id = body["token"], body["profile"]["profileId"]
    rotated = client.post(f"/profiles/{profile_id}/rotate-token",
                          headers={"Idempotency-Key": str(uuid4()), "X-Profile-Token": old_token})
    assert rotated.status_code == 200 and rotated.json()["token"].startswith("pp_")
    assert client.get(f"/profiles/{profile_id}", headers={"X-Profile-Token": old_token}).status_code == 401
    new_token = rotated.json()["token"]
    assert client.get(f"/profiles/{profile_id}", headers={"X-Profile-Token": new_token}).status_code == 200
    client.delete(f"/profiles/{profile_id}", headers={
        "X-Profile-Token": new_token, "Idempotency-Key": str(uuid4())})


def test_linked_session_requires_token(profile):
    client, token, profile_id = profile
    response = client.post("/sessions", json={
        "title": "Ohne Token",
        "profileId": str(profile_id),
        "consent": {"granted": True, "at": datetime.now(timezone.utc).isoformat(),
                    "version": "test", "scope": "local-analysis"},
    }, headers={"Idempotency-Key": str(uuid4()), "X-Profile-Token": ""})
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "E_PROFILE_TOKEN_INVALID"


def test_recorded_at_fallback_is_marked_server(profile):
    client, token, profile_id = profile
    session_id = linked_session(client, token, profile_id)
    future = datetime.now(timezone.utc) + timedelta(days=2)
    take_id = create_take(client, token, session_id, future)
    take = client.get(f"/takes/{take_id}").json()["take"]
    assert take["recordedAtSource"] == "server"


@pytest.mark.parametrize("method,path,body", [
    ("patch", "", {"displayName": "Synthetischer neuer Name"}),
    ("put", "/goals/pose.posture_share", {"direction": "decrease", "targetValue": 0.3}),
    ("post", "/progress/recompute", None),
])
def test_idempotency_replays_still_require_a_valid_token(profile, method, path, body):
    client, _, profile_id = profile
    url = f"/profiles/{profile_id}{path}"
    key = str(uuid4())
    first = client.request(method, url, json=body, headers={"Idempotency-Key": key})
    assert first.status_code in {200, 202}, first.text
    replay = client.request(method, url, json=body,
                            headers={"Idempotency-Key": key, "X-Profile-Token": "invalid"})
    assert replay.status_code == 401


def test_all_linked_review_resources_require_the_profile_token(profile):
    client, token, profile_id = profile
    session_id = linked_session(client, token, profile_id)
    take_id = create_take(client, token, session_id, datetime.now(timezone.utc))
    job_response = client.post(f"/takes/{take_id}/review", json={},
                               headers={"Idempotency-Key": str(uuid4())})
    assert job_response.status_code == 202, job_response.text
    job_id = job_response.json()["jobId"]
    visitor = TestClient(app)
    for path in (f"/sessions/{session_id}", f"/takes/{take_id}", f"/takes/{take_id}/timeline",
                 f"/takes/{take_id}/review", f"/takes/{take_id}/questions", f"/jobs/{job_id}"):
        response = visitor.get(path)
        assert response.status_code == 401, (path, response.text)
        assert response.headers["Cache-Control"] == "private, no-store"
    for method, path in (("delete", f"/sessions/{session_id}"),
                         ("post", f"/takes/{take_id}/events"),
                         ("post", f"/takes/{take_id}/audio")):
        response = visitor.request(method, path, headers={"Idempotency-Key": str(uuid4())})
        assert response.status_code == 401, response.text
    assert client.get(f"/takes/{take_id}").status_code == 200


def test_expiry_applies_to_progress_and_linked_reads_but_allows_deletion(profile):
    client, token, profile_id = profile
    session_id = linked_session(client, token, profile_id)
    take_id = create_take(client, token, session_id, datetime.now(timezone.utc))
    with db.connect() as connection:
        connection.execute("UPDATE speaker_profiles SET retention_until=now()-interval '1 second' WHERE id=%s",
                           (profile_id,))
    for path in ("", "/progress", "/progress/pose.posture_share", "/goals", "/takes", "/export"):
        response = client.get(f"/profiles/{profile_id}{path}")
        assert response.status_code == 410, (path, response.text)
    assert client.get(f"/takes/{take_id}").status_code == 410
    assert client.post(f"/profiles/{profile_id}/progress/recompute",
                       headers={"Idempotency-Key": str(uuid4())}).status_code == 410
    assert client.delete(f"/profiles/{profile_id}", headers={"Idempotency-Key": str(uuid4())}).status_code == 204


def test_retention_can_be_cleared_without_conflating_omitted_and_null(profile):
    client, _, profile_id = profile
    url = f"/profiles/{profile_id}"
    until = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    assert client.patch(url, json={"retentionUntil": until},
                        headers={"Idempotency-Key": str(uuid4())}).status_code == 200
    key = str(uuid4())
    unchanged = client.patch(url, json={}, headers={"Idempotency-Key": key})
    assert unchanged.json()["profile"]["consent"]["retentionUntil"] is not None
    assert client.patch(url, json={"retentionUntil": None},
                        headers={"Idempotency-Key": key}).status_code == 409
    cleared = client.patch(url, json={"retentionUntil": None}, headers={"Idempotency-Key": str(uuid4())})
    assert cleared.status_code == 200
    assert cleared.json()["profile"]["consent"]["retentionUntil"] is None


@pytest.mark.parametrize("path", [
    "/progress?from=2026-10-24T10:00:00", "/progress?from=2026-10-25T00:00:00Z&to=2026-10-24T00:00:00Z",
    "/progress/pose.posture_share?presentationMode=invalid", "/progress/primary", "/progress/all",
    "/progress/pose.posture_share,speech.pace_wpm", "/takes?cursor=invalid", "/takes?cursor=-1",
])
def test_bad_filters_and_cursors_are_client_errors(profile, path):
    client, _, profile_id = profile
    response = client.get(f"/profiles/{profile_id}{path}")
    assert response.status_code == 422, response.text


def test_reads_refresh_only_changed_metrics_and_do_not_overwrite_other_windows(profile):
    client, token, profile_id = profile
    session_id = linked_session(client, token, profile_id)
    take_ids = []
    for index in range(6):
        take_id = create_take(client, token, session_id, datetime.now(timezone.utc) - timedelta(days=6-index))
        add_event(client, take_id, index, 30_000 - index * 1_000)
        take_ids.append(take_id)
    path = f"/profiles/{profile_id}/progress"
    assert client.get(path, params={"metrics": "pose.posture_share", "window": "all"}).status_code == 200
    with db.connect() as connection:
        before = connection.execute("SELECT computed_at FROM take_metrics WHERE take_id=%s AND metric_id=%s",
                                     (take_ids[-1], "pose.posture_share")).fetchone()["computed_at"]
    result = client.get(path, params={"metrics": "pose.posture_share", "window": "last_5"})
    assert result.status_code == 200, result.text
    with db.connect() as connection:
        after = connection.execute("SELECT computed_at FROM take_metrics WHERE take_id=%s AND metric_id=%s",
                                    (take_ids[-1], "pose.posture_share")).fetchone()["computed_at"]
        snapshots = connection.execute("SELECT window_kind,total_n FROM progress_snapshots"
                                        " WHERE profile_id=%s AND metric_id=%s",
                                        (profile_id, "pose.posture_share")).fetchall()
    assert before == after
    assert {row["window_kind"]: row["total_n"] for row in snapshots} == {"all": 6, "last_5": 5}
    add_event(client, take_ids[-1], 5, 6_000)
    updated = client.get(path, params={"metrics": "pose.posture_share"}).json()["series"][0]
    assert updated["points"][-1]["value"] == 0.1


def test_version_break_does_not_produce_goal_feedback_or_change_points(profile):
    client, token, profile_id = profile
    session_id = linked_session(client, token, profile_id)
    for index in range(12):
        take_id = create_take(client, token, session_id, datetime.now(timezone.utc) - timedelta(days=12-index))
        add_event(client, take_id, index, 30_000 if index < 6 else 6_000, rule_version=7 if index < 6 else 8)
    assert client.put(f"/profiles/{profile_id}/goals/pose.posture_share",
                      json={"direction": "decrease", "targetValue": 0.2},
                      headers={"Idempotency-Key": str(uuid4())}).status_code == 200
    item = client.get(f"/profiles/{profile_id}/progress/pose.posture_share").json()["series"]
    assert item["quality"]["versionBreak"]
    assert item["trend"]["status"] == "unclear"
    assert item["trend"]["slopePerTake"] is None
    assert item["latest"]["changeVsBaseline"] is None
    assert item["goalStatus"] == "unknown" and item["changePoints"] == []


def test_hiding_excluded_points_does_not_change_the_analysis_or_quality(profile):
    client, token, profile_id = profile
    session_id = linked_session(client, token, profile_id)
    for index in range(10):
        take_id = create_take(client, token, session_id, datetime.now(timezone.utc) - timedelta(days=10-index),
                              coverage_ms=1_000 if index == 5 else 60_000)
        add_event(client, take_id, index, 30_000 - index * 1_000)
    path = f"/profiles/{profile_id}/progress/pose.posture_share"
    included = client.get(path).json()["series"]
    hidden = client.get(path, params={"includeExcluded": False}).json()["series"]
    assert len(included["points"]) == 10 and len(hidden["points"]) == 9
    assert included["quality"] == hidden["quality"]
    assert included["trend"] == hidden["trend"]
    assert [point["sequence"] for point in hidden["points"]] == [1, 2, 3, 4, 5, 7, 8, 9, 10]


def test_new_takes_after_two_hundred_are_materialized(profile):
    from app.review import db as review_db
    from app.review.models import TakeCreate
    client, token, profile_id = profile
    session_id = linked_session(client, token, profile_id)
    with db.connect() as connection:
        for index in range(201):
            review_db.create_take(connection, session_id, TakeCreate(
                duration_ms=60_000, mime_type="video/webm", timebase={"onstartPerfMs": 0},
                recorded_at=datetime.now(timezone.utc)-timedelta(minutes=201-index),
                coverage=[{"tMs": 0, "durationMs": 60_000, "evaluable": True}]))
    path = f"/profiles/{profile_id}/progress"
    first = client.get(path, params={"metrics": "pose.posture_share"})
    assert first.status_code == 200, first.text
    latest = create_take(client, token, session_id, datetime.now(timezone.utc))
    add_event(client, latest, 999, 6_000)
    response = client.get(path, params={"metrics": "pose.posture_share"})
    assert response.status_code == 200, response.text
    assert response.json()["profile"]["totalTakes"] == 202
    assert response.json()["series"][0]["points"][-1]["value"] == 0.1


def test_recompute_retries_queue_outage_and_is_safe_on_redelivery(profile, monkeypatch):
    from app.jobs import QueueUnavailable
    from app.progress import router
    client, token, profile_id = profile
    session_id = linked_session(client, token, profile_id)
    take_id = create_take(client, token, session_id, datetime.now(timezone.utc))
    add_event(client, take_id, 1, 6_000)
    publishes = []
    async def enqueue(task, run_id):
        publishes.append(run_id)
        if len(publishes) == 1:
            raise QueueUnavailable()
    monkeypatch.setattr(router, "enqueue_task", enqueue)
    path, key = f"/profiles/{profile_id}/progress/recompute", str(uuid4())
    assert client.post(path, headers={"Idempotency-Key": key}).status_code == 503
    accepted = client.post(path, headers={"Idempotency-Key": key})
    assert accepted.status_code == 202, accepted.text
    assert publishes[0] == publishes[1] == accepted.json()["runId"]
    assert client.post(path, headers={"Idempotency-Key": str(uuid4())}).status_code == 409
    run_id = UUID(accepted.json()["runId"])
    status_path = accepted.json()["statusUrl"].removeprefix("/api")
    assert TestClient(app).get(status_path).status_code == 401
    jobs.execute(run_id)
    assert client.get(status_path).json()["status"] == "completed"
    with db.connect() as connection:
        before = connection.execute("SELECT computed_at FROM take_metrics WHERE take_id=%s LIMIT 1",
                                     (take_id,)).fetchone()["computed_at"]
    jobs.execute(run_id)
    with db.connect() as connection:
        after = connection.execute("SELECT computed_at FROM take_metrics WHERE take_id=%s LIMIT 1",
                                    (take_id,)).fetchone()["computed_at"]
    assert before == after


def test_pending_recompute_cannot_resurrect_a_deleted_profile(profile):
    client, _, profile_id = profile
    accepted = client.post(f"/profiles/{profile_id}/progress/recompute",
                           headers={"Idempotency-Key": str(uuid4())})
    assert accepted.status_code == 202
    assert client.delete(f"/profiles/{profile_id}", headers={"Idempotency-Key": str(uuid4())}).status_code == 204
    jobs.execute(UUID(accepted.json()["runId"]))
    with db.connect() as connection:
        assert connection.execute("SELECT id FROM progress_runs WHERE profile_id=%s", (profile_id,)).fetchone() is None
