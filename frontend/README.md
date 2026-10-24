# Pitch Coach frontend

Start the full stack using the [root README](../README.md), then open
<http://localhost:3000>. Changes in `frontend/src/` reload automatically;
rebuild after changing dependencies or configuration.

## Use

- **Recording dashboard** (`/`, also `/stats-preview`): counts, durations and
  observations from takes actually captured in the current browser workspace.
  Before the first recording it shows an empty state. There are no fixed demo
  statistics, quality scores or simulated monthly progress. Video remains in memory.

- **418 review analysis** (`/review-preview`): a clearly labelled synthetic
  90-second video with timestamped example notes and sources, without synthetic
  scores or a performance curve. The matching `/live/[sessionId]/analysis` view
  uses the actual recording and feedback events. Click a marker or the timeline
  to seek; the slider supports keyboard seeking. Selected sections play with
  ±2 seconds of context and optional looping. Criterion buttons filter moments.
  Fact-check results supply transcript quotes and source excerpts.

- **418 loading preview** (`/loading-preview`): system typography, a small wordmark
  and an announced status with a subtle activity dot. The reusable
  `LoadingScreen` also supplies the App Router loading fallback (`app/loading.tsx`).
  Mount it during pending work with an optional `label`; no simulated percentage
  or artificial delay. Appearance follows the system; reduced motion stops the dot.

- **Sample demo** (`/demo`): deterministic rehearsal, sample transcript, judge questions
  and review. Works without camera, microphone or backend credentials.
- **Monitoring studio** (`/` and `/live`): navigation and settings are visible by default; **Large view** is optional. Choose **Enable camera**, then **Start recording**. Local gesture observations replace scripted markers; hold a neutral position for 3 seconds first.
- **See gestures in 22 seconds** (`/gestures`): synthetic walkthrough using the real observation rules.
- **Speech analysis:** **Live · in browser** is the default, with local microphone
  hints for pauses, volume, pitch variation and speaking rhythm. **Off · gestures
  only** uses no microphone. **Live + full backend analysis** adds the server's
  Silero/RMS/YIN signal stream and uploads the take after stopping. Calibration
  waits for about three seconds of voiced speech; startup silence and unpitched
  room noise do not count. The voice reference then adjusts slowly while you speak
  and stays fixed during pauses. A new recording calibrates afresh. Transcription is on by default within backend
  mode, with Deepgram EU streaming enabled (requires a server-side API key).
  Completed stream words are reused in review; otherwise local Whisper runs
  after stopping. Turn transcription off for signal analysis only. The batch
  fallback uses `local_only=true` to prevent an unintended hosted ASR provider.
- **Analysis features:** choose Lite/Heavy, VIDEO/IMAGE and individual speech
  feedback types. **Track fingers** is independent of the diagnostic **Pose lab**.
  Filler words and word-based pace require the transcript after stopping.
- **Source review and questions:** upload sources under `/sources`, then in a
  recorded take choose **Check facts**. Local Ollama selects claims,
  compares retrieved passages. **Start question round** asks follow-up questions;
  enter a text answer to compare it with the sources. Quotes are verified against retrieved text.
  [Setup, evaluation and limits](../docs/06-local-coaching.md).
- **Rewatch feedback sections:** seek to a marker, loop the surrounding section,
  or play the full take. Backend review also accepts word-timestamp JSON from
  the same take for `/transcription/analyze-words`; this import does not run ASR.
  Automatic words are clickable for replay. Replacing the transcript clears
  stale fact findings, questions and answers from the browser review.

Recordings stay in browser memory for replay; download before refreshing or
leaving the workspace. Backend mode uploads the complete take after stopping
and retains analysis results in S3; original uploads are deleted after terminal
processing. See [storage behavior and limits](../backend/README.md).
Failed analysis preserves the local recording. Sample findings are simulated.

## Local pose capture

Landmarks and logging start automatically with the camera. A local MediaPipe
worker draws visible pose/finger points and skeleton connections over the mirrored
video in standard and large views. Low-confidence points are hidden. The overlay
is preview-only and is not burned into recordings.

Turn the camera off to **Download pose JSONL**. Starting a take resets the preview
log and anchors it to video start; the take's log is also available in review.
Download preview data before starting a take to keep it. The log is limited to
3,000 samples; landmarks keep updating after that limit. Samples stay local. Calibrated, sustained gesture/posture observations use the
same recording clock and can be exported as evidence JSON from review.
[How and why we evaluate](../docs/04-gesture-evaluation.md) · [Jury runbook](../docs/05-jury-demo.md).

[Data points and heuristics](DATA_POINTS.md) · [Model provenance](public/pose/README.md).
`npm run dev` and `npm run build` prepare the runtime assets automatically;
deploy `public/pose` with the frontend. Model failures leave recording available.

## Backend connection

Compose sets `NEXT_PUBLIC_API_URL=/api`. Next.js forwards requests to
`API_INTERNAL_URL=http://backend:8000`; the browser uses its current origin.
Upload and polling endpoints are described in the [integration handoff](../docs/04-integration.md).

For optional local frontend development, install Node.js 22.12+ and run from
the repository root:

```sh
npm ci
npm run dev
```

The browser defaults to `/api`; Next.js forwards to `http://localhost:8000`
outside Compose. To override it, copy
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

[Design notes](DESIGN.md) · [Implementation decisions](../docs/02-ai-decision-log.md).
The user confirmed three camera gestures. Safari/iOS and microphone transcription
still need physical-device acceptance; public deployment is outside the local demo scope.

## Native app

The [React Native companion](../mobile/README.md) supports iPhone, iPad and Android,
including native on-device pose capture. Run `npm run mobile:ios` or
`npm run mobile:android` from the repository root to build a development client.
Expo Go cannot load its native pose modules.

## Backend timestamp alignment

Backend transcript timestamps may differ from the browser clock by up to 250 ms
at the end (the same allowance used by live captions). The adapter bounds those
words to the recorded duration and adds a notice. Imported word timestamps remain
strict. If a transcript is malformed or exceeds that allowance, the review still
receives the completed audio findings and measurements, alongside the error.
