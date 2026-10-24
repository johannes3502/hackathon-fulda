"""Hybrid retrieval over a collection's sources, plus helpers for prompts.

Vector search (cosine) and German keyword search each return their top
candidates; both rankings are combined with reciprocal rank fusion (RRF).
Keywords catch exact numbers and names that embeddings tend to blur.
"""

from uuid import UUID

from app.sources import db
from app.sources.embeddings import Embedder, configured_embedder
from app.sources.models import Location, SourceHit
from app.sources.quotes import normalize as normalize_quote

CANDIDATES = 20
RRF_K = 60  # Common constant from the original RRF paper; not tuned here.

_SEARCH = """
WITH vec AS (
    SELECT id, 1 - (embedding <=> %(vector)s::vector) AS similarity,
           row_number() OVER (ORDER BY embedding <=> %(vector)s::vector) AS rank
    FROM source_chunks
    WHERE collection_id = %(collection)s AND embedding_model = %(model)s
    ORDER BY embedding <=> %(vector)s::vector LIMIT %(candidates)s
), kw AS (
    SELECT id, row_number() OVER (ORDER BY ts_rank_cd(tsv, query) DESC, id) AS rank
    -- Same parser as the index; AND of plainto_tsquery turned into OR.
    FROM source_chunks, CAST(replace(plainto_tsquery('german', %(text)s)::text, ' & ', ' | ') AS tsquery) AS query
    WHERE collection_id = %(collection)s AND tsv @@ query
    ORDER BY ts_rank_cd(tsv, query) DESC, id LIMIT %(candidates)s
)
SELECT c.id, c.source_id, s.filename, c.location_kind, c.location_start, c.location_end, c.text,
       vec.similarity, vec.rank IS NOT NULL AS by_vector, kw.rank IS NOT NULL AS by_keyword
FROM vec FULL JOIN kw ON vec.id = kw.id
JOIN source_chunks c ON c.id = coalesce(vec.id, kw.id)
JOIN sources s ON s.id = c.source_id AND s.status = 'ready'
ORDER BY coalesce(1.0 / (%(rrf)s + vec.rank), 0) + coalesce(1.0 / (%(rrf)s + kw.rank), 0) DESC, c.id
LIMIT %(k)s
"""


CONFIGURED = object()


def search(collection_id: UUID, query: str, k: int = 5, embedder: Embedder | None | object = CONFIGURED) -> list[SourceHit]:
    """`embedder=None` searches keywords only; default is the configured model."""
    if embedder is CONFIGURED:
        embedder = configured_embedder()
    params = {
        "collection": collection_id, "candidates": CANDIDATES, "rrf": RRF_K, "k": k,
        "text": query,  # Stop words only: empty query, no keyword matches.
        # Without an embedder the vector branch matches no model and stays empty.
        "vector": db.vector_literal(embedder.embed_query(query)) if embedder else "[0]",
        "model": embedder.model if embedder else None,
    }
    with db.connect() as connection:
        rows = connection.execute(_SEARCH, params).fetchall()
    return [SourceHit(
        chunk_id=row["id"], source_id=row["source_id"], filename=row["filename"],
        location=Location(kind=row["location_kind"], start=row["location_start"], end=row["location_end"]),
        text=row["text"],
        similarity=round(float(row["similarity"]), 4) if row["similarity"] is not None else None,
        matched_by=[name for name, hit in (("vector", row["by_vector"]), ("keyword", row["by_keyword"])) if hit],
    ) for row in rows]


LABELS = {"page": ("Seite", "Seiten"), "slide": ("Folie", "Folien"),
          "paragraph": ("Absatz", "Absätze"), "line": ("Zeile", "Zeilen")}


def location_label(location: Location) -> str:
    singular, plural = LABELS[location.kind]
    if location.start == location.end:
        return f"{singular} {location.start}"
    return f"{plural} {location.start}–{location.end}"


def format_context(hits: list[SourceHit]) -> str:
    """Numbered passages for an LLM prompt: `[1] datei.pdf, Seite 3:` + text."""
    return "\n\n".join(
        f"[{index}] {hit.filename}, {location_label(hit.location)}:\n{hit.text}"
        for index, hit in enumerate(hits, 1)
    )


def normalize(text: str) -> str:
    return normalize_quote(text)


def quote_in_text(quote: str, text: str) -> bool:
    """Verbatim check for model citations (whitespace, case and quote style ignored)."""
    needle = normalize(quote).strip(" \"'.…")
    return bool(needle) and needle in normalize(text)
