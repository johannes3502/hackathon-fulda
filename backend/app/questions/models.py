"""Question generation, answer review and job status.

Question kinds, in the order they are asked:
`contradiction` (a source contradicts a statement), `unsupported` (statement
not found in the checked sources), `gap` (an upload passage the talk leaves
out), `clarification` (vague or unexplained passage), `follow_up` (asked after
an answer). Answers get the fact-check verdicts, no points or grades.

Answers are bound to a server-issued round (`round_id` + `question_id`). The
canonical question comes from the round ledger, never from the request, so a
client cannot fabricate evidence or change the task. `question` remains only
for the internal take-review worker and is ignored whenever a round is given.
"""

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.events import Event
from app.factcheck.models import ClaimResult, Evidence, EvidenceKind, Verdict
from app.prompt_safety import safe_http_url
from app.transcription.models import Word
from app.questions.styles import PresentationMode

QuestionKind = Literal["contradiction", "unsupported", "gap", "clarification", "follow_up"]
Persona = Literal["student", "tutor"]

MAX_QUESTION_CHARS = 500
MAX_REASON_CHARS = 300
MAX_QUERY_CHARS = 300
MAX_TRANSCRIPT_CHARS = 4000
MAX_CLAIM_CHARS = 2000
MAX_EVIDENCE_QUOTE_CHARS = 4000
MAX_EVIDENCE_PASSAGE_CHARS = 12000
MAX_EVIDENCE_LABEL_CHARS = 300


class QuestionConfig(BaseModel):
    """Prototype limits, not tuned. Returned with every result."""

    model_config = ConfigDict(extra="forbid")

    max_questions: int = Field(default=3, ge=1, le=5, description="Maximum initial questions; follow-ups are separate")
    max_follow_ups: int = Field(default=3, ge=0, le=5, description="Maximum follow-up questions per round")
    max_turns: int = Field(default=6, ge=1, le=12, description="Maximum answered question turns per round")
    round_ttl_s: int = Field(default=600, ge=60, le=3600, description="Server-side round lifetime in seconds")
    source_passages: int = Field(default=6, ge=0, le=12, description="Upload passages shown to the model to find gaps")
    top_k: int = Field(default=5, ge=1, le=10, description="Upload passages per answer review")
    min_quote_chars: int = Field(default=12, ge=1, description="Shorter quotes are not accepted as evidence")


class QuestionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    presentation_mode: PresentationMode = "thesis"
    words: list[Word] = Field(min_length=1, max_length=50000, description="Word timestamps relative to recording start")
    collection_id: UUID | None = Field(default=None, description="Uploaded sources for gaps and answer reviews")
    claims: list[ClaimResult] = Field(default_factory=list, max_length=30,
                                      description="Fact-check findings of the same transcript")
    persona: Persona = Field(default="tutor", description="Who asks: curious student or professor/tutor")
    config: QuestionConfig = Field(default_factory=QuestionConfig)

    @field_validator("claims")
    @classmethod
    def _bound_client_claims(cls, claims: list[ClaimResult]) -> list[ClaimResult]:
        """Client findings still reach the prompt; cap their text before adding them."""
        for claim in claims:
            if len(claim.claim) > MAX_CLAIM_CHARS or len(claim.transcript) > MAX_TRANSCRIPT_CHARS:
                raise ValueError("Fact-check claim or transcript is too long")
            if len(claim.explanation) > 2000:
                raise ValueError("Fact-check explanation is too long")
            evidence = claim.evidence
            if evidence is not None and (
                len(evidence.quote) > MAX_EVIDENCE_QUOTE_CHARS
                or len(evidence.passage) > MAX_EVIDENCE_PASSAGE_CHARS
                or len(evidence.label) > MAX_EVIDENCE_LABEL_CHARS
            ):
                raise ValueError("Fact-check evidence is too long")
        return claims


class Question(BaseModel):
    """A canonical question stored in the round ledger and returned to clients."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(max_length=64)
    kind: QuestionKind
    question: str = Field(min_length=1, max_length=MAX_QUESTION_CHARS)
    reason: str = Field(description="Why this question is asked, one sentence", max_length=MAX_REASON_CHARS)
    t_ms: int | None = Field(description="Start of the spoken passage; null if it concerns the whole talk")
    duration_ms: int = 0
    transcript: str | None = Field(default=None, max_length=MAX_TRANSCRIPT_CHARS,
                                   description="Spoken sentence(s) the question refers to")
    claim: str | None = Field(default=None, max_length=MAX_CLAIM_CHARS,
                              description="Fact-check claim the question comes from")
    evidence: Evidence | None = Field(default=None, description="Verified source passage behind the question")
    query: str = Field(description="Search query used to compare the answer with the sources",
                       max_length=MAX_QUERY_CHARS)

    @field_validator("evidence")
    @classmethod
    def _bound_evidence(cls, evidence: Evidence | None) -> Evidence | None:
        if evidence is None:
            return None
        if (len(evidence.quote) > MAX_EVIDENCE_QUOTE_CHARS
                or len(evidence.passage) > MAX_EVIDENCE_PASSAGE_CHARS
                or len(evidence.label) > MAX_EVIDENCE_LABEL_CHARS):
            raise ValueError("Question evidence is too long")
        # Never render a client- or provider-supplied javascript:/data:/credential URL.
        if evidence.url and not safe_http_url(evidence.url):
            return evidence.model_copy(update={"url": None})
        return evidence


class QuestionResult(BaseModel):
    presentation_mode: PresentationMode = "thesis"
    round_id: UUID | None = Field(default=None, description="Server-issued round for follow-up answers")
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
    model_config = ConfigDict(extra="forbid")

    presentation_mode: PresentationMode = "thesis"
    round_id: UUID | None = Field(default=None, description="Server-issued question round")
    question_id: str | None = Field(default=None, max_length=64)
    question: Question | None = Field(
        default=None,
        description="Deprecated. Ignored when round_id is set; the HTTP API rejects it without a round.",
    )
    answer: str = Field(min_length=1, max_length=4000)
    collection_id: UUID | None = None
    persona: Persona = "tutor"
    config: QuestionConfig = Field(default_factory=QuestionConfig)


class VoiceAnswerRequest(BaseModel):
    """Multipart `request` field of a spoken answer; the audio is a separate file."""

    model_config = ConfigDict(extra="forbid")

    presentation_mode: PresentationMode = "thesis"
    round_id: UUID | None = Field(default=None, description="Server-issued question round")
    question_id: str | None = Field(default=None, max_length=64)
    question: Question | None = Field(
        default=None,
        description="Deprecated. Ignored when round_id is set; the HTTP API rejects it without a round.",
    )
    collection_id: UUID | None = None
    persona: Persona = "tutor"
    config: QuestionConfig = Field(default_factory=QuestionConfig)
    audio_sha256: str | None = Field(default=None, max_length=64,
                                     description="Server-computed hash of the uploaded audio, for idempotency")


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

    @field_validator("evidence")
    @classmethod
    def _safe_review_url(cls, evidence: Evidence | None) -> Evidence | None:
        if evidence is not None and evidence.url and not safe_http_url(evidence.url):
            return evidence.model_copy(update={"url": None})
        return evidence


class AnswerJob(BaseModel):
    job_id: str
    status: Literal["queued", "running", "completed", "failed"]
    result: AnswerReview | None = None
    error: str | None = None
