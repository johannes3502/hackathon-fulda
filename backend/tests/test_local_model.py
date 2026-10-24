"""The local default must never become a hosted inference request implicitly."""
import json
from unittest.mock import Mock

import httpx
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.factcheck.local import LocalOllamaChat
from app.factcheck.pipeline import judge, Claim
from app.factcheck.models import FactCheckConfig


def test_local_json_contract_and_no_cloud():
    def handler(request):
        assert request.url.host in {"127.0.0.1", "host.docker.internal"}
        body = json.loads(request.content)
        assert body["format"] == "json" and body["think"] is False and body["stream"] is False
        assert body["options"]["temperature"] == 0
        assert "untrusted data" in body["messages"][0]["content"]
        return httpx.Response(200, json={"done": True, "done_reason": "stop", "message": {"content": '{"claims": []}'}})
    assert LocalOllamaChat(transport=httpx.MockTransport(handler)).complete_json("test", "synthetic") == {"claims": []}
    for url in ("https://api.example.com", "http://localhost.evil:11434", "http://user:pass@localhost:11434"):
        with pytest.raises(ValueError):
            LocalOllamaChat(endpoint=url)
    with pytest.raises(ValueError):
        LocalOllamaChat(model="test:cloud")
    truncated = LocalOllamaChat(transport=httpx.MockTransport(lambda _: httpx.Response(200, json={"done": True, "done_reason": "length"})))
    with pytest.raises(ValueError, match="incomplete"):
        truncated.complete_json("test", "synthetic")


def test_unverifiable_local_judgment_is_unchecked_not_missing_evidence():
    model = Mock()
    model.complete_json.return_value = {"verdict": "supports", "quote": "invented", "passage": 1}
    result = judge(model, Claim("synthetic", "query", ()), [], FactCheckConfig())
    assert result[0] == "unchecked" and result[2] is None


def test_local_asr_requirement_rejects_hosted_and_synthetic_before_upload(monkeypatch):
    from app.speech import router
    store = Mock()
    monkeypatch.setattr(router, "_store_upload", store)
    for provider in ("deepgram", "json"):
        monkeypatch.setenv("ASR_PROVIDER", provider)
        result = TestClient(app).post("/speech/analyze", data={"transcribe": "true", "local_only": "true"},
                                     files={"recording": ("synthetic.wav", b"synthetic", "audio/wav")})
        assert result.status_code == 503
    store.assert_not_called()


def test_colima_host_is_local_and_settings_remain_available(monkeypatch):
    monkeypatch.delenv("LLM_BASE_URL", raising=False)
    monkeypatch.delenv("LLM_MODEL", raising=False)
    monkeypatch.setenv("OLLAMA_URL", "http://host.lima.internal:11434")
    def handler(request):
        assert request.url.host == "host.lima.internal"
        assert request.url.path == "/api/tags"
        return httpx.Response(200, json={"models": [{"name": "qwen3.5:4b-q4_K_M"}]})
    assert LocalOllamaChat(transport=httpx.MockTransport(handler)).available()
    monkeypatch.setattr(LocalOllamaChat, "available", lambda self: True)
    response = TestClient(app).get("/factcheck/settings")
    assert response.status_code == 200
    assert response.json()["available"] is True
    assert response.json()["llm_host"] == "host.lima.internal"
    with pytest.raises(ValueError):
        LocalOllamaChat(endpoint="http://host.lima.internal.example.com:11434")
