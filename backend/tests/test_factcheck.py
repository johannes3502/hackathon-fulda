"""Fact-check pipeline with scripted model answers. Synthetic data only."""

import json
from unittest.mock import AsyncMock, Mock
from uuid import uuid4

import httpx
import pytest
from fastapi.testclient import TestClient

from app.factcheck import router as factcheck_router
from app.factcheck.llm import LLMError, OpenAICompatibleChat, configured_llm, parse_json_object
from app.factcheck.models import FactCheckRequest
from app.factcheck.pipeline import EXTRACT_PROMPT, run_fact_check
from app.factcheck.transcript import sentences
from app.factcheck.web import WebPassage, WikipediaSearcher, best_passages
from app.main import app
from app.sources.models import Location, SourceHit
from app.transcription.models import Word


def words(text: str, start_ms: int = 0, step_ms: int = 300) -> list[Word]:
    return [Word(word=w, start_ms=start_ms + i * step_ms, end_ms=start_ms + i * step_ms + 250)
            for i, w in enumerate(text.split())]


TRANSCRIPT = (words("Hallo zusammen, schön dass ihr da seid.")
              + words("Unsere Hochschule hat 9000 Studierende.", 5000)
              + words("Sie wurde 1974 gegründet.", 9000)
              + words("Der Mond besteht aus Käse.", 13000))

SLIDE = ("Die Hochschule Fulda hat rund 9.000 Studierende in acht Fachbereichen. "
         "Gegründet wurde sie 1974 als Fachhochschule.")


def hit(text: str = SLIDE) -> SourceHit:
    return SourceHit(chunk_id=1, source_id=uuid4(), filename="folien.pptx",
                     location=Location(kind="slide", start=3, end=3), text=text, matched_by=["keyword"])


class ScriptedModel:
    """Answers extraction with fixed claims; judgments come from `judge(claim, context)`."""

    model = "test-model"

    def __init__(self, judge, claims=None):
        self.judge = judge
        self.claims = claims if claims is not None else [
            {"sentences": [2], "claim": "Die Hochschule hat 9000 Studierende.", "query": "Hochschule Studierende"},
            {"sentences": [3], "claim": "Die Hochschule wurde 1974 gegründet.", "query": "Gründung Hochschule"},
            {"sentences": [4], "claim": "Der Mond besteht aus Käse.", "query": "Mond Zusammensetzung"},
            {"sentences": [99], "claim": "Ohne gültigen Satz.", "query": "x"},
            "kein Objekt",
        ]
        self.prompts = []

    def complete_json(self, system, user):
        self.prompts.append((system, user))
        if system.startswith(EXTRACT_PROMPT[:40]):
            return {"claims": self.claims}
        claim = user.split("\n", 1)[0].removeprefix("Behauptung: ")
        return self.judge(claim, user)


class FakeSearcher:
    name = "wikipedia"

    def __init__(self, passages):
        self.passages = passages
        self.queries = []

    def search(self, query, limit):
        self.queries.append(query)
        return self.passages[:limit]


def request(**kwargs) -> FactCheckRequest:
    return FactCheckRequest(words=TRANSCRIPT, collection_id=uuid4(), **kwargs)


def test_sentences_follow_punctuation_gaps_and_length():
    items = sentences(words("Erster Satz. zweiter ohne Punkt") + words("nach Pause", 5000))
    assert [(s.number, s.text, s.start_ms) for s in items] == [
        (1, "Erster Satz.", 0), (2, "zweiter ohne Punkt", 600), (3, "nach Pause", 5000)]
    assert items[1].end_ms == 1450
    assert len(sentences(words("wort " * 85), max_words=40)) == 3


def test_parse_json_object_tolerates_fences_and_prose():
    assert parse_json_object('```json\n{"a": 1}\n```') == {"a": 1}
    assert parse_json_object('Hier: {"a": {"b": 2}} fertig') == {"a": {"b": 2}}
    for broken in ("keine Antwort", "{kaputt}", "[1, 2]", '[{"claims": []}]', '[{"claims": []}'):
        with pytest.raises(LLMError):
            parse_json_object(broken)


def test_openai_compatible_contract(monkeypatch):
    def handle(req):
        assert str(req.url) == "https://llm.example/v1/chat/completions"
        assert req.headers["authorization"] == "Bearer test-only"
        body = json.loads(req.read())
        assert body["model"] == "demo-model" and body["response_format"] == {"type": "json_object"}
        assert "temperature" not in body  # Omitted unless configured; some models reject it.
        assert [m["role"] for m in body["messages"]] == ["system", "user"]
        return httpx.Response(200, json={"choices": [{"message": {"content": '{"ok": true}'}}]})

    chat = OpenAICompatibleChat("https://llm.example/v1/", "demo-model", "test-only", transport=httpx.MockTransport(handle))
    assert chat.complete_json("s", "u") == {"ok": True}
    failing = OpenAICompatibleChat("https://llm.example/v1", "m", transport=httpx.MockTransport(lambda r: httpx.Response(500)))
    with pytest.raises(LLMError):
        failing.complete_json("s", "u")

    monkeypatch.delenv("LLM_BASE_URL", raising=False)
    monkeypatch.delenv("LLM_MODEL", raising=False)
    with pytest.raises(ValueError):
        configured_llm()
    monkeypatch.setenv("LLM_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai")
    monkeypatch.setenv("LLM_MODEL", "gemini-3.1-flash-lite")
    monkeypatch.setenv("LLM_API_KEY", "test-only")
    monkeypatch.setenv("LLM_JSON_MODE", "false")
    monkeypatch.setenv("LLM_TEMPERATURE", "0")
    cloud = configured_llm()
    assert (cloud.json_mode, cloud.temperature) == (False, 0.0)


def test_uploads_first_quotes_verified_and_web_second():
    def judge(claim, context):
        if "9000" in claim:
            return {"verdict": "supports", "passage": 1, "quote": "rund 9.000 Studierende in acht Fachbereichen",
                    "explanation": "Folie nennt rund 9.000 Studierende."}
        if "1974" in claim:  # Invented quote must not count as evidence.
            return {"verdict": "supports", "passage": 1, "quote": "gegründet im Jahr 1974 von Fulda",
                    "explanation": "erfunden"}
        if "Wikipedia" in context:
            return {"verdict": "contradicts", "passage": 1, "quote": "besteht überwiegend aus Silikatgestein",
                    "explanation": "Laut Artikel besteht der Mond aus Gestein."}
        return {"verdict": "not_found", "passage": None, "quote": "", "explanation": "Nicht in den Folien."}

    searcher = FakeSearcher([WebPassage(title="Mond", url="https://de.wikipedia.org/wiki/Mond",
                                        text="Der Mond besteht überwiegend aus Silikatgestein.")])
    retrieved = []
    result = run_fact_check(request(), ScriptedModel(judge), searcher,
                            retrieve=lambda c, q, k: retrieved.append(q) or [hit()], ready_sources=lambda c: 1)

    assert [c.claim for c in result.claims] == ["Die Hochschule hat 9000 Studierende.",
                                                 "Die Hochschule wurde 1974 gegründet.", "Der Mond besteht aus Käse."]
    supported, invented, moon = result.claims
    assert supported.verdict == "supports" and supported.checked == ["upload"]
    assert supported.evidence.kind == "upload" and supported.evidence.label == "folien.pptx, Folie 3"
    assert supported.evidence.location.kind == "slide" and supported.evidence.url is None
    assert supported.t_ms == 5000 and supported.duration_ms == 1450  # From words, not from the model.
    assert supported.transcript == "Unsere Hochschule hat 9000 Studierende."

    # Discarded upload judgment falls through to the web, which has no quote for it either.
    assert invented.verdict == "unchecked" and invented.evidence is None
    assert invented.checked == ["upload", "web"] and any("nicht wörtlich" in n for n in invented.notes)

    assert moon.verdict == "contradicts" and moon.checked == ["upload", "web"]
    assert moon.evidence.kind == "web" and moon.evidence.url == "https://de.wikipedia.org/wiki/Mond"
    assert moon.evidence.label == "Wikipedia: Mond"
    assert searcher.queries == ["Gründung Hochschule", "Mond Zusammensetzung"]  # Supported claim never leaves.
    assert sorted(retrieved) == sorted(["Hochschule Studierende", "Gründung Hochschule", "Mond Zusammensetzung"])

    assert [(e.t_ms, e.type, e.source, e.severity) for e in result.events] == [
        (5000, "fact", "factcheck", "info"), (9000, "fact", "factcheck", "info"), (13000, "fact", "factcheck", "warning")]
    assert result.events[2].payload["verdict"] == "contradicts" and "t_ms" not in result.events[2].payload
    assert result.sources_checked and result.web_provider == "wikipedia" and result.model == "test-model"


def test_without_sources_only_web_and_without_web_nothing():
    model = ScriptedModel(lambda claim, context: {"verdict": "not_found", "explanation": ""})
    retrieve = Mock()
    searcher = FakeSearcher([])
    result = run_fact_check(request(), model, searcher, retrieve=retrieve, ready_sources=lambda c: 0)
    retrieve.assert_not_called()
    assert all(c.checked == ["web"] and c.verdict == "not_found" for c in result.claims)
    assert not result.sources_checked and any("nur im Web" in n for n in result.notices)

    offline = run_fact_check(request(use_web=False), model, searcher, retrieve=retrieve, ready_sources=lambda c: 0)
    assert all(c.checked == [] and c.verdict == "not_found" for c in offline.claims)
    assert offline.web_provider is None and any("nicht geprüft" in n for n in offline.notices)
    assert len(searcher.queries) == 3


def test_failed_lookups_are_unchecked_not_false():
    def judge(claim, context):
        raise LLMError("timeout")

    result = run_fact_check(request(use_web=False), ScriptedModel(judge), None,
                            retrieve=lambda c, q, k: [hit()], ready_sources=lambda c: 1)
    assert {c.verdict for c in result.claims} == {"unchecked"}
    assert {e.severity for e in result.events} == {"info"}

    empty = run_fact_check(request(), ScriptedModel(judge, claims=[]), None, ready_sources=lambda c: 1)
    assert empty.claims == [] and any("Keine prüfbaren" in n for n in empty.notices)


def test_extraction_failure_fails_the_job():
    class Broken(ScriptedModel):
        def complete_json(self, system, user):
            return {"unexpected": True}

    with pytest.raises(LLMError):
        run_fact_check(request(), Broken(None), None, ready_sources=lambda c: 0)


def test_wikipedia_searcher_contract():
    article = "Einleitung über den Mond.\n== Aufbau ==\nDer Mond besteht überwiegend aus Silikatgestein.\nSonstiges."

    def handle(req):
        assert req.headers["user-agent"].startswith("PresentationTrainer/")
        params = req.url.params
        if params.get("list") == "search":
            assert params["srsearch"] == "Mond Gestein"
            return httpx.Response(200, json={"query": {"search": [{"title": "Mond"}]}})
        assert params["titles"] == "Mond" and params["explaintext"] == "1"
        return httpx.Response(200, json={"query": {"pages": [
            {"title": "Mond", "fullurl": "https://de.wikipedia.org/wiki/Mond", "extract": article}]}})

    found = WikipediaSearcher(transport=httpx.MockTransport(handle)).search("Mond Gestein", 2)
    assert found[0].url == "https://de.wikipedia.org/wiki/Mond"
    assert "Silikatgestein" in found[0].text and "== Aufbau ==" not in found[0].text
    assert best_passages("a\nb", "nichts passendes", 3) == []


def test_api_settings_validation_and_accept(monkeypatch):
    client = TestClient(app)
    monkeypatch.delenv("LLM_BASE_URL", raising=False)
    monkeypatch.setenv("LLM_MODEL", "requires-explicit-base-url")
    monkeypatch.setenv("WEB_SEARCH_PROVIDER", "none")
    assert client.get("/factcheck/settings").json() == {
        "available": False, "model": None, "llm_host": None, "web_provider": None}
    body = {"words": [w.model_dump() for w in TRANSCRIPT], "collection_id": str(uuid4())}
    assert client.post("/factcheck", json=body).status_code == 503
    assert client.post("/factcheck", json={"words": []}).status_code == 422

    monkeypatch.setenv("LLM_BASE_URL", "https://llm.example/v1")
    monkeypatch.setenv("LLM_MODEL", "demo-model")
    monkeypatch.setenv("WEB_SEARCH_PROVIDER", "tavily")
    monkeypatch.delenv("TAVILY_API_KEY", raising=False)
    assert client.get("/factcheck/settings").json() == {
        "available": True, "model": "demo-model", "llm_host": "llm.example", "web_provider": "tavily"}
    assert client.post("/factcheck", json=body).status_code == 503  # Web provider lacks its key.

    store, enqueue = Mock(), AsyncMock(return_value="task")
    monkeypatch.setattr(factcheck_router, "_store", store)
    monkeypatch.setattr(factcheck_router, "enqueue_task", enqueue)
    response = client.post("/factcheck", json={**body, "use_web": False})
    assert response.status_code == 202
    job_id = response.json()["job_id"]
    assert response.json()["status_url"] == f"/factcheck/jobs/{job_id}"
    assert store.call_args.args[1].use_web is False
    assert enqueue.await_args.args[1] == job_id

    monkeypatch.setattr(factcheck_router.storage, "read_json", lambda job, name, prefix: None)
    assert client.get(f"/factcheck/jobs/{uuid4()}").status_code == 404


def test_task_is_idempotent_and_deletes_the_stored_transcript(monkeypatch):
    from app import tasks
    from app.factcheck import llm, pipeline, web

    store = {"request.json": FactCheckRequest(words=TRANSCRIPT, use_web=False).model_dump(mode="json")}
    monkeypatch.setattr(tasks.storage, "read_json", lambda job, name, prefix: store.get(name))
    monkeypatch.setattr(tasks.storage, "write_json", lambda job, name, value, prefix: store.__setitem__(name, value))
    s3 = Mock()
    s3.delete_object.side_effect = lambda Bucket, Key: store.pop(Key.rsplit("/", 1)[1], None)
    monkeypatch.setattr(tasks, "s3_client", lambda: s3)
    monkeypatch.setenv("S3_BUCKET", "test")
    redis = Mock()
    redis.lock.return_value.acquire.return_value = True
    monkeypatch.setattr("app.connections.redis_client", lambda: redis)
    model = ScriptedModel(lambda claim, context: {"verdict": "not_found"})
    monkeypatch.setattr(llm, "configured_llm", lambda: model)
    monkeypatch.setattr(web, "configured_web_searcher", lambda: None)
    monkeypatch.setattr(pipeline, "run_fact_check", lambda *a, **k: run_fact_check(*a, ready_sources=lambda c: 0, **k))

    tasks.fact_check.run("job-1")
    assert store["status.json"]["status"] == "completed" and "request.json" not in store
    assert len(store["status.json"]["result"]["claims"]) == 3
    calls = len(model.prompts)
    tasks.fact_check.run("job-1")  # Redelivery reuses the terminal result; no new model calls.
    assert len(model.prompts) == calls

    store.clear()
    store["request.json"] = FactCheckRequest(words=TRANSCRIPT).model_dump(mode="json")
    monkeypatch.setattr(llm, "configured_llm", Mock(side_effect=ValueError("not configured")))
    tasks.fact_check.run("job-2")
    assert store["status.json"]["status"] == "failed" and "request.json" not in store
