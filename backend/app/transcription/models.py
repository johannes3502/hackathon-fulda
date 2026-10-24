"""Data shapes of the transcription pipeline: words in, word-based events out."""

from typing import Any

from pydantic import BaseModel, Field, model_validator

from app.events import Event


class Word(BaseModel):
    word: str
    start_ms: int = Field(ge=0)
    end_ms: int = Field(ge=0)

    @model_validator(mode="after")
    def _ordered(self) -> "Word":
        if self.end_ms < self.start_ms:
            raise ValueError("end_ms must not be before start_ms")
        return self


class WordSummary(BaseModel):
    """Measured values only; no score or grade."""

    word_count: int
    speaking_duration_ms: int
    words_per_minute: float | None
    pause_count: int
    filler_count: int
    repetition_count: int
    median_window_wpm: float | None


class WordAnalysis(BaseModel):
    summary: WordSummary
    events: list[Event]
    heuristics: dict[str, Any]
