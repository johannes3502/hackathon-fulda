"""Audio-signal analysis on synthetic tones only, never a voice recording."""

import io
import shutil
import wave

import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.events import Event, merge_timeline
from app.main import app
from app.speech import AudioConfig, analyze_samples as _analyze_samples

SR = 16000


def analyze_samples(samples, config=None):
    # Synthetic tones exercise DSP, not speech detection. Explicit legacy
    # baseline keeps these tests independent of the new calibration default.
    config = config or AudioConfig(baseline_ms=None)
    return _analyze_samples(samples, config.model_copy(update={"activity_detector": "energy"}))


def tone(seconds: float, f0: float = 150.0, amplitude: float = 0.3, syllables_hz: float = 4.0,
         glide_st: float = 0.0) -> np.ndarray:
    """Syllable-like bursts: a tone, amplitude-modulated at `syllables_hz`,
    optionally with pitch moving ±`glide_st` semitones."""
    t = np.arange(int(seconds * SR)) / SR
    freq = f0 * 2 ** (glide_st * np.sin(2 * np.pi * 0.5 * t) / 12)
    phase = 2 * np.pi * np.cumsum(freq) / SR
    envelope = 0.5 - 0.5 * np.cos(2 * np.pi * syllables_hz * t) if syllables_hz else np.ones_like(t)
    return (amplitude * envelope * np.sin(phase)).astype(np.float32)


def silence(seconds: float) -> np.ndarray:
    return np.zeros(int(seconds * SR), dtype=np.float32)


def of_type(result, event_type):
    return [e for e in result.events if e.type == event_type]


def test_series_is_timestamped_per_frame():
    result = analyze_samples(tone(2.0))
    series = result.series
    assert series.hop_ms == 10
    assert series.t_ms[:3] == [0, 10, 20]
    assert len(series.t_ms) == len(series.level_db) == len(series.f0_hz) == len(series.active)
    assert result.summary.duration_ms == 2000


def test_f0_estimate():
    result = analyze_samples(tone(2.0, f0=200.0, syllables_hz=0.0))
    assert result.summary.median_f0_hz == pytest.approx(200.0, rel=0.02)


def test_pause_between_speech_only():
    samples = np.concatenate([silence(1.0), tone(3.0), silence(2.5), tone(3.0), silence(1.0)])
    [pause] = of_type(analyze_samples(samples), "pause")
    assert pause.t_ms == pytest.approx(4000, abs=150)
    assert pause.duration_ms == pytest.approx(2500, abs=250)


def test_quiet_section_relative_to_baseline():
    samples = np.concatenate([tone(6.0, amplitude=0.3), tone(4.0, amplitude=0.05), tone(6.0, amplitude=0.3)])
    [quiet] = of_type(analyze_samples(samples), "volume")
    assert quiet.payload["direction"] == "quiet"
    assert quiet.t_ms == 6000 and quiet.duration_ms == 4000
    assert quiet.payload["window_delta_db"][0] <= -AudioConfig().volume_quiet_db


def test_monotone_only_without_pitch_variation():
    varied = analyze_samples(tone(8.0, glide_st=4.0))
    assert of_type(varied, "pitch") == []
    flat = analyze_samples(tone(8.0))
    [monotone] = of_type(flat, "pitch")
    assert monotone.payload["direction"] == "monotone"
    assert monotone.t_ms == 0 and monotone.duration_ms == 8000


def test_syllable_rate_and_fast_section():
    calm = analyze_samples(tone(10.0, syllables_hz=4.0))
    assert calm.summary.syllables_per_second == pytest.approx(4.0, rel=0.25)
    samples = np.concatenate([tone(10.0, syllables_hz=4.0), tone(5.0, syllables_hz=7.0), tone(10.0, syllables_hz=4.0)])
    [fast] = of_type(analyze_samples(samples), "pace")
    assert fast.payload["direction"] == "fast"
    assert fast.t_ms == 10000 and fast.duration_ms == 5000


def test_calibration_baseline():
    # Calibrated on a quiet start, normal speech afterwards counts as loud.
    samples = np.concatenate([tone(4.0, amplitude=0.05), tone(4.0, amplitude=0.3)])
    assert of_type(analyze_samples(samples), "volume") != []
    calibrated = analyze_samples(samples, AudioConfig(baseline_ms=4000))
    assert [e.payload["direction"] for e in of_type(calibrated, "volume")] == ["loud"]


def test_silence_only():
    result = analyze_samples(silence(2.0))
    assert result.events == []
    assert result.summary.active_ms == 0 and result.summary.median_f0_hz is None


@pytest.mark.parametrize("seconds", [10, 10.005])
def test_padded_final_frame_never_extends_events_past_recording(seconds):
    result = analyze_samples(tone(seconds, syllables_hz=0))
    assert result.events
    assert all(0 <= e.t_ms < e.t_ms + e.duration_ms <= result.summary.duration_ms for e in result.events)


def test_silent_calibration_does_not_produce_nan():
    import json

    samples = np.concatenate([silence(4.0), tone(4.0)])
    result = analyze_samples(samples, AudioConfig(baseline_ms=3000))
    assert result.summary.f0_range_st is None
    assert of_type(result, "volume") == []
    assert of_type(result, "pace") == []
    # Results must be persistable with strict JSON even when speech starts late.
    json.dumps(result.model_dump(), allow_nan=False)


def test_merge_timeline_across_pipelines():
    a = Event(t_ms=500, duration_ms=0, type="pause", severity="info", source="speech", payload={})
    b = Event(t_ms=100, duration_ms=0, type="filler", severity="hint", source="asr", payload={})
    assert merge_timeline([a], [b]) == [b, a]


def wav_bytes(samples: np.ndarray) -> bytes:
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(SR)
        wav.writeframes((samples * 32767).astype("<i2").tobytes())
    return buffer.getvalue()


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="FFmpeg not installed")
def test_upload_decoder():
    from app.speech.analysis import analyze_upload

    samples = np.concatenate([tone(3.0), silence(2.5), tone(3.0)])
    result = analyze_upload(io.BytesIO(wav_bytes(samples)), AudioConfig(activity_detector="energy", pause_min_ms=1500))
    assert result.summary.pause_count == 1


def test_api_invalid_config():
    client = TestClient(app)
    response = client.post(
        "/speech/analyze",
        files={"recording": ("synthetic.wav", b"", "audio/wav")},
        data={"config": '{"f0_min_hz": 500}', "transcribe": "false"},
    )
    assert response.status_code == 422
