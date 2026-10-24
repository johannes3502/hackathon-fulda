"""Local Ollama adapter. No hosted fallback and no API key."""

import json
import os
from typing import TypeVar
from urllib.parse import urlsplit

import httpx
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


class LocalCoach:
    def __init__(self, *, endpoint: str | None = None, model: str | None = None, transport=None):
        self.endpoint = (endpoint or os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")).rstrip("/")
        url = urlsplit(self.endpoint)
        if (url.scheme != "http" or url.hostname not in {"127.0.0.1", "localhost", "::1", "host.docker.internal", "ollama"}
                or url.username or url.password or url.query or url.fragment or url.path):
            raise ValueError("Use the local Ollama server URL")
        self.model = model or os.getenv("COACH_MODEL", "qwen3.5:4b-q4_K_M")
        if "cloud" in self.model.lower():
            raise ValueError("A locally downloaded model is required")
        self.transport = transport

    def available(self) -> bool:
        try:
            with httpx.Client(timeout=3, transport=self.transport, trust_env=False) as client:
                response = client.get(f"{self.endpoint}/api/tags")
                response.raise_for_status()
                return any(m.get("name") == self.model for m in response.json().get("models", []))
        except (httpx.HTTPError, ValueError, TypeError):
            return False

    def structured(self, output: type[T], instructions: str, data: dict) -> T:
        schema = output.model_json_schema()
        with httpx.Client(timeout=httpx.Timeout(150, connect=5), transport=self.transport, trust_env=False) as client:
            response = client.post(f"{self.endpoint}/api/chat", json={
                "model": self.model, "stream": False, "think": False, "keep_alive": "30m",
                "format": schema,
                "options": {"temperature": 0, "num_ctx": 16384, "num_predict": 4096},
                "messages": [
                    {"role": "system", "content": instructions + "\nReturn JSON matching this schema:\n" + json.dumps(schema)},
                    {"role": "user", "content": json.dumps(data, ensure_ascii=False)},
                ],
            })
            response.raise_for_status()
        result = response.json()
        if not result.get("done") or result.get("done_reason") == "length":
            raise ValueError("Local model response was incomplete")
        return output.model_validate_json(result["message"]["content"])
