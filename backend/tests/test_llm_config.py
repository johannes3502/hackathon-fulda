"""LLM configuration: Gemini by default, no implicit local fallback."""
import json
from unittest.mock import Mock

import httpx
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.factcheck.llm import OpenAICompatibleChat, configured_llm, llm_available, llm_settings
from app.factcheck.pipeline import judge, Claim
from app.factcheck.models import FactCheckConfig


def test_openai_compatible_contract():
    def handler(request):
        assert str(request.url) == "https://llm.example/v1/chat/completions"
        assert request.headers["authorization"] == "Bearer test-only"
        body = json.loads(request.content)
        assert body["model"] == "demo-model" and body["response_format"] == {"type": "json_object"}
        return httpx.Response(200, json={"choices": [{"message": {"content": '{"claims": []}'}}]})
    assert OpenAICompatibleChat("https://llm.example/v1/", "demo-model", "test-only",
                                transport=httpx.MockTransport(handler)).complete_json("test", "synthetic") == {"claims": []}


def test_unverifiable_judgment_is_unchecked_not_missing_evidence():
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


def test_missing_config_has_no_local_default(monkeypatch):
    monkeypatch.delenv("LLM_BASE_URL", raising=False)
    monkeypatch.delenv("LLM_MODEL", raising=False)
    assert llm_settings() is None
    assert llm_available() is False
    with pytest.raises(ValueError):
        configured_llm()


def test_gemini_settings_require_key_and_accept_alias(monkeypatch):
    monkeypatch.setenv("LLM_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai")
    monkeypatch.setenv("LLM_MODEL", "gemini-3.1-flash-lite")
    for name in ("LLM_API_KEY", "GEMINI_API_KEY", "GOOGLE_API_KEY"):
        monkeypatch.delenv(name, raising=False)
    assert llm_settings()["provider"] == "gemini"
    assert llm_available() is False
    monkeypatch.setenv("GEMINI_API_KEY", "test-only")
    assert llm_available() is True
    assert configured_llm().api_key == "test-only"


def test_settings_endpoint_reports_gemini_host(monkeypatch):
    monkeypatch.setenv("LLM_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai")
    monkeypatch.setenv("LLM_MODEL", "gemini-3.1-flash-lite")
    monkeypatch.setenv("GEMINI_API_KEY", "test-only")
    response = TestClient(app).get("/factcheck/settings")
    assert response.status_code == 200
    assert response.json()["available"] is True
    assert response.json()["model"] == "gemini-3.1-flash-lite"
    assert response.json()["llm_host"] == "generativelanguage.googleapis.com"
