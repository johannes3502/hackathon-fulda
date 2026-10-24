"""Transcriber interface so the ASR provider stays exchangeable.

Whisper (`faster-whisper`) runs locally and is the default provider. Deepgram
remains available as an optional hosted batch ASR; `JsonTranscriber` replays
synthetic word timestamps for an explicitly selected deterministic demo.
"""

import json
import os
from collections.abc import Iterable
from functools import lru_cache
from pathlib import Path
from typing import Any, Protocol

import httpx

from app.transcription.models import Word

DEFAULT_WHISPER_MODEL = "small"


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


@lru_cache(maxsize=2)
def load_whisper_model(
    model: str, device: str, compute_type: str, model_dir: str | None
) -> Any:
    from faster_whisper import WhisperModel

    return WhisperModel(
        model,
        device=device,
        compute_type=compute_type,
        download_root=model_dir,
    )


class WhisperTranscriber:
    """Local German batch ASR with word timestamps via faster-whisper.

    The model is loaded once per worker process. `faster-whisper` uses
    CTranslate2; model files are read from `WHISPER_MODEL_DIR` when set.
    """

    def __init__(
        self,
        model: str = DEFAULT_WHISPER_MODEL,
        *,
        device: str = "cpu",
        compute_type: str = "int8",
        model_dir: str | None = None,
        model_path: str | None = None,
        language: str | None = "de",
        beam_size: int = 5,
        vad_filter: bool = False,
        initial_prompt: str | None = None,
        loaded_model: Any | None = None,
    ):
        if not model.strip():
            raise ValueError("Whisper model must not be empty")
        if beam_size < 1:
            raise ValueError("WHISPER_BEAM_SIZE must be at least 1")
        self.model = model
        self.device = device
        self.compute_type = compute_type
        self.model_dir = model_dir
        self.model_path = model_path
        self.language = language
        self.beam_size = beam_size
        self.vad_filter = vad_filter
        self.initial_prompt = initial_prompt
        self._loaded_model = loaded_model

    @classmethod
    def from_env(cls) -> "WhisperTranscriber":
        model = os.getenv("WHISPER_MODEL", DEFAULT_WHISPER_MODEL).strip()
        model_dir = os.getenv("WHISPER_MODEL_DIR", "").strip() or None
        model_path = os.getenv("WHISPER_MODEL_PATH", "").strip() or None
        language = os.getenv("WHISPER_LANGUAGE", "de").strip() or None
        initial_prompt = os.getenv("WHISPER_INITIAL_PROMPT", "").strip() or None
        return cls(
            model or DEFAULT_WHISPER_MODEL,
            device=os.getenv("WHISPER_DEVICE", "cpu").strip() or "cpu",
            compute_type=os.getenv("WHISPER_COMPUTE_TYPE", "int8").strip() or "int8",
            model_dir=model_dir,
            model_path=model_path,
            language=language,
            beam_size=_env_int("WHISPER_BEAM_SIZE", 5),
            vad_filter=_env_bool("WHISPER_VAD_FILTER", False),
            initial_prompt=initial_prompt,
        )

    def transcribe(self, audio_path: Path) -> list[Word]:
        source = self.model_path or self.model
        download_root = None if self.model_path else self.model_dir
        model = (
            self._loaded_model
            if self._loaded_model is not None
            else load_whisper_model(source, self.device, self.compute_type, download_root)
        )
        segments, _info = model.transcribe(
            str(audio_path),
            language=self.language,
            beam_size=self.beam_size,
            vad_filter=self.vad_filter,
            word_timestamps=True,
            initial_prompt=self.initial_prompt,
        )
        return _words_from_segments(segments)


def _words_from_segments(segments: Iterable[Any]) -> list[Word]:
    words: list[Word] = []
    for segment in segments:
        for item in getattr(segment, "words", None) or ():
            token = (getattr(item, "word", "") or "").strip()
            if not token:
                continue
            start_ms = round(float(item.start) * 1000)
            end_ms = round(float(item.end) * 1000)
            if end_ms < start_ms:
                end_ms = start_ms
            words.append(Word(word=token, start_ms=start_ms, end_ms=end_ms))
    return words


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or not raw.strip():
        return default
    try:
        return int(raw)
    except ValueError as error:
        raise ValueError(f"{name} must be an integer") from error


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None or not raw.strip():
        return default
    value = raw.strip().lower()
    if value in {"1", "true", "yes", "on"}:
        return True
    if value in {"0", "false", "no", "off"}:
        return False
    raise ValueError(f"{name} must be a boolean")


def configured_transcriber() -> Transcriber:
    """Whisper is local; JSON is an explicit synthetic demo, never a silent fallback."""
    provider = os.getenv("ASR_PROVIDER", "whisper").strip().lower() or "whisper"
    if provider == "json":
        return JsonTranscriber(Path(os.environ["ASR_DEMO_WORDS_PATH"]))
    if provider == "deepgram":
        key = os.getenv("DEEPGRAM_API_KEY", "")
        if not key:
            raise ValueError("Set DEEPGRAM_API_KEY or submit transcribe=false")
        return DeepgramTranscriber(key, os.getenv("DEEPGRAM_MODEL", "nova-3"))
    if provider in {"whisper", "faster-whisper"}:
        return WhisperTranscriber.from_env()
    raise ValueError("Unsupported ASR_PROVIDER")
