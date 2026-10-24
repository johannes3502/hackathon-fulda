"""Question generation, answer review and job status.

Question kinds, in the order they are asked:
`contradiction` (a source contradicts a statement), `unsupported` (statement
not found in the checked sources), `gap` (an upload passage the talk leaves
out), `clarification` (vague or unexplained passage), `follow_up` (asked after
an answer). Answers get the fact-check verdicts, no points or grades.
"""

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.events import Event
from app.factcheck.models import ClaimResult, Evidence, EvidenceKind, Verdict
from app.transcription.models import Word

QuestionKind = Literal["contradiction", "unsupported", "gap", "clarification", "follow_up"]


class QuestionConfig(BaseModel):
    """Prototype limits, not tuned. Returned with every result."""

    max_questions: int = Field(default=5, ge=1, le=10)
    source_passages: int = Field(default=6, ge=0, le=12, description="Upload passages shown to the model to find gaps")
    top_k: int = Field(default=5, ge=1, le=10, description="Upload passages per answer review")
    min_quote_chars: int = Field(default=12, ge=1, description="Shorter quotes are not accepted as evidence")


class QuestionRequest(BaseModel):
    words: list[Word] = Field(min_length=1, max_length=50000, description="Word timestamps relative to recording start")
    collection_id: UUID | None = Field(default=None, description="Uploaded sources for gaps and answer reviews")
    claims: list[ClaimResult] = Field(default_factory=list, max_length=30,
                                      description="Fact-check findings of the same transcript")
    config: QuestionConfig = Field(default_factory=QuestionConfig)


class Question(BaseModel):
    id: str
    kind: QuestionKind
    question: str
    reason: str = Field(description="Why this question is asked, one sentence")
    t_ms: int | None = Field(description="Start of the spoken passage; null if it concerns the whole talk")
    duration_ms: int = 0
    transcript: str | None = Field(default=None, description="Spoken sentence(s) the question refers to")
    claim: str | None = Field(default=None, description="Fact-check claim the question comes from")
    evidence: Evidence | None = Field(default=None, description="Verified source passage behind the question")
    query: str = Field(description="Search query used to compare the answer with the sources")


class QuestionResult(BaseModel):
    questions: list[Question]
    events: list[Event]
    model: str
    sources_used: bool
    config: QuestionConfig
    notices: list[str]


class QuestionJob(BaseModel):
    job_id: str
    status: Literal["queued", "running", "completed", "failed"]
    result: QuestionResult | None = None
    error: str | None = None


class AnswerRequest(BaseModel):
    question: Question
    answer: str = Field(min_length=1, max_length=4000)
    collection_id: UUID | None = None
    config: QuestionConfig = Field(default_factory=QuestionConfig)


class AnswerReview(BaseModel):
    verdict: Verdict = Field(description="`unchecked`: no passage to compare with or the check failed")
    explanation: str
    evidence: Evidence | None = None
    checked: list[EvidenceKind] = Field(description="Where the answer was compared")
    follow_up: Question | None = None
    model: str
    notes: list[str] = Field(default_factory=list)


class AnswerJob(BaseModel):
    job_id: str
    status: Literal["queued", "running", "completed", "failed"]
    result: AnswerReview | None = None
    error: str | None = None
