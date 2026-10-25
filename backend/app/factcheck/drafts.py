"""Internal model-output contracts, separate from stored API result models."""
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


class Draft(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ExtractedClaim(Draft):
    sentences: list[int] = Field(default_factory=list)
    claim: str
    query: str = ""


class ExtractedClaims(Draft):
    claims: list[ExtractedClaim] = Field(max_length=30)


class Judgment(Draft):
    verdict: Literal["supports", "contradicts", "not_found"]
    passage: int | None = None
    quote: str = ""
    explanation: str = ""


class AnswerJudgment(Judgment):
    follow_up: str = ""
    reply: str = ""


class QuestionDraft(Draft):
    kind: Literal["contradiction", "unsupported", "gap", "clarification"]
    question: str
    reason: str = ""
    finding: int | None = None
    sentences: list[int] = Field(default_factory=list)
    passage: int | None = None
    quote: str = ""
    query: str = ""


class QuestionDrafts(Draft):
    questions: list[QuestionDraft] = Field(max_length=10)
