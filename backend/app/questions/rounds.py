"""Bounded question rounds; one Redis value expires at a fixed deadline.

Short Redis locks serialize reservations and completion across workers. Model
and ASR calls run outside the lock. Pending turns reserve budget until failure
or round expiry; duplicate submissions cannot start another paid review.
"""

import time
from contextlib import contextmanager
from typing import Literal
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.connections import redis_client
from app.questions.models import AnswerReview, Persona, Question, QuestionConfig
from app.questions.styles import PresentationMode

ROUND_PREFIX = "question-round:"


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


class TurnRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    answer_hash: str
    status: Literal["pending", "completed"]
    review: AnswerReview | None = None


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
    turns: dict[str, TurnRecord] = Field(default_factory=dict)
    followed_up: list[str] = Field(default_factory=list)

    @property
    def answered(self) -> list[str]:
        return [key for key, turn in self.turns.items() if turn.status == "completed"]

    @property
    def turns_used(self) -> int:
        return len(self.answered)

    @property
    def follow_ups_used(self) -> int:
        return len(self.followed_up)


def _client(client=None):
    return client if client is not None else redis_client()


def _round_key(round_id: UUID | str) -> str:
    return f"{ROUND_PREFIX}{round_id}"


def create_round(questions: list[Question], config: QuestionConfig, *, collection_id: UUID | None,
                 persona: Persona, presentation_mode: PresentationMode, client=None) -> QuestionRound:
    now = time.time()
    state = QuestionRound(
        round_id=uuid4(), created_at=now, expires_at=now + config.round_ttl_s,
        presentation_mode=presentation_mode, persona=persona, collection_id=collection_id,
        config=config, questions=questions,
    )
    _client(client).set(_round_key(state.round_id), state.model_dump_json(), ex=config.round_ttl_s)
    return state


def expire(round_id: UUID | str, client=None) -> None:
    _client(client).delete(_round_key(round_id))


def get_round(round_id: UUID | str, client=None) -> QuestionRound:
    client = _client(client)
    raw = client.get(_round_key(round_id))
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


@contextmanager
def _mutation(round_id, client):
    # No provider calls while holding this lock. A single SET commits counters,
    # follow-ups and the cached review together; an expired round stays expired.
    with client.lock(f"{_round_key(round_id)}:lock", timeout=30, blocking_timeout=3):
        state = get_round(round_id, client)
        yield state
        if state.expires_at <= time.time() or not client.set(
                _round_key(round_id), state.model_dump_json(), xx=True, keepttl=True):
            raise RoundExpired()


def find_question(state: QuestionRound, question_id: str | None) -> Question:
    for question in state.questions:
        if question.id == question_id:
            return question
    raise UnknownQuestion()


def check_answer_allowed(state: QuestionRound, question_id: str | None) -> Question:
    question = find_question(state, question_id)
    # Pending reviews reserve turns, so concurrent requests cannot exceed budget.
    if question.id not in state.turns and len(state.turns) >= state.config.max_turns:
        raise TurnLimit()
    return question


def claim_turn(round_id: UUID | str, question_id: str, answer_hash: str, client=None) -> AnswerReview | None:
    client = _client(client)
    with _mutation(round_id, client) as state:
        question = check_answer_allowed(state, question_id)
        record = state.turns.get(question.id)
        if record is not None:
            if record.status == "pending":
                raise DuplicateTurn()
            if record.answer_hash != answer_hash:
                raise AlreadyAnswered()
            if record.review is not None:
                return record.review
            # Corrupt cached results fail closed instead of paying again.
            raise AlreadyAnswered()
        state.turns[question.id] = TurnRecord(answer_hash=answer_hash, status="pending")
    return None


def fail_turn(round_id: UUID | str, question_id: str, answer_hash: str, client=None) -> None:
    client = _client(client)
    try:
        with _mutation(round_id, client) as state:
            record = state.turns.get(question_id)
            if record and record.status == "pending" and record.answer_hash == answer_hash:
                del state.turns[question_id]
    except RoundExpired:
        pass


def _add_follow_up(state: QuestionRound, parent: Question, follow_up: Question) -> Question | None:
    if (parent.id in state.followed_up or state.follow_ups_used >= state.config.max_follow_ups
            or len(state.questions) >= state.config.max_turns):
        return None
    # One follow-up per parent: stable IDs need no search or model-provided ID.
    canonical = follow_up.model_copy(update={
        "id": f"{parent.id}.f1", "kind": "follow_up",
        "reason": f"Nachfrage zur Antwort auf: {parent.question}"[:300],
    })
    state.questions.append(canonical)
    state.followed_up.append(parent.id)
    return canonical


def complete_turn(round_id: UUID | str, question_id: str, answer_hash: str, review: AnswerReview,
                  client=None) -> AnswerReview:
    client = _client(client)
    with _mutation(round_id, client) as state:
        question = find_question(state, question_id)
        record = state.turns.get(question.id)
        if record is None or record.answer_hash != answer_hash:
            raise DuplicateTurn()
        if record.status == "completed":
            if record.review is None:
                raise AlreadyAnswered()
            return record.review
        follow_up = review.follow_up
        notes = list(review.notes)
        if follow_up is not None:
            follow_up = _add_follow_up(state, question, follow_up)
            if follow_up is None:
                notes.append("Nachfrage-Limit dieser Runde erreicht.")
        review = review.model_copy(update={"follow_up": follow_up, "notes": notes})
        state.turns[question.id] = TurnRecord(answer_hash=answer_hash, status="completed", review=review)
    return review


def validate_answer(round_id: UUID | str, question_id: str | None, client=None) -> Question:
    return check_answer_allowed(get_round(round_id, client), question_id)
