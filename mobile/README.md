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

Set `EXPO_PUBLIC_API_URL` in `mobile/.env.local` or enter an address in Recording Options. Use a reachable HTTPS/LAN address (e.g. `http://192.168.1.42:8000` during development), not a physical phone's `localhost`. Release builds should use HTTPS; platform network policies may reject plain HTTP. Never put secrets in `EXPO_PUBLIC_*` variables.

```sh
npm run typecheck --workspace mobile
npm run test --workspace mobile
npm run export --workspace mobile
```

`eas.json` contains development/simulator/preview profiles; no cloud project, paid build or store submission is configured. Generated `ios/` and `android/` projects are ignored. Config plugins bundle the same local pose model as the web app. Rebuild the development client after native dependency or plugin changes.

## Working paths

- **Local capture:** explicit camera/microphone permission, front camera with audio, one, three or five minutes, background interruption stops the take. MP4 playback uses native controls. Sharing exports the video or pose JSONL. Deleting a take removes its local files.
- **Native pose:** Vision Camera frame processor → MediaPipe Pose Landmarker Lite on-device → shared `poseSample` geometry. Up to 10 samples/second in IMAGE mode, without temporal smoothing. The log contains the same 21 selected raw landmarks and derived heuristics as the web app. Hidden knees/ankles remain `null`. No face-recognition, emotion or performance score. Pose data is not uploaded.
- **Real backend:** `GET /health/ready`, multipart `POST /speech/analyze` with `transcribe=false`, poll `GET /speech/jobs/{job_id}`. Explicit upload from review; cancelled requests do not cancel a job already accepted by the server. Failed analysis preserves the local take. Imported word JSON uses `POST /transcription/analyze-words`, with the web app's validation. Feedback buttons seek the original local recording and play a short event window; these are not server-cut clips.
- **Sample rehearsal:** the web app's deterministic synthetic transcript, scripted questions/answer branches and evidence-based sample report. Clearly separate from actual recording analysis.

## Native bridge patch

`npm ci` applies `scripts/patch-native.cjs` to the pinned `react-native-mediapipe@0.6.0`. The upstream frame bridge only handled LIVE_STREAM; the patch allows synchronous IMAGE-mode inference and carries the frame submission timestamp through iOS/Android result events. It also passes Android rotation options and propagates model initialization/inference failures. The script fails if its expected source changes and has an idempotence regression test. Upgrade this dependency only after reviewing/removing the patch.

**Timing limit:** Vision Camera 4 exposes recording completion but no JS recording-start callback. Native `t_ms` is relative to the recording request, not a confirmed encoded first video frame. JSONL explicitly declares `timebase: recording-request` and `alignment: approximate`. Do not use this log to claim frame-accurate video alignment. Device validation must cover rotation, front-camera mirroring, startup offset, thermal load and interruption; a simulator cannot validate camera tracking or calibrated head angles.

**Storage limit:** files live in the app cache and the take index is in memory. Share before closing the app. There is no cross-launch session archive, account, sync or backend session persistence.

## Still mocked / needed from the backend

See the [integration handoff](../docs/pitch-coach-handoff.md) for the endpoint inventory and [`frontend/DATA_POINTS.md`](../frontend/DATA_POINTS.md) for pose fields. Native does not invent new endpoints. Source upload and retrieval are connected in both web and native clients. The Sources screens can open the same collection ID on the same server. RAG fact-check, real question generation and answer evaluation, session/report persistence, presigned uploads and server-cut clips remain unavailable to this UI. Automatic ASR is not requested by this native path; import word timestamps instead. The sample is not a fallback that silently replaces failed real analysis.

## Verification (24 October 2026)

- iOS simulator native build and Android arm64 debug APK compiled successfully.
- App launched on iPhone 17 Pro (iOS 26.5) and iPad Pro 11-inch (iPadOS 27); the iPad scene lifecycle startup failure was reproduced and fixed.
- iOS/Android JavaScript exports, lint, TypeScript, 12 mobile tests and 35 existing web tests passed. Expo dependency check passed.
- The web-only clean npm install passed with the shared lockfile; Docker image execution was not checked because the local Docker daemon was unavailable.
- Not yet verified: physical-device camera/microphone capture, pose accuracy/orientation and video timing, real native-to-backend uploads, file sharing on devices, Android runtime interaction, signed release or store distribution. The simulator checks establish launch, not hardware acceptance.

## Native interface

The iOS library uses SwiftUI `List` and `ContentUnavailableView`. Recording Options uses a native `Form`, `TextField`, and switches in a system sheet. Actions are SwiftUI buttons; navigation, menus, and video controls use the platform implementations. System colors, SF Symbols, scalable text, and grouped sections follow Apple's [iOS guidance](https://developer.apple.com/design/human-interface-guidelines/designing-for-ios), [typography](https://developer.apple.com/design/human-interface-guidelines/typography), and [accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility). Android uses platform-specific alternatives; SwiftUI imports stay in `.ios.tsx` components outside the route directory.

On iPad, recording, review, and sample pages use two columns when width and text size permit. Compact sample layouts put playback and question controls before the transcript. Recording options persist during the app session, including after the sheet closes; they are not saved across launches.

### Repeatable native visual checks

Run these on a development build connected to Metro. Use synthetic recordings only. These are manual UI regression tests, separate from the automated API/pose tests.

1. **Library and navigation:** cold-launch, verify the large Rehearsals title, empty state, sample row, and labeled New Recording toolbar button. Open and close recording and sample screens. Repeat in light and dark appearance.
2. **Settings round trip:** open Recording Options, set the name to `Design rehearsal`, turn pose off and server analysis on, and enter `https://example.invalid`. Close and reopen the sheet. Expect the full name, URL, and both switches to persist. Do not upload to this test address. Turn server analysis off before recording.
3. **Sample flow:** Start Sample, advance, open the native menu, choose Sample Questions, and choose an answer. Expect the question and complete multiline answers to remain readable. Open Sample Report, inspect excerpts, then restart. No synthetic response should be presented as analysis of a real take.
4. **Largest text:** on iPad set `simctl ui <device> content_size accessibility-extra-extra-extra-large`; open the sample and scroll. Expect one column, readable sample disclosure, wrapping text, and reachable native controls. Restore `large`. Repeat at default size: expect two columns.
5. **Review:** with a synthetic local take, inspect native video playback, timestamp actions, analysis disclosure, measured values, sharing, and the destructive action in the toolbar menu. Cancel the delete confirmation. No upload should occur without pressing Upload & Analyze.

Redesign checks on 24 October 2026: iPhone 17 Pro/iOS 26.5 dark-mode library, sample menu and multiline answers; iPad Pro 11-inch/iPadOS 27 light-mode recording, settings round trip, two-column sample, and largest-text single-column sample; iPhone review layout with a temporary generated solid-color video and synthetic feedback. Temporary review seed code was removed. Direct `simctl io <device> screenshot <file>` captures were used to resolve Device Hub's stale/partially blank display artifacts. Physical-device recording, VoiceOver traversal, Android interaction, sharing, and actual analysis uploads still require device testing.

## Web/native integration (24 October 2026)

| Web capability | Native entry / shared implementation |
| --- | --- |
| Setup: title, context, audience, duration, mode, focus | Practice Setup; shared `SessionConfig` and gateway validation |
| Scripted practice and Q&A | Sample Rehearsal / custom practice; same `MockCoachGateway`, reducer, fixtures and null-aware observations |
| Pause, finish, restart, recovery | Native practice controls; subscription changes with each attempt |
| Feedback and focused retries | Category filters, transcript excerpts, retry comparisons and earlier reports |
| Sources upload, indexing, search, delete | Source Library; shared source API functions, file validation and location labels; `expo/fetch` transport |
| Source collection across devices | Web disclosure + native collection field; IDs retained per server in app documents |
| Local pose | Shared sample geometry, visibility filtering, skeleton connections, arms-crossed rule and diagnostic measurements |
| Preview export and recording | Separate preview-start / recording-request JSONL; 1/3/5-minute capture; video and pose remain local until explicit sharing/upload |
| Audio analysis and timestamp review | Existing real analysis endpoints and shared event mapping; original local video playback |

Use an absolute API address on native, including `/api` if connecting through the deployed web proxy. Same server + same collection ID gives both clients the same sources; recordings and practice sessions are not synchronized because session persistence endpoints do not exist. Source IDs are not authentication. Upload synthetic documents only.

Checks added: native source multipart filenames and HTTP 204 deletion, collection identity persistence/isolation and malformed storage, subscription renewal after reset/question jumps/retry, custom setup pause/resume, preview log labeling, and shared overlay visibility/mirroring/crop geometry. Hardware orientation/mirroring remains a device acceptance check; tests establish the projection math only. No backend code is changed.

Integration verification: 47 web tests and 18 mobile tests passed, along with both workspaces' lint and TypeScript checks. iOS and Android production JavaScript exports passed. The web production build passed using `--webpack`; the default Turbopack build was blocked by this environment's worker port-binding restriction. No local backend was running, so source uploads and native analysis were not verified against a real server.

The source collection browser regression passed on desktop and mobile viewports, including reopening the same collection and persistence after reload. Simulator checks covered custom iPhone setup → simulation → questions → report, and the iPad source library's two-column empty state.
