"""Hybrid retrieval over a collection's sources, plus helpers for prompts.

Vector search (cosine) and German keyword search each return their top
candidates; both rankings are combined with reciprocal rank fusion (RRF).
Keywords catch exact numbers and names that embeddings tend to blur.
"""

import os
from uuid import UUID

from app.sources import db
from app.sources.embeddings import Embedder, configured_embedder
from app.sources.models import Location, SourceHit
from app.sources.quotes import normalize as normalize_quote

CANDIDATES = 20
RRF_K = 60  # Common constant from the original RRF paper; not tuned here.


def weak_similarity() -> float:
    """Cosine below which a vector-only hit is marked weak; heuristic, not calibrated."""
    try:
        return float(os.getenv("SOURCE_WEAK_SIMILARITY", "0.30"))
    except ValueError:
        return 0.30

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
       vec.similarity, vec.rank IS NOT NULL AS by_vector, kw.rank IS NOT NULL AS by_keyword,
       coalesce(1.0 / (%(rrf)s + vec.rank), 0) + coalesce(1.0 / (%(rrf)s + kw.rank), 0) AS score
FROM vec FULL JOIN kw ON vec.id = kw.id
JOIN source_chunks c ON c.id = coalesce(vec.id, kw.id)
JOIN sources s ON s.id = c.source_id AND s.status = 'ready'
ORDER BY score DESC, c.id
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
    threshold = weak_similarity()
    results = []
    for row in rows:
        similarity = round(float(row["similarity"]), 4) if row["similarity"] is not None else None
        matched_by = [name for name, hit in (("vector", row["by_vector"]), ("keyword", row["by_keyword"])) if hit]
        results.append(SourceHit(
            chunk_id=row["id"], source_id=row["source_id"], filename=row["filename"],
            location=Location(kind=row["location_kind"], start=row["location_start"], end=row["location_end"]),
            text=row["text"], similarity=similarity, matched_by=matched_by,
            retrieval_score=round(float(row["score"]), 6),
            weak=similarity is not None and similarity < threshold and "keyword" not in matched_by,
        ))
    return results


def fuse(results: list[list[SourceHit]], k: int = 5, rrf_k: int = RRF_K) -> list[SourceHit]:
    """Fuse several ranked result lists with reciprocal rank fusion."""
    scores: dict[int, float] = {}
    hits: dict[int, SourceHit] = {}
    for result in results:
        for rank, hit in enumerate(result, 1):
            scores[hit.chunk_id] = scores.get(hit.chunk_id, 0.0) + 1.0 / (rrf_k + rank)
            previous = hits.get(hit.chunk_id)
            if previous is None:
                hits[hit.chunk_id] = hit
                continue
            similarities = [value for value in (previous.similarity, hit.similarity) if value is not None]
            hits[hit.chunk_id] = previous.model_copy(update={
                "matched_by": list(dict.fromkeys(previous.matched_by + hit.matched_by)),
                "similarity": max(similarities) if similarities else None,
                "weak": previous.weak and hit.weak,
            })
    ordered = sorted(hits, key=lambda chunk_id: (-scores[chunk_id], chunk_id))[:k]
    return [hits[chunk_id].model_copy(update={"retrieval_score": round(scores[chunk_id], 6)})
            for chunk_id in ordered]


def search_many(collection_id: UUID, queries: list[str], k: int = 5,
                embedder: Embedder | None | object = CONFIGURED) -> list[SourceHit]:
    """Run focused queries and fuse their rankings; duplicates are skipped."""
    unique = list(dict.fromkeys(query.strip() for query in queries if query.strip()))
    if not unique:
        return []
    if embedder is CONFIGURED:
        embedder = configured_embedder()
    return fuse([search(collection_id, query, k, embedder) for query in unique], k)


LABELS = {"page": ("Seite", "Seiten"), "slide": ("Folie", "Folien"),
          "paragraph": ("Absatz", "Absätze"), "table": ("Tabelle", "Tabellen"),
          "line": ("Zeile", "Zeilen")}


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
