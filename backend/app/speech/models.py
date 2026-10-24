"""Data shapes shared by transcriber, analysis and API.

`SpeechEvent` follows the Event schema in AGENTS.md; `session_id` and `id`
are assigned when events are persisted, which is not implemented yet.
"""

from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator


class Word(BaseModel):
    word: str
    start_ms: int = Field(ge=0)
    end_ms: int = Field(ge=0)

    @model_validator(mode="after")
    def _ordered(self) -> "Word":
        if self.end_ms < self.start_ms:
            raise ValueError("end_ms must not be before start_ms")
        return self


class SpeechEvent(BaseModel):
    t_ms: int
    duration_ms: int
    type: Literal["filler", "pause", "pace"]
    severity: Literal["info", "hint", "warning"]
    source: Literal["speech"] = "speech"
    payload: dict[str, Any]


class SpeechSummary(BaseModel):
    """Measured values only; no score or grade."""

    word_count: int
    speaking_duration_ms: int
    words_per_minute: float | None
    pause_count: int
    filler_count: int
    repetition_count: int
    median_window_wpm: float | None


class SpeechAnalysis(BaseModel):
    summary: SpeechSummary
    events: list[SpeechEvent]
    heuristics: dict[str, Any]
