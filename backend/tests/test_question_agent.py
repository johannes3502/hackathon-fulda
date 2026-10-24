"""Synthetic protocol checks and an opt-in live configuration check; no paid calls."""

import json
import os
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock
from uuid import uuid4

import httpx
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.questions import agent, router
from app.questions.models import AnswerRequest, QuestionRequest
from app.questions.pipeline import generate_questions, review_answer
from app.questions.styles import PRESENTATION_STYLES
from tests.test_factcheck import TRANSCRIPT, hit
from tests.test_questions import Model, question


@pytest.mark.parametrize("mode", PRESENTATION_STYLES)
def test_modes_change_both_questions_and_answer_feedback(mode):
    model = Model({"questions": []})
    result = generate_questions(QuestionRequest(words=TRANSCRIPT, presentation_mode=mode), model)
    assert result.presentation_mode == mode
    assert PRESENTATION_STYLES[mode] in model.prompts[0][0]
    if mode != "thesis":
        assert "Professur" not in model.prompts[0][0]
    answer_model = Model({"verdict": "not_found"})
    review_answer(AnswerRequest(question=question(), answer="Synthetic answer", presentation_mode=mode), answer_model)
    assert PRESENTATION_STYLES[mode] in answer_model.prompts[0][0]


def test_context_uses_only_the_requested_collection_and_includes_source_locations(monkeypatch):
    collection = uuid4()
    monkeypatch.setattr(agent.db, "list_sources", lambda value: [SimpleNamespace(status="ready")])
    retrieve = Mock(return_value=[hit()])
    monkeypatch.setattr(agent.retrieval, "search", retrieve)
    result = agent.prepare_context(QuestionRequest(words=TRANSCRIPT, collection_id=collection, presentation_mode="nonprofit"))
    assert retrieve.call_args.args[0] == collection
    assert result.source_count == 1
    assert "Folie 3" in result.prompt
    assert "source_passages" in result.prompt and "transcript" in result.prompt
    assert "untrusted reference material" in result.prompt
    assert "teacher asking a student" in result.prompt


def test_missing_or_processing_sources_are_not_presented_as_ready(monkeypatch):
    result = agent.prepare_context(QuestionRequest(words=TRANSCRIPT))
    assert result.source_count == 0 and result.notices
    monkeypatch.setattr(agent.db, "list_sources", lambda value: [SimpleNamespace(status="processing")])
    with pytest.raises(ValueError, match="processing"):
        agent.prepare_context(QuestionRequest(words=TRANSCRIPT, collection_id=uuid4()))


@pytest.mark.parametrize("mode", PRESENTATION_STYLES)
def test_teacher_receives_the_spoken_content_and_starts_without_an_introduction(mode):
    result = agent.prepare_context(QuestionRequest(words=TRANSCRIPT, presentation_mode=mode))
    context = json.loads(result.prompt.splitlines()[-1])
    assert context["transcript"] == " ".join(word.word for word in TRANSCRIPT)
    assert "Do not greet" in result.prompt
    assert "teacher asking a student" in result.prompt
    assert "Open with only 'I have a few questions.'" in result.prompt
    assert "immediately followed by the first specific question" in result.prompt
    assert "Do not add an introduction, recap or explanation" in result.prompt
    assert all(style not in result.prompt for style in PRESENTATION_STYLES.values())
    assert "actual claim, example or explanation" in result.prompt
    assert "breadth of understanding" in result.prompt
    assert "new application or counterexample" in result.prompt
    assert "do not turn the conversation into unrelated trivia" in result.prompt


def test_teacher_moves_on_after_limited_follow_ups_even_if_the_answer_is_wrong():
    prompt = agent.prepare_context(QuestionRequest(words=TRANSCRIPT)).prompt
    assert "ask one brief follow-up, and at most a second follow-up" in prompt
    assert "After at most two follow-ups" in prompt
    assert "continue to the next main question even if the answer is still wrong" in prompt
    assert "Move on sooner if the student does not know or asks to skip" in prompt
    assert "Never repeat a question until they get it right" in prompt


@pytest.mark.skipif(os.getenv("RUN_CLOUD_SMOKE") != "1", reason="Opt-in read of the configured ElevenLabs agent")
def test_live_agent_has_no_saved_greeting_and_allows_context_overrides():
    response = httpx.get(
        f"https://api.elevenlabs.io/v1/convai/agents/{os.environ['ELEVENLABS_AGENT_ID']}",
        headers={"xi-api-key": os.environ["ELEVENLABS_API_KEY"]},
        timeout=15,
    )
    assert response.status_code == 200, f"Agent configuration returned HTTP {response.status_code}"
    config = response.json()
    # The saved first message bypasses the LLM, so prompt-only tests cannot catch this regression.
    assert config["conversation_config"]["agent"]["first_message"] == ""
    overrides = config["platform_settings"]["overrides"]["conversation_config_override"]["agent"]
    assert overrides["first_message"] is True
    assert overrides["prompt"]["prompt"] is True


def test_agent_api_queues_context_without_needing_the_local_llm(monkeypatch):
    client = TestClient(app)
    monkeypatch.delenv("ELEVENLABS_API_KEY", raising=False)
    assert client.get("/questions/agent/settings").json()["available"] is False
    assert client.post("/questions/agent/session").status_code == 503
    monkeypatch.setenv("ELEVENLABS_API_KEY", "synthetic-secret")
    monkeypatch.setenv("ELEVENLABS_AGENT_ID", "agent_synthetic")
    monkeypatch.setattr(router, "configured_llm", Mock(side_effect=AssertionError("No local LLM needed")))
    store, enqueue = Mock(), AsyncMock()
    monkeypatch.setattr(router, "_store", store)
    monkeypatch.setattr(router, "enqueue_task", enqueue)
    body = QuestionRequest(words=TRANSCRIPT, presentation_mode="startup").model_dump(mode="json")
    response = client.post("/questions/agent", json=body)
    assert response.status_code == 202
    assert enqueue.await_args.args[0] is router.prepare_agent
    assert store.call_args.args[1].presentation_mode == "startup"
    assert client.post("/questions/agent", json={**body, "presentation_mode": "grade_me"}).status_code == 422
    assert "synthetic-secret" not in client.get("/questions/agent/settings").text


@pytest.mark.parametrize("status,body", [(200, {"signed_url": "wss://api.elevenlabs.io/v1/convai/conversation?synthetic"}),
                                        (403, {"detail": "synthetic-secret"}),
                                        (200, {"signed_url": "wss://untrusted.example/"})])
def test_signed_session_keeps_credentials_on_server_and_redacts_provider_errors(monkeypatch, status, body):
    monkeypatch.setenv("ELEVENLABS_API_KEY", "synthetic-secret")
    monkeypatch.setenv("ELEVENLABS_AGENT_ID", "agent_synthetic")
    async_client = httpx.AsyncClient
    def handle(request):
        assert request.headers["xi-api-key"] == "synthetic-secret"
        assert request.url.params["agent_id"] == "agent_synthetic"
        return httpx.Response(status, json=body)
    monkeypatch.setattr(agent.httpx, "AsyncClient", lambda **kwargs: async_client(transport=httpx.MockTransport(handle), **kwargs))
    response = TestClient(app).post("/questions/agent/session")
    if status == 200 and "api.elevenlabs.io" in body["signed_url"]:
        assert response.status_code == 200
        assert response.headers["cache-control"] == "no-store"
    else:
        assert response.status_code == 502
    assert "synthetic-secret" not in response.text


def test_agent_task_reuses_results_and_removes_input(monkeypatch):
    from app import tasks
    store = {(tasks.AGENT_PREFIX, "request.json"): QuestionRequest(words=TRANSCRIPT).model_dump(mode="json")}
    monkeypatch.setattr(tasks.storage, "read_json", lambda job, name, prefix: store.get((prefix, name)))
    monkeypatch.setattr(tasks.storage, "write_json", lambda job, name, value, prefix: store.__setitem__((prefix, name), value))
    s3 = Mock()
    s3.delete_object.side_effect = lambda Bucket, Key: store.pop(tuple(Key.split("/")[::2]), None)
    monkeypatch.setattr(tasks, "s3_client", lambda: s3)
    monkeypatch.setenv("S3_BUCKET", "test")
    redis = Mock()
    redis.lock.return_value.acquire.return_value = True
    monkeypatch.setattr("app.connections.redis_client", lambda: redis)
    prepare = Mock(return_value=agent.AgentContext(prompt="Synthetic context", source_count=0, notices=[]))
    monkeypatch.setattr(agent, "prepare_context", prepare)
    tasks.prepare_agent.run("synthetic-job")
    tasks.prepare_agent.run("synthetic-job")
    assert prepare.call_count == 1
    assert (tasks.AGENT_PREFIX, "request.json") not in store
    assert store[(tasks.AGENT_PREFIX, "status.json")]["status"] == "completed"
