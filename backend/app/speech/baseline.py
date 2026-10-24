"""Causal, bounded adaptation from voiced speech; no wall-clock decay in pauses.

The browser mirrors this tracker in features/live/speech-baseline.ts. Each
non-overlapping block needs enough voiced evidence. Medians reject short spikes;
clipped exponential updates follow sustained changes without immediately hiding
them. All settings are unvalidated prototype heuristics.
"""

import math
from dataclasses import dataclass
from statistics import median

from app.speech.config import AudioConfig


@dataclass(frozen=True, slots=True)
class BaselineFrame:
    level: float
    pitch: float
    active: bool
    peak: bool
    duration: int


@dataclass(frozen=True, slots=True)
class SpeechReference:
    level: float
    pitch: float
    rate: float


def _rate(frames: list[BaselineFrame]) -> float:
    active_ms = sum(f.duration for f in frames if f.active)
    return sum(f.active and f.peak for f in frames) * 1000 / active_ms if active_ms else 0.0


def _clamp(value: float, limit: float) -> float:
    return max(-limit, min(limit, value))


class AdaptiveSpeechBaseline:
    def __init__(self, config: AudioConfig):
        if config.baseline_ms is None:
            raise ValueError("Adaptive calibration needs a voiced-speech duration")
        self.config = config
        self.current: SpeechReference | None = None
        self.voiced_ms = 0
        self.pending: list[BaselineFrame] = []
        self.pending_ms = 0
        self.calibration: list[BaselineFrame] = []

    def voiced(self, frame: BaselineFrame) -> bool:
        return frame.active and math.isfinite(frame.pitch) and self.config.f0_min_hz <= frame.pitch <= self.config.f0_max_hz

    def observe(self, frame: BaselineFrame) -> SpeechReference | None:
        self.pending.append(frame)
        self.pending_ms += frame.duration
        if self.pending_ms < self.config.baseline_update_ms:
            return self.current
        frames, duration = self.pending, self.pending_ms
        speech = [f for f in frames if self.voiced(f)]
        speech_ms = sum(f.duration for f in speech)
        self.pending, self.pending_ms = [], 0
        if speech_ms / duration < self.config.baseline_min_voiced_ratio:
            return self.current

        if self.current is None:
            self.calibration.extend(frames)
            self.voiced_ms += speech_ms
            if self.voiced_ms < self.config.baseline_ms:
                return None
            initial = [f for f in self.calibration if self.voiced(f)]
            self.current = SpeechReference(
                median(f.level for f in initial), median(f.pitch for f in initial), _rate(self.calibration),
            )
            self.calibration = []
        else:
            prior = self.current
            alpha = -math.expm1(-math.log(2) * speech_ms / self.config.baseline_half_life_ms)
            level_delta = median(f.level for f in speech) - prior.level
            pitch_delta = 12 * math.log2(median(f.pitch for f in speech) / prior.pitch)
            candidate_rate = _rate(frames)
            rate = prior.rate
            if candidate_rate > 0:
                rate = (prior.rate * math.exp(alpha * _clamp(math.log(candidate_rate / prior.rate), math.log(self.config.baseline_max_rate_ratio)))
                        if prior.rate > 0 else candidate_rate)
            self.current = SpeechReference(
                prior.level + alpha * _clamp(level_delta, self.config.baseline_max_level_delta_db),
                prior.pitch * 2 ** (alpha * _clamp(pitch_delta, self.config.baseline_max_pitch_delta_st) / 12),
                rate,
            )
        return self.current
