"""Server-issued question rounds with hard limits and a Redis TTL.

Redis stores only the canonical questions, counters and already computed
reviews. Question objects can contain a transcript snippet and a verified
source quote; the whole round therefore expires after `round_ttl_s` (default
600 s). The key is never extended by reads or answers, so ten minutes after
generation both the questions and their cached reviews are gone.

The ledger is intentionally small and synchronous. Every paid answer review
claims a per-question Redis key before calling the model, so a duplicate
submission with the same answer returns the cached result instead of paying
again. Turn and follow-up limits are checked from the same state.
"""

import time
from typing import Literal
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.connections import redis_client
from app.questions.models import AnswerReview, Persona, Question, QuestionConfig
from app.questions.styles import PresentationMode

ROUND_PREFIX = "question-round:"
TURN_PREFIX = "round:turn:"
# A crashed worker must not block its question for the whole round.
PENDING_TTL_S = 180


class RoundError(RuntimeError):
    """A client-visible refusal; the message is safe to show."""

    status_code = 400
    code = "E_ROUND"

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class RoundExpired(RoundError):
    status_code = 410
    code = "E_ROUND_EXPIRED"

    def __init__(self):
        super().__init__("This question round has expired. Start a new round.")


class UnknownQuestion(RoundError):
    status_code = 404
    code = "E_QUESTION_NOT_FOUND"

    def __init__(self):
        super().__init__("This question does not belong to the round.")


class TurnLimit(RoundError):
    status_code = 429
    code = "E_ROUND_TURN_LIMIT"

    def __init__(self):
        super().__init__("The question-turn limit for this round is reached. Start a new round.")


class DuplicateTurn(RoundError):
    status_code = 409
    code = "E_TURN_IN_PROGRESS"

    def __init__(self):
        super().__init__("This answer is already being reviewed.")


class AlreadyAnswered(RoundError):
    status_code = 409
    code = "E_QUESTION_ALREADY_ANSWERED"

    def __init__(self):
        super().__init__("This question has already been answered in this round.")


class QuestionRound(BaseModel):
    model_config = ConfigDict(extra="forbid")

    round_id: UUID
    created_at: float
    expires_at: float
    presentation_mode: PresentationMode
    persona: Persona
    collection_id: UUID | None
    config: QuestionConfig
    questions: list[Question]
    turns_used: int = 0
    follow_ups_used: int = 0
    answered: list[str] = Field(default_factory=list)
    followed_up: list[str] = Field(default_factory=list)


class TurnRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    answer_hash: str
    status: Literal["pending", "completed"]
    review: dict | None = None


def _client(client=None):
    return client if client is not None else redis_client()


def _round_key(round_id: UUID | str) -> str:
    return f"{ROUND_PREFIX}{round_id}"


def _turn_key(round_id: UUID | str, question_id: str) -> str:
    return f"{TURN_PREFIX}{round_id}:{question_id}"


def _remaining_ttl(client, key: str, state: QuestionRound) -> int:
    ttl = int(client.ttl(key))
    if ttl <= 0:
        ttl = int(state.expires_at - time.time())
    return max(1, ttl)


def create_round(questions: list[Question], config: QuestionConfig, *, collection_id: UUID | None,
                 persona: Persona, presentation_mode: PresentationMode, client=None) -> QuestionRound:
    """Create and persist a round; the caller must be inside the generation job."""
    now = time.time()
    state = QuestionRound(
        round_id=uuid4(),
        created_at=now,
        expires_at=now + config.round_ttl_s,
        presentation_mode=presentation_mode,
        persona=persona,
        collection_id=collection_id,
        config=config,
        questions=questions,
    )
    _client(client).set(_round_key(state.round_id), state.model_dump_json(), ex=config.round_ttl_s)
    return state


def expire(round_id: UUID | str, client=None) -> None:
    _client(client).delete(_round_key(round_id))


def get_round(round_id: UUID | str, client=None) -> QuestionRound:
    client = _client(client)
    key = _round_key(round_id)
    raw = client.get(key)
    if raw is None:
        raise RoundExpired()
    try:
        state = QuestionRound.model_validate_json(raw)
    except ValidationError:
        expire(round_id, client)
        raise RoundExpired() from None
    if state.expires_at <= time.time():
        expire(round_id, client)
        raise RoundExpired()
    return state


def find_question(state: QuestionRound, question_id: str | None) -> Question:
    if not question_id:
        raise UnknownQuestion()
    for question in state.questions:
        if question.id == question_id:
            return question
    raise UnknownQuestion()


def check_answer_allowed(state: QuestionRound, question_id: str | None) -> Question:
    """Reject unknown questions and new turns over the cap before enqueueing work."""
    question = find_question(state, question_id)
    if question.id not in state.answered and state.turns_used >= state.config.max_turns:
        raise TurnLimit()
    return question


def _read_turn(client, round_id: UUID | str, question_id: str) -> TurnRecord | None:
    raw = client.get(_turn_key(round_id, question_id))
    if raw is None:
        return None
    try:
        return TurnRecord.model_validate_json(raw)
    except ValidationError:
        return None


def _write_turn(client, state: QuestionRound, question_id: str, record: TurnRecord) -> None:
    key = _turn_key(state.round_id, question_id)
    client.set(key, record.model_dump_json(), ex=_remaining_ttl(client, _round_key(state.round_id), state))


def _review_from_record(record: TurnRecord | None) -> AnswerReview | None:
    if record is None or record.status != "completed" or record.review is None:
        return None
    try:
        return AnswerReview.model_validate(record.review)
    except ValidationError:
        return None


def claim_turn(round_id: UUID | str, question_id: str, answer_hash: str, client=None) -> AnswerReview | None:
    """Reserve the one paid review for this question and answer.

    Returns a cached review for an identical completed submission. A different
    pending submission is refused. Re-reviewing an already answered question
    with different text is allowed and does not consume another turn.
    """
    client = _client(client)
    state = get_round(round_id, client)
    question = check_answer_allowed(state, question_id)
    record = _read_turn(client, state.round_id, question.id)
    if record is not None:
        if record.status == "pending":
            raise DuplicateTurn()
        if record.answer_hash == answer_hash:
            cached = _review_from_record(record)
            if cached is not None:
                return cached
            # A corrupt cached payload must not block the question forever.
            client.delete(_turn_key(state.round_id, question.id))
            record = None
        else:
            # One accepted review per question. This closes an unbounded
            # paid re-review loop while still allowing an identical retry.
            raise AlreadyAnswered()
    pending = TurnRecord(answer_hash=answer_hash, status="pending")
    ttl = min(_remaining_ttl(client, _round_key(state.round_id), state), PENDING_TTL_S)
    # A new answer must atomically own the key. An NX write makes concurrent
    # identical submissions collapse onto one paid review.
    claimed = client.set(_turn_key(state.round_id, question.id), pending.model_dump_json(), ex=ttl,
                         nx=record is None)
    if claimed is None:
        latest = _read_turn(client, state.round_id, question.id)
        cached = _review_from_record(latest)
        if latest is not None and latest.answer_hash == answer_hash and cached is not None:
            return cached
        raise DuplicateTurn()
    return None


def fail_turn(round_id: UUID | str, question_id: str, answer_hash: str | None = None, client=None) -> None:
    """Release a pending claim after a failed review so a retry can run."""
    client = _client(client)
    record = _read_turn(client, round_id, question_id)
    if record is not None and record.status == "pending" and (answer_hash is None or record.answer_hash == answer_hash):
        client.delete(_turn_key(round_id, question_id))


def _follow_up_id(state: QuestionRound, parent: Question) -> str:
    existing = {question.id for question in state.questions}
    index = 1
    while True:
        candidate = f"{parent.id}.f{index}"
        if candidate not in existing:
            return candidate
        index += 1


def _add_follow_up(state: QuestionRound, parent: Question, follow_up: Question) -> Question | None:
    """Mutate the in-memory state; returns the canonical question or None at the cap."""
    if parent.id in state.followed_up:
        return None
    if state.follow_ups_used >= state.config.max_follow_ups or len(state.questions) >= state.config.max_turns:
        return None
    canonical = follow_up.model_copy(update={
        "id": _follow_up_id(state, parent),
        "kind": "follow_up",
        "reason": f"Nachfrage zur Antwort auf: {parent.question}"[:300],
    })
    state.questions.append(canonical)
    state.follow_ups_used += 1
    state.followed_up.append(parent.id)
    return canonical


def _save_round(client, state: QuestionRound) -> None:
    key = _round_key(state.round_id)
    client.set(key, state.model_dump_json(), ex=_remaining_ttl(client, key, state))


def add_follow_up(round_id: UUID | str, parent_question_id: str, follow_up: Question,
                  client=None) -> Question | None:
    """Persist a follow-up for a parent question if the round has budget left."""
    client = _client(client)
    state = get_round(round_id, client)
    parent = find_question(state, parent_question_id)
    if parent.id in state.followed_up:
        return None
    canonical = _add_follow_up(state, parent, follow_up)
    if canonical is not None:
        _save_round(client, state)
    return canonical


def complete_turn(round_id: UUID | str, question_id: str, answer_hash: str, review: AnswerReview,
                  client=None) -> AnswerReview:
    """Record an accepted review, consume one turn and add a capped follow-up."""
    client = _client(client)
    state = get_round(round_id, client)
    question = find_question(state, question_id)
    already_answered = question.id in state.answered
    if not already_answered:
        if state.turns_used >= state.config.max_turns:
            raise TurnLimit()
        state.turns_used += 1
        state.answered.append(question.id)

    follow_up = review.follow_up
    notes = list(review.notes)
    if follow_up is not None and already_answered:
        follow_up = None
        notes.append("Diese Antwort wurde bereits ausgewertet; keine weitere Nachfrage.")
    elif follow_up is not None:
        follow_up = _add_follow_up(state, question, follow_up)
        if follow_up is None:
            notes.append("Nachfrage-Limit dieser Runde erreicht.")

    review = review.model_copy(update={"follow_up": follow_up, "notes": notes})
    _save_round(client, state)
    _write_turn(client, state, question.id,
                TurnRecord(answer_hash=answer_hash, status="completed", review=review.model_dump(mode="json")))
    return review


def consume_turn(round_id: UUID | str, question_id: str, answer_hash: str, review: AnswerReview,
                 client=None) -> AnswerReview:
    """Alias with the ledger vocabulary used by callers."""
    return complete_turn(round_id, question_id, answer_hash, review, client)


def validate_answer(round_id: UUID | str, question_id: str | None, client=None) -> Question:
    """Fast API-side check: round exists, is unexpired and has this question/turn budget."""
    state = get_round(round_id, client)
    return check_answer_allowed(state, question_id)


def round_counts(state: QuestionRound) -> dict[str, int]:
    return {
        "turnsUsed": state.turns_used,
        "maxTurns": state.config.max_turns,
        "followUpsUsed": state.follow_ups_used,
        "maxFollowUps": state.config.max_follow_ups,
    }


__all__ = [
    "RoundError", "RoundExpired", "UnknownQuestion", "TurnLimit", "DuplicateTurn",
    "AlreadyAnswered",
    "QuestionRound", "create_round", "get_round", "find_question", "check_answer_allowed",
    "claim_turn", "fail_turn", "complete_turn", "consume_turn", "add_follow_up",
    "validate_answer", "expire", "round_counts",
    "ROUND_PREFIX", "TURN_PREFIX",
]
