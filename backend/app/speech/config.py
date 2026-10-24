"""Signal-processing parameters and heuristic thresholds for audio events.

None of the thresholds are validated. They are prototype starting points and
are returned with every analysis so the UI can label them as "Heuristik".
Comparisons are relative to a baseline: the first `baseline_ms` of the
recording (calibration) or, if unset, the whole recording.
"""

from typing import Literal

from pydantic import BaseModel, Field, model_validator


class AudioConfig(BaseModel):
    sample_rate: int = Field(default=16000, ge=8000)
    frame_ms: int = Field(default=40, gt=0)
    hop_ms: int = Field(default=10, gt=0)
    baseline_ms: int | None = Field(default=3000, gt=0)

    activity_detector: Literal["silero", "energy"] = "silero"
    vad_threshold: float = Field(default=0.5, gt=0, lt=1)
    vad_min_speech_ms: int = Field(default=250, ge=0)
    vad_min_silence_ms: int = Field(default=100, ge=0)

    @model_validator(mode="after")
    def valid_signal_parameters(self):
        if self.activity_detector == "silero" and self.sample_rate not in (8000, 16000):
            raise ValueError("Silero requires 8000 or 16000 Hz")
        if self.sample_rate * self.hop_ms // 1000 < 1:
            raise ValueError("hop_ms must cover at least one sample")
        if self.f0_max_hz <= self.f0_min_hz or self.f0_max_hz >= self.sample_rate / 2:
            raise ValueError("Require f0_min_hz < f0_max_hz < Nyquist")
        if self.sample_rate * self.frame_ms // 1000 <= int(self.sample_rate / self.f0_min_hz):
            raise ValueError("frame_ms is too short for f0_min_hz")
        return self

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
