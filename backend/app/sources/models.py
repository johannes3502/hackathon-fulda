from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.sources.extract import LocationKind

SourceStatus = Literal["queued", "processing", "ready", "failed"]


class Source(BaseModel):
    id: UUID
    collection_id: UUID
    filename: str
    content_type: str
    size_bytes: int
    status: SourceStatus
    error: str | None = None
    chunk_count: int = 0
    embedding_model: str | None = None
    created_at: datetime


class AcceptedSource(BaseModel):
    source: Source
    status_url: str


class Location(BaseModel):
    """1-based; `start == end` unless merged paragraphs/line blocks."""

    kind: LocationKind
    start: int
    end: int


class SourceHit(BaseModel):
    chunk_id: int
    source_id: UUID
    filename: str
    location: Location
    text: str
    similarity: float | None = Field(
        default=None, description="Cosine similarity to the query embedding; null if matched by keywords only")
    matched_by: list[Literal["vector", "keyword"]]


class SearchRequest(BaseModel):
    collection_id: UUID
    query: str = Field(min_length=1, max_length=2000)
    k: int = Field(default=5, ge=1, le=20)
