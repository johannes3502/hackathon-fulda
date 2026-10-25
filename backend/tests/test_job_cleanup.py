"""Synthetic failures must preserve retryable deletions and discard job inputs."""

import os
from unittest.mock import AsyncMock, Mock
from uuid import uuid4

import pytest
from botocore.exceptions import EndpointConnectionError
from celery.exceptions import Retry
from fastapi.testclient import TestClient

from app import tasks
from app.factcheck import router as fact_router
from app.factcheck.models import FactCheckConfig, FactCheckJob, FactCheckResult
from app.jobs import QueueUnavailable
from app.main import app
from app.questions import router as question_router
from app.sources import db, router as source_router
from app.sources.models import Source
from app.speech import storage


def outage():
    return EndpointConnectionError(endpoint_url="http://synthetic-storage")


@pytest.mark.skipif(not os.getenv("POSTGRES_HOST"), reason="Needs PostgreSQL")
def test_source_delete_can_be_retried_after_storage_failure(monkeypatch):
    source = Source(id=uuid4(), collection_id=uuid4(), filename="synthetic.txt", content_type="text/plain",
                    size_bytes=1, status="queued", created_at="2026-10-25T00:00:00Z")
    db.insert_source(source, f"sources/{source.id}/original")
    s3 = Mock()
    s3.delete_object.side_effect = [outage(), {}]
    monkeypatch.setattr(source_router, "s3_client", lambda: s3)
    client = TestClient(app)
    try:
        assert client.delete(f"/sources/{source.id}").status_code == 503
        assert db.get_source(source.id) is not None
        assert client.delete(f"/sources/{source.id}").status_code == 204
        assert db.get_source(source.id) is None
    finally:
        db.delete_source(source.id)


@pytest.mark.parametrize("route,prefix", [("/factcheck", tasks.PREFIX), ("/questions", tasks.QUESTION_PREFIX)])
@pytest.mark.parametrize("partial_store", [False, True])
def test_failed_acceptance_discards_inputs(monkeypatch, route, prefix, partial_store):
    router = fact_router if route == "/factcheck" else question_router
    objects = {}
    def write(job, name, value, kind):
        objects[storage.key(job, name, kind)] = value
        if partial_store:
            raise outage()
    s3 = Mock()
    s3.delete_object.side_effect = lambda Bucket, Key: objects.pop(Key, None)
    monkeypatch.setattr(storage, "write_json", write)
    monkeypatch.setattr(storage, "s3_client", lambda: s3)
    monkeypatch.setattr(router, "configured_llm", Mock())
    monkeypatch.setattr(router, "enqueue_task", AsyncMock(side_effect=QueueUnavailable()))
    monkeypatch.setenv("S3_BUCKET", "synthetic")
    response = TestClient(app).post(route, json={"words": [{"word": "Synthetic.", "start_ms": 0, "end_ms": 1000}], "use_web": False})
    assert response.status_code == 503
    assert objects == {}
    assert {call.kwargs["Key"].rsplit("/", 1)[1] for call in s3.delete_object.call_args_list} == {"request.json", "status.json", "recording"}
    assert all(call.kwargs["Key"].startswith(prefix + "/") for call in s3.delete_object.call_args_list)


def test_cleanup_retry_does_not_repeat_a_completed_model_call(monkeypatch):
    objects = {"request.json": {}}
    monkeypatch.setattr(storage, "read_json", lambda job, name, prefix: objects.get(name))
    monkeypatch.setattr(storage, "write_json", lambda job, name, value, prefix: objects.__setitem__(name, value))
    redis, s3, task = Mock(), Mock(), Mock()
    redis.lock.return_value.acquire.return_value = True
    monkeypatch.setattr("app.connections.redis_client", lambda: redis)
    monkeypatch.setattr(tasks, "s3_client", lambda: s3)
    monkeypatch.setenv("S3_BUCKET", "synthetic")
    s3.delete_object.side_effect = [outage(), {}]
    task.retry.side_effect = Retry()
    run = Mock(return_value=FactCheckResult(claims=[], events=[], model="synthetic", sources_checked=False, web_provider=None, config=FactCheckConfig(), notices=[]))
    with pytest.raises(Retry):
        tasks._model_job(task, "synthetic", tasks.PREFIX, FactCheckJob, run, "failed")
    assert objects["status.json"]["status"] == "completed"
    tasks._model_job(task, "synthetic", tasks.PREFIX, FactCheckJob, run, "failed")
    run.assert_called_once()
    assert redis.lock.return_value.release.call_count == 2


def test_speech_cleanup_removes_live_transcript_request_too(monkeypatch):
    s3 = Mock()
    monkeypatch.setattr(storage, "s3_client", lambda: s3)
    monkeypatch.setenv("S3_BUCKET", "synthetic")
    storage.delete_input("synthetic")
    assert [call.kwargs["Key"] for call in s3.delete_object.call_args_list] == [
        "speech-jobs/synthetic/recording", "speech-jobs/synthetic/request.json"]


def test_partial_discard_failure_does_not_skip_remaining_objects(monkeypatch, caplog):
    s3 = Mock()
    s3.delete_object.side_effect = [outage(), {}, {}]
    monkeypatch.setattr(storage, "s3_client", lambda: s3)
    monkeypatch.setenv("S3_BUCKET", "synthetic")
    storage.discard_job("synthetic", tasks.ANSWER_PREFIX)
    assert s3.delete_object.call_count == 3
    assert "Could not discard answer-jobs/synthetic/recording" in caplog.text
