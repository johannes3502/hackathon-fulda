# Pitch Coach frontend

Start the full stack using the [root README](../README.md), then open
<http://localhost:3000>. Changes in `frontend/src/` reload automatically;
rebuild after changing dependencies or configuration.

## Use

- **418 review analysis** (`/review-preview`): synthetic 90-second video, four
  criteria and an interactive performance graph with timestamped positive,
  practice and factual notes. Click a marker or the graph to seek; the slider
  supports keyboard seeking. Play a selected section with ±2 seconds of context,
  optionally looping. Criterion buttons filter moments, not the overall curve.
  The stats-card demo links here. A matching view at `/live/[sessionId]/analysis`
  is linked from live review and uses the actual recording and feedback events.
  Completed fact-check results also supply transcript quotes and source excerpts
  to its annotation panel (including links for web evidence).
  Live scores/curves stay unavailable until a scoring pipeline exists; scripted
  feedback on real recordings is explicitly disclosed. Video remains in memory.

- **418 stats card**: on the start page and at `/stats-preview` (with replay).
  Animated Three.js ring, 2×2 criteria, count-up and subtle pointer tilt.
  `StatsCard` accepts `gesture`, `knowledge`, `flow`, `structure` values from
  1–100; the overall value is their rounded arithmetic mean. Invalid or missing
  values produce an unavailable overall value. The homepage currently passes
  explicitly labeled synthetic demo values; no backend scoring is implemented.
  Reduced motion shows final values immediately; SVG supports unavailable WebGL.

- **418 loading preview** (`/loading-preview`): white background, #42ff8c rotating
  Three.js disc and locally hosted Noto Serif Display. The reusable
  `LoadingScreen` also supplies the App Router loading fallback (`app/loading.tsx`).
  Mount it during pending work with an optional `label`; no simulated percentage
  or artificial delay. Reduced motion and unavailable WebGL use a static logo.

- **Sample demo** (`/demo`): deterministic rehearsal, sample transcript, judge questions
  and review. Works without camera, microphone or backend credentials.
- **Monitoring studio** (`/` opens `/live`): Large view opens by default. Choose **Enable camera**, then
  **Start recording** for real silent video with clearly labeled scripted markers.
- **Recording options → Backend · audio analysis after recording:** enable camera
  and microphone, then **Start recording**. Speak normally for the first three seconds
  of calibration. After stopping, local Silero/RMS/YIN analysis runs in Celery;
  feedback and measurements appear in review. This mode uses `transcribe=false`.
- **Rewatch feedback sections:** seek to a marker, loop the surrounding section,
  or play the full take. Backend review also accepts word-timestamp JSON from
  the same take for `/transcription/analyze-words`; this import does not run ASR.

Recordings stay in browser memory for replay; download before refreshing or
leaving the workspace. Backend mode uploads the complete take after stopping
and retains analysis results in S3; original uploads are deleted after terminal
processing. See [storage behavior and limits](../backend/README.md).
Failed analysis preserves the local recording. Sample findings are simulated.

## Local pose capture

Landmarks and logging start automatically with the camera. A local MediaPipe
worker draws visible pose points and skeleton connections over the mirrored
video in standard and large views. Low-confidence points are hidden. The overlay
is preview-only and is not burned into recordings.

Turn the camera off to **Download pose JSONL**. Starting a take resets the preview
log and anchors it to video start; the take's log is also available in review.
Download preview data before starting a take to keep it. The log is limited to
3,000 samples; landmarks keep updating after that limit. Samples stay local and
do not replace scripted feedback.

[Data points and heuristics](DATA_POINTS.md) · [Model provenance](public/pose/README.md).
`npm run dev` and `npm run build` prepare the runtime assets automatically;
deploy `public/pose` with the frontend. Model failures leave recording available.

## Backend connection

Compose sets `NEXT_PUBLIC_API_URL=/api`. Next.js forwards requests to
`API_INTERNAL_URL=http://backend:8000`; the browser uses its current origin.
Upload and polling endpoints are described in the [integration handoff](../docs/pitch-coach-handoff.md).

For optional local frontend development, install Node.js 22.12+ and run from
the repository root:

```sh
npm ci
npm run dev
```

The API defaults to `http://localhost:8000`. To override it, copy
`frontend/.env.example` to `frontend/.env.local`. A separate API origin needs
matching backend CORS configuration and HTTPS when the frontend uses HTTPS.

## Sources

Open `/sources` or choose **Add your sources** on setup. Upload PDF, PPTX, DOCX, TXT or MD files (synthetic content, max 25 MB). The backend extracts text per page or slide and indexes it; the page polls until each file is **Ready**. **What will the coach find?** runs the same search that fact-check and the question round will use. The browser keeps one collection ID in `localStorage`; clearing site data starts a new, empty collection.

## Checks

With Compose running:

```sh
docker compose exec frontend npm run typecheck
docker compose exec frontend npm run lint
docker compose exec frontend npm test
```

For local browser tests: `npx playwright install chromium`, then
`npm run test:e2e`. Production build: `npm run build`.

[Design notes](DESIGN.md) · [Implementation decisions](../docs/pitch-coach-ai-decision-log.md).
Real camera hardware, Safari/iOS and public deployment still need acceptance.

## Native app

The [React Native companion](../mobile/README.md) supports iPhone, iPad and Android,
including native on-device pose capture. Run `npm run mobile:ios` or
`npm run mobile:android` from the repository root to build a development client.
Expo Go cannot load its native pose modules.
