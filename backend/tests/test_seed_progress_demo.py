"""Progress seed fixtures stay deterministic, synthetic and measurable."""

from app.progress import metrics
from scripts.seed_progress_demo import (
    NOTICE, PROFILE_ID, PROFILE_TOKEN, demo_progress_takes,
)


PRIMARY = (
    "speech.pace_wpm", "speech.pause_share", "speech.filler_rate_per_100_words",
    "pose.posture_share", "pose.head_away_share", "pose.gesture_rate_per_min",
    "content.contradiction_rate",
)


def test_progress_seed_is_stable_and_measurable():
    first, second = demo_progress_takes(), demo_progress_takes()
    assert [item.take.take_id for item in first] == [item.take.take_id for item in second]
    assert len(first) == 24
    assert len([item for item in first if item.take.duration_ms >= 60_000]) == 20
    assert PROFILE_TOKEN.startswith("pp_")
    for fixture in first:
        take = fixture.take
        assert take.profile_id == PROFILE_ID
        assert fixture.session.profile_id == PROFILE_ID
        assert take.analysis.synthetic_demo is False
        assert NOTICE in take.analysis.notices
        assert take.coverage and take.coverage[0].evaluable
        assert take.analysis.words
        assert all(word.end_ms <= take.duration_ms for word in take.analysis.words)
        assert all(event.t_ms + event.duration_ms <= take.duration_ms for event in fixture.events)
        quality, values = metrics.extract(take, fixture.events)
        if take.duration_ms < 60_000:
            assert quality["status"] == "poor"
            assert "duration-too-short" in quality["global_exclusion_reasons"]
            assert not any(item["quality"]["eligible"] for item in values.values())
            continue
        assert quality["status"] == "ok"
        for metric_id in PRIMARY:
            assert values[metric_id]["value"] is not None
            assert values[metric_id]["quality"]["eligible"] is True
