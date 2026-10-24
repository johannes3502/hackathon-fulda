"""Audio signal → frame time series → pause, volume, pitch and pace events.

Works on the sound only; no transcript. Every value carries a timestamp in ms
relative to the recording start, so it can be merged with other pipelines.
"""

import tempfile
from pathlib import Path

import numpy as np

from app.events import Event
from app.speech.config import AudioConfig
from app.speech.models import AudioAnalysis, AudioSeries, AudioSummary
from app.speech.signal import decode_audio, envelope_peaks, frame_signal, level_db, yin_f0


def analyze_recording(recording: Path, config: AudioConfig | None = None) -> AudioAnalysis:
    config = config or AudioConfig()
    return analyze_samples(decode_audio(recording, config.sample_rate), config)


def analyze_upload(data, config: AudioConfig | None = None) -> AudioAnalysis:
    """Analyse a file-like object (e.g. an HTTP upload) via a temporary file."""
    with tempfile.NamedTemporaryFile() as handle:
        while chunk := data.read(1 << 20):
            handle.write(chunk)
        handle.flush()
        return analyze_recording(Path(handle.name), config)


def analyze_samples(samples: np.ndarray, config: AudioConfig | None = None) -> AudioAnalysis:
    config = config or AudioConfig()
    sr, hop_ms = config.sample_rate, config.hop_ms
    hop = sr * hop_ms // 1000
    frames = frame_signal(samples, sr * config.frame_ms // 1000, hop)
    t_ms = np.arange(len(frames)) * hop_ms

    level = level_db(frames)
    if len(level):
        gate = max(config.activity_floor_db, np.percentile(level, 95) - config.activity_range_db)
        active = level > gate
    else:
        active = np.zeros(0, dtype=bool)

    f0 = np.full(len(frames), np.nan)
    f0[active] = yin_f0(frames[active], sr, config.f0_min_hz, config.f0_max_hz, config.yin_threshold)
    voiced = ~np.isnan(f0)

    half_width = max(1, config.syllable_min_distance_ms // hop_ms // 2)
    peaks = envelope_peaks(level, active, half_width, config.syllable_prominence_db)
    is_peak = np.zeros(len(frames), dtype=bool)
    is_peak[peaks] = True

    baseline = t_ms < config.baseline_ms if config.baseline_ms else np.ones(len(frames), dtype=bool)
    base_level = _median(level[active & baseline])
    base_f0 = _median(f0[voiced & baseline])
    base_rate = _rate(is_peak[baseline], active[baseline], hop_ms)
    semitones = 12 * np.log2(f0 / base_f0) if base_f0 else np.full(len(frames), np.nan)

    events = sorted(
        _pauses(active, t_ms, config)
        + _volume(level, active, t_ms, base_level, config)
        + _pitch(semitones, voiced, t_ms, config)
        + _pace(is_peak, active, t_ms, base_rate, config),
        key=lambda e: (e.t_ms, e.type),
    )

    voiced_st = semitones[voiced]
    summary = AudioSummary(
        duration_ms=round(len(samples) / sr * 1000),
        active_ms=int(active.sum()) * hop_ms,
        median_level_db=_round(_median(level[active])),
        median_f0_hz=_round(_median(f0[voiced])),
        f0_range_st=_round(np.percentile(voiced_st, 90) - np.percentile(voiced_st, 10)) if voiced_st.size else None,
        syllables_per_second=_round(_rate(is_peak, active, hop_ms), 2),
        pause_count=sum(e.type == "pause" for e in events),
    )
    series = AudioSeries(
        hop_ms=hop_ms,
        t_ms=t_ms.tolist(),
        level_db=np.round(level, 1).tolist(),
        f0_hz=[None if np.isnan(v) else round(float(v), 1) for v in f0],
        active=active.tolist(),
        syllable_peaks_ms=t_ms[peaks].tolist(),
    )
    return AudioAnalysis(summary=summary, series=series, events=events, heuristics=config.model_dump())


def _median(values: np.ndarray) -> float | None:
    return float(np.median(values)) if values.size else None


def _round(value: float | None, digits: int = 1) -> float | None:
    return None if value is None else round(float(value), digits)


def _rate(is_peak: np.ndarray, active: np.ndarray, hop_ms: int) -> float | None:
    active_s = active.sum() * hop_ms / 1000
    return float(is_peak.sum() / active_s) if active_s else None


def _runs(mask: np.ndarray) -> list[tuple[int, int]]:
    """Half-open index ranges where `mask` is True."""
    edges = np.flatnonzero(np.diff(np.concatenate(([0], mask.astype(np.int8), [0]))))
    return list(zip(edges[::2], edges[1::2]))


def _pauses(active: np.ndarray, t_ms: np.ndarray, config: AudioConfig) -> list[Event]:
    if not active.any():
        return []
    first, last = np.flatnonzero(active)[[0, -1]]
    events = []
    for start, end in _runs(~active[first:last + 1]):
        duration = int(end - start) * config.hop_ms
        if duration >= config.pause_min_ms:
            events.append(Event(
                t_ms=int(t_ms[first + start]), duration_ms=duration, type="pause",
                severity="info", source="speech", payload={"gap_ms": duration},
            ))
    return events


def _windowed(
    t_ms: np.ndarray,
    window_ms: int,
    config: AudioConfig,
    measure,
    event_type: str,
    value_key: str,
    baseline: dict,
) -> list[Event]:
    """Evaluate fixed windows; `measure(slice)` returns (value, direction) or None.
    Adjacent windows with the same direction become one event."""
    per_window = max(1, window_ms // config.hop_ms)
    events: list[Event] = []
    previous: str | None = None
    for start in range(0, len(t_ms), per_window):
        window = slice(start, min(start + per_window, len(t_ms)))
        result = measure(window)
        direction = result[1] if result else None
        if direction is None:
            previous = None
            continue
        value = round(float(result[0]), 2)
        end_ms = int(t_ms[window.stop - 1]) + config.hop_ms
        if previous == direction:
            events[-1].duration_ms = end_ms - events[-1].t_ms
            events[-1].payload[value_key].append(value)
        else:
            events.append(Event(
                t_ms=int(t_ms[window.start]), duration_ms=end_ms - int(t_ms[window.start]),
                type=event_type, severity="hint", source="speech",
                payload={"direction": direction, value_key: [value], **baseline},
            ))
        previous = direction
    return events


def _enough(mask: np.ndarray, config: AudioConfig) -> bool:
    return mask.size > 0 and mask.mean() >= config.window_min_active_ratio


def _volume(level, active, t_ms, base_level, config: AudioConfig) -> list[Event]:
    if base_level is None:
        return []

    def measure(window):
        if not _enough(active[window], config):
            return None
        delta = float(np.median(level[window][active[window]])) - base_level
        direction = "quiet" if delta <= -config.volume_quiet_db else "loud" if delta >= config.volume_loud_db else None
        return delta, direction

    return _windowed(t_ms, config.volume_window_ms, config, measure, "volume", "window_delta_db",
                     {"baseline_level_db": round(base_level, 1)})


def _pitch(semitones, voiced, t_ms, config: AudioConfig) -> list[Event]:
    def measure(window):
        if not _enough(voiced[window], config):
            return None
        spread = float(np.std(semitones[window][voiced[window]]))
        return spread, "monotone" if spread <= config.pitch_monotone_max_st else None

    return _windowed(t_ms, config.pitch_window_ms, config, measure, "pitch", "window_std_st", {})


def _pace(is_peak, active, t_ms, base_rate, config: AudioConfig) -> list[Event]:
    if not base_rate:
        return []

    def measure(window):
        if not _enough(active[window], config):
            return None
        rate = _rate(is_peak[window], active[window], config.hop_ms)
        ratio = rate / base_rate
        direction = "fast" if ratio >= config.pace_fast_ratio else "slow" if ratio <= config.pace_slow_ratio else None
        return rate, direction

    return _windowed(t_ms, config.pace_window_ms, config, measure, "pace", "window_syllables_per_s",
                     {"baseline_syllables_per_s": round(base_rate, 2)})
