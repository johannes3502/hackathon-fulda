"""Source metadata and chunks in PostgreSQL (pgvector + German full-text search).

The vector column has no fixed dimension, so the embedding model can be
exchanged; queries only compare vectors of the same `embedding_model`.
No ANN index: exact search is fast enough for a few thousand chunks.
"""

from uuid import UUID

import psycopg
from psycopg.rows import dict_row

from app.connections import connect_db
from app.sources.chunking import Chunk
from app.sources.models import Source

SCHEMA = """
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS sources (
    id uuid PRIMARY KEY,
    collection_id uuid NOT NULL,
    filename text NOT NULL,
    content_type text NOT NULL,
    size_bytes bigint NOT NULL,
    object_key text NOT NULL,
    status text NOT NULL CHECK (status IN ('queued', 'processing', 'ready', 'failed')),
    error text,
    chunk_count integer NOT NULL DEFAULT 0,
    embedding_model text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sources_collection_idx ON sources (collection_id, created_at);
CREATE TABLE IF NOT EXISTS source_chunks (
    id bigserial PRIMARY KEY,
    source_id uuid NOT NULL REFERENCES sources (id) ON DELETE CASCADE,
    collection_id uuid NOT NULL,
    ordinal integer NOT NULL,
    location_kind text NOT NULL,
    location_start integer NOT NULL,
    location_end integer NOT NULL,
    text text NOT NULL,
    embedding vector,
    embedding_model text,
    tsv tsvector GENERATED ALWAYS AS (to_tsvector('german', text)) STORED,
    UNIQUE (source_id, ordinal)
);
CREATE INDEX IF NOT EXISTS source_chunks_collection_idx ON source_chunks (collection_id);
CREATE INDEX IF NOT EXISTS source_chunks_tsv_idx ON source_chunks USING gin (tsv);
"""

_schema_ready = False
COLUMNS = "id, collection_id, filename, content_type, size_bytes, status, error, chunk_count, embedding_model, created_at"


def connect() -> psycopg.Connection:
    """Connection with the schema in place; created once per process."""
    global _schema_ready
    connection = connect_db()
    if not _schema_ready:
        with connection.transaction():
            # Serialize concurrent first starts of API and worker processes.
            connection.execute("SELECT pg_advisory_xact_lock(hashtext('sources-schema'))")
            connection.execute(SCHEMA)
        _schema_ready = True
    connection.row_factory = dict_row
    return connection


def vector_literal(vector: list[float]) -> str:
    return "[" + ",".join(f"{value:.7g}" for value in vector) + "]"


def insert_source(source: Source, object_key: str):
    with connect() as connection:
        connection.execute(
            "INSERT INTO sources (id, collection_id, filename, content_type, size_bytes, object_key, status, created_at)"
            " VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
            (source.id, source.collection_id, source.filename, source.content_type, source.size_bytes,
             object_key, source.status, source.created_at),
        )


def get_source(source_id: UUID) -> tuple[Source, str] | None:
    """Source and its object key."""
    with connect() as connection:
        row = connection.execute(f"SELECT {COLUMNS}, object_key FROM sources WHERE id = %s", (source_id,)).fetchone()
    if row is None:
        return None
    object_key = row.pop("object_key")
    return Source.model_validate(row), object_key


def list_sources(collection_id: UUID) -> list[Source]:
    with connect() as connection:
        rows = connection.execute(
            f"SELECT {COLUMNS} FROM sources WHERE collection_id = %s ORDER BY created_at, id", (collection_id,)
        ).fetchall()
    return [Source.model_validate(row) for row in rows]


def set_status(source_id: UUID, status: str, error: str | None = None):
    with connect() as connection:
        connection.execute(
            "UPDATE sources SET status = %s, error = %s, updated_at = now() WHERE id = %s", (status, error, source_id)
        )


def delete_source(source_id: UUID) -> str | None:
    """Delete source and chunks; return the object key, None if unknown."""
    with connect() as connection:
        row = connection.execute("DELETE FROM sources WHERE id = %s RETURNING object_key", (source_id,)).fetchone()
    return row["object_key"] if row else None


def store_chunks(source_id: UUID, chunks: list[Chunk], vectors: list[list[float]] | None, model: str | None) -> bool:
    """Replace all chunks and mark the source ready in one transaction.

    Returns False if the source was deleted meanwhile. Safe to repeat.
    """
    with connect() as connection, connection.transaction():
        row = connection.execute("SELECT collection_id FROM sources WHERE id = %s FOR UPDATE", (source_id,)).fetchone()
        if row is None:
            return False
        connection.execute("DELETE FROM source_chunks WHERE source_id = %s", (source_id,))
        with connection.cursor() as cursor:
            cursor.executemany(
                "INSERT INTO source_chunks (source_id, collection_id, ordinal, location_kind, location_start,"
                " location_end, text, embedding, embedding_model) VALUES (%s, %s, %s, %s, %s, %s, %s, %s::vector, %s)",
                [(source_id, row["collection_id"], chunk.ordinal, chunk.kind, chunk.start, chunk.end, chunk.text,
                  vector_literal(vectors[index]) if vectors else None, model if vectors else None)
                 for index, chunk in enumerate(chunks)],
            )
        connection.execute(
            "UPDATE sources SET status = 'ready', error = NULL, chunk_count = %s, embedding_model = %s,"
            " updated_at = now() WHERE id = %s",
            (len(chunks), model if vectors else None, source_id),
        )
    return True
