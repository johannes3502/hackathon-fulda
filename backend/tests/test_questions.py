"""Question simulator with scripted model answers. Synthetic data only."""

import json
from unittest.mock import AsyncMock, Mock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.factcheck.llm import LLMError
from app.factcheck.models import ClaimResult, Evidence
from app.main import app
from app.questions import pipeline, router as questions_router
from app.questions.models import AnswerRequest, Question, QuestionRequest
from app.questions.pipeline import generate_questions, review_answer
from tests.test_factcheck import SLIDE, TRANSCRIPT, hit

SOURCE = Evidence(kind="upload", label="folien.pptx, Folie 3", quote="rund 9.000 Studierende",
                  passage=SLIDE, filename="folien.pptx")
CLAIMS = [
    ClaimResult(claim="Die Hochschule hat 9000 Studierende.", transcript="Unsere Hochschule hat 9000 Studierende.",
                t_ms=5000, duration_ms=1450, verdict="supports", explanation="", evidence=SOURCE, checked=["upload"]),
    ClaimResult(claim="Der Mond besteht aus Käse.", transcript="Der Mond besteht aus Käse.", t_ms=13000,
                duration_ms=1250, verdict="contradicts", explanation="Laut Artikel Gestein.", checked=["upload", "web"],
                evidence=Evidence(kind="web", label="Wikipedia: Mond", quote="überwiegend aus Silikatgestein",
                                  passage="Der Mond besteht überwiegend aus Silikatgestein.",
                                  url="https://de.wikipedia.org/wiki/Mond")),
    ClaimResult(claim="Die Hochschule wurde 1974 gegründet.", transcript="Sie wurde 1974 gegründet.", t_ms=9000,
                duration_ms=900, verdict="not_found", explanation="", checked=["upload"]),
]


class Model:
    model = "test-model"

    def __init__(self, answer):
        self.answer = answer
        self.prompts = []

    def complete_json(self, system, user):
        self.prompts.append((system, user))
        return self.answer(system, user) if callable(self.answer) else self.answer


GENERATED = {"questions": [
    {"kind": "clarification", "question": "Was meinen Sie mit schön?", "reason": "Begrüßung vage.", "sentences": [1]},
    {"kind": "gap", "question": "Welche Fachbereiche gibt es?", "reason": "Folie nennt acht Fachbereiche.",
     "passage": 1, "quote": "in acht Fachbereichen", "query": "Fachbereiche"},
    {"kind": "contradiction", "question": "Woraus besteht der Mond?", "reason": "Quelle widerspricht.",
     "finding": 2, "sentences": [4], "query": "Mond Gestein"},
    {"kind": "unsupported", "question": "Woher stammt das Gründungsjahr?", "reason": "Nicht belegt.", "finding": 3},
    {"kind": "contradiction", "question": "Erfundener Widerspruch?", "reason": "x", "finding": 1, "sentences": [2]},
    {"kind": "gap", "question": "Erfundene Lücke?", "reason": "x", "passage": 1, "quote": "steht nicht im Auszug drin"},
    {"kind": "clarification", "question": "Woraus besteht der Mond?", "sentences": [4]},
    {"kind": "clarification", "question": "Ohne Bezug?"},
    "kein Objekt",
]}


def request(**kwargs) -> QuestionRequest:
    kwargs.setdefault("config", {"max_questions": 5})
    return QuestionRequest(words=TRANSCRIPT, collection_id=uuid4(), claims=CLAIMS, **kwargs)


def test_questions_are_grounded_ordered_and_timed_by_code():
    model = Model(GENERATED)
    queries = []
    result = generate_questions(request(), model, retrieve=lambda c, q, k: queries.append((q, k)) or [hit()],
                                ready_sources=lambda c: 1)

    assert [(q.id, q.kind, q.question) for q in result.questions] == [
        ("q1", "contradiction", "Woraus besteht der Mond?"),
        ("q2", "unsupported", "Woher stammt das Gründungsjahr?"),
        ("q3", "gap", "Welche Fachbereiche gibt es?"),
        ("q4", "clarification", "Was meinen Sie mit schön?"),
        ("q5", "clarification", "Erfundener Widerspruch?"),
    ]
    moon, founded, gap, vague, invented = result.questions
    # Timestamps and evidence come from the referenced finding, not the model.
    assert (moon.t_ms, moon.duration_ms, moon.evidence.kind) == (13000, 1250, "web")
    assert moon.claim == "Der Mond besteht aus Käse." and moon.query == "Mond Gestein"
    assert founded.t_ms == 9000 and founded.evidence is None and founded.query == "Die Hochschule wurde 1974 gegründet."
    assert gap.t_ms is None and gap.evidence.quote == "in acht Fachbereichen" and gap.evidence.label == "folien.pptx, Folie 3"
    assert vague.t_ms == 0 and vague.transcript == "Hallo zusammen, schön dass ihr da seid."
    # A "supports" finding does not justify a contradiction question.
    assert invented.evidence is None and invented.claim is None and invented.t_ms == 5000

    assert [(e.t_ms, e.type, e.source, e.severity) for e in result.events] == [
        (0, "question", "agent", "info"), (5000, "question", "agent", "info"),
        (9000, "question", "agent", "hint"), (13000, "question", "agent", "warning")]
    assert "t_ms" not in result.events[0].payload
    assert result.sources_used and len(queries) == 1 and queries[0][1] == 6
    system, user = model.prompts[0]
    assert "Höchstens 5 Fragen" in system
    assert "[2] (00:13) widerspricht: Der Mond besteht aus Käse." in user and "[1] folien.pptx, Folie 3:" in user


def test_without_sources_or_findings_and_broken_answers():
    model = Model({"questions": []})
    retrieve = Mock()
    result = generate_questions(QuestionRequest(words=TRANSCRIPT), model, retrieve=retrieve, ready_sources=lambda c: 0)
    retrieve.assert_not_called()
    assert result.questions == [] and not result.sources_used
    assert any("Ohne Faktencheck" in n for n in result.notices)
    assert any("keine belastbaren" in n for n in result.notices)
    assert "(kein Faktencheck vorhanden)" in model.prompts[0][1] and "(keine Auszüge)" in model.prompts[0][1]

    with pytest.raises(LLMError):
        generate_questions(request(), Model({"unexpected": True}), ready_sources=lambda c: 0)


def question(**kwargs) -> Question:
    return Question(**{"id": "q1", "kind": "contradiction", "question": "Woraus besteht der Mond?",
                       "reason": "Quelle widerspricht.", "t_ms": 13000, "duration_ms": 1250,
                       "transcript": "Der Mond besteht aus Käse.", "evidence": CLAIMS[1].evidence,
                       "query": "Mond Gestein", **kwargs})


def test_answer_review_uses_question_evidence_and_verifies_quotes():
    model = Model({"verdict": "supports", "passage": 1, "quote": "überwiegend aus Silikatgestein",
                   "explanation": "Der Artikel nennt Silikatgestein.", "follow_up": "Welche Quelle nutzen Sie?"})
    queries = []
    review = review_answer(AnswerRequest(question=question(), answer="Aus Gestein.", collection_id=uuid4()), model,
                           retrieve=lambda c, q, k: queries.append(q) or [hit()])
    assert review.verdict == "supports" and review.evidence.label == "Wikipedia: Mond"
    assert review.checked == ["web", "upload"] and queries == ["Mond Gestein Aus Gestein."]
    assert review.follow_up.id == "q1.f" and review.follow_up.kind == "follow_up"
    assert review.follow_up.t_ms == 13000 and review.follow_up.evidence == question().evidence
    assert "[1] Wikipedia: Mond:" in model.prompts[0][1] and "[2] folien.pptx, Folie 3:" in model.prompts[0][1]

    invented = review_answer(AnswerRequest(question=question(), answer="Aus Käse."),
                             Model({"verdict": "contradicts", "passage": 1, "quote": "besteht ganz aus Käse und Milch"}))
    assert invented.verdict == "unchecked" and invented.evidence is None and invented.follow_up is None
    assert any("nicht wörtlich" in n for n in invented.notes)


def test_answer_review_without_passages_or_model_is_unchecked():
    model = Model(lambda s, u: (_ for _ in ()).throw(LLMError("down")))
    bare = question(evidence=None)
    review = review_answer(AnswerRequest(question=bare, answer="Aus Gestein."), model)
    assert review.verdict == "unchecked" and model.prompts == []
    down = review_answer(AnswerRequest(question=question(), answer="Aus Gestein."), model)
    assert down.verdict == "unchecked" and any("nicht erreichbar" in n for n in down.notes)


def test_api_requires_model_and_accepts_jobs(monkeypatch):
    client = TestClient(app)
    monkeypatch.delenv("LLM_BASE_URL", raising=False)
    monkeypatch.setenv("LLM_MODEL", "requires-explicit-base-url")
    body = {"words": [w.model_dump() for w in TRANSCRIPT]}
    assert client.post("/questions", json=body).status_code == 503
    assert client.post("/questions", json={"words": []}).status_code == 422
    answer = {"question": question().model_dump(mode="json"), "answer": "Aus Gestein."}
    assert client.post("/questions/answers", json=answer).status_code == 503
    assert client.post("/questions/answers", json={**answer, "answer": ""}).status_code == 422

    monkeypatch.setenv("LLM_BASE_URL", "https://llm.example/v1")
    monkeypatch.setenv("LLM_MODEL", "demo-model")
    store, enqueue = Mock(), AsyncMock(return_value="task")
    monkeypatch.setattr(questions_router, "_store", store)
    monkeypatch.setattr(questions_router, "enqueue_task", enqueue)
    response = client.post("/questions", json=body)
    assert response.status_code == 202
    job_id = response.json()["job_id"]
    assert response.json()["status_url"] == f"/questions/jobs/{job_id}"
    assert enqueue.await_args.args == (questions_router.generate_questions, job_id)
    response = client.post("/questions/answers", json=answer)
    assert response.json()["status_url"] == f"/questions/answers/{response.json()['job_id']}"
    assert enqueue.await_args.args[0] is questions_router.review_answer

    monkeypatch.setattr(questions_router.storage, "read_json", lambda job, name, prefix: None)
    assert client.get(f"/questions/jobs/{uuid4()}").status_code == 404
    assert client.get(f"/questions/answers/{uuid4()}").status_code == 404


def test_tasks_are_idempotent_and_delete_the_stored_request(monkeypatch):
    from app import tasks
    from app.factcheck import llm

    store: dict = {}
    monkeypatch.setattr(tasks.storage, "read_json", lambda job, name, prefix: store.get((prefix, name)))
    monkeypatch.setattr(tasks.storage, "write_json",
                        lambda job, name, value, prefix: store.__setitem__((prefix, name), value))
    s3 = Mock()
    s3.delete_object.side_effect = lambda Bucket, Key: store.pop(tuple(Key.split("/")[::2]), None)
    monkeypatch.setattr(tasks, "s3_client", lambda: s3)
    monkeypatch.setenv("S3_BUCKET", "test")
    redis = Mock()
    redis.lock.return_value.acquire.return_value = True
    monkeypatch.setattr("app.connections.redis_client", lambda: redis)
    model = Model(GENERATED)
    monkeypatch.setattr(llm, "configured_llm", lambda: model)
    monkeypatch.setattr(pipeline, "generate_questions",
                        lambda r, m, **k: generate_questions(r, m, ready_sources=lambda c: 0))

    store[(tasks.QUESTION_PREFIX, "request.json")] = request().model_dump(mode="json")
    tasks.generate_questions.run("job-1")
    status = store[(tasks.QUESTION_PREFIX, "status.json")]
    assert status["status"] == "completed" and (tasks.QUESTION_PREFIX, "request.json") not in store
    assert len(status["result"]["questions"]) == 4  # Gap question has no passage without sources.
    tasks.generate_questions.run("job-1")  # Redelivery reuses the terminal result; no new model calls.
    assert len(model.prompts) == 1

    store[(tasks.ANSWER_PREFIX, "request.json")] = AnswerRequest(question=question(), answer="x").model_dump(mode="json")
    monkeypatch.setattr(llm, "configured_llm", Mock(side_effect=ValueError("not configured")))
    tasks.review_answer.run("job-2")
    assert store[(tasks.ANSWER_PREFIX, "status.json")]["status"] == "failed"
    assert (tasks.ANSWER_PREFIX, "request.json") not in store


def test_persona_changes_the_role_not_the_grounding():
    tutor = Model({"questions": []})
    generate_questions(request(), tutor, retrieve=lambda c, q, k: [hit()], ready_sources=lambda c: 1)
    student = Model({"questions": []})
    result = generate_questions(request(persona="student"), student, retrieve=lambda c, q, k: [hit()],
                                ready_sources=lambda c: 1)
    assert result.persona == "student" and any("Studierender" in n for n in result.notices)
    assert student.prompts[0][0].startswith(pipeline.PERSONAS["student"])
    assert tutor.prompts[0][0].startswith(pipeline.PERSONAS["tutor"])
    # Same transcript, findings and passages reach the model in both roles.
    assert student.prompts[0][1] == tutor.prompts[0][1]


def test_spoken_reply_is_kept_only_with_a_verified_quote():
    reply = "Ah, okay, in den Unterlagen steht ja Silikatgestein."
    model = Model({"verdict": "supports", "passage": 1, "quote": "überwiegend aus Silikatgestein",
                   "explanation": "Der Artikel nennt Silikatgestein.", "reply": reply})
    review = review_answer(AnswerRequest(question=question(), answer="Aus Gestein.", persona="student"), model)
    assert review.reply == reply and model.prompts[0][0].startswith(pipeline.PERSONAS["student"])

    invented = review_answer(AnswerRequest(question=question(), answer="Aus Käse.", persona="student"),
                             Model({"verdict": "contradicts", "passage": 1, "quote": "besteht ganz aus Käse",
                                    "reply": "Laut Folie 9 ist der Mond aus Milch."}))
    assert invented.reply == pipeline.FALLBACK_REPLY["student"]
    bare = review_answer(AnswerRequest(question=question(evidence=None), answer="Aus Gestein."), model)
    assert bare.verdict == "unchecked" and bare.reply == pipeline.FALLBACK_REPLY["tutor"]


class Transcriber:
    def __init__(self, words):
        self.words = words

    def transcribe(self, audio_path):
        return self.words


def test_voice_answer_is_transcribed_then_reviewed(monkeypatch, tmp_path):
    from app.questions.models import VoiceAnswerRequest
    from app.transcription.models import Word

    monkeypatch.setattr(pipeline, "extract_audio", lambda recording, target: target)
    voice = VoiceAnswerRequest(question=question(), persona="tutor")
    model = Model({"verdict": "supports", "passage": 1, "quote": "überwiegend aus Silikatgestein",
                   "explanation": "Passt.", "reply": "Richtig, die Quelle nennt Silikatgestein."})
    words = [Word(word="Aus", start_ms=0, end_ms=200), Word(word="Gestein.", start_ms=200, end_ms=700)]
    review = pipeline.review_voice_answer(voice, tmp_path / "a.webm", Transcriber(words), model, retrieve=None)
    assert review.answer == "Aus Gestein." and review.verdict == "supports"
    assert "Antwort: Aus Gestein." in model.prompts[0][1]

    silent = pipeline.review_voice_answer(voice, tmp_path / "a.webm", Transcriber([]), model, retrieve=None)
    assert silent.verdict == "unchecked" and silent.reply == pipeline.UNHEARD_REPLY["tutor"]
    assert len(model.prompts) == 1


def test_voice_api_needs_asr_and_stores_the_audio(monkeypatch):
    client = TestClient(app)
    monkeypatch.setenv("LLM_BASE_URL", "https://llm.example/v1")
    monkeypatch.setenv("LLM_MODEL", "demo-model")
    monkeypatch.setenv("ASR_PROVIDER", "deepgram")
    monkeypatch.delenv("DEEPGRAM_API_KEY", raising=False)
    files = {"recording": ("answer.webm", b"synthetic", "audio/webm")}
    form = {"request": json.dumps({"question": question().model_dump(mode="json"), "persona": "student"})}
    assert client.post("/questions/answers/voice", files=files, data=form).status_code == 503
    monkeypatch.setenv("DEEPGRAM_API_KEY", "test-key")
    assert client.post("/questions/answers/voice", files=files,
                       data={"request": '{"persona": "student"}'}).status_code == 422

    stored = []
    enqueue = AsyncMock(return_value="task")
    monkeypatch.setattr(questions_router, "_store", lambda job, req, prefix, status, recording:
                        stored.append((req, recording.read())))
    monkeypatch.setattr(questions_router, "enqueue_task", enqueue)
    response = client.post("/questions/answers/voice", files=files, data=form)
    assert response.status_code == 202
    assert response.json()["status_url"] == f"/questions/answers/{response.json()['job_id']}"
    assert enqueue.await_args.args[0] is questions_router.review_voice_answer
    assert stored[0][0].persona == "student" and stored[0][1] == b"synthetic"


def test_voice_task_deletes_audio_and_request(monkeypatch):
    from app import tasks
    from app.factcheck import llm
    from app.questions.models import VoiceAnswerRequest
    from app.transcription import transcriber

    store: dict = {(tasks.ANSWER_PREFIX, "recording"): b"synthetic",
                   (tasks.ANSWER_PREFIX, "request.json"): VoiceAnswerRequest(question=question()).model_dump(mode="json")}
    monkeypatch.setattr(tasks.storage, "read_json", lambda job, name, prefix: store.get((prefix, name)))
    monkeypatch.setattr(tasks.storage, "write_json",
                        lambda job, name, value, prefix: store.__setitem__((prefix, name), value))
    s3 = Mock()
    s3.delete_object.side_effect = lambda Bucket, Key: store.pop(tuple(Key.split("/")[::2]), None)
    monkeypatch.setattr(tasks, "s3_client", lambda: s3)
    monkeypatch.setenv("S3_BUCKET", "test")
    redis = Mock()
    redis.lock.return_value.acquire.return_value = True
    monkeypatch.setattr("app.connections.redis_client", lambda: redis)
    monkeypatch.setattr(llm, "configured_llm", lambda: Model({}))
    monkeypatch.setattr(transcriber, "configured_transcriber", lambda: Transcriber([]))
    monkeypatch.setattr(pipeline, "extract_audio", lambda recording, target: target)

    tasks.review_voice_answer.run("job-3")
    status = store[(tasks.ANSWER_PREFIX, "status.json")]
    assert status["status"] == "completed" and status["result"]["reply"] == pipeline.UNHEARD_REPLY["tutor"]
    assert (tasks.ANSWER_PREFIX, "recording") not in store and (tasks.ANSWER_PREFIX, "request.json") not in store
    assert s3.download_file.call_args.args[1] == f"{tasks.ANSWER_PREFIX}/job-3/recording"
