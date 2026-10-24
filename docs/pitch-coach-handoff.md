# Pitch Coach integration handoff

## Camera and audio review

The `/` and `/live` workspace uses HTTP and WebSocket endpoints through the same-origin `/api` proxy in local development and Compose. `frontend/src/features/live/transport.ts` implements the local capture transport
and `AnalysisTransport`; `contracts.ts` defines their shared interface.

| Backend endpoint | Frontend use |
| --- | --- |
| `GET /health/ready` | Display dependency readiness |
| `GET /health/live` | Check API availability before capture |
| `POST /speech/analyze` | Upload the complete camera/microphone recording after stop, with the transcript checkbox (default on in speech mode) and `local_only=true`; returns 202 and a job ID |
| `GET /speech/jobs/{job_id}` | Poll queued/running jobs until completed or failed; use returned audio measurements and timeline events |
| `WS /speech/live` | Optional live-caption preview: 16 kHz mono Int16 PCM from AudioWorklet; connection failure leaves recording active |
| `POST /transcription/analyze-words` | Analyze an optional JSON import of `{word,start_ms,end_ms}` from the same take |

No individual MediaRecorder chunks are uploaded. All feedback times are relative
to recording start; HTTP responses are validated in `analysis.ts` before display.
Each request has a two-minute timeout; job polling stops after eleven minutes or
on exit. Failed analysis preserves the local recording and reports an error.
It does not substitute sample findings. Speech analysis is selected above the camera; local Whisper transcription is enabled by default within that mode. The recorded words, provider, synthetic-data flag and notices reach the review. [Backend details](../backend/README.md).

Replay uses the full take held in browser memory, with two seconds of context
around a selected marker. Download before refreshing or closing the tab. The
backend stores queued uploads and results in S3 and deletes originals after
terminal processing; there are no event clips or persistent session history yet.

Pose capture and calibrated gesture observations run locally in a MediaPipe worker/browser and export JSONL/evidence JSON without
sending landmarks to the backend. Preview and recording logs use separate time
anchors; a take resets the preview log. The recording log remains downloadable
in review. [Data points and heuristics](../frontend/DATA_POINTS.md).

Live captions use `features/live/captions.ts` and `public/audio/pcm-worklet.js`, enabled explicitly under Recording options. Caption text is a provisional preview; complete-recording ASR supplies review timestamps. Stop, cancellation and unmount close audio resources and the socket. The backend supports one live session per API process.
[Quickstart for integration](./04-integration.md).

## Sample transcript and judge flow

Replace the adapter in `frontend/src/features/coach/gateway.ts` to connect the
sample rehearsal to real services. Screens consume `useCoachSession`. The
factory currently returns `MockCoachGateway`; a live adapter must hide or replace
the sample controls and validate external input before dispatching events.

- Contracts: `frontend/src/features/coach/contracts.ts`.
- Deterministic presentation and answer fixtures: `mock/fixtures/scenario.ts`.
- Event-derived reports and question branches: `mock/MockCoachGateway.ts`.
- `atMs` is active attempt time; pause freezes it. It is not mapped to a recording.
- Keep one increasing sequence per attempt; reject wrong-session, wrong-attempt,
  duplicate and late-turn events. Higher transcript revisions replace partials.
- Missing metrics stay null. Retry preserves previous evidence as judge context,
  without attributing it to a new user recording. Storage failure leaves the
  in-memory sample usable.

Real local gesture/posture rules now feed live hints, evidence export and review
markers (`features/pose/evaluation.ts`). The separate `/gestures` walkthrough
runs these rules on explicitly synthetic landmarks. Eye contact is not inferred.
Source upload and hybrid retrieval are implemented at `/sources`. The live review connects transcript-backed fact-checks, source-based questions, typed answers and spoken answers to the backend. Ollama is the default language-model provider; the separate `/demo` flow remains explicitly synthetic. Session persistence, presigned uploads
and event-clip retrieval are also pending. Keep these boundaries visible when
connecting new services; no fabricated scores or model results.

## Native companion (phones and iPad)

[`mobile/`](../mobile/README.md) is an Expo/React Native development client with
native camera/audio recording, on-device MediaPipe pose capture, JSONL/video
sharing and timestamp review. It uses the existing HTTP analysis endpoints above;
questions and sample reports reuse `MockCoachGateway`. No backend implementation
is added by this client. Native pose logs explicitly mark recording-request timing
as approximate, and take files are temporary local cache data. See the mobile
README for build commands, validation and remaining device checks.


Native integration now covers custom setup, pause/finish/recovery, focused retries,
comparison reports, and the source library. Both platforms reuse source request
functions and contracts, pose visibility/geometry/cues, event mapping, the mock
gateway and reducer. Native source collections persist per API address; the web
Sources page exposes a collection ID that can be opened on native and vice versa.
This shares server documents, not camera recordings or practice history. Missing
session/clip/fact-check/question APIs remain explicit rather than being invented.
