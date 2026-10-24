"""Deterministic voiced-frame regressions, shared with the browser tracker."""

import json
import math
from pathlib import Path

import numpy as np
import pytest

from app.speech.analysis import _reference_series
from app.speech.baseline import AdaptiveSpeechBaseline, BaselineFrame
from app.speech.config import AudioConfig


def feed(tracker, ms, level=-25, pitch=200, active=True, peak_every=0):
    for i in range(ms // 10):
        tracker.observe(BaselineFrame(level, pitch, active, bool(peak_every and i % peak_every == 0), 10))
    return tracker.current


def ready():
    tracker = AdaptiveSpeechBaseline(AudioConfig())
    feed(tracker, 3000)
    return tracker


def test_matches_browser_shared_noise_speech_pause_fixture():
    fixture = json.loads((Path(__file__).parent / "fixtures/adaptive-baseline.json").read_text())
    tracker = AdaptiveSpeechBaseline(AudioConfig())
    for segment in fixture["segments"]:
        feed(tracker, segment["durationMs"], segment["levelDb"],
             segment["f0Hz"] if segment["f0Hz"] is not None else math.nan,
             segment["active"], segment["peakEveryFrames"])
        expected = segment["expected"]
        if expected is None:
            assert tracker.current is None
        else:
            for key, value in expected.items():
                assert getattr(tracker.current, key) == pytest.approx(value, abs=1e-9)


@pytest.mark.parametrize("pitch", [math.nan, math.inf, 0, -100, 1000])
def test_unpitched_or_invalid_noise_cannot_calibrate(pitch):
    tracker = AdaptiveSpeechBaseline(AudioConfig())
    assert feed(tracker, 10000, level=-45, pitch=pitch) is None
    assert tracker.voiced_ms == 0
    assert feed(tracker, 3000).level == -25


def test_mostly_unvoiced_room_noise_does_not_lower_the_volume_reference():
    tracker = AdaptiveSpeechBaseline(AudioConfig())
    for _ in range(10):
        feed(tracker, 680, level=-45, pitch=math.nan)
        feed(tracker, 320)
    assert tracker.current.level == -25


def test_spikes_do_not_train_and_sustained_change_is_bounded():
    tracker = ready()
    feed(tracker, 10, level=0)
    feed(tracker, 990)
    assert tracker.current.level == -25
    feed(tracker, 1000, level=0)
    assert -25 < tracker.current.level < -24.7


def test_pause_and_noise_freeze_the_reference_and_do_not_accumulate_decay():
    tracker = ready()
    before = tracker.current
    feed(tracker, 60000, level=-100, pitch=math.nan, active=False)
    feed(tracker, 60000, level=-45, pitch=math.nan)
    assert tracker.current is before
    feed(tracker, 1000, level=-13)
    assert tracker.current.level < -24.7


def test_later_rhythm_recovers_from_zero_calibration_peaks():
    tracker = ready()
    assert tracker.current.rate == 0
    feed(tracker, 1000, peak_every=20)
    assert tracker.current.rate == 5


def test_reference_for_existing_timestamps_never_uses_future_samples():
    config = AudioConfig()
    length = 8000  # 80 seconds of derived 10 ms samples, no expensive DSP.
    levels = np.r_[np.full(1000, -25.), np.full(length - 1000, -13.)]
    pitches, active = np.full(length, 200.), np.ones(length, dtype=bool)
    peaks = np.arange(length) % 20 == 0
    full = _reference_series(levels, pitches, active, peaks, config)
    prefix = _reference_series(levels[:2000], pitches[:2000], active[:2000], peaks[:2000], config)
    for actual, expected in zip(full, prefix):
        np.testing.assert_equal(actual[:2000], expected)
    assert np.isnan(full[0][:300]).all()  # Calibration cannot judge itself.
    assert full[0][300] == -25
    assert full[0][2000] < -22
    assert full[0][-1] > -16


def test_adaptive_tracker_cannot_accidentally_use_legacy_global_mode():
    with pytest.raises(ValueError, match="voiced-speech duration"):
        AdaptiveSpeechBaseline(AudioConfig(baseline_ms=None))
