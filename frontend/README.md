# Pitch Coach frontend

Start the full stack using the [root README](../README.md), then open
<http://localhost:3000>. Changes in `frontend/src/` reload automatically;
rebuild after changing dependencies or configuration.

## Use

- **418 loading preview** (`/loading-preview`): white background, #42ff8c rotating
  Three.js disc and locally hosted Noto Serif Display. The reusable
  `LoadingScreen` also supplies the App Router loading fallback (`app/loading.tsx`).
  Mount it during pending work with an optional `label`; no simulated percentage
  or artificial delay. Reduced motion and unavailable WebGL use a static logo.

- **Try sample demo:** deterministic rehearsal, sample transcript, judge questions
  and review. Works without camera, microphone or backend credentials.
- **See gestures in 22 seconds** (`/gestures`): synthetic skeleton walkthrough
  using the real observation rules; no camera or API needed.
- **Open camera studio** (`/live`): enable the camera, then **Record with gesture
  feedback**. Hold a neutral position for 3 seconds, then follow the movement guide.
  Real local observations appear live and become replay markers. No scripted
  findings are attached to your recording.
- **Local server · speech analysis and transcript:** enable camera and microphone,
  then **Record & analyze audio**. Speak normally for the first three seconds
  of calibration. After stopping, local Silero/RMS/YIN analysis runs in Celery;
  feedback and measurements appear in review. Local Whisper transcription is on
  by default; turn it off for signal analysis only. `local_only=true` prevents
  a hosted or synthetic ASR provider from silently replacing local Whisper.
- **Source review and questions:** upload sources under `/sources`, then in a
  recorded take choose **Compare with my sources**. Local Ollama selects claims,
  compares retrieved passages and asks follow-up questions. Enter a text answer
  to compare it with the sources. Quotes are verified against retrieved text.
  [Setup, evaluation and limits](../docs/06-local-coaching.md).
- **Rewatch feedback sections:** seek to a marker, loop the surrounding section,
  or play the full take. Backend review also accepts word-timestamp JSON from
  the same take for `/transcription/analyze-words`; this import does not run ASR.
  Automatic words are clickable for replay. Delete a source review before
  replacing its transcript so old verdicts cannot attach to new words.

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
3,000 samples; landmarks keep updating after that limit. Samples stay local. Calibrated, sustained gesture/posture observations use the
same recording clock and can be exported as evidence JSON from review.
[How and why we evaluate](../docs/04-gesture-evaluation.md) · [Jury runbook](../docs/05-jury-demo.md).

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
The user confirmed three camera gestures. Safari/iOS and microphone transcription
still need physical-device acceptance; public deployment is outside the local demo scope.

## Native app

The [React Native companion](../mobile/README.md) supports iPhone, iPad and Android,
including native on-device pose capture. Run `npm run mobile:ios` or
`npm run mobile:android` from the repository root to build a development client.
Expo Go cannot load its native pose modules.
