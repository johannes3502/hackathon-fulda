# Native Mac vector pipeline benchmark — 2026-10-24

Measured on Apple M5 Pro, 15 CPU cores, 24 GiB RAM, macOS 27.0.1 (26A434).
Application revision: `366fbf4` (pulled from `origin/main`). No application
optimizations or embedding settings were changed.

The existing implementation processes 20 synthetic slides in **0.545 s** and
100 in **2.692 s**, excluding model loading and storage. Hybrid retrieval over
10,000 replicated chunks takes **54.0 ms median / 61.5 ms observed p95**.
Embedding accounts for over 99% of the measured 100-slide compute time.

## Runtime and method

- Native ARM64 Python 3.12.13; FastEmbed 0.9.0, ONNX Runtime 1.24.4,
  NumPy 2.4.6, python-pptx 1.0.2. Actual provider: `CPUExecutionProvider`.
- Model: `jinaai/jina-embeddings-v2-base-de`, pinned revision
  `3f9eede875721714945b6a99a3198299243cf2be`, downloaded before timing.
  FastEmbed reported using FP32. Existing batch size: 16; vectors: 768 dimensions.
- Three repetitions each of 3-, 20-, and 100-slide generated German PPTX decks.
  Each slide becomes one chunk, about 890 characters. Bodies repeat with distinct
  slide titles: controlled throughput input, not a representative relevance corpus.
- Calls the real `extract`, `chunk_segments`, `embed_documents`, `store_chunks`,
  and `retrieval.search` functions. Fixture generation and vector validation are
  outside stage timings. Runs sequentially with no concurrent request load.
- Search uses five short German questions repeated four times (20 observations
  per mode/size). Reported p95 is the nearest-rank sample percentile, not an SLA.
- Database: native PostgreSQL **15.17** with pgvector **0.8.6**, isolated in `/tmp`
  and listening on loopback port 55432. This differs from Compose's PostgreSQL 18.
  All source rows were deleted and the temporary server was stopped afterward.
- DB scaling repeats the 100 real vectors/chunks to create 1,000 and 10,000 rows;
  those larger sizes are not freshly embedded documents. Existing exact cosine
  search and German full-text search with RRF are unchanged. Search timing includes
  query embedding, a new database connection, SQL execution and hit construction.
  Rows are freshly inserted; this does not simulate a long-lived production database.

## Measurements

Document stages, median of three runs, milliseconds:

| Slides/chunks | PPTX extraction | Chunking | Embedding | Total compute | Embedding chunks/s |
|---:|---:|---:|---:|---:|---:|
| 3 | 1.98 | 0.005 | 84.63 | 86.61 | 35.45 |
| 20 | 3.80 | 0.012 | 540.84 | 544.70 | 36.98 |
| 100 | 13.15 | 0.041 | 2,679.10 | 2,692.29 | 37.33 |

Database and retrieval, milliseconds (storage is one observation per size):

| Chunks | Store/replace | Hybrid median | Hybrid p95 | Keyword-only median | Keyword-only p95 |
|---:|---:|---:|---:|---:|---:|
| 100 | 28.81 | 11.38 | 12.61 | 4.02 | 4.21 |
| 1,000 | 223.10 | 15.60 | 23.17 | 7.18 | 7.73 |
| 10,000 | 2,089.85 | 54.03 | 61.55 | 36.11 | 43.16 |

- Model constructor plus its deferred library imports: **1.847 s** in the first
  process, **0.486 s** in the second process. Filesystem caches were not cleared;
  these are fresh-process observations, not controlled cold-disk measurements.
- First query after model loading: **9.70 ms** in the full run.
- Warm query embedding: **6.05 ms median / 6.33 ms p95**, 20 observations.
- Peak Python process RSS: **1.42 GiB** (full run); **1.43 GiB** in the initial
  compute-only run. This includes inference batches and Python data, excludes the
  database, and is not a measurement of idle model memory.
- All benchmark assertions passed: expected chunk counts, finite normalized
  768-dimensional vectors, persisted counts, vector hits, source scoping and cleanup.

Raw measurements: [full run](2026-10-24-m5-pro-vectors.jsonl),
[first compute-only run](2026-10-24-m5-pro-vectors-first-run.jsonl).

## Reproduce

Install the source-pipeline dependencies from `backend/requirements.txt` in a
Python 3.12 environment. Download the pinned model using the command in
`backend/Dockerfile` (choose a local destination). From `backend/`:

```sh
EMBEDDING_MODEL_PATH=/path/to/downloaded/model HF_HUB_OFFLINE=1 \
  python -u -m scripts.benchmark_vectors
```

Set the normal `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`,
and `POSTGRES_PASSWORD` variables to include DB stages. Prefer an isolated test
database: the script creates schema if absent, writes synthetic rows and deletes
only its own UUID source in `finally`. Without DB configuration it explicitly
reports the skipped stages. Capture stdout to preserve raw JSONL results.

## Limits and local blocker

Docker Desktop's installed backend crashes with SIGSEGV during
`github.com/shoenig/go-m1cpu` initialization, even for `com.docker.backend --help`.
Neither the default nor desktop-linux daemon socket became available. The local
Compose configuration also lacks required S3 values. Native PostgreSQL was used
without modifying the installed PostgreSQL files or existing databases.

This measures native compute and database calls, **not** the full browser upload →
S3 → Redis/Celery → ready response. HTTP, upload, queue delay, container overhead,
LLM fact-checking, concurrent users, heterogeneous document lengths, PDF parsing,
and retrieval relevance were not benchmarked. The 10,000-row corpus repeats text;
its broad keyword matches and cache behavior differ from real documents.
The measured speed does not establish production latency or answer quality.
