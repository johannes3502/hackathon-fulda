"""Chat model behind a small interface; any OpenAI-compatible endpoint works.

Base URL, model and key come from the environment (`LLM_BASE_URL`,
`LLM_MODEL`, `LLM_API_KEY`), so the team can switch between OpenAI, a hosted
open model or a local server (Ollama, vLLM, LM Studio) without code changes.
"""

import json
import os
import re
from typing import Protocol
from urllib.parse import urlsplit

import httpx
from pydantic import BaseModel
from app.factcheck.local import LocalOllamaChat


class LLMError(RuntimeError):
    """The model call failed or returned no usable JSON object."""


class ChatModel(Protocol):
    model: str

    def complete_json(self, system: str, user: str) -> dict:
        """Return the model's answer parsed as one JSON object."""
        ...


def structured_json(llm: ChatModel, system: str, user: str, output: type[BaseModel]) -> dict:
    """Native local inference constrains the JSON grammar; other adapters retain their contract."""
    if isinstance(llm, LocalOllamaChat):
        raw = llm.complete_json(system, user, schema=output.model_json_schema())
        return output.model_validate(raw).model_dump()
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


def llm_settings() -> dict[str, str] | None:
    """Base URL and model if configured; None disables the fact-check."""
    base_url, model = os.getenv("LLM_BASE_URL", "").strip(), os.getenv("LLM_MODEL", "").strip()
    if not base_url and not model:
        coach = LocalOllamaChat()
        return {"base_url": coach.endpoint, "model": coach.model,
                "host": urlsplit(coach.endpoint).hostname or "localhost", "provider": "ollama"}
    if not base_url or not model:
        return None
    return {"base_url": base_url, "model": model, "host": urlsplit(base_url).hostname or base_url}


def configured_llm() -> ChatModel:
    settings = llm_settings()
    if settings is None:
        raise ValueError("Set LLM_BASE_URL and LLM_MODEL for the fact-check")
    if settings.get("provider") == "ollama":
        return LocalOllamaChat()
    temperature = os.getenv("LLM_TEMPERATURE", "").strip()
    return OpenAICompatibleChat(
        settings["base_url"], settings["model"], os.getenv("LLM_API_KEY", ""),
        json_mode=os.getenv("LLM_JSON_MODE", "true").lower() not in ("0", "false", "no"),
        temperature=float(temperature) if temperature else None,
        timeout_s=float(os.getenv("LLM_TIMEOUT_S", "90")),
    )
