"""Embedder interface so the embedding model stays exchangeable.

Default: `jinaai/jina-embeddings-v2-base-de` (German/English, 768 dims) via
FastEmbed/ONNX, locally in the API and worker; no text leaves the server.
The Docker image contains the pinned model (see `backend/Dockerfile`),
so inference never downloads. `EMBEDDING_PROVIDER=none` disables vectors;
search then uses keywords only.
"""

import os
from functools import lru_cache
from typing import Protocol

DEFAULT_MODEL = "jinaai/jina-embeddings-v2-base-de"
MODEL_REVISION = "3f9eede875721714945b6a99a3198299243cf2be"


class Embedder(Protocol):
    model: str

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        """One normalized vector per text, same order."""
        ...

    def embed_query(self, text: str) -> list[float]:
        ...


class FastEmbedEmbedder:
    def __init__(self, model: str = DEFAULT_MODEL, model_path: str | None = None):
        from fastembed import TextEmbedding

        self.model = model
        # Without a path FastEmbed downloads into its cache (local development).
        self._model = TextEmbedding(model, specific_model_path=model_path)

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [vector.tolist() for vector in self._model.embed(texts, batch_size=16)]

    def embed_query(self, text: str) -> list[float]:
        return next(iter(self._model.query_embed(text))).tolist()


@lru_cache(maxsize=1)
def configured_embedder() -> Embedder | None:
    """Loaded once per process (~0.6 GB); None means keyword search only."""
    provider = os.getenv("EMBEDDING_PROVIDER", "local")
    if provider == "none":
        return None
    if provider != "local":
        raise ValueError("Unsupported EMBEDDING_PROVIDER")
    return FastEmbedEmbedder(DEFAULT_MODEL, os.getenv("EMBEDDING_MODEL_PATH"))
