"""Question generation, answer review and job status.

Question kinds, in the order they are asked:
`contradiction` (a source contradicts a statement), `unsupported` (statement
not found in the checked sources), `gap` (an upload passage the talk leaves
out), `clarification` (vague or unexplained passage), `follow_up` (asked after
an answer). Answers get the fact-check verdicts, no points or grades.

Personas change only the voice of the questions and replies (`student`: a
curious first-semester student; `tutor`: a professor or tutor). Grounding in
the uploaded lecture materials and fact-check findings is the same for both.
"""

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.events import Event
from app.factcheck.models import ClaimResult, Evidence, EvidenceKind, Verdict
from app.transcription.models import Word
from app.questions.styles import PresentationMode

QuestionKind = Literal["contradiction", "unsupported", "gap", "clarification", "follow_up"]
Persona = Literal["student", "tutor"]


class QuestionConfig(BaseModel):
    """Prototype limits, not tuned. Returned with every result."""

    max_questions: int = Field(default=3, ge=1, le=5, description="Hard cap: no endless question loop")
    source_passages: int = Field(default=6, ge=0, le=12, description="Upload passages shown to the model to find gaps")
    top_k: int = Field(default=5, ge=1, le=10, description="Upload passages per answer review")
    min_quote_chars: int = Field(default=12, ge=1, description="Shorter quotes are not accepted as evidence")


class QuestionRequest(BaseModel):
    presentation_mode: PresentationMode = "thesis"
    words: list[Word] = Field(min_length=1, max_length=50000, description="Word timestamps relative to recording start")
    collection_id: UUID | None = Field(default=None, description="Uploaded sources for gaps and answer reviews")
    claims: list[ClaimResult] = Field(default_factory=list, max_length=30,
                                      description="Fact-check findings of the same transcript")
    persona: Persona = Field(default="tutor", description="Who asks: curious student or professor/tutor")
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
    presentation_mode: PresentationMode = "thesis"
    questions: list[Question]
    events: list[Event]
    persona: Persona = "tutor"
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
    presentation_mode: PresentationMode = "thesis"
    question: Question
    answer: str = Field(min_length=1, max_length=4000)
    collection_id: UUID | None = None
    persona: Persona = "tutor"
    config: QuestionConfig = Field(default_factory=QuestionConfig)


class VoiceAnswerRequest(BaseModel):
    """Multipart `request` field of a spoken answer; the audio is a separate file."""

    presentation_mode: PresentationMode = "thesis"
    question: Question
    collection_id: UUID | None = None
    persona: Persona = "tutor"
    config: QuestionConfig = Field(default_factory=QuestionConfig)


class AnswerReview(BaseModel):
    verdict: Verdict = Field(description="`unchecked`: no passage to compare with or the check failed")
    explanation: str
    evidence: Evidence | None = None
    checked: list[EvidenceKind] = Field(description="Where the answer was compared")
    follow_up: Question | None = None
    reply: str = Field(default="", description="What the persona says back, to be read aloud; no grading")
    answer: str | None = Field(default=None, description="Transcript of a spoken answer")
    model: str
    notes: list[str] = Field(default_factory=list)


class AnswerJob(BaseModel):
    job_id: str
    status: Literal["queued", "running", "completed", "failed"]
    result: AnswerReview | None = None
    error: str | None = None
