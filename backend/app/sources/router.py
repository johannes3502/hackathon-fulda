import os
from datetime import UTC, datetime
from pathlib import PurePath
from uuid import UUID, uuid4

import psycopg
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import APIRouter, File, Form, HTTPException, Response, UploadFile
from starlette.concurrency import run_in_threadpool

from app.connections import s3_client
from app.jobs import QueueUnavailable, enqueue_task
from app.sources import db, retrieval
from app.sources.extract import SUPPORTED
from app.sources.ingest import object_key
from app.sources.models import AcceptedSource, SearchRequest, Source, SourceHit
from app.tasks import ingest_source

router = APIRouter(prefix="/sources", tags=["sources"])

UNAVAILABLE = (psycopg.Error, BotoCoreError, ClientError)


def max_bytes() -> int:
    return int(os.getenv("SOURCE_MAX_BYTES", str(25 * 1024 * 1024)))


def _store(source: Source, file):
    db.insert_source(source, object_key(source.id))
    s3_client().upload_fileobj(file, os.environ["S3_BUCKET"], object_key(source.id),
                               ExtraArgs={"ContentType": source.content_type})


def _remove(source_id: UUID):
    with db.connect() as connection:
        row = connection.execute("SELECT object_key FROM sources WHERE id = %s FOR UPDATE", (source_id,)).fetchone()
        if row is None:
            return False
        # Keep the row available for retry if object storage is unavailable.
        s3_client().delete_object(Bucket=os.environ["S3_BUCKET"], Key=row["object_key"])
        connection.execute("DELETE FROM sources WHERE id = %s", (source_id,))
    return True


@router.post("", status_code=202)
async def upload_source(
    collection_id: UUID = Form(description="Client-generated ID grouping the sources of one presentation"),
    file: UploadFile = File(description="PDF, PPTX, DOCX, TXT or MD; synthetic content only"),
) -> AcceptedSource:
    """Store in S3 and enqueue extraction, chunking and embedding.

    Poll status_url until status is `ready` or `failed`. Scanned PDFs without
    a text layer are not supported (no OCR).
    """
    filename = PurePath((file.filename or "").replace("\\", "/")).name[:200]
    suffix = PurePath(filename).suffix.lower()
    if suffix not in SUPPORTED:
        raise HTTPException(415, f"Supported file types: {', '.join(SUPPORTED)}")
    file.file.seek(0, os.SEEK_END)
    size = file.file.tell()
    file.file.seek(0)
    if size == 0:
        raise HTTPException(422, "The file is empty")
    if size > max_bytes():
        raise HTTPException(413, f"Files may be at most {max_bytes() // (1024 * 1024)} MB")
    source = Source(
        id=uuid4(), collection_id=collection_id, filename=filename, size_bytes=size, status="queued",
        content_type=file.content_type or "application/octet-stream", created_at=datetime.now(UTC),
    )
    try:
        await run_in_threadpool(_store, source, file.file)
        await enqueue_task(ingest_source, str(source.id))
    except (QueueUnavailable, *UNAVAILABLE) as error:
        try:
            await run_in_threadpool(_remove, source.id)
        except UNAVAILABLE:
            pass  # The same outage can prevent cleanup; report service failure.
        raise HTTPException(503, "Source storage or queue unavailable") from error
    return AcceptedSource(source=source, status_url=f"/sources/{source.id}")


@router.get("")
def list_sources(collection_id: UUID) -> list[Source]:
    try:
        return db.list_sources(collection_id)
    except psycopg.Error as error:
        raise HTTPException(503, "Source database unavailable") from error


@router.post("/search")
def search_sources(request: SearchRequest) -> list[SourceHit]:
    """Top-k passages of ready sources, hybrid vector + keyword ranking."""
    try:
        return retrieval.search(request.collection_id, request.query, request.k)
    except psycopg.Error as error:
        raise HTTPException(503, "Source database unavailable") from error


@router.get("/{source_id}")
def get_source(source_id: UUID) -> Source:
    try:
        found = db.get_source(source_id)
    except psycopg.Error as error:
        raise HTTPException(503, "Source database unavailable") from error
    if found is None:
        raise HTTPException(404, "Unknown source")
    return found[0]


@router.delete("/{source_id}", status_code=204)
def delete_source(source_id: UUID) -> Response:
    """Delete the file, its chunks and vectors."""
    try:
        if not _remove(source_id):
            raise HTTPException(404, "Unknown source")
    except UNAVAILABLE as error:
        raise HTTPException(503, "Source storage unavailable") from error
    return Response(status_code=204)
