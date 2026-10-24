# Pitch Coach

Pitch rehearsal built from `../Pitch_Coach_Frontend_Plan.md`, with two connected entry points: a deterministic sample rehearsal, and a camera workspace with live feedback, stats, video playback and feedback-section replay.

## Run

From the repository root, start Docker and create `.env` from `.env.example`
once, then:

```sh
docker compose up --build -d --wait
```

This starts the frontend and backend services together. Open
<http://localhost:3000>. Source changes in `frontend/src/` reload automatically;
rebuild after changing dependencies or configuration. The container keeps
dependencies in its image and Next.js output in a Docker volume.

Browser requests to `/api/...` are forwarded by Next.js to
`http://backend:8000/...` inside Compose. For example,
<http://localhost:3000/api/health/ready> checks the backend connection.
`API_INTERNAL_URL` is server-side configuration; local npm development defaults
to `http://localhost:8000`. Compose sets `NEXT_PUBLIC_API_URL=/api`, so the
browser uses its current origin and the container handles the internal hostname.

Optional local frontend development requires Node 22.12+ and npm. Run from the
monorepo root; dependencies and the lockfile are shared:

```sh
npm ci
npm run dev
```

Open http://localhost:3000 and choose **Try sample demo**. No credentials, microphone, camera, backend, or hosted services are needed. Production: `npm run build` then `npm start`.

## Camera, stats and replay

Open http://localhost:3000/live or choose **Open camera studio** from setup.

1. Enable the camera preview, then **Record with demo feedback**. This records actual silent video while scripted feedback markers appear in the first ten seconds. No upload runs in local demo mode; pose logging is a separate optional action.
2. Choose **Finish & review** for recording stats, feedback frequencies, optional backend measurements and a video player.
3. Choose **Rewatch feedback sections** to filter by category, seek to a feedback moment, loop the surrounding section, or watch the full take.
4. Download before refreshing or leaving the live workspace. Recordings are held in browser memory only.

For real audio analysis, choose **Backend · audio analysis after recording**, enable the camera and microphone, then **Record & analyze audio**. The API URL is `/api` in Compose and defaults to `http://localhost:8000` for local npm development (`NEXT_PUBLIC_API_URL` overrides it). The browser checks `/health/ready` for service status and `/health/live` before capture. After stopping it uploads the complete recording to `POST /speech/analyze` with `transcribe=false`, then polls `/speech/jobs/{job_id}` until completed or failed. Feedback and measurements appear in review. No partial MediaRecorder chunks are uploaded. Failed analysis preserves the local recording.

This UI uses local Silero/RMS/YIN analysis; no paid ASR request is made. Speak normally during the first three seconds for calibration. Polling stops after eleven minutes or on exit; each HTTP request has a two-minute timeout.

In backend review, optionally upload a JSON array of `{word,start_ms,end_ms}` from the same take to call `POST /transcription/analyze-words`. This endpoint analyzes existing words; it does not perform ASR. Imported timestamps must fall within the recording. When using a separate API origin, use HTTPS if the frontend is served over HTTPS and configure the backend CORS setting for the frontend origin. Compose's `/api` proxy uses the frontend origin.

Missing endpoints remain mocked in the sample rehearsal. See [the integration handoff](../docs/pitch-coach-handoff.md) for pending work. No backend implementation is part of this integration.

## Demo walkthrough

1. Continue with demo preview. The three-second countdown starts the sample.
2. Around 10 seconds, a pace cue appears. At 18 seconds, the sample claims a 50% improvement.
3. End pitch. The judge quotes that exact claim.
4. Start answer, select **Vague answer**, and submit. The follow-up challenges the missing measurement.
5. Finish Q&A. Select a finding’s timestamp to inspect the transcript.
6. Choose **Try a focused retry**. The original claim is carried forward as judge context in a new attempt.
7. Select **Direct answer** to compare the actual sample texts. No overall score or measured learning improvement is invented.

The **Demo controls** disclosure offers next event, Q&A/review jumps, speed, pause/resume, restart, interruption, and a failure of the next command. One scenario is intentionally supported: Viva’s hackathon pitch. A jump replays its prerequisite events; restarting preserves completed reports. Start new practice creates a separate session.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

Unit tests exercise the sample session lifecycle and the live protocol, feedback validation, ordering, clip ranges, backpressure and cancellation. Playwright checks both journeys at 1366px and 375px, including generated camera video, actual MediaRecorder playback, an HTTP analysis harness, recovery, overflow and camera cleanup. Screenshots and failure traces go to ignored `frontend/test-results/`.

## Boundaries

- Next.js App Router + strict TypeScript + Tailwind, local shadcn-style Radix primitives, Lucide icons. Dependency versions are locked in the root `package-lock.json`.
- `src/features/coach/contracts.ts` is the adapter contract.
- `SessionProvider` owns the subscription and exposes `useCoachSession`; UI components issue commands, never schedule the scenario.
- `reducer.ts` handles normalized events, sequence/ID deduplication, transcript upserts, metric patches, cues, evidence selection, and reports.
- `mock/MockCoachGateway.ts` is the only fixture consumer. Its monotonic clock freezes during pauses; cleanup stops subscription timers.
- `session-repository.ts` stores synthetic setup and report data in this browser tab’s `sessionStorage`. Refresh restores completed reports and offers a restart for an interrupted active attempt.
- `useCameraPreview.ts` requests video only for demos and video plus microphone audio for backend mode, on an explicit user action. Tracks stop on exit; late permission results are immediately released. Preview alone does not record or upload; the live workspace has a separate explicit recording action.
- `features/live/recorder.ts` owns actual capture, monotonic timestamps and local video. `transport.ts` keeps demo markers local and uploads complete takes for backend audio analysis. `LiveSessionProvider` owns in-memory recordings and releases object URLs on exit.

`NEXT_PUBLIC_COACH_GATEWAY` applies only to the sample rehearsal and defaults to `mock`. Selecting anything else shows a configuration error. Never put provider credentials in a public variable. The sample judge/transcript integration is separate from the video contract; see [the integration handoff](../docs/pitch-coach-handoff.md).

## Design and limitations

Mobbin MCP references and their specific design influence are recorded in [DESIGN.md](DESIGN.md). Setup, studio, judge, review, and comparison use the plan’s neutral/blue palette and explicitly label simulated coaching.

In the sample rehearsal, custom title, context, audience, mode, duration, and focus areas are retained; **they do not generate new analysis**. Its metrics and questions remain fixtures; timestamps select transcript evidence. The camera workspace instead replays actual captured video and clearly labels the source of feedback. Scripted markers are not assessments. No accounts, persistent recording history, PDF parser, live AI, deployment, or actual human-performance evaluation is included.

Real camera hardware, Safari/iOS behavior, and a public deployment still require acceptance in the actual presentation environment.

## Local pose data capture

The camera studio has an independent **Start pose capture** action. It uses a
local MediaPipe worker; stop to download the raw JSONL. Starting a recording
resets the preview log and anchors it to video start; its log remains downloadable
in review. Download preview data before starting a take if you want to keep it.
Pose samples never go to the backend and do not replace scripted feedback.
All points, heuristics, null handling and limits are documented in
[DATA_POINTS.md](DATA_POINTS.md). Model/runtime failures leave recording available.

`npm ci` installs the pinned runtime; `npm run dev` and `npm run build` prepare its
static assets automatically. Deploy `public/pose` with the frontend. The official
Lite model version 1 is included; provenance is in `public/pose/README.md`.

