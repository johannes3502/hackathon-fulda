"""Transcriber interface so the ASR provider stays exchangeable.

Deepgram provides German batch ASR; `JsonTranscriber` replays synthetic word
timestamps for an explicitly selected deterministic demo.
"""

import json
import os
from pathlib import Path
from typing import Protocol

import httpx

from app.transcription.models import Word


class Transcriber(Protocol):
    def transcribe(self, audio_path: Path) -> list[Word]:
        """Return words with start/end in ms relative to the recording start."""
        ...


class JsonTranscriber:
    """Reads `[{"word", "start_ms", "end_ms"}, ...]` from a file; ignores the audio."""

    def __init__(self, words_path: Path):
        self.words_path = words_path

    def transcribe(self, audio_path: Path) -> list[Word]:
        data = json.loads(self.words_path.read_text(encoding="utf-8"))
        return [Word.model_validate(item) for item in data]


class DeepgramTranscriber:
    """German batch ASR. German filler preservation is NOT guaranteed."""

    def __init__(self, api_key: str, model: str = "nova-3", *, transport=None):
        self.api_key = api_key
        self.model = model
        self.transport = transport

    def transcribe(self, audio_path: Path) -> list[Word]:
        # No automatic retries: a timed-out paid request could already be processed.
        with httpx.Client(timeout=httpx.Timeout(180, connect=10), transport=self.transport) as client:
            with audio_path.open("rb") as audio:
                response = client.post(
                    "https://api.eu.deepgram.com/v1/listen",
                    params={"model": self.model, "language": "de", "punctuate": "true"},
                    headers={"Authorization": f"Token {self.api_key}", "Content-Type": "audio/wav"},
                    content=audio,
                )
            response.raise_for_status()
        raw = response.json()["results"]["channels"][0]["alternatives"][0]["words"]
        return [Word(
            word=item.get("punctuated_word") or item["word"],
            start_ms=round(float(item["start"]) * 1000),
            end_ms=round(float(item["end"]) * 1000),
        ) for item in raw]


def configured_transcriber() -> Transcriber:
    """JSON is an explicit synthetic demo; never a silent fallback."""
    provider = os.getenv("ASR_PROVIDER", "deepgram")
    if provider == "json":
        return JsonTranscriber(Path(os.environ["ASR_DEMO_WORDS_PATH"]))
    if provider != "deepgram":
        raise ValueError("Unsupported ASR_PROVIDER")
    key = os.getenv("DEEPGRAM_API_KEY", "")
    if not key:
        raise ValueError("Set DEEPGRAM_API_KEY or submit transcribe=false")
    return DeepgramTranscriber(key, os.getenv("DEEPGRAM_MODEL", "nova-3"))
