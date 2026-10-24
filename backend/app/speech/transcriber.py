"""Transcriber interface so the ASR provider stays exchangeable.

The hosted ASR provider is not chosen yet (AGENTS.md, "Offen"). Until then,
`JsonTranscriber` replays precomputed word timestamps, e.g. for the
deterministic demo session.
"""

import json
from pathlib import Path
from typing import Protocol

from app.speech.models import Word


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
