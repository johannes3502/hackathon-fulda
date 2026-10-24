"""Signal-processing parameters and heuristic thresholds for audio events.

None of the thresholds are validated. They are prototype starting points and
are returned with every analysis so the UI can label them as "Heuristik".
Comparisons are relative to a baseline: the first `baseline_ms` of the
recording (calibration) or, if unset, the whole recording.
"""

from pydantic import BaseModel, Field


class AudioConfig(BaseModel):
    sample_rate: int = Field(default=16000, ge=8000)
    frame_ms: int = Field(default=40, gt=0)
    hop_ms: int = Field(default=10, gt=0)
    baseline_ms: int | None = Field(default=None, gt=0)

    # Voice activity: louder than the floor and within range of the loud frames (p95).
    activity_floor_db: float = -50.0
    activity_range_db: float = Field(default=30.0, gt=0)

    # Pitch (YIN).
    f0_min_hz: float = Field(default=75.0, gt=0)
    f0_max_hz: float = Field(default=400.0, gt=0)
    yin_threshold: float = Field(default=0.15, gt=0, lt=1)

    # Syllable nuclei: local maxima of the level envelope.
    syllable_min_distance_ms: int = Field(default=100, gt=0)
    syllable_prominence_db: float = Field(default=3.0, ge=0)

    pause_min_ms: int = Field(default=2000, ge=0)

    volume_window_ms: int = Field(default=2000, gt=0)
    volume_quiet_db: float = Field(default=6.0, gt=0)
    volume_loud_db: float = Field(default=6.0, gt=0)

    pitch_window_ms: int = Field(default=4000, gt=0)
    pitch_monotone_max_st: float = Field(default=1.0, gt=0)

    pace_window_ms: int = Field(default=5000, gt=0)
    pace_fast_ratio: float = Field(default=1.3, gt=1)
    pace_slow_ratio: float = Field(default=0.7, gt=0, lt=1)

    # A window is only evaluated if enough of it is active / voiced.
    window_min_active_ratio: float = Field(default=0.3, gt=0, le=1)
