"""Shared test fixtures; synthetic data only, no Redis or database required."""

import pytest

from app.questions import rounds
from tests.redis_fake import FakeRedis


@pytest.fixture
def fake_redis_store(monkeypatch):
    fake = FakeRedis()
    monkeypatch.setattr(rounds, "redis_client", lambda: fake)
    return fake


@pytest.fixture(autouse=True)
def _default_question_round_store(fake_redis_store):
    """Question generation now creates a round; tests get an isolated fake ledger."""
    return fake_redis_store
