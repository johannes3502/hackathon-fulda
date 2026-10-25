"""Chat model behind a small interface; any OpenAI-compatible endpoint works.

Base URL, model and key come from the environment (`LLM_BASE_URL`,
`LLM_MODEL`, `LLM_API_KEY`). The default is Gemini through its
OpenAI-compatible endpoint; `GEMINI_API_KEY` and `GOOGLE_API_KEY` are accepted
as key aliases only for Google's HTTPS endpoint.
"""

import json
import math
import os
import re
from typing import Protocol
from urllib.parse import urlsplit

import httpx
from pydantic import BaseModel

from app.prompt_safety import POLICY


class LLMError(RuntimeError):
    """The model call failed or returned no usable JSON object."""


class ChatModel(Protocol):
    model: str

    def complete_json(self, system: str, user: str, *, max_tokens: int | None = None) -> dict:
        """Return the model's answer parsed as one JSON object."""
        ...


def structured_json(llm: ChatModel, system: str, user: str, output: type[BaseModel],
                    max_tokens: int | None = None) -> dict:
    """Describe the expected schema; callers still verify references and evidence.

    The output limit is enforced by the provider request. `max_tokens` may
    override the client default (`LLM_MAX_OUTPUT_TOKENS`, 1024). A failed or
    malformed billed call is never retried here.
    """
    return llm.complete_json(
        system + "\n" + POLICY + "\nJSON schema: " + json.dumps(output.model_json_schema(), ensure_ascii=False),
        user,
        max_tokens=max_tokens,
    )


_FENCE = re.compile(r"^```(?:json)?\s*|\s*```$")


def parse_json_object(text: str) -> dict:
    """Tolerates code fences and prose around the object; some servers ignore JSON mode."""
    text = _FENCE.sub("", text.strip())
    try:
        value = json.loads(text)
    except json.JSONDecodeError:
        start, end = text.find("{"), text.rfind("}")
        if start < 0 or end < start or text.startswith("["):
            raise LLMError("Model answer contains no JSON object") from None
        try:
            value = json.loads(text[start:end + 1])
        except json.JSONDecodeError as error:
            raise LLMError("Model answer is not valid JSON") from error
    if not isinstance(value, dict):
        raise LLMError("Model answer is not a JSON object")
    return value


class OpenAICompatibleChat:
    """POST {base_url}/chat/completions. No automatic retries: calls may be billed."""

    def __init__(self, base_url: str, model: str, api_key: str = "", *, json_mode: bool = True,
                 temperature: float | None = None, timeout_s: float = 45, transport=None,
                 max_tokens: int = 1024):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.api_key = api_key
        self.json_mode = json_mode
        self.temperature = temperature
        self.timeout = httpx.Timeout(timeout_s, connect=10)
        self.transport = transport
        self.max_tokens = max_tokens

    def complete_json(self, system: str, user: str, *, max_tokens: int | None = None) -> dict:
        body: dict = {"model": self.model, "messages": [
            {"role": "system", "content": system}, {"role": "user", "content": user}]}
        limit = self.max_tokens if max_tokens is None else max_tokens
        if limit is not None:
            body["max_tokens"] = limit
        if self.json_mode:
            body["response_format"] = {"type": "json_object"}
        if self.temperature is not None:
            body["temperature"] = self.temperature
        headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
        try:
            with httpx.Client(timeout=self.timeout, transport=self.transport) as client:
                response = client.post(f"{self.base_url}/chat/completions", json=body, headers=headers)
            response.raise_for_status()
            choice = response.json()["choices"][0]
            if not isinstance(choice, dict):
                raise LLMError("LLM answer has no completion")
            if choice.get("finish_reason") not in (None, "stop"):
                raise LLMError("LLM answer was incomplete or blocked")
            message = choice["message"]
            if not isinstance(message, dict) or message.get("refusal"):
                raise LLMError("LLM answer has no usable message")
            content = message["content"]
        except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError) as error:
            # Never log the response body: it can echo transcript content.
            raise LLMError(f"LLM request failed ({type(error).__name__})") from error
        if not isinstance(content, str):
            raise LLMError("LLM answer has no text content")
        return parse_json_object(content)


def llm_api_key(provider: str) -> str:
    """Never attach a Google key to an unrelated compatible endpoint."""
    names = ("LLM_API_KEY", "GEMINI_API_KEY", "GOOGLE_API_KEY") if provider == "gemini" else ("LLM_API_KEY",)
    for name in names:
        value = os.getenv(name, "").strip()
        if value:
            return value
    return ""


def llm_settings() -> dict[str, str] | None:
    """Base URL and model if configured; None disables LLM-backed features."""
    base_url, model = os.getenv("LLM_BASE_URL", "").strip(), os.getenv("LLM_MODEL", "").strip()
    if not base_url or not model:
        return None
    try:
        url = urlsplit(base_url)
        # Accessing port also validates malformed or out-of-range port values.
        url.port
        if (url.scheme not in {"http", "https"} or not url.hostname
                or url.username is not None or url.password is not None or url.query or url.fragment
                or any(char.isspace() for char in base_url)):
            return None
    except ValueError:
        return None
    host = url.hostname
    provider = "gemini" if host == "generativelanguage.googleapis.com" else "openai-compatible"
    if provider == "gemini" and url.scheme != "https":
        return None
    return {"base_url": base_url, "model": model, "host": host, "provider": provider}


def llm_available(settings: dict[str, str] | None = None) -> bool:
    """Configuration readiness only; this makes no provider request."""
    settings = llm_settings() if settings is None else settings
    if settings is None:
        return False
    try:
        _configured_chat(settings)
    except ValueError:
        return False
    return True


def configured_llm() -> ChatModel:
    settings = llm_settings()
    if settings is None:
        raise ValueError("Set a valid HTTP(S) LLM_BASE_URL and LLM_MODEL")
    return _configured_chat(settings)


def _configured_chat(settings: dict[str, str]) -> OpenAICompatibleChat:
    api_key = llm_api_key(settings["provider"])
    if settings["provider"] == "gemini" and not api_key:
        raise ValueError("Set LLM_API_KEY, GEMINI_API_KEY or GOOGLE_API_KEY for Gemini")
    temperature = os.getenv("LLM_TEMPERATURE", "").strip()
    try:
        temperature = float(temperature) if temperature else None
        timeout_s = float(os.getenv("LLM_TIMEOUT_S", "45"))
        max_tokens = int(os.getenv("LLM_MAX_OUTPUT_TOKENS", "1024"))
    except ValueError:
        raise ValueError(
            "LLM_TEMPERATURE, LLM_TIMEOUT_S and LLM_MAX_OUTPUT_TOKENS must be finite numbers") from None
    if not math.isfinite(timeout_s) or timeout_s <= 0 or (temperature is not None and not math.isfinite(temperature)):
        raise ValueError("LLM_TIMEOUT_S must be positive and finite; LLM_TEMPERATURE must be finite")
    if not 64 <= max_tokens <= 8192:
        raise ValueError("LLM_MAX_OUTPUT_TOKENS must be between 64 and 8192")
    json_mode = os.getenv("LLM_JSON_MODE", "true").strip().lower()
    if json_mode not in {"0", "false", "no", "off", "1", "true", "yes", "on"}:
        raise ValueError("LLM_JSON_MODE must be true or false")
    return OpenAICompatibleChat(
        settings["base_url"], settings["model"], api_key,
        json_mode=json_mode in {"1", "true", "yes", "on"},
        temperature=temperature,
        timeout_s=timeout_s,
        max_tokens=max_tokens,
    )
