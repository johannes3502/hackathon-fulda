## Current endpoint integration (2026-10-24)

The camera workspace now uses the existing REST endpoints. This section supersedes any proposed WebSocket integration below; no WebSocket service exists in the backend.

| Endpoint | Frontend use |
| --- | --- |
| `GET /health/live` | Before backend recording starts |
| `GET /health/ready` | Backend service status; unavailable storage does not block stateless analysis |
| `POST /speech/analyze` | Complete camera/microphone recording after stop; events and measurements in review |
| `POST /transcription/analyze-words` | Optional timestamped transcript JSON import in backend review |

### Still needed — keep mocks until these services exist

- Audio-to-text / ASR with word timestamps: the sample transcript stays mocked. Word analysis is not ASR.
- Pose capture now runs locally in the camera studio and exports JSONL (see `frontend/DATA_POINTS.md`). Pose/gesture/gaze feedback rules are still pending; local demo markers stay explicitly scripted.
- Source upload/ingest and fact-check API: sample evidence and fact-check findings stay mocked.
- Question simulator / answer evaluation API: sample judge and follow-up responses stay mocked.
- Session persistence, presigned upload, asynchronous jobs/status, event-clip retrieval: local browser replay remains temporary; no backend routes are invented.

Do not present mocked findings as observations about a live recording. Backend audio failures retain the user's video and show an error, without silently substituting mock results. The default sample path remains deterministic and available without any backend.

---

# Pitch Coach frontend handoff

2026-10-24 · Source: `Pitch_Coach_Frontend_Plan.md` and the implemented TypeScript contracts.

## Integration seam

The frontend now lives in the root `frontend/` npm workspace. The new `/live` camera, stats and video replay flow has its own [replaceable video protocol](live-camera-protocol.md). This document describes the original sample transcript/judge flow.

Replace the sample adapter in `frontend/src/features/coach/gateway.ts`. Keep screens consuming `useCoachSession`. The current factory returns the mock, with mock-only defaults and demo controls outside `CoachGateway`; a live factory must hide or replace these demo affordances.

The implementation adds `clock.updated` and `pause.changed` events to the proposed union. They carry active presentation/answer clocks and pause state. `judge.question` includes labeled sample answer choices. Reports also carry their finalized transcript so previous-attempt evidence survives retries and refresh. A live boundary must validate incoming records before dispatch; the mock’s TypeScript contracts are not an external-input validator.

## Example normalized event sequence

This abbreviated sequence shows the envelope and data shapes. Session/attempt/event IDs are illustrative; the mock stamps actual attempt IDs at runtime.

```json
[
  {"sessionId":"sample","attemptId":"attempt-1","eventId":"attempt-1:1","seq":1,"atMs":0,"origin":"mock","type":"phase.changed","phase":"countdown"},
  {"sessionId":"sample","attemptId":"attempt-1","eventId":"attempt-1:2","seq":2,"atMs":3000,"origin":"mock","type":"phase.changed","phase":"presenting"},
  {"sessionId":"sample","attemptId":"attempt-1","eventId":"attempt-1:3","seq":3,"atMs":5000,"origin":"mock","type":"transcript.updated","segment":{"id":"opening","revision":1,"speaker":"presenter","startMs":3000,"endMs":5000,"text":"What if a polished essay","isFinal":false}},
  {"sessionId":"sample","attemptId":"attempt-1","eventId":"attempt-1:4","seq":4,"atMs":7000,"origin":"mock","type":"transcript.updated","segment":{"id":"opening","revision":2,"speaker":"presenter","startMs":3000,"endMs":7000,"text":"What if a polished essay no longer tells us what a student understands?","isFinal":true}}
]
```

The full presentation fixture and both answer branches are in `mock/fixtures/scenario.ts`. Question construction and event-derived report templates live in `MockCoachGateway.ts`; `coach.test.ts` exercises both question branches, early reports, and before/after evidence.

## Semantics to preserve

- `atMs` is active attempt time; pauses freeze it. Presentation time runs only while presenting. Answer time resets per turn. No recording-time mapping currently exists.
- Normalize upstream providers into one increasing sequence per attempt. Reject wrong-session, wrong-attempt, duplicate, and late-turn events.
- A higher transcript revision replaces a partial segment; finalization commits it once. Judge transcript remains separate from presenter metrics.
- Metric events patch keys; null is unavailable, never zero. The UI treats observations older than 15 active seconds as stale sample data. This age threshold is a demo policy, not a calibrated live metric threshold.
- A question remains until the user starts an answer. Submission determines the next turn. Ending early cannot introduce future fixture findings.
- Retry creates a new attempt and preserves original report/transcript evidence. Retry context is attributed to the judge, not to a newly spoken user claim.
- Mock reconnection resumes a paused sample. No equivalent live reconnect guarantee is implied.
- Storage failure leaves the in-memory demo usable and warns that refresh may lose it.

Before connecting a real transcript/judge backend, agree authentication, command idempotency, report readiness, timestamp/recording offsets, retry endpoints, and error/reconnection semantics. The separate camera flow now proposes a replaceable WebSocket endpoint and video contract at the user's request; it does not yet integrate live judge Q&A or transcription.
