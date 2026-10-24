"""Fact-check request, per-claim results and job status.

Three verdicts (AGENTS.md): `supports`, `contradicts`, `not_found`.
`not_found` means "not in the checked sources", never "false". `unchecked`
marks a claim whose check failed technically (model or search unavailable).
"""

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.events import Event
from app.sources.models import Location
from app.transcription.models import Word

Verdict = Literal["supports", "contradicts", "not_found", "unchecked"]
EvidenceKind = Literal["upload", "web"]


class FactCheckConfig(BaseModel):
    """Prototype limits, not tuned. Returned with every result."""

    max_claims: int = Field(default=6, ge=1, le=30)
    top_k: int = Field(default=5, ge=1, le=10, description="Uploaded passages per claim")
    web_results: int = Field(default=4, ge=1, le=8, description="Web passages per claim")
    min_quote_chars: int = Field(default=12, ge=1, description="Shorter quotes are not accepted as evidence")


class FactCheckRequest(BaseModel):
    words: list[Word] = Field(min_length=1, max_length=50000, description="Word timestamps relative to recording start")
    collection_id: UUID | None = Field(default=None, description="Uploaded sources to check against first")
    use_web: bool = Field(default=True, description="Search the configured web provider if uploads do not settle a claim")
    config: FactCheckConfig = Field(default_factory=FactCheckConfig)


class Evidence(BaseModel):
    kind: EvidenceKind
    label: str = Field(description="e.g. `folien.pdf, Seite 3` or the web page title")
    quote: str = Field(description="Verbatim passage, verified by string match")
    passage: str
    filename: str | None = None
    source_id: UUID | None = None
    location: Location | None = None
    url: str | None = None
    quote_verified: Literal["exact", "fuzzy"] | None = None


class ClaimResult(BaseModel):
    claim: str
    transcript: str = Field(description="Spoken sentence(s) the claim was extracted from")
    t_ms: int
    duration_ms: int
    verdict: Verdict
    explanation: str
    evidence: Evidence | None = None
    checked: list[EvidenceKind] = Field(description="Where the claim was looked up")
    notes: list[str] = Field(default_factory=list)


class FactCheckResult(BaseModel):
    claims: list[ClaimResult]
    events: list[Event]
    model: str
    web_provider: str | None
    sources_checked: bool
    config: FactCheckConfig
    notices: list[str]


class FactCheckJob(BaseModel):
    job_id: str
    status: Literal["queued", "running", "completed", "failed"]
    result: FactCheckResult | None = None
    error: str | None = None


class FactCheckSettings(BaseModel):
    available: bool
    model: str | None
    llm_host: str | None = Field(description="Host receiving transcript text; name it in consent notices")
    web_provider: str | None
