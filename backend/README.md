# Backend development setup

Run from the repository root with Docker Desktop or Docker Engine + Compose:

```sh
cp .env.example .env
docker compose up --build -d --wait
docker compose exec backend python -m scripts.smoke
```

Keep an existing `.env` instead of overwriting it. API docs:
<http://localhost:8000/docs>. Edit `backend/app/` for automatic reload.
Changes to dependencies, scripts or the Dockerfile require a rebuild.

## IntelliJ IDEA and VS Code

Open the **repository root** in either IDE. Docker must be running and `.env`
must exist as described above. Shared IntelliJ configurations are in `.run/`;
VS Code configuration is in `.vscode/`. Personal `.idea/` state stays ignored.

| Action | IntelliJ run configuration | VS Code task |
|---|---|---|
| Build/start the full stack | `Compose - up` | `Compose: up` (default build task) |
| Stop containers, keep data | `Compose - stop` | `Compose: stop` |
| Follow API logs | `Compose - backend logs` | `Compose: backend logs` |
| Check the running Docker backend | `Backend - smoke (Docker)` | `Backend: smoke (Docker)` |

In IntelliJ, enable the **Shell scripts** plugin for these Docker commands.
They use the Docker CLI and your current Docker context. In VS Code, use
**Tasks: Run Task**. Run the full stack before invoking its smoke check.

For Python editing and local breakpoint debugging, create a Python 3.12
environment once. From the repository root on macOS/Linux:

```sh
python3.12 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements.txt
```

On Windows:

```powershell
py -3.12 -m venv backend/.venv
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
```

- **IntelliJ IDEA:** enable the Python plugin. Add `backend/.venv` as the
  Python SDK for the `hackathon-fulda` module (or select that interpreter in
  the run configuration). Mark `backend/` as a Sources Root for imports.
  Select **Backend - local FastAPI** and click **Debug**.
- **VS Code:** install the workspace's recommended Python extensions. Select
  `backend/.venv` with **Python: Select Interpreter** if it is not selected
  automatically. Choose **Backend: local FastAPI** under Run and Debug and
  press **F5**.

Both launch `scripts.dev`, which reads the root `.env`, starts PostgreSQL
and S3, stops the Docker backend to free the API port, and runs FastAPI on
localhost with the same credentials and configured ports. No secrets are
copied into IDE files. Set breakpoints in `backend/app/`; open
<http://localhost:8000/health/ready> to exercise the request path (or use your
configured `API_PORT`). The local debugger uses one process without reload;
restart it after edits.

Stopping the debugger leaves PostgreSQL/S3 running and the Docker backend
stopped. Stop the local debugger **before** running `Compose: up` / `Compose - up`
to return to the full Docker stack. The Docker smoke check requires that
backend container. FFmpeg is provided by Docker; install it separately on the
host if running media conversion code locally.

## Components

| Component | Role | Local address |
|---|---|---|
| FastAPI + Uvicorn | API; connection helpers and health endpoints | `http://localhost:8000` |
| MediaPipe | Python Tasks library inside the backend container | No separate service |
| PostgreSQL | Structured data, later transcripts, timestamps and file metadata | `localhost:5432` |
| SeaweedFS | S3-compatible object storage for audio/video and uploaded files | `http://localhost:8333` |
| MediaRecorder | Browser API that produces audio/video blobs | Frontend; no container or Python dependency |
| FFmpeg | Available for converting browser recording formats when needed | Backend container |

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

## Speech analysis (`app/speech/`)

Post-upload speech features from word timestamps (Feature 3 in `AGENTS.md`):

```
recording (WebM/MP4) → FFmpeg 16 kHz mono WAV → Transcriber → words
  → analyze_words → summary + events (type pause | filler | pace, source speech)
```

- `Transcriber` protocol: `transcribe(audio_path) -> [Word(word, start_ms, end_ms)]`.
  The ASR provider is still open; `JsonTranscriber` replays precomputed words
  (demo session / tests).
- Pauses: gap between words ≥ `pause_min_ms`; payload marks whether it falls
  mid-sentence (only meaningful if the ASR returns punctuation).
- Fillers: configurable token list (still open, see `docs/01-product.md`).
  Repetitions ("ich ich") are `filler` events with `payload.kind = "repetition"`.
- Pace: words per minute per window, excluding long pauses, relative to the
  session's own median; adjacent windows with the same direction are merged.
- All thresholds live in `SpeechConfig`, are unvalidated heuristics and are
  returned in `heuristics` so the UI can label them. No scores.
- `POST /speech/analyze` with `{"words": [...], "config": {...}}` runs the
  analysis on given words and stores nothing. Persisting events, the upload
  route and clip cutting are not implemented yet.

Volume and pitch are analysed live in the browser (planned, not here).

Tests (synthetic data only), from `backend/`:

```sh
.venv/bin/python -m pip install -r requirements-dev.txt
.venv/bin/python -m pytest tests
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

Both services use named Docker volumes. Data deliberately written during
development survives restart, recreation and `docker compose down`. There is
no automatic expiry. Before implementing real recording persistence, decide
and document consent, retention, session deletion and cleanup of both files
and database references in `docs/01-product.md`.

```sh
docker compose logs -f backend
docker compose down
```

To intentionally erase **all local database and media data** for this project:

```sh
docker compose down --volumes
```

Changing `POSTGRES_PASSWORD` in `.env` does not change an already initialized
database password. Change it in PostgreSQL too, or reset the volumes only if
their contents are disposable.

## Checks and limits

- `/health/live`: API process responds, independent of storage availability.
- `/health/ready`: executes a PostgreSQL query and authenticates to the S3
  bucket; returns HTTP 503 with the failing dependency marked unavailable.
- `python -m scripts.smoke`: checks readiness, MediaPipe Tasks imports,
  FFmpeg, a database round trip, synthetic S3 upload/read/range/delete and
  rejection of anonymous object access.
- This does not verify live tracking, transcription, a model/API fallback,
  browser recording, physical devices or a deployment. Those remain work
  for the vertical slice. Dependency failures do not produce fake feedback.

Verified locally on 24.10.2026 with Docker Desktop on ARM64: image build,
`pip check`, all three service health checks and the smoke check passed.
Additional lifecycle checks confirmed HTTP 503 during either dependency's
outage, recovery after restart, and persistence of a test database row and
S3 object across recreation of all containers. Test fixtures were removed.

## References

- [FastAPI Docker setup](https://fastapi.tiangolo.com/deployment/docker/)
- [MediaPipe Python setup](https://developers.google.com/edge/mediapipe/solutions/setup_python)
- [MediaPipe package and platform wheels](https://pypi.org/project/mediapipe/1.1.1/)
- [SeaweedFS quick start](https://github.com/seaweedfs/seaweedfs#quick-start)
- [PostgreSQL Docker image and volume location](https://hub.docker.com/_/postgres)
- [MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [Microphone/camera secure contexts](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [IntelliJ shared run configurations](https://www.jetbrains.com/help/idea/run-debug-configuration.html)
- [IntelliJ shell run configurations](https://www.jetbrains.com/help/idea/run-debug-configuration-shell-script.html)
- [VS Code Python debugging](https://code.visualstudio.com/docs/python/debugging)
