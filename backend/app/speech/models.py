from typing import Any

from pydantic import BaseModel

from app.events import Event


class AudioSeries(BaseModel):
    """Frame-wise time series, column-oriented. `t_ms[i]` is the centre of frame i
    relative to the recording start; `f0_hz` is null where no pitch was found."""

    hop_ms: int
    t_ms: list[int]
    level_db: list[float]
    f0_hz: list[float | None]
    active: list[bool]
    syllable_peaks_ms: list[int]


class AudioSummary(BaseModel):
    """Measured values only; no score or grade."""

    duration_ms: int
    active_ms: int
    median_level_db: float | None
    median_f0_hz: float | None
    f0_range_st: float | None  # p10–p90 spread in semitones
    syllables_per_second: float | None
    pause_count: int


class AudioAnalysis(BaseModel):
    summary: AudioSummary
    series: AudioSeries
    events: list[Event]
    heuristics: dict[str, Any]
