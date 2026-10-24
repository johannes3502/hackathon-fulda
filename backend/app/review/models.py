"""The camelCase session/take contract; legacy pipeline models stay compatible."""

from datetime import datetime
from typing import Annotated, Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, PlainSerializer, WrapValidator, model_serializer, model_validator
from pydantic.alias_generators import to_camel

from app.factcheck.models import FactCheckResult
from app.questions.models import AnswerReview, QuestionResult
from app.speech.models import AudioSummary
from app.transcription.models import Word, WordSummary

MAX_DURATION_MS = 86_400_000
PresentationMode = Literal["startup", "thesis", "school", "nonprofit"]
PoseCategory = Literal["posture", "head", "hands", "framing", "data-quality"]
EventType = Literal["posture", "head", "hands", "framing", "data-quality", "gesture",
                    "filler", "pause", "pace", "volume", "pitch", "fact", "question"]


class Model(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="forbid", allow_inf_nan=False)


class Consent(Model):
    granted: Literal[True]
    at: datetime
    version: str = Field(min_length=1, max_length=100)
    scope: Literal["local-analysis", "local-and-cloud-analysis"]

    @model_validator(mode="after")
    def timezone(self):
        if self.at.tzinfo is None:
            raise ValueError("Consent timestamp must include a timezone")
        return self


class Capture(Model):
    framing_mode: Literal["upper-body", "full-body"] = "upper-body"
    audience_mode: Literal["camera", "room"] = "camera"
    width: int = Field(default=1280, gt=0, le=16384)
    height: int = Field(default=720, gt=0, le=16384)
    fps: float = Field(default=30, gt=0, le=240)
    mirrored: bool = True
    device_key: UUID | None = None


class SessionCreate(Model):
    title: str = Field(min_length=1, max_length=200)
    collection_id: UUID | None = None
    profile_id: UUID | None = None
    presentation_mode: PresentationMode | None = None
    capture: Capture = Field(default_factory=Capture)
    consent: Consent


class Session(SessionCreate):
    session_id: UUID
    status: Literal["created", "analyzing", "review_ready", "failed", "deleted"]
    created_at: datetime


class Timebase(Model):
    onstart_perf_ms: float = Field(ge=0)
    first_video_pts_ms: float | None = None
    audio_start_ms: float | None = None
    av_offset_ms: float | None = None
    container_duration_ms: float | None = Field(default=None, ge=0)
    wall_duration_ms: float | None = Field(default=None, ge=0)

    @model_serializer(mode="wrap")
    def preserve_supplied_fields(self, handler, info):
        fields = {to_camel(field) if info.by_alias else field for field in self.model_fields_set}
        return {key: value for key, value in handler(self).items() if key in fields}


class CoverageInterval(Model):
    t_ms: int = Field(ge=0, strict=True)
    duration_ms: int = Field(ge=0, strict=True)
    evaluable: bool
    reason: str | None = Field(default=None, max_length=100)


class TakeCreate(Model):
    duration_ms: int = Field(ge=0, le=MAX_DURATION_MS, strict=True)
    mime_type: str = Field(min_length=1, max_length=200)
    timebase: Timebase
    recorded_at: datetime | None = None
    coverage: list[CoverageInterval] = Field(default_factory=list, max_length=10000,
        description="Measured pose-coverage intervals. Omitted time is explicitly unknown, not evaluable.")

    @model_validator(mode="after")
    def intervals(self):
        if self.recorded_at is not None and self.recorded_at.tzinfo is None:
            raise ValueError("E_RECORDED_AT_TIMEZONE: recordedAt must include a timezone")
        if any(item.t_ms + item.duration_ms > self.duration_ms for item in self.coverage):
            raise ValueError("E_EVENT_OUT_OF_RANGE: coverage exceeds take duration")
        return self


class TakeAnalysis(Model):
    words: list[Word] = Field(default_factory=list)
    audio_summary: AudioSummary | None = None
    word_summary: WordSummary | None = None
    asr_provider: str | None = None
    synthetic_demo: bool = False
    notices: list[str] = Field(default_factory=list)
    factcheck: FactCheckResult | None = None
    questions: QuestionResult | None = None


class Take(TakeCreate):
    take_id: UUID
    session_id: UUID
    profile_id: UUID | None = None
    recorded_at_source: Literal["client", "server"] = "server"
    status: Literal["created", "audio_processing", "events_ready", "review_ready", "failed"]
    audio_probe: dict[str, Any] | None = None
    analysis: TakeAnalysis = Field(default_factory=TakeAnalysis)
    warnings: list[str] = Field(default_factory=list)
    created_at: datetime


class PoseMetric(Model):
    metric_id: str = Field(min_length=1, max_length=100)
    value_at_peak: float
    baseline: float | None
    delta: float | None
    unit: Literal["deg", "ratio", "count", "perMin"]

    @model_validator(mode="after")
    def baseline_delta(self):
        if self.baseline is None and self.delta is not None:
            raise ValueError("E_BASELINE_MISSING")
        if self.delta is not None and abs(self.value_at_peak - self.baseline - self.delta) > 0.11:
            raise ValueError("E_BASELINE_DELTA_MISMATCH")
        return self


class PoseRule(Model):
    rule_id: str = Field(min_length=1, max_length=100)
    version: int = Field(ge=1)
    evidence: Literal["A", "B", "C", "none"]
    confidence: Literal["high", "medium", "low"]
    thresholds_status: Literal["heuristic-unvalidated"]


class PoseEvidence(Model):
    sample_count: int = Field(ge=0, strict=True)
    valid_ratio: float = Field(ge=0, le=1)


class PoseMessage(Model):
    key: str = Field(min_length=1, max_length=120)
    params: dict[str, str | float] = Field(default_factory=dict, max_length=20)


class PosePayload(Model):
    schema_: Literal["pose.event.v1"] = Field(alias="schema")
    category: PoseCategory
    kind: Literal["trunk-lateral", "shoulder-tilt", "head-lateral", "arms-closed", "self-touch",
                  "hand-hidden-near-torso", "head-orientation", "framing", "data-quality"]
    metric: PoseMetric | None = None
    rule: PoseRule | None = None
    evidence: PoseEvidence
    message: PoseMessage
    reason: str | None = Field(default=None, max_length=100)

    @model_validator(mode="after")
    def category_kind(self):
        kinds = {"posture": {"trunk-lateral", "shoulder-tilt"}, "head": {"head-lateral", "head-orientation"},
                 "hands": {"arms-closed", "self-touch", "hand-hidden-near-torso"},
                 "framing": {"framing"}, "data-quality": {"data-quality"}}
        if self.kind not in kinds[self.category]:
            raise ValueError("E_POSE_CATEGORY_MISMATCH")
        if self.category in {"framing", "data-quality"} and self.metric is not None:
            raise ValueError("E_NON_EVALUABLE_METRIC")
        if self.category not in {"framing", "data-quality"} and self.metric is None:
            raise ValueError("E_METRIC_MISSING")
        return self


class ReviewEvent(Model):
    event_id: str = Field(min_length=1, max_length=200, pattern=r"^[A-Za-z0-9][A-Za-z0-9:_.-]*$")
    t_ms: int = Field(ge=0, strict=True)
    peak_ms: int = Field(ge=0, strict=True)
    duration_ms: int = Field(ge=0, le=MAX_DURATION_MS, strict=True)
    type: EventType
    severity: Literal["info", "hint", "warning"]
    source: Literal["browser", "asr", "speech", "factcheck", "agent"]
    stage: Literal["live", "final"] = "final"
    payload: dict[str, Any]
    dedupe_key: str = Field(min_length=1, max_length=200)
    rule_version: str | None = Field(default=None, max_length=100)

    @model_validator(mode="before")
    @classmethod
    def default_dedupe_key(cls, data):
        if isinstance(data, dict) and "dedupeKey" not in data and "dedupe_key" not in data:
            data = {**data, "dedupeKey": data.get("eventId", data.get("event_id"))}
        return data


class BrowserEventInput(ReviewEvent):
    type: PoseCategory
    source: Literal["browser"]
    payload: PosePayload
    dedupe_key: str = Field(default="", min_length=1, max_length=200, description="Defaults to eventId when omitted")


# Keep each raw member for per-event acceptance/rejection, while describing
# the real accepted input in OpenAPI rather than an untyped object array.
BatchMember = Annotated[BrowserEventInput, WrapValidator(lambda value, handler: value),
                        PlainSerializer(lambda value: value, return_type=Any)]


class EventBatch(Model):
    events: list[BatchMember] = Field(max_length=500)


class RejectedEvent(Model):
    index: int
    event_id: str | None = None
    code: str
    message: str


class EventsAccepted(Model):
    accepted: int
    rejected: list[RejectedEvent]


class Coverage(Model):
    duration_ms: int
    evaluable_ms: int
    not_evaluable_ms: int
    reasons: dict[str, int]


class Aggregate(Model):
    id: str
    label: str
    value: int | float
    unit: Literal["count", "ms", "ratio", "WPM", "syllables/s"]


class Timeline(Model):
    session: Session
    take: Take
    events: list[ReviewEvent]
    aggregates: list[Aggregate]
    coverage: Coverage


class ReviewRequest(Model):
    mode: Literal["template", "llm"] = "template"
    language: Literal["de", "en"] = "de"


class FindingEvidence(Model):
    event_ids: list[str]
    start_ms: int
    peak_ms: int
    end_ms: int
    rule_id: str | None = None
    metric: str | None = None
    value: float | None = None
    baseline: float | None = None
    delta: float | None = None
    unit: str | None = None
    valid_ratio: float | None = None
    confidence: str | None = None
    evidence_grade: str | None = None
    thresholds_status: Literal["heuristic-unvalidated"] | None = None
    filename: str | None = None
    location: dict[str, Any] | None = None
    quote: str | None = None
    quote_verified: Literal["exact", "fuzzy"] | None = None
    source_kind: Literal["upload", "web"] | None = None


class NextAction(Model):
    suggestion_id: str
    text: str


class Finding(Model):
    id: str
    category: Literal["posture", "voice", "content", "coverage"]
    title: str
    observation: str
    evidence: FindingEvidence
    interpretation: str | None = None
    next_action: NextAction | None = None


class ReviewCoverage(Coverage):
    events_total: int
    events_selected: int
    events_mentioned: int


class Generator(Model):
    mode: Literal["template", "llm"]
    model: str | None = None
    prompt_version: str | None = None


class Summary(Model):
    text: str
    by_category: dict[str, int]


class Strength(Model):
    text: str
    event_ids: list[str]


class Provenance(Model):
    event_pack_hash: str
    prompt_hash: str | None = None
    catalog_version: str
    git_sha: str | None = None


class ReviewReport(Model):
    schema_version: Literal["review.v1"] = "review.v1"
    review_id: UUID
    session_id: UUID
    take_id: UUID
    language: Literal["de", "en"]
    generated_at: datetime
    generator: Generator
    coverage: ReviewCoverage
    summary: Summary
    findings: list[Finding]
    strengths: list[Strength] = Field(default_factory=list)
    limitations: list[str]
    provenance: Provenance


class ReviewReference(Model):
    review_id: UUID


class Job(Model):
    job_id: UUID
    take_id: UUID
    kind: Literal["audio_analyze", "review_generate", "factcheck", "questions_generate", "answer_review"]
    status: Literal["queued", "running", "completed", "failed"]
    progress: int = Field(ge=0, le=100)
    error: dict[str, Any] | None = None
    result: FactCheckResult | QuestionResult | AnswerReview | ReviewReference | None = None


class TakeJobAccepted(Model):
    job_id: UUID
    status_url: str


class SessionResponse(Model):
    session: Session


class SessionDetail(SessionResponse):
    takes: list[Take]


class TakeResponse(Model):
    take: Take


class TimelineResponse(Model):
    timeline: Timeline


class ReviewResponse(Model):
    review: ReviewReport


class JobResponse(Model):
    job: Job


class QuestionsResponse(Model):
    questions: QuestionResult | None


class Verification(Model):
    failure_codes: dict[str, int]
    attempts: int
    fallback_count: int
    fallback_rate: float
    claim_count: int
    supported_claim_count: int
    event_pack_hash: str
    degraded: bool


class FailedJob(Model):
    kind: str
    error: dict[str, Any]


class Evaluation(Model):
    verification: Verification | None
    failed_jobs: list[FailedJob]
    human_labeled_claims: int | None
    limitations: list[str]


class EvaluationResponse(Model):
    evaluation: Evaluation


class ReviewReused(Model):
    review_id: UUID


class FactcheckRequest(Model):
    use_web: bool = False


class QuestionsRequest(Model):
    persona: Literal["student", "tutor"] = "tutor"


class TakeAnswerRequest(QuestionsRequest):
    question_id: str = Field(min_length=1, max_length=200)
    answer: str = Field(min_length=1, max_length=4000)


class ErrorBody(Model):
    code: str
    message: str
    details: dict[str, Any] = Field(default_factory=dict)
    request_id: str


class ErrorResponse(Model):
    error: ErrorBody
