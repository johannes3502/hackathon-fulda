"""Postgres integration tests. All sessions and recordings here are synthetic."""

from datetime import datetime, timezone
import os
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.events import Event
from app.main import app
from app.review import db, media, service, worker
from app.review.errors import ReviewError
from app.review.models import ReviewEvent, ReviewRequest
from app.speech.job_models import AnalysisOptions, RecordingAnalysis
from app.speech.models import AudioAnalysis, AudioSeries, AudioSummary
from app.transcription.analysis import analyze_words
from app.transcription.models import Word
from test_review import pose_event

pytestmark = pytest.mark.skipif(not os.getenv("POSTGRES_HOST"), reason="Needs PostgreSQL (docker compose)")


@pytest.fixture
def api(monkeypatch):
    from app.review import router
    queued, sessions, deleted = [], [], []
    async def enqueue(task, job_id):
        queued.append(job_id)
        return job_id
    monkeypatch.setattr(router, "enqueue_task", enqueue)
    monkeypatch.setattr(media, "delete", lambda key: deleted.append(key) if key else None)
    client = TestClient(app)
    def post(path, body=None, key=None, **kwargs):
        return client.post(path, json=body, headers={"Idempotency-Key": key or str(uuid4())}, **kwargs)
    def create(duration=10000):
        request = {"title": "Synthetic review fixture", "consent": {"granted": True,
            "at": datetime.now(timezone.utc).isoformat(), "version": "test", "scope": "local-analysis"}}
        response = post("/sessions", request)
        assert response.status_code == 201, response.text
        session_id = response.json()["session"]["sessionId"]
        sessions.append(UUID(session_id))
        take_response = post(f"/sessions/{session_id}/takes", {"durationMs": duration,
            "mimeType": "video/webm", "timebase": {"onstartPerfMs": 12000.3, "firstVideoPtsMs": 12,
                "audioStartMs": 24, "avOffsetMs": 12}, "coverage": [{"tMs": 0, "durationMs": duration, "evaluable": True}]})
        assert take_response.status_code == 201, take_response.text
        return UUID(session_id), UUID(take_response.json()["take"]["takeId"])
    yield client, post, create, queued, deleted, sessions
    for session_id in sessions:
        service.delete_session(session_id)


def test_session_idempotency_and_request_conflict(api):
    client, post, _, _, _, sessions = api
    request = {"title": "Synthetic", "consent": {"granted": True, "at": "2026-10-24T10:00:00Z", "version": "test", "scope": "local-analysis"}}
    key = str(uuid4())
    first, second = post("/sessions", request, key), post("/sessions", request, key)
    assert first.status_code == second.status_code == 201
    assert first.json() == second.json()
    sessions.append(UUID(first.json()["session"]["sessionId"]))
    conflict = post("/sessions", {**request, "title": "Changed"}, key)
    assert conflict.status_code == 409 and conflict.json()["error"]["code"] == "E_IDEMPOTENCY_CONFLICT"
    assert conflict.json()["error"]["requestId"]


def test_event_partial_validation_stable_dedupe_and_id_conflict(api):
    client, post, create, *_ = api
    _, take_id = create()
    path = f"/takes/{take_id}/events"
    batch = {"events": [pose_event(), pose_event(eventId="late", tMs=50000, peakMs=50000)]}
    response = post(path, batch)
    assert response.status_code == 200 and response.json()["accepted"] == 1
    assert response.json()["rejected"][0]["code"] == "E_EVENT_OUT_OF_RANGE"
    assert post(path, {"events": [pose_event()]}).json()["accepted"] == 1
    renamed = pose_event(eventId="new-id", dedupeKey="pose:R1:1000")
    assert post(path, {"events": [renamed]}).status_code == 200
    events = client.get(f"/takes/{take_id}/timeline").json()["timeline"]["events"]
    assert len(events) == 1 and events[0]["eventId"] == "pose:R1:1000"
    conflicting = pose_event(dedupeKey="different")
    response = post(path, {"events": [pose_event(eventId="rollback"), conflicting]})
    assert response.status_code == 409 and response.json()["error"]["code"] == "E_EVENT_ID_CONFLICT"
    assert len(client.get(f"/takes/{take_id}/timeline").json()["timeline"]["events"]) == 1


def test_review_job_persistence_reuse_and_invalidation(api):
    client, post, create, queued, *_ = api
    _, take_id = create()
    post(f"/takes/{take_id}/events", {"events": [pose_event()]})
    assert client.get(f"/takes/{take_id}/review").json()["error"]["code"] == "E_REVIEW_NOT_READY"
    path, key = f"/takes/{take_id}/review", str(uuid4())
    first, second = post(path, {}, key), post(path, {}, key)
    assert first.status_code == 202 and first.json() == second.json()
    job_id = UUID(first.json()["jobId"])
    with db.connect() as connection:
        assert connection.execute("SELECT count(*) AS n FROM jobs WHERE take_id=%s", (take_id,)).fetchone()["n"] == 1
    worker.execute(job_id)
    worker.execute(job_id)
    job = client.get(f"/jobs/{job_id}").json()["job"]
    assert job["status"] == "completed" and job["progress"] == 100
    report = client.get(path).json()["review"]
    assert report["schemaVersion"] == "review.v1" and report["findings"][0]["evidence"]["peakMs"] == 1500
    # Identical upserts do not invalidate a completed review.
    post(f"/takes/{take_id}/events", {"events": [pose_event()]})
    reused = post(path, {})
    assert reused.status_code == 200 and reused.json() == {"reviewId": report["reviewId"]}
    raw = pose_event(peakMs=1800)
    post(f"/takes/{take_id}/events", {"events": [raw]})
    assert client.get(path).status_code == 404
    assert post(path, {}).status_code == 202


def test_timebase_warnings_and_negative_duration(api):
    client, post, create, *_ = api
    session_id, _ = create()
    request = {"durationMs": 10000, "mimeType": "video/webm", "timebase": {
        "onstartPerfMs": 0, "containerDurationMs": 15000, "avOffsetMs": 600}}
    response = post(f"/sessions/{session_id}/takes", request)
    assert response.status_code == 201
    assert response.json()["take"]["timebase"] == request["timebase"]
    assert set(response.json()["take"]["warnings"]) == {"E_DURATION_MISMATCH", "E_AV_OFFSET_IMPLAUSIBLE"}
    invalid = post(f"/sessions/{session_id}/takes", {**request, "durationMs": -1})
    assert invalid.status_code == 422 and invalid.json()["error"]["code"] == "E_DURATION_NEGATIVE"


def audio_job(take_id):
    value = service.reserve_job(take_id, "audio_analyze", AnalysisOptions().model_dump(mode="json"), str(uuid4()))
    job_id = UUID(value[1]["jobId"])
    with db.connect() as connection:
        connection.execute("UPDATE jobs SET upload_ready=true WHERE id=%s", (job_id,))
    return job_id


def test_audio_worker_shifts_words_and_events_and_removes_original(api, monkeypatch):
    client, _, create, _, deleted, _ = api
    _, take_id = create()
    words = [Word(word="Synthetisch", start_ms=0, end_ms=500), Word(word="weiter", start_ms=2500, end_ms=3000)]
    audio = AudioAnalysis(summary=AudioSummary(duration_ms=10000, active_ms=1000, median_level_db=-20,
        median_f0_hz=200, f0_range_st=1, syllables_per_second=3, pause_count=1),
        series=AudioSeries(hop_ms=10, t_ms=[], level_db=[], f0_hz=[], active=[], syllable_peaks_ms=[]),
        events=[Event(t_ms=500, duration_ms=2000, type="pause", severity="info", source="speech", payload={"gap_ms": 2000})], heuristics={})
    result = RecordingAnalysis(audio=audio, words=words, text="Synthetisch weiter", transcription=analyze_words(words), events=[], asr_provider="test")
    monkeypatch.setattr(media, "download", lambda key, target: target.write_bytes(b"synthetic"))
    monkeypatch.setattr(media, "probe", lambda path: {"audio_start_ms": 24, "video_start_ms": None, "duration_ms": 10000, "format_start_ms": 0})
    monkeypatch.setattr("app.speech.pipeline.run_analysis", lambda *args: result)
    job_id = audio_job(take_id)
    key = service.queued_job(job_id)["object_key"]
    worker.execute(job_id)
    assert key in deleted and service.queued_job(job_id)["object_key"] is None
    with db.connect() as connection:
        take = db.require_take(connection, take_id)
        assert take["analysis"]["words"][0]["start_ms"] == 12
        assert take["audio_probe"]["audio_start_ms"] == 24
        assert "series" not in take["analysis"]
    timeline = client.get(f"/takes/{take_id}/timeline").json()["timeline"]
    assert len(timeline["events"]) == 1 and timeline["events"][0]["tMs"] == 512


def test_audio_failure_cleanup_and_delete_during_processing(api, monkeypatch):
    client, _, create, _, deleted, _ = api
    session_id, take_id = create()
    job_id = audio_job(take_id)
    key = service.queued_job(job_id)["object_key"]
    def fail(*args):
        raise ReviewError(422, "E_AUDIO_STREAM_MISSING", "Synthetic failure")
    monkeypatch.setattr(worker, "analyze_audio", fail)
    worker.execute(job_id)
    assert key in deleted and client.get(f"/jobs/{job_id}").json()["job"]["status"] == "failed"
    second = audio_job(take_id)
    def deleted_while_running(*args):
        service.delete_session(session_id)
        return {"analysis": {}, "probe": {}, "events": [], "offset": 0}
    monkeypatch.setattr(worker, "analyze_audio", deleted_while_running)
    worker.execute(second)
    assert client.get(f"/jobs/{second}").status_code == 404
    assert client.get(f"/takes/{take_id}").status_code == 404
    assert client.delete(f"/sessions/{session_id}").status_code == 204


def test_deletion_cascades_events_reviews_jobs_idempotency_and_pending_audio(api):
    client, post, create, _, deleted, _ = api
    session_id, take_id = create()
    post(f"/takes/{take_id}/events", {"events": [pose_event()]})
    job_id = UUID(post(f"/takes/{take_id}/review", {}).json()["jobId"])
    worker.execute(job_id)
    pending = audio_job(take_id)
    key = service.queued_job(pending)["object_key"]
    assert client.delete(f"/sessions/{session_id}").status_code == 204
    assert client.delete(f"/sessions/{session_id}").status_code == 204
    assert key in deleted
    with db.connect() as connection:
        for table in ("takes", "events", "reviews", "jobs"):
            condition, identifier = ("session_id", session_id) if table == "takes" else ("take_id", take_id)
            assert connection.execute(f"SELECT count(*) AS n FROM {table} WHERE {condition}=%s", (identifier,)).fetchone()["n"] == 0
        assert connection.execute("SELECT count(*) AS n FROM review_idempotency WHERE session_id=%s", (session_id,)).fetchone()["n"] == 0


def test_queue_outage_retries_same_durable_job_and_final_events_win(api, monkeypatch):
    from app.jobs import QueueUnavailable
    from app.review import router
    client, post, create, *_ = api
    _, take_id = create()
    post(f"/takes/{take_id}/events", {"events": [pose_event()]})
    post(f"/takes/{take_id}/events", {"events": [pose_event(stage="live", peakMs=1900)]})
    event = client.get(f"/takes/{take_id}/timeline").json()["timeline"]["events"][0]
    assert event["stage"] == "final" and event["peakMs"] == 1500
    key, original = str(uuid4()), router.enqueue_task
    async def unavailable(*args):
        raise QueueUnavailable("Synthetic queue outage")
    monkeypatch.setattr(router, "enqueue_task", unavailable)
    assert post(f"/takes/{take_id}/review", {}, key).status_code == 503
    with db.connect() as connection:
        pending = connection.execute("SELECT id FROM jobs WHERE take_id=%s", (take_id,)).fetchone()["id"]
    monkeypatch.setattr(router, "enqueue_task", original)
    retried = post(f"/takes/{take_id}/review", {}, key)
    assert retried.status_code == 202 and UUID(retried.json()["jobId"]) == pending


def test_question_jobs_and_answer_comparison_are_take_scoped(api, monkeypatch):
    from app.questions.models import AnswerReview, Question, QuestionConfig, QuestionResult
    from app.review import router
    client, post, create, *_ = api
    _, take_id = create()
    monkeypatch.setattr(router, "require_llm", lambda identifier: None)
    with db.connect() as connection:
        from psycopg.types.json import Jsonb
        connection.execute("UPDATE takes SET analysis=%s WHERE id=%s", (Jsonb({"words": [{"word": "Synthetisch", "start_ms": 0, "end_ms": 500}]}), take_id))
    question = Question(id="q_1", kind="clarification", question="Was bedeutet der Begriff?", reason="Synthetische Rückfrage",
                        t_ms=0, duration_ms=500, query="Synthetisch")
    result = QuestionResult(questions=[question], events=[], model="synthetic-test", sources_used=False, config=QuestionConfig(), notices=[])
    monkeypatch.setattr(worker, "model_job", lambda *args: ("questions", result.model_dump(mode="json"), []))
    accepted = post(f"/takes/{take_id}/questions", {"persona": "student"})
    assert accepted.status_code == 202, accepted.text
    worker.execute(UUID(accepted.json()["jobId"]))
    response = client.get(f"/takes/{take_id}/questions")
    assert response.status_code == 200 and response.json()["questions"]["questions"][0]["id"] == "q_1"
    assert post(f"/takes/{take_id}/questions/answers", {"questionId": "other-take", "answer": "Test"}).status_code == 404
    answer = AnswerReview(verdict="unchecked", explanation="Keine Quelle in synthetischer Fixture.", checked=[], model="synthetic-test")
    monkeypatch.setattr(worker, "model_job", lambda *args: ("answer", answer.model_dump(mode="json"), []))
    response = post(f"/takes/{take_id}/questions/answers", {"questionId": "q_1", "answer": "Synthetische Antwort"})
    job_id = UUID(response.json()["jobId"])
    worker.execute(job_id)
    job = client.get(f"/jobs/{job_id}").json()["job"]
    assert job["status"] == "completed" and job["result"]["verdict"] == "unchecked"
    assert service.queued_job(job_id)["input"] == {}
    evaluation = client.get(f"/takes/{take_id}/evaluation")
    assert evaluation.status_code == 200 and evaluation.json()["evaluation"]["humanLabeledClaims"] is None


def test_llm_failure_persists_grounded_fallback_and_failure_metrics(api, monkeypatch):
    from app.review import router
    client, post, create, *_ = api
    _, take_id = create()
    post(f"/takes/{take_id}/events", {"events": [pose_event()]})
    monkeypatch.setattr(router, "require_llm", lambda identifier: None)
    class UnsafeModel:
        model = "synthetic-injection"
        def complete_json(self, system, user):
            return {"claims": [{"evidenceIds": ["pose:R1:1000"], "template": "observation", "text": "Dein Score ist 99."}]}
    monkeypatch.setattr("app.factcheck.llm.configured_llm", lambda: UnsafeModel())
    response = post(f"/takes/{take_id}/review", {"mode": "llm"})
    worker.execute(UUID(response.json()["jobId"]))
    job = client.get(f"/jobs/{response.json()['jobId']}").json()["job"]
    assert job["status"] == "failed" and job["error"]["code"] == "E_REVIEW_VERIFICATION"
    report = client.get(f"/takes/{take_id}/review").json()["review"]
    assert report["generator"]["mode"] == "template" and "99" not in report["findings"][0]["observation"]
    evaluation = client.get(f"/takes/{take_id}/evaluation").json()["evaluation"]
    assert evaluation["verification"]["fallbackRate"] == 1 and evaluation["humanLabeledClaims"] is None


def test_audio_cleanup_failure_never_reports_success_and_redelivery_only_cleans(api, monkeypatch):
    client, _, create, _, deleted, _ = api
    _, take_id = create()
    job_id = audio_job(take_id)
    calls = []
    def analyze(*args):
        calls.append(True)
        return {"analysis": {}, "probe": {}, "events": [], "offset": 0}
    monkeypatch.setattr(worker, "analyze_audio", analyze)
    original_delete = media.delete
    def fail_cleanup(key):
        raise RuntimeError("Synthetic storage failure")
    monkeypatch.setattr(media, "delete", fail_cleanup)
    with pytest.raises(RuntimeError):
        worker.execute(job_id)
    assert service.queued_job(job_id)["status"] == "failed"
    assert service.queued_job(job_id)["object_key"] is not None
    monkeypatch.setattr(media, "delete", original_delete)
    worker.execute(job_id)
    assert calls == [True] and service.queued_job(job_id)["object_key"] is None


def test_audio_upload_hash_and_partial_non_object_events(api, monkeypatch):
    client, post, create, *_ = api
    _, take_id = create()
    monkeypatch.setattr(media, "upload", lambda *args: None)
    key = str(uuid4())
    def upload(data):
        return client.post(f"/takes/{take_id}/audio", files={"file": ("synthetic.wav", data, "audio/wav")},
                           data={"transcribe": "false"}, headers={"Idempotency-Key": key})
    first, second = upload(b"synthetic-one"), upload(b"synthetic-one")
    assert first.status_code == 202 and first.json() == second.json()
    assert upload(b"synthetic-two").status_code == 409
    response = post(f"/takes/{take_id}/events", {"events": [None, 1, pose_event()]})
    assert response.status_code == 200 and response.json()["accepted"] == 1
    assert [item["index"] for item in response.json()["rejected"]] == [0, 1]
