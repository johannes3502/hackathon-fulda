# Backend development setup

Run from the repository root with Docker Desktop or Docker Engine + Compose:

```sh
cp .env.example .env
docker compose up --build -d --wait
docker compose exec backend python -m scripts.smoke
```

Keep an existing `.env` instead of overwriting it. API docs:
<http://localhost:8000/docs>; frontend: <http://localhost:3000>.
Edit `backend/app/` for automatic API reload;
restart the worker after task changes with `docker compose restart worker`.
Changes to dependencies, scripts or the Dockerfile require a rebuild.

## OpenAPI and TypeScript

FastAPI exposes the API contract at <http://localhost:8000/openapi.json>.
Local tooling setup, generation commands and frontend usage are documented
in the [API contract guide](../api/README.md). Regenerate and commit both
artifacts whenever API routes or models change.

## IntelliJ IDEA and VS Code

Open the **repository root** in either IDE. Docker must be running and `.env`
must exist as described above. Shared IntelliJ configurations are in `.run/`;
VS Code configuration is in `.vscode/`. Personal `.idea/` state stays ignored.

- **IntelliJ IDEA:** enable the **Docker** plugin, select **Docker Compose**
  in the run selector and click **Run**. It builds images and starts every
  service in `compose.yaml`: frontend, backend, Celery worker, Redis, PostgreSQL and S3 storage. The
  configuration uses the local Docker connection named `Docker`; select your
  local connection in its **Server** field if it has a different name.
  View logs and stop containers in the **Services** tool window.
- **VS Code:** run **Tasks: Run Build Task** (`Cmd+Shift+B` on macOS,
  `Ctrl+Shift+B` on Windows/Linux). The default **Compose: up** task builds
  and starts all six containers, then waits for their health checks. **Tasks:
  Run Task** also offers **Compose: stop**, **Compose: frontend logs** and
  **Compose: backend logs**.

No local Node.js, Python SDK or virtual environment is required to start the stack.
FastAPI runs inside Docker and reloads when `backend/app/` changes. Run the
smoke command above to check the running containers.

## Components

| Component | Role | Local address |
|---|---|---|
| Next.js frontend | Browser UI; `/api/...` forwards to FastAPI inside Compose | `http://localhost:3000` |
| FastAPI + Uvicorn | API; connection helpers and health endpoints | `http://localhost:8000` |
| Celery worker | Background jobs in separate Python processes | Internal; no host port |
| Redis | Celery broker (DB 0) and temporary task results (DB 1) | Internal `redis:6379`; no host port |
| MediaPipe | Python Tasks library in the shared backend/worker image | No separate service |
| PostgreSQL + pgvector | Source metadata, text chunks and embeddings; later transcripts and timestamps | `localhost:5432` |
| SeaweedFS | S3-compatible object storage for audio/video and uploaded files | `http://localhost:8333` |
| OpenAI-compatible LLM (external or local) | Fact-check: claim extraction and judgments; optional | `LLM_BASE_URL` in `.env` |
| MediaRecorder | Browser API that produces audio/video blobs | Frontend; no container or Python dependency |
| FFmpeg | Available for converting browser recording formats when needed | Backend and worker containers |

File bytes belong in object storage; PostgreSQL can hold their object key,
MIME type, size and relation to a presentation. Audio jobs persist uploads and analysis in S3. Product database tables
and event clips are not implemented yet.

SeaweedFS `mini` runs the file store in one container and creates `S3_BUCKET`
on startup. Credentials come from `.env`; the bucket is not public. Only the
S3 port is published. WebDAV, the admin UI and table catalogs are disabled.
The selected images/wheels support Linux ARM64 and AMD64; there is no forced
AMD64 emulation on Apple Silicon.

Inside Compose, use `postgres:5432` and `http://storage:8333` (already set for
the backend). From the host, use the localhost addresses above and credentials
from `.env`. Ports can be changed there. Keep S3 credentials in the backend.
Future presigned URLs need an endpoint reachable by the browser; the internal
`storage` hostname is not reachable from a browser.

## Background jobs

`app/celery_app.py` configures Celery; add background tasks in `app/tasks.py`.
API and worker share the image, source and PostgreSQL/S3 connection settings.
The worker uses two processes by default; change `CELERY_WORKER_CONCURRENCY`
in `.env` and run Compose again to adjust it.

For a future transcription route, declare the processing function with
`@celery_app.task`, then publish it from the async route using
`task_id = await enqueue_task(transcribe, session_id, object_key)` from
`app.jobs`. Return HTTP 202 with the task ID after successful publication.
The helper puts Redis publishing in a thread so it does not block the API's
event loop. Handle `QueueUnavailable` as HTTP 503; never wait on
`AsyncResult.get()` inside a request. A future status route should also move
synchronous Redis result lookups to a thread.

Only pass IDs and S3 object keys through the queue. Workers fetch media from
S3 and write durable output to S3/PostgreSQL; Redis task results should contain
small status/reference values. The `worker_probe` task is an infrastructure smoke check. `analyze_speech`
runs the audio/ASR pipeline; `/speech/jobs/{job_id}` reads its status from S3.

Jobs use JSON, the `background` queue, late acknowledgements and one reserved
job per process. Make tasks idempotent: interrupted jobs may be delivered
again. Normal failures/timeouts are recorded as failures, without automatic
task retries; add bounded provider-specific retries when implementing them.
The initial soft/hard runtime limits are 9/10 minutes, the worker has an
11-minute shutdown grace period, and Redis's visibility timeout is one hour.
These are infrastructure defaults to revisit for the actual ASR provider;
keep the visibility timeout longer than the hard task limit.

```sh
docker compose logs -f worker
docker compose restart worker
```

## Analysis pipelines

Two independent pipelines write the shared `Event` schema (`app/events.py`,
see `AGENTS.md`). Every timestamp is in ms relative to the recording start,
and are combined with `merge_timeline`. Uploads, options, status and analysis
are stored under `speech-jobs/{job_id}/` in S3. Clip cutting is not implemented.

### Audio signal (`app/speech/`, `POST /speech/analyze`)

The signal pipeline measures sound; the combined worker optionally adds ASR:

```
recording (WebM/MP4/WAV) → FFmpeg 16 kHz mono → frames (40 ms, every 10 ms)
  → time series: level_db, f0_hz (YIN), active (Silero VAD), syllable peaks
  → events: pause | volume | pitch | pace   (source "speech")
```

- `series` is column-oriented: `t_ms[i]` (frame centre) belongs to
  `level_db[i]`, `f0_hz[i]` (null if no pitch) and `active[i]`;
  `syllable_peaks_ms` lists envelope maxima.
- Pause: no voice activity for ≥ `pause_min_ms` between speech.
- Volume: median level per window vs. baseline (`quiet` / `loud`).
- Pitch: spread of F0 in semitones per window; low spread → `monotone`.
  No statement about emotion.
- Pace: syllable rate from the level envelope vs. baseline (`fast` / `slow`).
- Baseline: the first 3000 ms by default; speak normally during calibration.
  Explicit `baseline_ms: null` selects the whole recording. Adjacent windows with the same direction become one event.
- Upload as multipart field `recording`, optional field `config` with
  `AudioConfig` JSON, and `transcribe` (default true).
- `POST /speech/analyze` now returns **202** with `job_id` and `status_url`;
  this replaces the previous synchronous 200 response. Poll the status URL:
  `queued` → `running` → `completed` (with `result`) or `failed` (with `error`).
  Decode failures occur in the worker and are reported as failed jobs.
- The frontend camera flow uploads completed recordings with `transcribe=false`
  and polls this job API. This keeps its signal analysis local. Optional paid
  ASR is available through the API; the UI still imports word timestamps separately.
- `result.events` uses word-based tempo and acoustic pauses without duplicate
  events. Raw pipeline events remain in `audio.events` / `transcription.events`.
- Silero v6.2 is installed and checksum-verified at image build time. CPU ONNX
  inference runs locally, without PyTorch or runtime downloads. `activity_detector:
  "energy"` explicitly selects the old energy gate for DSP tests/debugging.
- Set `DEEPGRAM_API_KEY` in `.env`, then recreate backend/worker. Default ASR:
  Nova-3, German, batch upload to `https://api.eu.deepgram.com/v1/listen`.
  The audio is sent to this third party; only synthetic demo recordings are
  intended at this stage. German filler preservation is **unverified** and the
  English-only `filler_words` feature is not enabled.
- Without a key, submit `transcribe=false` for local signal analysis, or set
  `ASR_PROVIDER=json` to explicitly replay `app/demo/words.json`. Demo output is
  flagged `synthetic_demo=true`; those words are invented and not aligned to an
  arbitrary upload. Failed ASR never silently turns into fabricated feedback.
- No automatic paid ASR retries. Completed/failed jobs reuse stored results on
  redelivery. A 660-second Redis lease prevents simultaneous processing; hard
  worker loss permits redelivery after the lease. A crash after a successful
  provider call but before saving the result can still repeat that call.
- Originals are deleted after terminal processing (including analysis failure).
  If storage is unavailable or a process is killed, cleanup can be delayed;
  queued/stalled jobs and analysis results have no automatic expiry yet.

Example from the repository root, using only the synthetic fixture:

```sh
curl -F recording=@backend/tests/fixtures/speech-de.wav -F transcribe=false http://localhost:8000/speech/analyze
curl http://localhost:8000/speech/jobs/JOB_ID
```

Full local queue/model smoke (synthetic fixture, no paid ASR by default):

```sh
docker compose cp backend/tests/fixtures/speech-de.wav backend:/tmp/speech-de.wav
docker compose exec -T backend python -m scripts.smoke_audio /tmp/speech-de.wav
```

Use `--transcribe` only when the desired provider is configured. With
`ASR_PROVIDER=json` this checks the explicit deterministic demo; with
`ASR_PROVIDER=deepgram` it sends the synthetic audio to the paid ASR API.

For local inference outside Docker, from `backend/`:

```sh
.venv/bin/python -m scripts.install_silero /tmp/fulda-models
SILERO_MODEL_PATH=/tmp/fulda-models/silero_vad.onnx .venv/bin/python -m pytest tests
```

The real ONNX smoke test uses computer-generated German speech, seeded noise
and silence. Without a model path it is skipped; other tests still run. Provider
contract tests use mocked HTTP responses and do not prove German ASR quality.

### Transcription (`app/transcription/`, `POST /transcription/analyze-words`)

```
recording → FFmpeg WAV → Transcriber → words {word, start_ms, end_ms}
  → events: filler (incl. repetition) | pause | pace   (source "asr")
```

- `Transcriber` keeps the provider exchangeable. `DeepgramTranscriber` maps
  seconds to millisecond word timestamps; `JsonTranscriber` replays demo words.
- Fillers use a configurable list (still open, see `docs/01-product.md`);
  repetitions ("ich ich") are `filler` events with `payload.kind = "repetition"`.
- Word-based pause and words-per-minute complement the signal-based values.

All thresholds (`AudioConfig`, `WordConfig`) are unvalidated heuristics and
are returned in `heuristics` so the UI can label them. No scores.

Tests (synthetic tones, computer-generated speech and word lists only), from `backend/`:

```sh
.venv/bin/python -m pip install -r requirements-dev.txt
.venv/bin/python -m pytest tests
```

### Sources and retrieval (`app/sources/`, `/sources`)

Uploaded slides, papers and notes that fact-check, question agent and other
features can cite. Data flow:

```
POST /sources (multipart: collection_id, file) → S3 sources/{id}/original
  → Celery ingest_source: extract → chunk → embed → PostgreSQL (pgvector)
POST /sources/search {collection_id, query, k} → top-k passages
```

- Formats: PDF (per page), PPTX (per slide incl. tables and speaker notes),
  DOCX (per paragraph), TXT/MD (per block of lines). No OCR: scanned PDFs
  without a text layer fail with a readable message. Max 25 MB
  (`SOURCE_MAX_BYTES`).
- `collection_id` is generated by the client (one per browser in the
  frontend) and groups the sources of a presentation. There is no login.
- Chunks: ~1200 characters, split at sentence boundaries with ~200 characters
  overlap. Pages and slides are never merged, so every passage cites exactly
  one page or slide (`location: {kind, start, end}`).
- Embeddings: `jinaai/jina-embeddings-v2-base-de` (German/English, Apache-2.0)
  via FastEmbed/ONNX on the CPU, inside API and worker. The pinned revision is
  baked into the image; no text leaves the server. `Embedder` keeps the model
  exchangeable; `EMBEDDING_PROVIDER=none` runs keyword-only search.
  Each process loads the model on first use (~0.6 GB RAM).
- Search: cosine similarity (pgvector) and German full-text search, merged by
  reciprocal rank fusion. Keywords catch exact figures such as "260.000".
  `similarity` is the raw cosine value, not a quality score. Search always
  returns the best k passages, even when none of them is relevant.
- Status: `queued` → `processing` → `ready` (with `chunk_count`) or `failed`
  (with `error`), via `GET /sources/{id}` or `GET /sources?collection_id=`.
  `DELETE /sources/{id}` removes file, chunks and vectors.
- Originals stay in S3 until deleted (unlike recordings): they are the
  evidence that answers cite. No automatic expiry yet.

For other features, from Python:

```python
from app.sources.retrieval import format_context, quote_in_text, search

hits = search(collection_id, "Wie viele Studierende nutzen die App?", k=5)
prompt_context = format_context(hits)   # "[1] deck.pptx, Folie 3:\n…"
quote_in_text(model_quote, hits[0].text)  # verbatim check (AGENTS.md, Fact-Check step 4)
```

End-to-end smoke (synthetic PPTX built in memory; uploads, waits for the
worker, searches, deletes):

```sh
docker compose exec -T backend python -m scripts.smoke_sources
```

The Postgres image is now `pgvector/pgvector` (PostgreSQL 18, Debian) instead
of `postgres:18.6-alpine`. Existing local volumes keep working; the schema and
extension are created on first use. `tests/test_sources.py` contains a
database round trip that runs when `POSTGRES_HOST` is set.

For native source-pipeline timings, run `python -u -m scripts.benchmark_vectors`
with `EMBEDDING_MODEL_PATH` pointing to the downloaded pinned model. It uses
synthetic PPTX decks and checks vector shape/normalization. `POSTGRES_*` enables
storage and retrieval timings against an isolated test database; otherwise these
stages are explicitly skipped. See the [M5 Pro measurements and limitations](../docs/benchmarks/2026-10-24-m5-pro-vectors.md).

### Fact-check (`app/factcheck/`, `/factcheck`)

Checks factual statements of a transcript against the uploaded sources of a
collection first (RAG), then, only for statements the uploads do not settle,
against a web search. Data flow:

```
POST /factcheck {words, collection_id?, use_web} → S3 factcheck-jobs/{id}/request.json
  → Celery fact_check:
      words → numbered sentences (timestamps from code, not from the model)
      LLM: extract checkable claims + search query, referencing sentence numbers
      per claim: retrieval.search(collection) → LLM judges with verbatim quote
                 → quote_in_text() verifies the quote, otherwise discarded
                 not settled? → web search (Wikipedia/Tavily) → same judge + check
  → S3 factcheck-jobs/{id}/status.json (request.json deleted afterwards)
GET /factcheck/jobs/{id}   queued | running | completed | failed
GET /factcheck/settings    configured model, LLM host and web provider (for consent text)
```

- Verdicts: `supports`, `contradicts`, `not_found` ("not in the checked
  sources", never "false") and `unchecked` (model or search failed for this
  claim). Every result is also a `fact` event (`source="factcheck"`) on the
  shared timeline: `contradicts` → `warning`, `not_found` → `hint`, otherwise
  `info`. No scores.
- Evidence is accepted only if the quoted text appears verbatim in the passage
  (whitespace, case and quote style ignored) and has at least
  `min_quote_chars` characters. Upload evidence names file and page/slide;
  web evidence names title and URL.
- Model: any OpenAI-compatible `POST {LLM_BASE_URL}/chat/completions`
  (OpenAI, hosted open models, Ollama, vLLM, LM Studio). Configure
  `LLM_BASE_URL`, `LLM_MODEL` and, if needed, `LLM_API_KEY` in `.env`; without
  them `/factcheck` answers 503. `LLM_JSON_MODE=false` for servers without
  `response_format=json_object`; `LLM_TEMPERATURE` stays unset unless the model
  accepts it. A local server on the host is reachable from the containers as
  `http://host.docker.internal:<port>/v1`. Calls are not retried (they may be
  billed); `LLM_CONCURRENCY` claims are judged in parallel.
- Web search (`WEB_SEARCH_PROVIDER`): `wikipedia` (default, MediaWiki API, no
  key, `WEB_SEARCH_LANGUAGE=de`), `tavily` (`TAVILY_API_KEY`) or `none`. Only
  search APIs, no HTML scraping. The client can switch it off per request
  (`use_web=false`).
- Third parties: transcript sentences go to the LLM host; short search queries
  go to the web provider. The review UI names both before the check starts.
- Limits (`FactCheckConfig`, returned with every result): 12 claims, 5 upload
  passages and 4 web passages per claim. Not tuned; quality of claim
  extraction and judgments depends on the chosen model and is not measured.

Tests: `tests/test_factcheck.py` (scripted model answers, HTTP contracts for
the OpenAI-compatible API and Wikipedia, task redelivery). A full run through
the Compose stack needs a configured model; see the AI decision log entry for
the end-to-end check with a deterministic stand-in model.

## MediaRecorder integration

The frontend requests camera/microphone access through `getUserMedia()`
and passes that stream to `MediaRecorder`. Select formats using
`MediaRecorder.isTypeSupported()`; do not assume every browser records WebM.
Preserve the actual `recorder.mimeType` with the blob. Collect `dataavailable`
chunks and wait for the final `stop` event before assembling a complete file;
individual chunks are not necessarily independently playable. Stop all media
tracks when finished.

Microphone/camera access requires HTTPS or localhost. For smartphone testing,
use an HTTPS origin reachable from the phone; a laptop's plain HTTP LAN IP
does not satisfy this requirement. Add the actual frontend origin to
`CORS_ORIGINS` when connecting it. This Compose file binds to localhost and
does not set up public hosting or TLS.

## Storage decision for this scaffold

This is a local development setup for synthetic data only, following
`AGENTS.md`. Starting the stack does not capture audio. The explicit `/speech/analyze`
upload route stores recordings for worker processing and analysis in S3. The smoke check generates
silent audio and deletes it again; its temporary database table disappears
when the connection closes.

PostgreSQL, S3 and Redis use named Docker volumes. Data deliberately written during
development survives restart, recreation and `docker compose down`. There is
no automatic expiry for database records, media or queued jobs. Redis uses
AOF persistence with a one-second sync interval and no key eviction; abrupt
host failure can still lose the most recent writes. Task results expire after
one hour; the smoke check removes its result immediately. This does not define
media/transcript retention. Before using human recordings, decide
and document consent, retention, session deletion and cleanup of both files
and database references in `docs/01-product.md`.

```sh
docker compose logs -f backend
docker compose down
```

To intentionally erase **all local database, media and queued job data** for this project:

```sh
docker compose down --volumes
```

Changing `POSTGRES_PASSWORD` in `.env` does not change an already initialized
database password. Change it in PostgreSQL too, or reset the volumes only if
their contents are disposable.

## Checks and limits

- `/health/live`: API process responds, independent of storage availability.
- `/health/ready`: executes a PostgreSQL query, authenticates to the S3
  bucket and pings Redis; returns HTTP 503 with the failing dependency marked
  unavailable. Worker availability is checked separately by its Compose
  health check; jobs can queue while the worker is stopped or busy.
- `python -m scripts.smoke`: checks readiness, MediaPipe Tasks imports,
  FFmpeg, a database round trip, synthetic S3 upload/read/range/delete and
  rejection of anonymous object access. It also publishes a five-second job,
  checks that both API health routes respond while that job is running in a
  separate worker container, verifies the result and deletes it.
- This does not verify live tracking, transcription, a model/API fallback,
  browser recording, physical devices or a deployment. Those remain work
  for the vertical slice. Dependency failures do not produce fake feedback.

Verified locally on 24.10.2026 with Docker Desktop on ARM64: image build,
`pip check`, all six service health checks and the extended smoke check passed.
The API responded while the synthetic worker job was running. Redis outage
checks confirmed readiness 503, liveness 200 and prompt `QueueUnavailable`
errors. A queued job survived Redis recreation and completed when the worker
restarted; a separate check confirmed that an existing producer and running
worker recover after a Redis restart. Test jobs/results were removed.

Earlier lifecycle checks also confirmed PostgreSQL/S3 outage reporting and
recovery, and persistence of a test database row and S3 object across container
recreation. Those fixtures were removed too.

## References

- [FastAPI Docker setup](https://fastapi.tiangolo.com/deployment/docker/)
- [MediaPipe Python setup](https://developers.google.com/edge/mediapipe/solutions/setup_python)
- [MediaPipe package and platform wheels](https://pypi.org/project/mediapipe/1.1.1/)
- [SeaweedFS quick start](https://github.com/seaweedfs/seaweedfs#quick-start)
- [PostgreSQL Docker image and volume location](https://hub.docker.com/_/postgres)
- [MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [Microphone/camera secure contexts](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [IntelliJ shared run configurations](https://www.jetbrains.com/help/idea/run-debug-configuration.html)
- [IntelliJ Docker Compose](https://www.jetbrains.com/help/idea/docker-compose.html)
- [VS Code tasks](https://code.visualstudio.com/docs/debugtest/tasks)
- [Celery with Redis](https://docs.celeryq.dev/en/stable/getting-started/backends-and-brokers/redis.html)
- [Celery task and worker configuration](https://docs.celeryq.dev/en/stable/userguide/configuration.html)
- [Redis Docker image](https://hub.docker.com/_/redis)
