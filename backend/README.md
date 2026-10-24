# Backend development setup

Run from the repository root with Docker Desktop or Docker Engine + Compose:

```sh
cp .env.example .env
docker compose up --build -d --wait
docker compose exec backend python -m scripts.smoke
```

Keep an existing `.env` instead of overwriting it. API docs:
<http://localhost:8000/docs>. Edit `backend/app/` for automatic API reload;
restart the worker after task changes with `docker compose restart worker`.
Changes to dependencies, scripts or the Dockerfile require a rebuild.

## IntelliJ IDEA and VS Code

Open the **repository root** in either IDE. Docker must be running and `.env`
must exist as described above. Shared IntelliJ configurations are in `.run/`;
VS Code configuration is in `.vscode/`. Personal `.idea/` state stays ignored.

- **IntelliJ IDEA:** enable the **Docker** plugin, select **Docker Compose**
  in the run selector and click **Run**. It builds images and starts every
  service in `compose.yaml`: backend, Celery worker, Redis, PostgreSQL and S3 storage. The
  configuration uses the local Docker connection named `Docker`; select your
  local connection in its **Server** field if it has a different name.
  View logs and stop containers in the **Services** tool window.
- **VS Code:** run **Tasks: Run Build Task** (`Cmd+Shift+B` on macOS,
  `Ctrl+Shift+B` on Windows/Linux). The default **Compose: up** task builds
  and starts the full stack, then waits for the health checks. **Tasks: Run
  Task** also offers **Compose: stop** and **Compose: backend logs**.

No local Python SDK or virtual environment is required to start the stack.
FastAPI runs inside Docker and reloads when `backend/app/` changes. Run the
smoke command above to check the running containers.

## Components

| Component | Role | Local address |
|---|---|---|
| FastAPI + Uvicorn | API; connection helpers and health endpoints | `http://localhost:8000` |
| Celery worker | Background jobs in separate Python processes | Internal; no host port |
| Redis | Celery broker (DB 0) and temporary task results (DB 1) | Internal `redis:6379`; no host port |
| MediaPipe | Python Tasks library in the shared backend/worker image | No separate service |
| PostgreSQL | Structured data, later transcripts, timestamps and file metadata | `localhost:5432` |
| SeaweedFS | S3-compatible object storage for audio/video and uploaded files | `http://localhost:8333` |
| MediaRecorder | Browser API that produces audio/video blobs | Frontend; no container or Python dependency |
| FFmpeg | Available for converting browser recording formats when needed | Backend and worker containers |

File bytes belong in object storage; PostgreSQL can hold their object key,
MIME type, size and relation to a presentation. No product tables, recording
endpoints, inference models or analysis rules are implemented yet.

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
small status/reference values. The current `worker_probe` task is a synthetic
smoke check, with no HTTP endpoint. Transcription and job/status routes are
not implemented yet.

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

## MediaRecorder integration

The frontend will request camera/microphone access through `getUserMedia()`
and pass that stream to `MediaRecorder`. Select formats using
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
`AGENTS.md`. There is no recording/upload route, so starting the stack does
not capture or save audio, video or transcripts. The smoke check generates
silent audio and deletes it again; its temporary database table disappears
when the connection closes.

PostgreSQL, S3 and Redis use named Docker volumes. Data deliberately written during
development survives restart, recreation and `docker compose down`. There is
no automatic expiry for database records, media or queued jobs. Redis uses
AOF persistence with a one-second sync interval and no key eviction; abrupt
host failure can still lose the most recent writes. Task results expire after
one hour; the smoke check removes its result immediately. This does not define
media/transcript retention. Before implementing real recording persistence, decide
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
`pip check`, all five service health checks and the extended smoke check passed.
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
