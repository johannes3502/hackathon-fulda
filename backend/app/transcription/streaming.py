"""Streaming adapter for live transcription; words are returned per PCM window.

`WhisperStreamingTranscriber` feeds one PCM window (16 kHz mono, float32 in
[−1, 1]) to `faster-whisper` and returns words with millisecond timestamps
relative to the **window** start. The WebSocket router (`app.speech.live`)
keeps the global timeline, deduplicates boundary words and sends JSON frames.
"""

import os
from typing import Any, Literal, Protocol

import numpy as np
from pydantic import BaseModel

from app.transcription.models import Word
from app.transcription.transcriber import _env_bool, _env_int, load_whisper_model, whisper_prompt


class LiveWordsMessage(BaseModel):
    type: Literal["words"] = "words"
    final: bool
    words: list[Word]


class LiveTextMessage(BaseModel):
    type: Literal["text"] = "text"
    text: str
    final: bool


class LiveReadyMessage(BaseModel):
    type: Literal["ready"] = "ready"
    sample_rate: int


class LiveErrorMessage(BaseModel):
    type: Literal["error"] = "error"
    message: str


class LiveDoneMessage(BaseModel):
    type: Literal["done"] = "done"


class StreamingTranscriber(Protocol):
    """Decode one PCM window; words' ms are relative to the window start."""

    def transcribe_window(self, samples: np.ndarray, sample_rate: int) -> list[Word]:
        ...


class WhisperStreamingTranscriber:
    """Local German streaming ASR via faster-whisper over PCM windows.

    The model is loaded once per process (`load_whisper_model`); decode runs
    in an executor so the WebSocket event loop is not blocked. Filler words
    and word boundaries are model-dependent. Near-realtime latency is a
    property of the machine; measure it with `scripts/smoke_live.py`.
    """

    def __init__(
        self,
        model: str,
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
            raise ValueError("Whisper live model must not be empty")
        if beam_size < 1:
            raise ValueError("WHISPER_LIVE_BEAM_SIZE must be at least 1")
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
    def from_env(cls) -> "WhisperStreamingTranscriber":
        model = os.getenv("WHISPER_LIVE_MODEL", "").strip() or os.getenv(
            "WHISPER_MODEL", "small"
        ).strip()
        return cls(
            model or "small",
            device=os.getenv("WHISPER_DEVICE", "cpu").strip() or "cpu",
            compute_type=os.getenv("WHISPER_COMPUTE_TYPE", "int8").strip() or "int8",
            model_dir=os.getenv("WHISPER_MODEL_DIR", "").strip() or None,
            model_path=os.getenv("WHISPER_MODEL_PATH", "").strip() or None,
            language=(language := os.getenv("WHISPER_LANGUAGE", "de").strip() or None),
            beam_size=_env_int("WHISPER_LIVE_BEAM_SIZE", _env_int("WHISPER_BEAM_SIZE", 5)),
            vad_filter=_env_bool("WHISPER_LIVE_VAD_FILTER", False),
            initial_prompt=whisper_prompt(language),
        )

    def transcribe_window(self, samples: np.ndarray, sample_rate: int) -> list[Word]:
        source = self.model_path or self.model
        download_root = None if self.model_path else self.model_dir
        model = (
            self._loaded_model
            if self._loaded_model is not None
            else load_whisper_model(source, self.device, self.compute_type, download_root)
        )
        audio = samples.astype(np.float32, copy=False)
        segments, _info = model.transcribe(
            audio,
            language=self.language,
            beam_size=self.beam_size,
            vad_filter=self.vad_filter,
            word_timestamps=True,
            initial_prompt=self.initial_prompt,
        )
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


def configured_streaming_transcriber() -> StreamingTranscriber:
    """Live endpoint always uses the local whisper provider."""
    return WhisperStreamingTranscriber.from_env()
