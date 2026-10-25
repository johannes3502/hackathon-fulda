"""The stage path must stay independent of LLM, Redis and providers."""

from fastapi.testclient import TestClient

from app.main import app
from app.questions import pitch


def test_pitch_context_is_fixed_and_has_exactly_one_question(monkeypatch):
    monkeypatch.delenv("PITCH_MODE", raising=False)
    response = TestClient(app).get("/questions/pitch")
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    body = response.json()
    assert body["question"]["id"] == "pitch-privacy"
    assert body["question"]["question"] == pitch.PITCH_QUESTION
    assert body["question"]["question"].count("?") == 1
    assert body["question"]["evidence"]["quote_verified"] == "exact"
    assert body["question"]["answer_points"] == pitch.PITCH_ANSWER_POINTS
    assert pitch.PITCH_QUESTION in body["prompt"]
    assert "keine Nachfrage" in body["prompt"]
    assert "questions" not in body
    assert len(body["notices"]) == 2


def test_pitch_endpoint_can_be_disabled(monkeypatch):
    monkeypatch.setenv("PITCH_MODE", "0")
    response = TestClient(app).get("/questions/pitch")
    assert response.status_code == 404


def test_pitch_does_not_require_the_question_ledger(monkeypatch):
    def fail(*args, **kwargs):
        raise AssertionError("pitch context must not call Redis")

    monkeypatch.setattr("app.questions.rounds.redis_client", fail)
    result = pitch.context()
    assert result.question.id == "pitch-privacy"
