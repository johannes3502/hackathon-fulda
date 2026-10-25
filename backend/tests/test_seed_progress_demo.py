"""Progress seed fixtures stay deterministic, synthetic and measurable."""

from app.progress import metrics
from scripts.seed_progress_demo import (
    NOTICE, PROFILE_ID, PROFILE_TOKEN,
    SHOWCASE_NAMESPACE, SHOWCASE_NOTICE, SHOWCASE_PROFILE_ID,
    SHOWCASE_PROFILE_NAME, SHOWCASE_PROFILE_TOKEN, demo_progress_takes,
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


def test_showcase_seed_is_neutral_and_separate():
    demo = demo_progress_takes()
    showcase = demo_progress_takes(
        SHOWCASE_NAMESPACE, SHOWCASE_PROFILE_ID, SHOWCASE_NOTICE, showcase=True)
    assert len(showcase) == len(demo) == 24
    assert SHOWCASE_PROFILE_TOKEN.startswith("pp_")
    assert SHOWCASE_PROFILE_NAME == "Alex Winter"
    assert {item.take.profile_id for item in showcase} == {SHOWCASE_PROFILE_ID}
    assert {item.session.profile_id for item in showcase} == {SHOWCASE_PROFILE_ID}
    assert not {item.take.take_id for item in showcase} & {
        item.take.take_id for item in demo}
    for fixture in showcase:
        assert not fixture.take.analysis.notices
        assert "Synthet" not in fixture.session.title
        assert fixture.take.analysis.asr_provider == "local-whisper"
        claims = fixture.take.analysis.factcheck.claims
        assert claims
        assert all("Synthet" not in claim.claim for claim in claims)
        assert all(claim.evidence is None or "Pitch-Deck" in claim.evidence.label
                   for claim in claims)
        quality, values = metrics.extract(fixture.take, fixture.events)
        if fixture.take.duration_ms < 60_000:
            continue
        assert quality["status"] == "ok"
        for metric_id in PRIMARY:
            assert values[metric_id]["quality"]["eligible"] is True
