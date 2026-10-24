"""Worker side of a source upload: S3 file → segments → chunks → vectors → DB."""

import logging
import os
import tempfile
from pathlib import Path
from uuid import UUID

from app.connections import s3_client
from app.sources import db
from app.sources.chunking import chunk_segments
from app.sources.embeddings import configured_embedder
from app.sources.extract import ExtractionError, extract

logger = logging.getLogger(__name__)


def object_key(source_id: UUID) -> str:
    return f"sources/{source_id}/original"


def ingest_source(source_id: UUID):
    """Idempotent: terminal sources are skipped, chunks are replaced."""
    found = db.get_source(source_id)
    if found is None:
        return  # Deleted before processing.
    source, key = found
    if source.status in ("ready", "failed"):
        return
    db.set_status(source_id, "processing")
    try:
        with tempfile.TemporaryDirectory() as workdir:
            path = Path(workdir) / "original"
            s3_client().download_file(os.environ["S3_BUCKET"], key, str(path))
            chunks = chunk_segments(extract(path, Path(source.filename).suffix.lower()))
        if not chunks:
            raise ExtractionError("Keine Textinhalte gefunden. Gescannte PDFs ohne Textebene werden nicht unterstützt.")
        embedder = configured_embedder()
        vectors = embedder.embed_documents([chunk.text for chunk in chunks]) if embedder else None
        db.store_chunks(source_id, chunks, vectors, embedder.model if embedder else None)
    except ExtractionError as error:
        db.set_status(source_id, "failed", str(error))
    except Exception as error:
        # Never log document text; it may be confidential.
        logger.warning("Source %s failed (%s)", source_id, type(error).__name__)
        db.set_status(source_id, "failed", "Verarbeitung fehlgeschlagen. Datei und Backend-Logs prüfen.")
