"""Coverage and missing-data regressions, with synthetic events only."""

import pytest

from app.progress import metrics
from app.review.models import ReviewEvent, TakeAnalysis
from app.transcription.models import Word
from test_review import pose_event, speech_event, take_fixture


def take(intervals=None):
    result = take_fixture(60_000, intervals if intervals is not None else [
        {"tMs": 0, "durationMs": 60_000, "evaluable": True}])
    result.analysis = TakeAnalysis(audio_summary={
        "duration_ms": 60_000, "active_ms": 40_000, "median_level_db": -20,
        "median_f0_hz": 200, "f0_range_st": 3, "syllables_per_second": 3, "pause_count": 0})
    return result


def test_pose_event_duration_only_counts_inside_evaluable_intervals():
    recording = take([{"tMs": 20_000, "durationMs": 40_000, "evaluable": True}])
    event = ReviewEvent.model_validate(pose_event(tMs=0, peakMs=5_000, durationMs=30_000))
    _, values = metrics.extract(recording, [event])
    item = values["pose.posture_share"]
    assert item["value"] == pytest.approx(10_000 / 40_000)
    assert item["quality"]["eligible"]


def test_missing_pose_quality_is_unknown_even_without_warnings():
    _, values = metrics.extract(take(), [])
    item = values["pose.posture_share"]
    assert not item["quality"]["eligible"]
    assert "pose-valid-ratio-unknown" in item["quality"]["exclusionReasons"]
    gestures = values["pose.gesture_rate_per_min"]
    assert gestures["value"] is None
    assert "gesture-measurement-missing" in gestures["quality"]["exclusionReasons"]


def test_pause_share_keeps_the_union_of_overlapping_sources():
    events = [speech_event("a", "pause", "asr", 1_000, 4_000),
              speech_event("b", "pause", "speech", 3_000, 4_000)]
    _, values = metrics.extract(take(), events)
    assert values["speech.pause_share"]["value"] == pytest.approx(6_000 / 60_000)


def test_live_events_and_trailing_tolerance_do_not_inflate_final_measurements():
    live = speech_event("live", "pause", "speech", 0, 30_000).model_copy(update={"stage": "live"})
    trailing = speech_event("end", "pause", "speech", 59_500, 1_000)
    _, values = metrics.extract(take(), [live, trailing])
    assert values["speech.pause_share"]["value"] == pytest.approx(500 / 60_000)


def test_asr_provider_is_part_of_metric_comparability():
    recording = take()
    recording.analysis.words = [Word(word="Synthetisch", start_ms=i*1000, end_ms=i*1000+500) for i in range(50)]
    versions = []
    for provider in ("whisper", "deepgram"):
        recording.analysis.asr_provider = provider
        _, values = metrics.extract(recording, [])
        item = values["speech.filler_rate_per_100_words"]
        assert item["quality"]["eligible"]
        versions.append(item["rule_version"])
    assert versions == ["asr:whisper", "asr:deepgram"]
