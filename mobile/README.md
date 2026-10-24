# Pitch Coach — iPhone, iPad and Android

React Native / Expo development client. The backend is unchanged. The native app reuses the web app's event mapper, word validation, pose geometry and synthetic question scenario.

## Run

From the repository root (Node 22, npm workspaces):

```sh
npm ci
npm run mobile:ios -- --device
npm run mobile:android
```

Xcode and CocoaPods are required for iOS; Android Studio, an Android SDK and JDK 17 for Android. `npm run mobile` starts Metro for an already installed development client. **Expo Go cannot load the native camera/MediaPipe modules.** Scene support is explicitly enabled for iOS/iPadOS 27 compatibility. iPad is enabled; review and sample screens use two columns when enough space is available, including after rotation or Split View resizing. Larger accessibility text returns to a single column.

Set `EXPO_PUBLIC_API_URL` in `mobile/.env.local` or enter an address in the recording screen. Use a reachable HTTPS/LAN address (e.g. `http://192.168.1.42:8000` during development), not a physical phone's `localhost`. Release builds should use HTTPS; platform network policies may reject plain HTTP. Never put secrets in `EXPO_PUBLIC_*` variables.

```sh
npm run typecheck --workspace mobile
npm run test --workspace mobile
npm run export --workspace mobile
```

`eas.json` contains development/simulator/preview profiles; no cloud project, paid build or store submission is configured. Generated `ios/` and `android/` projects are ignored. Config plugins bundle the same local pose model as the web app. Rebuild the development client after native dependency or plugin changes.

## Working paths

- **Local capture:** explicit camera/microphone permission, front camera with audio, up to three minutes, background interruption stops the take. MP4 playback uses native controls. Sharing exports the video or pose JSONL. Deleting a take removes its local files.
- **Native pose:** Vision Camera frame processor → MediaPipe Pose Landmarker Lite on-device → shared `poseSample` geometry. Up to 10 samples/second in IMAGE mode, without temporal smoothing. The log contains the same 21 selected raw landmarks and derived heuristics as the web app. Hidden knees/ankles remain `null`. No face-recognition, emotion or performance score. Pose data is not uploaded.
- **Real backend:** `GET /health/ready`, multipart `POST /speech/analyze` with `transcribe=false`, poll `GET /speech/jobs/{job_id}`. Explicit upload from review; cancelled requests do not cancel a job already accepted by the server. Failed analysis preserves the local take. Imported word JSON uses `POST /transcription/analyze-words`, with the web app's validation. Feedback buttons seek the original local recording and play a short event window; these are not server-cut clips.
- **Sample rehearsal:** the web app's deterministic synthetic transcript, scripted questions/answer branches and evidence-based sample report. Clearly separate from actual recording analysis.

## Native bridge patch

`npm ci` applies `scripts/patch-native.cjs` to the pinned `react-native-mediapipe@0.6.0`. The upstream frame bridge only handled LIVE_STREAM; the patch allows synchronous IMAGE-mode inference and carries the frame submission timestamp through iOS/Android result events. It also passes Android rotation options and propagates model initialization/inference failures. The script fails if its expected source changes and has an idempotence regression test. Upgrade this dependency only after reviewing/removing the patch.

**Timing limit:** Vision Camera 4 exposes recording completion but no JS recording-start callback. Native `t_ms` is relative to the recording request, not a confirmed encoded first video frame. JSONL explicitly declares `timebase: recording-request` and `alignment: approximate`. Do not use this log to claim frame-accurate video alignment. Device validation must cover rotation, front-camera mirroring, startup offset, thermal load and interruption; a simulator cannot validate camera tracking or calibrated head angles.

**Storage limit:** files live in the app cache and the take index is in memory. Share before closing the app. There is no cross-launch session archive, account, sync or backend session persistence.

## Still mocked / needed from the backend

See the [integration handoff](../docs/pitch-coach-handoff.md) for the endpoint inventory and [`frontend/DATA_POINTS.md`](../frontend/DATA_POINTS.md) for pose fields. Native does not invent new endpoints. Source ingestion/RAG fact-check, real question generation and answer evaluation, session/report persistence, presigned uploads and server-cut clips remain unavailable to this UI. Automatic ASR is not requested by this native path; import word timestamps instead. The sample is not a fallback that silently replaces failed real analysis.

## Verification (24 October 2026)

- iOS simulator native build and Android arm64 debug APK compiled successfully.
- App launched on iPhone 17 Pro (iOS 26.5) and iPad Pro 11-inch (iPadOS 27); the iPad scene lifecycle startup failure was reproduced and fixed.
- iOS/Android JavaScript exports, lint, TypeScript, 12 mobile tests and 35 existing web tests passed. Expo dependency check passed.
- The web-only clean npm install passed with the shared lockfile; Docker image execution was not checked because the local Docker daemon was unavailable.
- Not yet verified: physical-device camera/microphone capture, pose accuracy/orientation and video timing, real native-to-backend uploads, file sharing on devices, Android runtime interaction, signed release or store distribution. The simulator checks establish launch, not hardware acceptance.
