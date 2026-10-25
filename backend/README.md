# Backend development setup

Run from the repository root with Docker Desktop or Docker Engine + Compose:

```sh
cp .env.example .env
docker compose up --build -d --wait
docker compose exec backend python -m scripts.smoke
```

Keep an existing `.env` instead of overwriting it. API docs:
<http://localhost:8000/docs>; frontend: <http://localhost:3000>.
Compose runs the source baked into one shared image for the API, worker and
scheduler, without hot reload or source mounts. After backend changes, rebuild
and recreate all three so they run the same revision:

```sh
docker compose up --build -d --wait backend worker beat
```

The Docker build context is the repository root; `templates/` is included in
the image. Local development can still use `uvicorn app.main:app --reload`
from `backend/` with the configured infrastructure and model paths. Model
download layers are cached independently of ordinary application edits.

## Question rounds and retention (reviewed 25 October 2026)

`POST /questions` returns a `round_id`; answer endpoints require that ID and
`question_id`. The server loads the question, persona, collection and limits
from Redis. Defaults: 600 seconds, six answered turns and three follow-ups.
Pending turns reserve budget; identical retries reuse the completed review.
A different answer to an already reviewed question returns 409. Old saved
rounds need regeneration. The take-review question API uses the same ledger.
Redis failure prevents a paid review; a worker crash can reserve a turn until
round expiry. Generation still accepts client findings as untrusted leads.
Nonce delimiters, strict output schemas, safe HTTP URLs, quote checks and
numeric gates are defensive measures, not an injection-proof boundary.

Compose runs exactly one `beat`, scheduling `app.tasks.retention_sweep` at
03:15 UTC. Recreate backend/worker/beat after integrating the configuration:

```sh
docker compose up --build -d --wait backend worker beat
docker compose exec -T backend python -c 'from app.retention.service import sweep; print(sweep(dry_run=True))'
```

Profile defaults are 365 days, extended by new linked takes; explicit deadlines
and `retentionUntil:null` remain user choices. Expiry deletes progress data and
unlinks sessions/takes. Linked sessions have no automatic session deadline,
including after unlinking. Anonymous sessions have an independent 365-day
period. `RETENTION_PROFILE_DAYS`, `RETENTION_SESSION_DAYS`, `RETENTION_JOB_DAYS`
(default 30), `RETENTION_STALE_JOB_HOURS` (default 2), and `RETENTION_BATCH`
(default 100 per category) control new records and sweeps. Legacy migration
backfills use the documented 365-day default. Database migrations preserve
existing explicit profile deadlines and deliberately unset session deadlines.

Deletion queues S3 keys in `blob_deletions` in the metadata transaction and
flushes them after commit. Storage failures retain the key with backoff for a
later sweep; partial sweep failures also trigger bounded task retries.
`retention_runs` records counts and error codes. Sweep batches include expired
profiles/sessions, stale/terminal take jobs and expired idempotency records.
Source collections and legacy S3-only job/result prefixes are not swept; no
external lifecycle policy is assumed. Browser videos remain separate.

## OpenAPI and TypeScript

FastAPI exposes the API contract at <http://localhost:8000/openapi.json>.
Local tooling setup, generation commands and frontend usage are documented
in the [API contract guide](../api/README.md). Regenerate and commit both
artifacts whenever API routes or models change.

## Frontend returns HTTP 500 for a health check

Starting `npm run dev` starts only the frontend. If nothing listens on port 8000,
the `/api` proxy returns HTTP 500 before any recording starts. Start the backend
and its dependencies, then verify both routes:

```sh
# Preserve an existing .env; otherwise copy .env.example first.
docker compose up --build -d --wait backend worker
curl --fail http://localhost:8000/health/ready
curl --fail http://localhost:3000/api/health/ready
```

The first build downloads local Whisper and embedding models. If Docker Desktop
cannot start and Colima is already installed, the same stack can run there:

```sh
colima start --activate=false
docker --context colima compose up --build -d --wait backend worker
```

Use that context for subsequent Compose commands. Existing Docker Desktop
volumes and Colima volumes are separate. Gemini is reached over outbound HTTPS;
no host-gateway or local model server is needed. In the normal studio,
unavailable analysis blocks capture with a retry message; the local stage path
(`/stage` → **Lokale Sofortaufnahme**) records without an upload. No recording
exists if startup fails before capture.

## IntelliJ IDEA and VS Code

Open the **repository root** in either IDE. Docker must be running and `.env`
must exist as described above. Shared IntelliJ configurations are in `.run/`;
VS Code configuration is in `.vscode/`. Personal `.idea/` state stays ignored.

- **IntelliJ IDEA:** enable the **Docker** plugin, select **Docker Compose**
  in the run selector and click **Run**. It builds images and starts every
  service in `compose.yaml`: frontend, backend, Celery worker, Celery Beat, Redis, PostgreSQL and S3 storage. The
  configuration uses the local Docker connection named `Docker`; select your
  local connection in its **Server** field if it has a different name.
  View logs and stop containers in the **Services** tool window.
- **VS Code:** run **Tasks: Run Build Task** (`Cmd+Shift+B` on macOS,
  `Ctrl+Shift+B` on Windows/Linux). The default **Compose: up** task builds
  and starts all seven containers, then waits for their health checks. **Tasks:
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
| MediaPipe | Pose/hand tracking in the browser | Client-side; no Python package in the backend image |
| PostgreSQL + pgvector | Sessions, takes, events, reviews, jobs, word timestamps, source chunks and embeddings | `localhost:5432` |
| SeaweedFS | Sources and temporary audio-analysis uploads; no review playback media | `http://localhost:8333` |
| OpenAI-compatible LLM (external or local) | Fact-check: claim extraction and judgments; optional | `LLM_BASE_URL` in `.env` |
| MediaRecorder | Browser API that produces audio/video blobs | Frontend; no container or Python dependency |
| FFmpeg | Available for converting browser recording formats when needed | Backend and worker containers |

File bytes belong in object storage; PostgreSQL can hold their object key,
MIME type, size and relation to a presentation. Legacy audio jobs persist analysis in S3.
The take review API stores derived results in PostgreSQL and deletes temporary uploads.
Video playback stays in the client; the backend has no clip or snapshot API.

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

## Persistent session/take reviews

The additive API in `app/review/` implements the backend contract in
[`docs/06-backend-review-api.md`](../docs/06-backend-review-api.md).
Existing `/speech`, `/factcheck` and `/questions` clients keep their routes.
All new POST routes require `Idempotency-Key` (1–128 characters); reuse it
when retrying the same operation. A changed body with the same key returns 409.
Request/response names are camelCase; actual IDs are UUIDs.

1. `POST /sessions` with a title and explicit consent (`granted`, zoned `at`,
   `version`, `scope: "local-analysis"`). Capture settings and collection UUID
   are optional. Cloud ASR/LLM/web use requires `local-and-cloud-analysis`.
2. `POST /sessions/{id}/takes` with `durationMs`, `mimeType`, `timebase`.
   Optional `coverage: [{tMs, durationMs, evaluable, reason?}]` describes measured
   pose coverage. Unreported intervals remain unknown, never assumed valid.
3. `POST /takes/{id}/events` with up to 500 browser pose events. `dedupeKey`
   defaults to `eventId`; an explicit value must be nonempty. Each invalid
   event is rejected separately. A conflicting event ID rejects the transaction.
4. Optionally `POST /takes/{id}/audio`, multipart `file`, `transcribe`, `config`
   (`AudioConfig` JSON), `local_only`, `live_transcript`. Upload limit: 128 MiB.
   Poll the returned `/api/jobs/{jobId}` through the frontend proxy, or
   `/jobs/{jobId}` on port 8000. The worker probes A/V starts, shifts timestamps,
   stores word/speech summaries in `take.analysis`, and deletes the upload.
5. `POST /takes/{id}/review` with `{mode: "template", language: "de"}` (defaults).
   Poll the job, then `GET /takes/{id}/review` returns `{review: review.v1}`.
   `GET /takes/{id}/timeline` returns events, aggregates and coverage. A ready
   report with the same pack/options is reused with `200 {reviewId}`.
6. Optional `POST /takes/{id}/factcheck` (`useWeb: false` by default), then
   `POST /takes/{id}/questions` (`persona: "student" | "tutor"`). Both use the
   stored transcript/collection. `GET /takes/{id}/questions` returns the result;
   `POST /takes/{id}/questions/answers` accepts `questionId`, `answer`, `persona`
   and compares against sources without a grade. Results are in `/jobs/{id}`.
7. `DELETE /sessions/{id}` removes server-side takes, events, reviews, jobs,
   idempotency entries and pending audio. Repeat deletion returns 204. Clients
   delete their local recording separately. Sources remain in their collection.

The schema is created idempotently on first access under a PostgreSQL advisory
lock. No extra service or frontend implementation is needed for backend tests.
`run_take_job` is a Celery task; queues contain only job UUIDs. Worker writes
re-check the parent session so deletion cannot recreate derived data.
Only one long-running job is accepted per take. Queued jobs survive a publish
failure: retry the same POST/key to publish the same job. There is no periodic
outbox sweeper; abandoned requests need retry or session deletion. Terminal
jobs reuse results. Audio cleanup failures are retried and never reported as
successful completion. A hard worker kill delays cleanup until redelivery.

The review writer receives a bounded evidence-card pack, chooses at most three
findings and builds counts/summary in code. `mode: "llm"` uses the configured
model as a selector of approved placeholder-based wording; Gemini uses the
OpenAI-compatible JSON mode. All providers pass the same schema/catalog checks.
Unknown values, sources, advice or numerical literals cannot enter the report.
After one retry, invalid claims use templates. Over 20% fallback marks the job
failed (`E_REVIEW_VERIFICATION`), while the grounded fallback report remains
available through GET. Machine verification is available at
`GET /takes/{id}/evaluation`; `humanLabeledClaims: null` means no human evaluation.

Synthetic verification, without touching the frontend:

```sh
# After changing app code, restart the worker (API reloads automatically).
docker compose restart worker
docker compose exec -T backend python < backend/scripts/smoke_review.py
# Explicit LLM smoke (Gemini key required; cloud consent for review):
docker compose exec -T backend python - --llm < backend/scripts/smoke_review.py
PYTHONPATH=backend backend/.venv/bin/python -m pytest backend/tests -q
```

### CLI options for development scripts

Run these commands from `backend/` with its Python environment. Every script
supports `--help`. Timeouts and polling intervals are positive, finite seconds;
defaults preserve the existing smoke behavior. The job timeout bounds polling
between requests; an individual HTTP request can additionally consume its
request timeout. The live receive timeout applies to each message, including
the initial `ready` handshake.

| Command (`python -m scripts.…`) | Additional options and defaults |
|---|---|
| `smoke_audio recording.wav` | `--url` (`API_URL` or `http://localhost:8000`), `--request-timeout 15`, `--job-timeout 60`, `--poll-interval 0.25` |
| `smoke_review` | `--request-timeout 20`, `--job-timeout 30` (180 with `--llm`), `--poll-interval 0.2`; existing `--url` still selects the server |
| `smoke_live recording.wav` | `--connect-timeout 15`, `--receive-timeout 60`; existing `--url` and `--feedback` still select the server and analysis |
| `benchmark_embedding` | `--output-dir benchmarks/results` (default is relative to the backend directory) |
| `export_openapi` | `--output PATH` selects the file to write or validate with `--check`; default: repository `api/openapi.json` |

Explicit output paths are relative to the current working directory. The root
`npm run api:export` wrapper runs in `backend/`, so
`npm run api:export -- --output ../api/custom.json` writes `api/custom.json`.

```sh
python -m scripts.smoke_audio tests/fixtures/speech-de.wav --job-timeout 120 --poll-interval 0.5
python -m scripts.smoke_review --url http://127.0.0.1:8000 --request-timeout 30 --job-timeout 90
python -m scripts.smoke_live tests/fixtures/speech-de.wav --feedback --receive-timeout 90
python -m scripts.export_openapi --output /tmp/418-openapi.json
python -m scripts.export_openapi --output /tmp/418-openapi.json --check
```

The smoke exercises real HTTP/Celery/Postgres/S3, verifies deletion, and times
a five-minute metadata-only take with 60 events. Database tests in
`tests/test_review_db.py` additionally run when `POSTGRES_HOST`, `POSTGRES_PORT`,
`POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` point to a test database.
Use a host-reachable PostgreSQL address outside Compose. These synthetic checks
do not establish model accuracy, human claim support, browser seeking or device
acceptance. Authentication, legacy S3-result retention and public-host rate
limits remain open; the confirmed deployment scope is localhost.

## Long-term progress (optional)

`app/progress/` adds pseudonymous profiles and a deterministic read model for
long-term trends. It is additive: sessions without `profileId` behave exactly
as before.

- `POST /profiles` with `scope: "long-term-progress"` returns a one-time
  `pp_…` token. Send it as `X-Profile-Token` for every profile route.
- `POST /sessions` accepts `profileId` and `presentationMode`; when linked, the
  token is required. Takes inherit `profileId` and `capture.deviceKey`.
  All linked session/take/job routes also require the token, including uploads
  and deletion. Anonymous sessions retain their existing API.
- `GET /profiles/{id}/progress` materializes `take_quality`, `take_metrics`,
  snapshots and change-points. Only takes with changed revisions/computation
  versions are extracted again; new takes remain visible above 200 takes.
  Use the default `last_20` window for interactive reads; `all` is unpaginated.
- `POST /profiles/{id}/progress/recompute` queues a Celery rebuild and returns
  `202 {runId,statusUrl}`. Poll `GET /profiles/{id}/progress/runs/{runId}`,
  then reload progress when completed. The same idempotency key republishes a
  queued run after a queue outage. Concurrent runs for a profile return `409`.
  Restart the worker after updating the task code.
- Retention is checked on every read/mutation, including idempotent replays.
  Expired profiles return `410`; deletion remains available. Explicit
  `PATCH {retentionUntil:null}` clears retention before expiry.
- Metrics are heuristics, missing values stay unknown, and the response has no
  overall score. See `docs/12-long-term-progress-data-design.md` and
  `docs/13-long-term-progress-frontend-contract.md`.
- `DELETE /profiles/{id}` removes progress data but unlinks sessions/takes;
  delete a session separately for its analysis data, or explicitly pass
  `?deleteSessions=true` to delete the linked server-side analysis too.

## Background jobs

`app/celery_app.py` configures Celery; add background tasks in `app/tasks.py`.
API and worker share the image, source and PostgreSQL/S3 connection settings.
The worker uses two processes by default; change `CELERY_WORKER_CONCURRENCY`
in `.env` and run Compose again to adjust it.

For a new processing route, declare the processing function with
`@celery_app.task`, then publish it from the async route using
`task_id = await enqueue_task(transcribe, session_id, object_key)` from
`app.jobs`. Return HTTP 202 with the task ID after successful publication.
The helper puts Redis publishing in a thread so it does not block the API's
event loop. Handle `QueueUnavailable` as HTTP 503; never wait on
`AsyncResult.get()` inside a request. A status route must also move
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
- Baseline: waits for 3000 ms of **voiced speech**, even after a silent start.
  Volume calibration and comparison use voiced levels, not quiet room noise.
  The reference then adapts in non-overlapping 1-second blocks with enough voiced
  evidence (30% minimum). Median candidates reject short spikes; bounded exponential
  updates have a 30-second half-life measured in voiced time. Silence/unpitched noise
  freeze it. Level/pitch candidates are clipped to a 12 dB/semitone difference;
  rhythm candidates to a factor of two. These are configurable prototype heuristics,
  not validated speech-quality thresholds. Sustained changes are initially visible
  and gradually become the reference; adaptation cannot judge absolute suitability.
  Explicit `baseline_ms: null` preserves the whole-recording comparison.
  `heuristics.baseline_ready` reports whether calibration completed.
  Adjacent windows with the same direction become one event; volume/pace payloads
  preserve `window_baseline_level_db` / `window_baseline_syllables_per_s` alongside
  the corresponding measurements. The existing scalar baseline is the first window's
  reference. Replay uses each timestamp's prior reference, never later audio.
- Upload as multipart field `recording`, optional field `config` with
  `AudioConfig` JSON, and `transcribe` (default true).
- `POST /speech/analyze` now returns **202** with `job_id` and `status_url`;
  this replaces the previous synchronous 200 response. Poll the status URL:
  `queued` → `running` → `completed` (with `result`) or `failed` (with `error`).
  Decode failures occur in the worker and are reported as failed jobs.
- The frontend backend mode uploads completed recordings with local Whisper
  transcription on by default, and polls this job API. The checkbox can disable
  transcription. It always sends `local_only=true`; when transcribing, a hosted
  or synthetic ASR configuration is rejected before storing the recording.
- `result.events` uses word-based tempo and keeps word pauses with sentence
  context, replacing only overlapping acoustic pauses. Acoustic-only pauses
  remain. Raw pipeline events remain in `audio.events` / `transcription.events`.
- Silero v6.2 is installed and checksum-verified at image build time. CPU ONNX
  inference runs locally, without PyTorch or runtime downloads. `activity_detector:
  "energy"` explicitly selects the old energy gate for DSP tests/debugging.
- Default ASR is local `faster-whisper` (`ASR_PROVIDER=whisper`, German).
  The worker loads the model once per process; audio stays on the VM. Word
  timestamps come from `word_timestamps=True`. Filler preservation and German
  quality are model-dependent and not measured here.
- `WHISPER_MODEL` is a **build argument** (default `small`). The Dockerfile
  downloads the CTranslate2 model into `/app/models/whisper`; the runtime path
  is `WHISPER_MODEL_PATH`. Change the model in `.env`, then
  `docker compose up --build -d --wait`. CPU defaults to `int8`; available
  sizes include `tiny`, `base`, `small`, `medium`, `large-v3`. Each worker
  process holds its own model, so raise `CELERY_WORKER_CONCURRENCY` only with
  enough RAM.
- **Selection is per machine, not per request.** Each teammate picks a
  `WHISPER_MODEL` that fits their device; see "Whisper model size per device"
  below. Download happens once at image build, not per job.
- Optional tuning: `WHISPER_DEVICE` (`cpu`/`cuda`), `WHISPER_COMPUTE_TYPE`,
  `WHISPER_LANGUAGE` (empty = auto-detect), `WHISPER_BEAM_SIZE`,
  `WHISPER_VAD_FILTER`, `WHISPER_INITIAL_PROMPT`.
- `ASR_PROVIDER=deepgram` remains available: set `DEEPGRAM_API_KEY` and
  recreate backend/worker. Audio is then sent to the EU endpoint; only
  synthetic demo recordings are intended. German filler preservation is
  **unverified** and the English-only `filler_words` feature is not enabled.
- Without ASR, submit `transcribe=false` for local signal analysis, or set
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

### Whisper model size per device

`WHISPER_MODEL` is shared by everyone who runs the same image, so pick a size
that matches the machine that executes the worker. The Docker build downloads
the model once into `/app/models/whisper`; afterwards no network is needed for
inference.

| Device / RAM | Suggested `WHISPER_MODEL` | Why |
|---|---|---|
| 4–8 GB RAM, older laptop, Raspberry Pi, CI runner | `tiny` or `base` | Keeps CPU + memory low, still maps word timestamps. |
| 8–16 GB RAM, Apple M1–M3 or modern Intel/AMD | `base` or `small` | Good German readability; roughly realtime-speed on small clips. |
| 16 GB+ RAM (e.g. Apple M-series with 24/32 GB) | `small`, `medium` or `large-v3` | Better German quality; still practical because RAM is not tight. |

Quality and German filler-word preservation are **not measured** here; pick a
bigger model only if you have the memory budget for it:

| Model | Approx. disk / RAM per worker (`int8`, CPU) |
|---|---|
| `tiny` | ~75 MB |
| `base` | ~140 MB |
| `small` | ~480 MB |
| `medium` | ~1.5 GB (untested on 8 GB-limited hosts) |
| `large-v3` | ~3 GB |

How to switch for one machine:

```sh
# repo root
sed -i 's/^WHISPER_MODEL=.*/WHISPER_MODEL=base/' .env
docker compose up --build -d --wait
```

Runtime model switching is intentionally **not** supported: `WHISPER_MODEL_PATH`
points at the model baked into the image, so changing `WHISPER_MODEL` requires a
rebuild (`docker compose up --build`). This keeps inference deterministic and
offline. On CPU-only hosts, `small` balances quality and speed for
6–10-second clips; it processes that clip roughly at realtime speed (~1.4× of
the clip duration, measured on a 2.5-core Linux VM; not guaranteed elsewhere).

Measured reference on this repo's fixture (6.8 s German speech, CPU `int8`):

| Model | Processing time (warm) |
|---|---|
| `tiny` (beam 5) | ~1.0 s |
| `small` (beam 5) | ~4.8 s |
| `small` (beam 1) | ~3.3 s |

`medium` was not measurable on a 7.7 GB host (OOM-killed) — treat it as a
16 GB+ model.

### Live speech feedback (`WS /speech/feedback`)

The web studio's backend mode streams 16 kHz mono Int16 PCM while recording.
Control frames are the same as `/speech/live`: `start` with `sample_rate: 16000`,
wait for `ready`, then binary PCM (at most one second per frame), then `stop`.
Every five seconds the server sends `{"type":"feedback","position_ms":5000,"events":[...]}`.
These are the existing calibrated volume, pitch, syllable-pace and pause rules;
no Whisper or LLM is needed. Preview audio stays in RAM and is released when
the socket ends. One signal session per API process, separately from captions.
The prototype reanalyses the prefix, capped at five minutes (the studio's limit),
replaying the same causal adaptive reference as batch analysis.
The browser aligns preview timestamps to recording start, shows one cue with a
15-second per-type cooldown, and stops the preview if analysis falls over 15
seconds behind. Hide live hints to suppress cues. Full batch review is unchanged.

Benchmark with synthetic audio of at least five seconds:

```sh
python -m scripts.smoke_live tests/fixtures/speech-de.wav --feedback
```

The reported signal delivery delay is measured from the analysed audio position;
the five-second collection interval is additional. Caption delay uses the last
delivered word timestamp and includes pauses; it is not pure inference time.

### Live transcription (`WS /speech/live`, backend prototype)

Near-realtime transcript while recording, same local Whisper, without Celery.

```
client PCM (16 kHz mono Int16, ~100 ms binary frames)
  → WS /speech/live → StreamingTranscriber (faster-whisper over a rolling window)
  ← {"type":"words"|"text","final":bool,…} + {"type":"ready"|"done"|"error"}
```

- Protocol: first message `{"type":"start","sample_rate":16000}` (only 16 kHz
  is accepted) → `ready`; then binary Int16 frames; `{"type":"stop"}`
  finalizes with final frames and `done`. Full tables live in
  `backend/app/transcription/README.md`.
- The handler transcribes when ≥ 2 s of new audio arrived
  (`WHISPER_LIVE_CHUNK_MS`) over a rolling window of max 10 s
  (`WHISPER_LIVE_MAX_WINDOW_MS`); an end cursor deduplicates words that
  overlap between windows. `WHISPER_LIVE_MAX_IDLE_SECONDS` (30 s silence)
  and `WHISPER_LIVE_MAX_SECONDS` (600 s audio) also finalize a session.
- One live session at a time per process (`asyncio.Semaphore(1)`); a second
  client is closed with status 1013 ("at capacity"). This is not designed as
  a public multi-tenant endpoint yet.
- Tuning: `WHISPER_LIVE_MODEL` / `WHISPER_LIVE_BEAM_SIZE` default to the
  batch `WHISPER_*` values; weak hosts prefer `WHISPER_LIVE_MODEL=tiny` and
  `WHISPER_LIVE_BEAM_SIZE=1`.
- Measure a recording end-to-end against Compose or a local uvicorn server:

  ```sh
  docker compose cp backend/tests/fixtures/speech-de.wav backend:/tmp/speech-de.wav
  docker compose exec -T backend python -m scripts.smoke_live /tmp/speech-de.wav
  ```

  The script streams the WAV at real-time pace and reports window latency
  (p50/p95/max): a max below ~1 s on the tiny model means the server keeps
  up with speech. Results are host-dependent; the browser sender
  (`frontend/src/features/live/transport.ts`) is not wired yet, so there is
  no end-to-end frontend measurement at this stage.

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

Use `--transcribe` to run the configured provider. The default local Whisper
model works without credentials; `ASR_PROVIDER=json` checks the explicit
deterministic demo, and `ASR_PROVIDER=deepgram` sends synthetic audio to the
paid ASR API.

## Source comparison and questions

The fact-check and question modules default to Gemini through its
OpenAI-compatible endpoint. Configure `GEMINI_API_KEY` (or `GOOGLE_API_KEY`)
and, optionally, `LLM_BASE_URL`/`LLM_MODEL` in `.env`. The test default is
`gemini-3.1-flash-lite`; use `gemini-3.8-flash` for the final pass. There is no
implicit local fallback. Web search is off by default.
[Setup, evaluation and limits](../docs/06-local-coaching.md).

The Gemini Developer API is cloud processing without EU region pinning. Send
only synthetic demo data, or use Vertex AI for EU residency. Invalid evidence
is `unchecked`, rather than a finding that evidence is absent.

Synthetic real-model integration check:

```sh
docker compose exec -T backend python - < backend/scripts/smoke_gemini.py
docker compose exec -T backend python - < backend/scripts/smoke_coaching.py
```

This checks `/factcheck`, `/questions` and `/questions/answers` and removes
its synthetic source and result objects. No general accuracy claim follows.

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
recording → FFmpeg 16 kHz WAV → Transcriber → words {word, start_ms, end_ms}
  → text + events: filler (incl. repetition) | pause | pace   (source "asr")
```

- `Transcriber` keeps the provider exchangeable. `WhisperTranscriber` runs
  `faster-whisper` locally and maps CTranslate2 word timestamps to
  milliseconds; `DeepgramTranscriber` is the optional hosted adapter and
  `JsonTranscriber` replays demo words. `RecordingAnalysis.text` joins the
  words into a readable transcript; timestamps remain authoritative.
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
  DOCX (per paragraph and table, in document order), TXT/MD (per block of
  lines). No OCR: scanned PDFs without a text layer fail with a readable
  message. Max 25 MB (`SOURCE_MAX_BYTES`).
- `collection_id` is generated by the client (one per browser in the
  frontend) and groups the sources of a presentation. There is no login.
- Chunks: ~1200 characters, split at sentence boundaries with ~200 characters
  overlap. Pages, slides and tables are never merged, so every passage cites
  exactly one page, slide or table (`location: {kind, start, end}`).
- Embeddings: `jinaai/jina-embeddings-v2-base-de` (German/English, Apache-2.0)
  via FastEmbed/ONNX on the CPU, inside API and worker. The pinned revision is
  baked into the image; no text leaves the server. `Embedder` keeps the model
  exchangeable; `EMBEDDING_PROVIDER=none` runs keyword-only search.
  Each process loads the model on first use (~0.6 GB RAM).
- Search: cosine similarity (pgvector) and German full-text search, merged by
  reciprocal rank fusion. Keywords catch exact figures such as "260.000".
  `similarity` is the raw cosine value, not a calibrated probability;
  `retrieval_score` is a rank-fusion signal. Vector-only hits below
  `SOURCE_WEAK_SIMILARITY` (default 0.30) are marked `weak`. Search always
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
- Default model: Gemini via `POST {LLM_BASE_URL}/chat/completions`
  (OpenAI-compatible). Configure `LLM_BASE_URL`, `LLM_MODEL` and
  `GEMINI_API_KEY`/`GOOGLE_API_KEY` in `.env`; `LLM_API_KEY` wins if set.
  `LLM_JSON_MODE=false` for servers without `response_format=json_object`;
  `LLM_TEMPERATURE` stays unset unless the model accepts it. Calls are not
  retried (they may be billed); `LLM_CONCURRENCY` claims are judged in parallel.
- Web search (`WEB_SEARCH_PROVIDER`): `wikipedia` (optional, MediaWiki API, no
  key, `WEB_SEARCH_LANGUAGE=de`), `tavily` (`TAVILY_API_KEY`) or `none` (default). Only
  search APIs, no HTML scraping. The client can switch it off per request
  (`use_web=false`).
- Third parties: transcript sentences go to the LLM host; short search queries
  go to the web provider. The review UI names both before the check starts.
- Limits (`FactCheckConfig`, returned with every result): 6 claims, 5 upload
  passages and 4 web passages per claim. Not tuned; quality of claim
  extraction and judgments depends on the chosen model and is not measured.

Tests: `tests/test_factcheck.py` (scripted model answers, HTTP contracts for
the OpenAI-compatible API and Wikipedia, task redelivery). A full run through
the Compose stack needs a configured model; see the AI decision log entry for
the end-to-end check with a deterministic stand-in model.

### Question simulator (`app/questions/`, `/questions`)

Asks follow-up questions after the talk and compares typed answers with the
sources. Input is the transcript plus the fact-check findings of the same
recording; it uses the same Gemini model as the fact-check.

```
POST /questions {words, collection_id?, claims[]} → S3 question-jobs/{id}/request.json
  → Celery generate_questions:
      words → numbered sentences; findings and related upload passages numbered
      LLM: questions referencing finding, sentence and passage numbers
      code: t_ms/evidence from the references; `contradiction`/`unsupported`
            only with a matching finding, `gap` only with a verbatim quote
  → status.json (questions + `question` events), request.json deleted
GET /questions/jobs/{id}
POST /questions/answers {round_id, question_id, answer} → S3 answer-jobs/{id}/
  → Celery review_answer: question evidence + hybrid search (query + answer)
      → LLM verdict with verbatim quote (quote_in_text) + optional follow-up
GET /questions/answers/{id}
```

- Kinds, asked in this order: `contradiction`, `unsupported`, `gap`,
  `clarification`; `follow_up` comes from an answer review. Questions without
  a source or spoken passage behind them are dropped.
- Questions with a spoken passage are `question` events (`source="agent"`):
  `contradiction` → `warning`, `unsupported` → `hint`, otherwise `info`.
  `gap` questions concern the whole talk (`t_ms: null`) and are no events.
- Answer verdicts reuse the fact-check ones (`supports`, `contradicts`,
  `not_found`, `unchecked`). No points, scores or grades.
- Answers are typed text only (no speech input); the review UI hides the
  source passage until an answer was compared, so the question does not give
  the answer away.
- Third parties: transcript sentences, findings, upload passages and the typed
  answer go to the LLM host. Stored requests (transcript, answer text) are
  deleted after the job finishes.
- Limits (`QuestionConfig`): 3 questions, 6 upload passages for gaps, 5 per
  answer review. Not tuned; question quality depends on the model.

Tests: `tests/test_questions.py` (scripted model answers, reference checks,
API and task redelivery).

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
- `python -m scripts.smoke`: checks readiness, FFmpeg,
  a database round trip, synthetic S3 upload/read/range/delete and
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

### ElevenLabs question practice

The web review supports a source-grounded ElevenLabs conversation and typed
questions with four presentation contexts. Configure `ELEVENLABS_API_KEY` and
`ELEVENLABS_AGENT_ID` server-side; set the agent's saved First message to
"Ich habe noch ein paar Fragen. Bist du bereit?" and enable both System prompt
and First message overrides. The agent waits for readiness before asking about
the presentation.
`GET /questions/agent/settings` reports configuration presence. Context preparation
is queued through `POST /questions/agent`, polled at `/questions/agent/jobs/{id}`.
`POST /questions/agent/session` issues an uncached signed WebSocket URL. It does
not require Gemini. Typed questions use the configured LLM (Gemini by default);
transcript, retrieved passages and typed answers are sent to that provider.
Setup, privacy, retention and verification limits: [Review and agent](../docs/07-review-and-agent.md).

## Synthetischer Datenbank-Seed

Drei feste Beispiel-Sessions mit je einem Take, vorberechneten Wort-Timestamps,
daraus abgeleiteten ASR-Events und einer Template-Review einspielen:

```sh
docker compose up -d postgres
docker compose run --rm --no-deps -v ./backend/scripts:/app/scripts:ro backend python -m scripts.seed_demo
```

Von der Repository-Wurzel ausführen; das lokale Backend-Image muss vorhanden sein
(`docker compose build backend`). Alternativ aus `backend/` mit gesetzten
`POSTGRES_*`-Variablen: `python -m scripts.seed_demo`.

Der Seed schreibt in die bestehenden Tabellen `sessions`, `takes`, `events`,
`reviews` und `jobs`. Er verwendet feste UUIDs, eine Transaktion und einen
Advisory Lock. Erneute Aufrufe überspringen vorhandene Seed-Sessions vollständig;
auch manuelle Änderungen daran bleiben erhalten. Andere Daten werden nicht
verändert oder gelöscht. Die Ausgabe nennt Session-/Take-IDs und Review-Pfade.
Es werden keine Medien hochgeladen, keine Modelle aufgerufen und keine Scores
angelegt. Titel, `syntheticDemo` und Review-Hinweise kennzeichnen die Daten als
synthetisch; nicht gemessene Pose-Coverage bleibt unbekannt.

Lesbar über `GET /api/sessions/{sessionId}` und
`GET /api/takes/{takeId}/timeline` bzw. `/review`. Das bestehende Web-Studio nutzt
weiterhin den Browser-Arbeitsbereich und die ältere Audio-Job-API; der Seed
legt deshalb keine lokalen Videos oder Frontend-Aufnahmen an.

## Synthetischer Fortschritts-Seed für UI-Tests

Ein festes Profil mit 24 Takes (20 auswertbar, 4 zu kurz), Wort-Timestamps,
Pose-/Sprach-/Fact-Check-Events und vier Zielen einspielen:

```sh
docker compose run --rm --no-deps -v ./backend/scripts:/app/scripts:ro backend python -m scripts.seed_progress_demo
```

`--reset` löscht nur dieses Seed-Profil samt Sessions und legt es neu an.
Die Ausgabe enthält `profileId`, den lokalen `pp_`-Token und den fertigen
`localStorage`-Eintrag `pitchcoach.progress-profile.v1`. Damit lässt sich die
Seite `/progress` ohne Profil-Erstellung direkt gegen die Datenbank testen.
Alle Werte sind synthetisch (Seed-Version `synthetic-progress-seed.v1`), die
Takes heißen entsprechend und tragen einen Hinweis; es werden keine Medien
hochgeladen und keine Modelle aufgerufen.
