from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.events import Event
from app.sources.models import Location
from app.transcription.models import Word


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


Verdict = Literal["supports", "contradicts", "not_found"]


class CoachingRequest(StrictModel):
    collection_id: UUID
    words: list[Word] = Field(min_length=1, max_length=5000)
    duration_ms: int = Field(gt=0, le=600_000)

    @model_validator(mode="after")
    def valid_transcript(self):
        previous = -1
        for word in self.words:
            if not word.word.strip() or len(word.word) > 200:
                raise ValueError("Invalid transcript word")
            if word.start_ms < previous or word.end_ms > self.duration_ms:
                raise ValueError("Transcript times must be ordered and inside this recording")
            previous = word.start_ms
        return self


class ClaimSpan(StrictModel):
    first_word: int = Field(ge=0)
    last_word: int = Field(ge=0)


class ExtractedClaims(StrictModel):
    claims: list[ClaimSpan] = Field(max_length=6)


class QuoteDraft(StrictModel):
    chunk_id: int
    quote: str = Field(min_length=1, max_length=1600)


class CheckDraft(StrictModel):
    claim_id: str
    verdict: Verdict
    explanation: str = Field(min_length=1, max_length=2000)
    citations: list[QuoteDraft] = Field(max_length=4)


class DraftChecks(StrictModel):
    checks: list[CheckDraft] = Field(max_length=6)


class Citation(StrictModel):
    chunk_id: int
    source_id: UUID
    filename: str
    location: Location
    quote: str


class FactCheck(StrictModel):
    id: str
    statement: str
    t_ms: int
    duration_ms: int
    verdict: Verdict | None
    explanation: str
    citations: list[Citation]
    issue: str | None = None


class QuestionDraft(StrictModel):
    claim_id: str | None
    text: str = Field(min_length=1, max_length=1200)
    reason: str = Field(min_length=1, max_length=1200)


class DraftQuestions(StrictModel):
    questions: list[QuestionDraft] = Field(max_length=3)


class CoachingQuestion(QuestionDraft):
    id: str
    t_ms: int


class CoachingReport(StrictModel):
    collection_id: UUID
    checks: list[FactCheck]
    questions: list[CoachingQuestion]
    events: list[Event]
    model: str
    notices: list[str]


class AnswerRequest(StrictModel):
    question_id: str = Field(min_length=1, max_length=100)
    answer: str = Field(min_length=1, max_length=6000)

    @model_validator(mode="after")
    def not_blank(self):
        if not self.answer.strip():
            raise ValueError("Write an answer first")
        return self


class AnswerDraft(StrictModel):
    verdict: Verdict
    explanation: str = Field(min_length=1, max_length=2000)
    citations: list[QuoteDraft] = Field(max_length=4)
    follow_up: str | None


class AnswerReview(StrictModel):
    question_id: str
    answer: str
    verdict: Verdict | None
    explanation: str
    citations: list[Citation]
    follow_up: str | None
    issue: str | None = None
    model: str


class CoachingJob(StrictModel):
    job_id: UUID
    status: Literal["queued", "running", "completed", "failed"]
    report: CoachingReport | None = None
    answer: AnswerReview | None = None
    error: str | None = None


class AcceptedCoaching(StrictModel):
    job_id: UUID
    status_url: str
