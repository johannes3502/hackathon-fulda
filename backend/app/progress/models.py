"""Camel-case contracts for profiles, goals and progress.v1."""

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator
from pydantic.alias_generators import to_camel


class Model(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True,
                              extra="forbid", allow_inf_nan=False)


PresentationMode = Literal["startup", "thesis", "school", "nonprofit"]
TrendStatus = Literal["insufficient", "early_signal", "stable", "trend_up", "trend_down", "unclear"]
GoalStatus = Literal["not_applicable", "unknown", "on_track", "off_track", "mixed"]
SuggestedDirection = Literal["increase", "decrease", "target_band", "neutral"]
Confidence = Literal["low", "medium", "high"]


class ProfileConsent(Model):
    granted: Literal[True]
    at: datetime
    version: str = Field(min_length=1, max_length=100)
    scope: Literal["long-term-progress"]
    retention_until: datetime | None = None

    @model_validator(mode="after")
    def timezone(self):
        if self.at.tzinfo is None:
            raise ValueError("Consent timestamp must include a timezone")
        if self.retention_until is not None and self.retention_until.tzinfo is None:
            raise ValueError("Retention timestamp must include a timezone")
        return self


class ProfileConsentOut(Model):
    scope: Literal["long-term-progress"] = "long-term-progress"
    version: str
    granted_at: datetime
    retention_until: datetime | None = None


class ProfileCreate(Model):
    display_name: str = Field(default="", max_length=120)
    locale: Literal["de", "en"] = "de"
    consent: ProfileConsent


class ProfilePatch(Model):
    display_name: str | None = Field(default=None, max_length=120)
    locale: Literal["de", "en"] | None = None
    retention_until: datetime | None = None

    @model_validator(mode="after")
    def timezone(self):
        if self.retention_until is not None and self.retention_until.tzinfo is None:
            raise ValueError("Retention timestamp must include a timezone")
        return self


class ProfileIdentity(Model):
    profile_id: UUID
    display_name: str
    locale: Literal["de", "en"]
    created_at: datetime
    consent: ProfileConsentOut


class ProfileGetResponse(Model):
    profile: ProfileIdentity


class ProfileCreateResponse(Model):
    profile: ProfileIdentity
    token: str | None = None
    token_issued: bool


class GoalInput(Model):
    direction: Literal["increase", "decrease", "target_band"]
    target_value: float | None = None
    target_min: float | None = None
    target_max: float | None = None

    @model_validator(mode="after")
    def bounds(self):
        if self.direction == "target_band":
            if self.target_min is None or self.target_max is None or self.target_min > self.target_max:
                raise ValueError("target_band requires targetMin <= targetMax")
        elif self.target_value is None:
            raise ValueError("increase/decrease requires targetValue")
        return self


class GoalRecord(Model):
    metric_id: str
    metric_version: int
    direction: Literal["increase", "decrease", "target_band"]
    target_value: float | None
    target_min: float | None
    target_max: float | None
    created_at: datetime
    updated_at: datetime


class GoalListResponse(Model):
    goals: list[GoalRecord]


class GoalResponse(Model):
    goal: GoalRecord


class ProgressRange(Model):
    from_: datetime | None = Field(default=None, alias="from")
    to: datetime | None = None
    window: Literal["all", "last_20", "last_10", "last_5"]
    presentation_mode: PresentationMode | None = None


class MetricQuality(Model):
    min_duration_ms: int
    min_pose_coverage: float | None = None
    min_pose_valid_ratio: float | None = None
    min_audio_active_ratio: float | None = None
    min_word_count: int | None = None
    min_claim_count: int | None = None
    device_sensitive: bool = False


class MetricDefinitionOut(Model):
    metric_id: str
    version: int
    label: dict[str, str]
    description: dict[str, str]
    unit: str
    value_type: str
    suggested_direction: SuggestedDirection
    is_primary: bool
    heuristic: bool
    source: str
    quality: MetricQuality


class PointQuality(Model):
    pose_coverage: float | None = None
    pose_valid_ratio: float | None = None
    audio_active_ratio: float | None = None
    word_count: int | None = None
    claim_count: int | None = None
    asr_provider: str | None = None
    synthetic_demo: bool = False


class PointContext(Model):
    presentation_mode: PresentationMode | None = None
    duration_ms: int
    device_key: UUID | None = None
    rule_versions: list[str] = Field(default_factory=list)


class ProgressPoint(Model):
    take_id: UUID
    session_id: UUID
    recorded_at: datetime
    recorded_at_source: Literal["client", "server"]
    sequence: int
    value: float | None = None
    unit: str
    eligible: bool
    exclusion_reasons: list[str] = Field(default_factory=list)
    quality: PointQuality
    context: PointContext


class ProgressBaseline(Model):
    kind: Literal["first_3_eligible", "first_5_eligible", "same_mode_first_3", "rolling_5", "none"]
    value: float | None = None
    n: int = 0
    take_ids: list[UUID] = Field(default_factory=list)


class ProgressLatest(Model):
    take_id: UUID
    recorded_at: datetime
    value: float | None = None
    change_vs_baseline: float | None = None
    relative_change: float | None = None
    z_score: float | None = None
    reliable_change: bool = False


class TrendWindow(Model):
    from_take_id: UUID | None = None
    to_take_id: UUID | None = None
    from_recorded_at: datetime | None = None
    to_recorded_at: datetime | None = None


class ProgressTrend(Model):
    status: TrendStatus
    direction: Literal["up", "down", "flat", "unknown"]
    method: str
    algorithm_version: str
    n: int
    window: TrendWindow
    slope_per_take: float | None = None
    slope_per_10_takes: float | None = None
    slope_ci95: tuple[float, float] | None = None
    relative_change: float | None = None
    effect_size: float | None = None
    noise_band: float | None = None
    minimum_detectable_change: float | None = None
    mann_kendall_p: float | None = None
    adjusted_p: float | None = None
    reliable_slope: bool = False
    confidence: Confidence = "low"


class ProgressChangePoint(Model):
    id: UUID
    metric_id: str
    metric_version: int
    take_id: UUID
    sequence: int
    recorded_at: datetime
    kind: Literal["step_up", "step_down", "regression", "recovery"]
    from_value: float | None = None
    to_value: float | None = None
    magnitude: float | None = None
    confidence: Confidence = "low"
    evidence_take_ids: list[UUID] = Field(default_factory=list)
    algorithm_version: str


class ProgressSeriesQuality(Model):
    total_points: int
    eligible_points: int
    excluded_points: int
    missing_points: int
    version_break: bool = False
    rule_versions: list[str] = Field(default_factory=list)
    status: Literal["good", "partial", "poor"]


class ProgressSeries(Model):
    metric_id: str
    metric_version: int
    label: dict[str, str]
    unit: str
    suggested_direction: SuggestedDirection
    is_primary: bool
    heuristic: bool
    goal: GoalRecord | None = None
    points: list[ProgressPoint]
    baseline: ProgressBaseline | None = None
    latest: ProgressLatest | None = None
    trend: ProgressTrend
    change_points: list[ProgressChangePoint] = Field(default_factory=list)
    goal_status: GoalStatus = "not_applicable"
    quality: ProgressSeriesQuality
    limitations: list["ProgressLimitation"] = Field(default_factory=list)


class ProgressProfile(ProfileIdentity):
    total_takes: int
    eligible_takes: int
    first_recorded_at: datetime | None = None
    last_recorded_at: datetime | None = None


class ProgressHighlight(Model):
    kind: Literal["insufficient_data", "trend_up", "trend_down", "goal_on_track",
                  "goal_off_track", "change_point", "quality_warning"]
    metric_id: str
    take_id: UUID | None = None
    sequence: int | None = None
    text_key: str
    params: dict[str, str | float | int] = Field(default_factory=dict)


class ProgressLimitation(Model):
    code: str
    message: str


class ProgressResponse(Model):
    schema_version: Literal["progress.v1"] = "progress.v1"
    generated_at: datetime
    profile: ProgressProfile
    range: ProgressRange
    metric_definitions: list[MetricDefinitionOut]
    series: list[ProgressSeries]
    highlights: list[ProgressHighlight] = Field(default_factory=list)
    limitations: list[ProgressLimitation] = Field(default_factory=list)


class MetricProgressResponse(Model):
    schema_version: Literal["progress.v1"] = "progress.v1"
    generated_at: datetime
    profile: ProgressProfile
    range: ProgressRange
    series: ProgressSeries


class ProfileTake(Model):
    take_id: UUID
    session_id: UUID
    recorded_at: datetime
    recorded_at_source: Literal["client", "server"]
    duration_ms: int
    status: str
    presentation_mode: PresentationMode | None = None


class ProfileTakesResponse(Model):
    takes: list[ProfileTake]
    next_cursor: str | None = None


class ExportResponse(Model):
    format: Literal["json", "csv"]
    content: str
    filename: str


class ProfileTokenRotateResponse(Model):
    token: str | None = None
    token_issued: bool = True


class ErrorBody(Model):
    code: str
    message: str
    details: dict[str, Any] = Field(default_factory=dict)
    request_id: str


class ErrorResponse(Model):
    error: ErrorBody
