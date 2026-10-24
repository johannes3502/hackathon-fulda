"""Chat model behind a small interface; any OpenAI-compatible endpoint works.

Base URL, model and key come from the environment (`LLM_BASE_URL`,
`LLM_MODEL`, `LLM_API_KEY`). The default is Gemini through its
OpenAI-compatible endpoint; `GEMINI_API_KEY` and `GOOGLE_API_KEY` are accepted
as key aliases so the same `.env` can serve the image skill and the backend.
"""

import json
import os
import re
from typing import Protocol
from urllib.parse import urlsplit

import httpx
from pydantic import BaseModel


class LLMError(RuntimeError):
    """The model call failed or returned no usable JSON object."""


class ChatModel(Protocol):
    model: str

    def complete_json(self, system: str, user: str) -> dict:
        """Return the model's answer parsed as one JSON object."""
        ...


def structured_json(llm: ChatModel, system: str, user: str, output: type[BaseModel]) -> dict:
    """The caller validates the returned object; Gemini's JSON mode constrains the shape."""
    return llm.complete_json(system, user)


_FENCE = re.compile(r"^```(?:json)?\s*|\s*```$")


def parse_json_object(text: str) -> dict:
    """Tolerates code fences and prose around the object; some servers ignore JSON mode."""
    text = _FENCE.sub("", text.strip())
    start, end = text.find("{"), text.rfind("}")
    if start < 0 or end < start:
        raise LLMError("Model answer contains no JSON object")
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
                 temperature: float | None = None, timeout_s: float = 90, transport=None):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.api_key = api_key
        self.json_mode = json_mode
        self.temperature = temperature
        self.timeout = httpx.Timeout(timeout_s, connect=10)
        self.transport = transport

    def complete_json(self, system: str, user: str) -> dict:
        body: dict = {"model": self.model, "messages": [
            {"role": "system", "content": system}, {"role": "user", "content": user}]}
        if self.json_mode:
            body["response_format"] = {"type": "json_object"}
        if self.temperature is not None:
            body["temperature"] = self.temperature
        headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
        try:
            with httpx.Client(timeout=self.timeout, transport=self.transport) as client:
                response = client.post(f"{self.base_url}/chat/completions", json=body, headers=headers)
            response.raise_for_status()
            content = response.json()["choices"][0]["message"]["content"]
        except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError) as error:
            # Never log the response body: it can echo transcript content.
            raise LLMError(f"LLM request failed ({type(error).__name__})") from error
        if not isinstance(content, str):
            raise LLMError("LLM answer has no text content")
        return parse_json_object(content)


def llm_api_key() -> str:
    """Backend key, preferring an explicit LLM key over the Gemini aliases."""
    for name in ("LLM_API_KEY", "GEMINI_API_KEY", "GOOGLE_API_KEY"):
        value = os.getenv(name, "").strip()
        if value:
            return value
    return ""


def llm_settings() -> dict[str, str] | None:
    """Base URL and model if configured; None disables LLM-backed features."""
    base_url, model = os.getenv("LLM_BASE_URL", "").strip(), os.getenv("LLM_MODEL", "").strip()
    if not base_url or not model:
        return None
    host = urlsplit(base_url).hostname or base_url
    provider = "gemini" if host.endswith("generativelanguage.googleapis.com") else "openai-compatible"
    return {"base_url": base_url, "model": model, "host": host, "provider": provider}


def llm_available(settings: dict[str, str] | None = None) -> bool:
    """Gemini needs a key; generic OpenAI-compatible endpoints may be keyless."""
    settings = settings or llm_settings()
    if settings is None:
        return False
    return settings["provider"] != "gemini" or bool(llm_api_key())


def configured_llm() -> ChatModel:
    settings = llm_settings()
    if settings is None:
        raise ValueError("Set LLM_BASE_URL and LLM_MODEL for the fact-check")
    temperature = os.getenv("LLM_TEMPERATURE", "").strip()
    return OpenAICompatibleChat(
        settings["base_url"], settings["model"], llm_api_key(),
        json_mode=os.getenv("LLM_JSON_MODE", "true").lower() not in ("0", "false", "no"),
        temperature=float(temperature) if temperature else None,
        timeout_s=float(os.getenv("LLM_TIMEOUT_S", "90")),
    )
