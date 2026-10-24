"""Synthetic tests for long-term progress. No human accuracy labels."""

from datetime import datetime, timedelta, timezone
import os
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.progress import db, stats

pytestmark = pytest.mark.skipif(not os.getenv("POSTGRES_HOST"), reason="Needs PostgreSQL (docker compose)")


def pose_event(index, duration_ms, *, kind="trunk-lateral", valid=0.96):
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
            "rule": {"ruleId": "R1", "version": 7, "evidence": "C", "confidence": "medium",
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


def test_theil_sen_detects_linear_change_and_ignores_one_outlier():
    values = [10.0 - 0.2 * index + (0.04 if index % 2 else -0.04) for index in range(20)]
    result = stats.analyse(values)
    assert result.trend_status == "trend_down"
    assert result.reliable_slope is True
    assert result.slope is not None and result.slope < 0

    outlier = [5.0] * 19 + [50.0]
    result = stats.analyse(outlier)
    assert result.trend_status != "trend_up"


def test_short_series_is_insufficient_and_bh_is_monotone():
    assert stats.analyse([1.0, 1.1, 0.9, 1.0]).trend_status == "insufficient"
    adjusted = stats.benjamini_hochberg({"a": 0.01, "b": 0.04, "c": 0.2})
    assert adjusted["a"] <= adjusted["b"] <= adjusted["c"] <= 1.0


def test_cusum_finds_a_step_after_the_baseline():
    values = [10.0, 10.1, 9.9, 10.0, 10.1, 9.9, 10.0, 10.1, 20.0, 20.1, 19.9, 20.0]
    result = stats.analyse(values)
    change = stats.cusum_change(values, result.baseline, result.noise_band)
    assert change is not None and change["direction"] == "up"
    assert change["detected_index"] >= 8


@pytest.fixture
def profile():
    client = TestClient(app)
    response = client.post("/profiles", json=profile_body(),
                           headers={"Idempotency-Key": str(uuid4())})
    assert response.status_code == 201, response.text
    body = response.json()
    token, profile_id = body["token"], UUID(body["profile"]["profileId"])
    yield client, token, profile_id
    client.delete(f"/profiles/{profile_id}", headers={
        "X-Profile-Token": token, "Idempotency-Key": str(uuid4())})


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
    assert recomputed.status_code == 200 and recomputed.json()["schemaVersion"] == "progress.v1"
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
    }, headers={"Idempotency-Key": str(uuid4())})
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "E_PROFILE_TOKEN_INVALID"


def test_recorded_at_fallback_is_marked_server(profile):
    client, token, profile_id = profile
    session_id = linked_session(client, token, profile_id)
    future = datetime.now(timezone.utc) + timedelta(days=2)
    take_id = create_take(client, token, session_id, future)
    take = client.get(f"/takes/{take_id}").json()["take"]
    assert take["recordedAtSource"] == "server"
