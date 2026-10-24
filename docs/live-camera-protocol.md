# Live camera protocol — replaceable prototype v1

2026-10-24. Proposed for the requested camera → live feedback → stats → video replay flow. This is a frontend contract, not an existing production backend. The local demo accepts actual camera video and emits scripted markers without a server.

## Run and replace

- App: `npm run dev` from the repository root, then `/live`.
- Default: **Local demo**, real silent camera recording, no upload and no analysis. Example feedback appears at 2.5, 6 and 10 seconds.
- Backend: choose **Backend** and enter `ws://localhost:8000/live`, or another implementing endpoint. Optionally set `NEXT_PUBLIC_COACH_WS_URL` in `frontend/.env.local` to prefill the field. HTTPS pages require `wss://`.
- Replacement seam: `frontend/src/features/live/transport.ts`. Implement `VideoTransport` in `contracts.ts`, or change the WebSocket adapter. Recording, review and replay consume the normalized contract.

The input is camera video only: no transcription, audio, preprocessing or browser detection. MediaRecorder encodes video into WebM (VP8 where supported), otherwise MP4 or the browser default. This is **encoded binary video, not uncompressed pixels or WebRTC**. The server must support the negotiated `mimeType`. Chunks form one continuous container stream; individual chunks need not be independently playable. Concatenate/process them in order starting with the first chunk.

## Session sequence

1. Browser opens WebSocket and sends a JSON text message:

```json
{"type":"session.start","version":1,"sessionId":"uuid","title":"My pitch rehearsal","mimeType":"video/webm;codecs=vp8","audio":false}
```

2. Server initializes its decoder, then acknowledges within 10 seconds:

```json
{"type":"session.ready","sessionId":"uuid"}
```

3. Browser starts MediaRecorder and establishes time zero. Roughly every 500 ms it sends a JSON text message, followed immediately by **one binary WebSocket message** containing that chunk:

```json
{"type":"video.chunk","sessionId":"uuid","seq":1,"startMs":0,"endMs":503.8,"byteLength":12345}
```

`seq` starts at 1 and increases by one; each `startMs` is the previous `endMs`. The binary payload length matches `byteLength`. Times are elapsed milliseconds since the recorder's start event, measured with a monotonic browser clock. They describe capture delivery intervals, not exact decoded frame timestamps. Decoding may need container timestamps to achieve frame-level alignment. Use the same zero for feedback; never use wall-clock or server-arrival time.

4. Server may send any number of observations and optional metric snapshots:

```json
{"type":"feedback","sessionId":"uuid","feedback":{"id":"gesture-1","category":"Gestures","kind":"suggestion","startMs":4000,"endMs":6000,"title":"Review this gesture","detail":"Describe the observed behavior here.","action":"Give one concrete practice suggestion."}}
```

```json
{"type":"metrics","sessionId":"uuid","atMs":6000,"metrics":[{"id":"visibility","label":"Visible in frame","value":96,"unit":"%"}]}
```

`kind`: `positive`, `suggestion`, or `attention`. `category` is a nonempty string, so new feedback categories automatically appear in filters and counts. Reusing a feedback ID revises the observation. Ranges must satisfy `0 <= startMs <= endMs <= last received chunk endMs`. Metric snapshots replace the previous snapshot; older `atMs` values are ignored. Values may be finite numbers, strings, or `null` for unavailable data. No score is fabricated when metrics are absent. An observation count is frequency, not performance quality.

The frontend rejects malformed, oversized (>64,000 characters), wrong-session and future-timestamp messages. Titles, details, category names and metric arrays have limits in `protocol.ts`. It renders strings as text.

5. Browser stops capture, sends the final chunk, then:

```json
{"type":"session.stop","sessionId":"uuid","durationMs":12500}
```

6. Server flushes remaining feedback before acknowledging:

```json
{"type":"session.complete","sessionId":"uuid"}
```

Finalization waits at most 10 seconds. Errors at any stage use:

```json
{"type":"error","sessionId":"uuid","message":"The video decoder could not process this format."}
```

## Failure, replay and retention

- A disconnect or server error stops capture and presents any captured local video and feedback as an interrupted take. No automatic reconnect: resuming dependent encoded chunks needs an agreed protocol.
- Congestion stops streaming instead of dropping chunks (4 MiB socket buffer; 8 MiB pending local send queue). Takes are limited to 1, 3 or 5 minutes and approximately 150 MiB each.
- Replay seeks the original recording to the observation range with up to two seconds of surrounding context. Native controls support full playback; selected sections can loop. Download uses the captured container format.
- Recordings and object URLs live in the `/live` workspace's memory. They survive in-app navigation between its screens, but not refresh or leaving this workspace. Download before leaving. There is no database, file upload endpoint or localStorage video persistence. Server retention is the backend's responsibility.
- This prototype does not implement authentication. Use a trusted local endpoint for development. Before shared deployment, agree authenticated session creation, origin checks, server-side payload limits, retention and supported codecs. Never put backend secrets into `NEXT_PUBLIC_*` variables.

## Verification

`frontend/src/features/live/live.test.ts` checks parsing, endpoint validation, event revisions, ranges, demo scheduling, chunk ordering, completion, congestion and cancellation. `frontend/tests/live.spec.ts` records generated canvas video using real Chromium MediaRecorder, verifies binary WebSocket messages with a protocol harness, and exercises playable review, timestamp seeking, download, disconnect recovery and responsive screens. This does not validate a real detection model, actual camera hardware, Safari or a production backend.
