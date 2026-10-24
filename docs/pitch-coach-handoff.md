# Pitch Coach integration handoff

## Camera and audio review

The `/live` workspace uses HTTP endpoints through the same-origin `/api` proxy
in Compose. `frontend/src/features/live/transport.ts` implements the local demo
and `AnalysisTransport`; `contracts.ts` defines their shared interface.

| Backend endpoint | Frontend use |
| --- | --- |
| `GET /health/ready` | Display dependency readiness |
| `GET /health/live` | Check API availability before capture |
| `POST /speech/analyze` | Upload the complete camera/microphone recording after stop, with `transcribe=false`; returns 202 and a job ID |
| `GET /speech/jobs/{job_id}` | Poll queued/running jobs until completed or failed; use returned audio measurements and timeline events |
| `POST /transcription/analyze-words` | Analyze an optional JSON import of `{word,start_ms,end_ms}` from the same take |

No individual MediaRecorder chunks are uploaded. All feedback times are relative
to recording start; HTTP responses are validated in `analysis.ts` before display.
Each request has a two-minute timeout; job polling stops after eleven minutes or
on exit. Failed analysis preserves the local recording and reports an error.
It does not substitute sample findings. Backend ASR is optional through the API
and is not selected by this UI. [Backend details](../backend/README.md).

Replay uses the full take held in browser memory, with two seconds of context
around a selected marker. Download before refresh or leaving `/live`. The
backend stores queued uploads and results in S3 and deletes originals after
terminal processing; there are no event clips or persistent session history yet.

Pose capture runs locally in a MediaPipe worker and exports JSONL without
sending landmarks to the backend. Preview and recording logs use separate time
anchors; a take resets the preview log. The recording log remains downloadable
in review. [Data points and heuristics](../frontend/DATA_POINTS.md).

The old video WebSocket prototype has been removed. Live audio transcription
exists as a [running backend prototype](../backend/app/transcription/README.md)
(`WS /speech/live`, local Whisper); the browser sender is not wired.
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

Pose/gesture/gaze feedback rules, source ingest/fact-check, judge questions and
answer evaluation still use sample data. Session persistence, presigned uploads
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
