"""Source-bound verdicts, timestamps, job lifecycle and local-only transport."""
import json
from unittest.mock import AsyncMock, Mock
from uuid import uuid4

import httpx
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app
from app.coaching import router, storage, tasks
from app.coaching.models import (
    AnswerDraft, AnswerRequest, CheckDraft, CoachingJob, CoachingRequest,
    DraftChecks, DraftQuestions, ExtractedClaims,
)
from app.coaching.pipeline import review_answer, run_coaching
from app.coaching.provider import LocalCoach
from app.jobs import QueueUnavailable
from app.sources.models import Location, SourceHit


class Coach:
    model = "synthetic-test-model"

    def __init__(self, *outputs):
        self.outputs = iter(outputs)
        self.inputs = []

    def structured(self, output, instructions, data):
        self.inputs.append(data)
        result = next(self.outputs)
        assert isinstance(result, output)
        return result


def request():
    return CoachingRequest(collection_id=uuid4(), duration_ms=2000, words=[
        {"word": word, "start_ms": 100 + 200 * i, "end_ms": 280 + 200 * i}
        for i, word in enumerate("Das Lernlabor hat zwanzig Plätze.".split())
    ])


def hit():
    return SourceHit(chunk_id=42, source_id=uuid4(), filename="synthetisch.pdf",
                     location=Location(kind="page", start=2, end=2),
                     text="Das Lernlabor hat zwanzig Plätze.", matched_by=["vector"])


def outputs(verdict="supports", quote="zwanzig Plätze", chunk_id=42):
    return [ExtractedClaims(claims=[{"first_word": 0, "last_word": 4}]),
            DraftChecks(checks=[CheckDraft(claim_id="claim-1", verdict=verdict,
                explanation="Vergleich mit der synthetischen Quelle.",
                citations=[] if quote is None else [{"chunk_id": chunk_id, "quote": quote}])]),
            DraftQuestions(questions=[{"claim_id": None, "text": "Wie nutzt ihr das Lernlabor?", "reason": "Vertiefung des Vortrags."}])]


def test_statement_and_event_times_are_derived_from_words():
    coach, passage = Coach(*outputs()), hit()
    retrieve = Mock(return_value=[passage])
    report = run_coaching(request(), coach, retrieve)
    [check] = report.checks
    assert check.statement == "Das Lernlabor hat zwanzig Plätze."
    assert (check.t_ms, check.duration_ms) == (100, 980)
    assert check.verdict == "supports" and check.citations[0].source_id == passage.source_id
    assert check.citations[0].location.start == 2
    assert report.events[0].t_ms == check.t_ms and report.events[0].source == "factcheck"
    assert coach.inputs[0]["words"][0] == {"index": 0, "word": "Das"}
    assert retrieve.call_args.kwargs == {"k": 5}


@pytest.mark.parametrize("quote,chunk", [("neunzig Plätze", 42), ("zwanzig Plätze", 99), (None, 42)])
def test_invalid_or_missing_citation_withholds_verdict_and_question_context(quote, chunk):
    coach = Coach(*outputs(quote=quote, chunk_id=chunk))
    report = run_coaching(request(), coach, lambda *a, **kw: [hit()])
    [check] = report.checks
    assert check.verdict is None and check.citations == [] and check.issue
    assert coach.inputs[2]["verified_checks"] == []


def test_absent_evidence_is_not_false():
    report = run_coaching(request(), Coach(*outputs(verdict="not_found", quote=None)), lambda *a, **kw: [])
    assert report.checks[0].verdict == "not_found" and report.checks[0].issue is None
    assert report.events[0].severity == "info"


def test_rejects_invented_spans_claims_and_question_references():
    with pytest.raises(ValueError, match="outside"):
        run_coaching(request(), Coach(ExtractedClaims(claims=[{"first_word": 0, "last_word": 80}])))
    wrong = outputs()
    wrong[1].checks[0].claim_id = "invented"
    with pytest.raises(ValueError, match="invented"):
        run_coaching(request(), Coach(*wrong), lambda *a, **kw: [hit()])
    wrong = outputs()
    wrong[2].questions[0].claim_id = "invented"
    with pytest.raises(ValueError, match="unverified"):
        run_coaching(request(), Coach(*wrong), lambda *a, **kw: [hit()])


def test_no_claims_skips_retrieval_and_fact_verdicts():
    retrieval = Mock()
    report = run_coaching(request(), Coach(ExtractedClaims(claims=[]), DraftQuestions(questions=[])), retrieval)
    assert report.checks == [] and report.events == []
    retrieval.assert_not_called()


def test_answer_citations_are_checked_again_and_unknown_question_rejected():
    report = run_coaching(request(), Coach(*outputs()), lambda *a, **kw: [hit()])
    answer = AnswerRequest(question_id="question-1", answer="Zwanzig Plätze.")
    draft = AnswerDraft(verdict="supports", explanation="Fundstelle", citations=[{"chunk_id": 42, "quote": "erfunden"}], follow_up="Falsche Prämisse?")
    result = review_answer(report, answer, Coach(draft), lambda *a, **kw: [hit()])
    assert result.verdict is None and result.follow_up is None and result.issue
    with pytest.raises(ValueError, match="Unknown question"):
        review_answer(report, answer.model_copy(update={"question_id": "invented"}))


def test_input_rejects_blank_words_outside_or_unordered_times():
    body = request().model_dump(mode="json")
    for words in ([{"word": " ", "start_ms": 0, "end_ms": 100}],
                  [{"word": "Text", "start_ms": 0, "end_ms": 5000}],
                  [{"word": "A", "start_ms": 200, "end_ms": 300}, {"word": "B", "start_ms": 0, "end_ms": 100}]):
        with pytest.raises(ValidationError):
            CoachingRequest.model_validate({**body, "words": words})
    with pytest.raises(ValidationError):
        AnswerRequest(question_id="q", answer=" \n ")


def test_local_adapter_enforces_schema_and_rejects_incomplete_responses():
    requests = []
    def handler(req):
        requests.append(json.loads(req.content))
        return httpx.Response(200, json={"done": True, "done_reason": "stop", "message": {"content": '{"claims":[]}'}})
    coach = LocalCoach(transport=httpx.MockTransport(handler))
    assert coach.structured(ExtractedClaims, "test", {}).claims == []
    assert requests[0]["format"] == ExtractedClaims.model_json_schema()
    assert requests[0]["think"] is False and requests[0]["stream"] is False
    assert requests[0]["options"]["temperature"] == 0
    coach = LocalCoach(transport=httpx.MockTransport(lambda _: httpx.Response(200, json={"done": True, "done_reason": "length"})))
    with pytest.raises(ValueError, match="incomplete"):
        coach.structured(ExtractedClaims, "test", {})
    for endpoint in ("https://api.example.com", "http://host.docker.internal.evil:11434", "http://user:pass@localhost:11434", "http://localhost:11434/path"):
        with pytest.raises(ValueError, match="local"):
            LocalCoach(endpoint=endpoint)
    with pytest.raises(ValueError, match="locally"):
        LocalCoach(model="model:cloud")


@pytest.fixture
def store(monkeypatch):
    objects = {}
    monkeypatch.setattr(storage, "read", lambda job, name: objects.get((job, name)))
    monkeypatch.setattr(storage, "write", lambda job, name, value: objects.__setitem__((job, name), value))
    def delete(job):
        for name in ("request.json", "status.json"):
            objects.pop((job, name), None)
    monkeypatch.setattr(storage, "delete", delete)
    monkeypatch.setattr(LocalCoach, "available", lambda self: True)
    return objects


def test_queue_payload_is_id_only_and_failed_publish_cleans_up(monkeypatch, store):
    client, enqueue = TestClient(app), AsyncMock()
    monkeypatch.setattr(router, "enqueue_task", enqueue)
    accepted = client.post("/coaching/analyze", json=request().model_dump(mode="json"))
    assert accepted.status_code == 202
    job_id = accepted.json()["job_id"]
    assert enqueue.await_args.args == (tasks.analyze_coaching, job_id)
    assert client.get(f"/coaching/jobs/{job_id}").json()["status"] == "queued"
    assert client.delete(f"/coaching/jobs/{job_id}").status_code == 409
    assert client.post(f"/coaching/jobs/{job_id}/answers", json={"question_id": "q", "answer": "A"}).status_code == 409
    before = dict(store)
    enqueue.side_effect = QueueUnavailable("unavailable")
    assert client.post("/coaching/analyze", json=request().model_dump(mode="json")).status_code == 503
    assert store == before


def test_worker_duplicate_delivery_and_delete(monkeypatch, store):
    job_id = str(uuid4())
    store[job_id, "request.json"] = {"kind": "analysis", "input": request().model_dump(mode="json")}
    store[job_id, "status.json"] = CoachingJob(job_id=job_id, status="queued").model_dump(mode="json")
    report = run_coaching(request(), Coach(*outputs()), lambda *a, **kw: [hit()])
    analysis = Mock(return_value=report)
    monkeypatch.setattr(tasks, "run_coaching", analysis)
    lock = Mock()
    lock.acquire.return_value = True
    monkeypatch.setattr(tasks, "redis_client", lambda: Mock(lock=Mock(return_value=lock)))
    for _ in range(2):
        assert tasks.analyze_coaching.run(job_id) == {"job_id": job_id}
    analysis.assert_called_once()
    client = TestClient(app)
    assert client.get(f"/coaching/jobs/{job_id}").json()["status"] == "completed"
    assert client.post(f"/coaching/jobs/{job_id}/answers", json={"question_id": "wrong", "answer": "A"}).status_code == 422
    assert client.delete(f"/coaching/jobs/{job_id}").status_code == 204
    assert client.get(f"/coaching/jobs/{job_id}").status_code == 404
    tasks.analyze_coaching.run(job_id)
    analysis.assert_called_once()


def test_local_recording_cannot_silently_use_hosted_or_synthetic_asr(monkeypatch):
    from app.speech import router as speech_router
    store = Mock()
    monkeypatch.setattr(speech_router, "_store_upload", store)
    for provider in ("deepgram", "json"):
        monkeypatch.setenv("ASR_PROVIDER", provider)
        result = TestClient(app).post("/speech/analyze", data={"transcribe": "true", "local_only": "true"},
                                      files={"recording": ("test.wav", b"synthetic", "audio/wav")})
        assert result.status_code == 503
    store.assert_not_called()
