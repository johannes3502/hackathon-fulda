"""Synthetic seed contract and repeatability; never touches existing sessions."""

import os
from uuid import uuid4

import pytest

from app.review import db, service
from app.review.models import ReviewReport
from scripts.seed_demo import NOTICE, demo_takes, seed_demo


def test_seed_fixtures_are_stable_bounded_and_explicitly_synthetic():
    first, second = demo_takes(), demo_takes()
    assert [item.take.take_id for item in first] == [item.take.take_id for item in second]
    assert len(first) == 3
    for fixture in first:
        assert fixture.session.title.startswith("Synthetische Demo")
        assert fixture.take.analysis.synthetic_demo
        assert fixture.take.analysis.audio_summary is None
        assert fixture.take.coverage == []
        assert NOTICE in fixture.take.analysis.notices
        assert all(word.end_ms <= fixture.take.duration_ms for word in fixture.take.analysis.words)
        assert all(event.t_ms + event.duration_ms <= fixture.take.duration_ms for event in fixture.events)


@pytest.mark.skipif(not os.getenv("POSTGRES_HOST"), reason="Needs PostgreSQL")
def test_database_seed_is_insert_only_and_reviews_are_readable():
    namespace = uuid4()
    fixtures = demo_takes(namespace)
    try:
        first = seed_demo(namespace)
        assert first["inserted"] == 3 and first["skipped"] == 0
        # Existing records, including manual changes, must survive a rerun.
        with db.connect() as connection:
            connection.execute("UPDATE sessions SET title='Synthetic edited title' WHERE id=%s", (fixtures[0].session.session_id,))
        again = seed_demo(namespace)
        assert again["inserted"] == 0 and again["skipped"] == 3
        assert service.session_detail(fixtures[0].session.session_id).session.title == "Synthetic edited title"
        for fixture in fixtures:
            timeline = service.timeline(fixture.take.take_id).timeline
            assert timeline.take.analysis.synthetic_demo
            assert timeline.events
            assert timeline.coverage.evaluable_ms == 0
            report = ReviewReport.model_validate(service.review(fixture.take.take_id)["review"])
            assert NOTICE in report.limitations
            assert report.generator.mode == "template"
            assert report.findings
            with db.connect() as connection:
                job = connection.execute("SELECT status,object_key FROM jobs WHERE take_id=%s", (fixture.take.take_id,)).fetchone()
                assert job == {"status": "completed", "object_key": None}
    finally:
        for fixture in fixtures:
            service.delete_session(fixture.session.session_id)
