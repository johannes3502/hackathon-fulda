# 418 presentation practice design

## Shared interface

The web interface uses locally hosted Open Sans Variable and accent #3803bf.
Shared tokens in `src/app/globals.css` supply typography, hover and soft accent
colors. White surfaces, neutral backgrounds and a dark camera stage separate
controls, feedback and video. Main controls stay at least 44 px high; text and
symbols accompany semantic colors. Timers use tabular digits.

Both `/` and `/live` open the recording studio. Large view leads with the camera
and one live cue; Standard view adds navigation and settings. Camera permission
starts only on click. **Live · in browser** measures microphone signals locally;
**Off · gestures only** uses no microphone. Backend mode states its upload
behavior before recording. Pose/voice calibration, tracking status, errors and
recording-retention notices stay visible.

Recording, analysis, gesture guide and diagnostics use disclosures. Model/mode,
finger tracking and speech feedback flags are locked during a take. Pose Lab is
a diagnostic tool. The `/demo` rehearsal and `/gestures` walkthrough use clearly
labelled synthetic data. The homepage shows no synthetic score card.

## Recording and review

A live recording shows observed events and source-backed findings without a
performance score. Review leads with duration, video and timestamped moments.
Selecting a moment seeks with surrounding context. Category filters select
observations, not people or presentation quality. Local media stays in browser
memory, with visible download and retention guidance.

Desktop puts the video beside feedback; narrow screens stack them. The camera
and skeleton use the same crop/mirror projection. Controls and feedback must
fit without horizontal page overflow, including large view. Motion respects
reduced-motion preferences.

## Reusable component previews

`/loading-preview`, `/stats-preview` and `/review-preview` remain explicit design
previews, covered by browser checks. They use the shared font/accent:

- `LoadingScreen` also supplies the App Router loading fallback. Its Three.js
  disc has a readable static fallback; there is no fake progress percentage.
- `StatsCard` demonstrates synthetic criteria/count-up/ring animation. It is
  not a measured score for a camera recording. Missing/invalid values remain
  unavailable; SVG covers missing WebGL.
- `ReviewAnalysis` synchronizes video, graph, cursor and evidence on one clock.
  The illustrated preview has synthetic values. `/live/[id]/analysis` uses real
  feedback events and leaves unsupported scores unavailable.

## Mobbin references inspected, 2026-10-24
- [Riverside studio](https://mobbin.com/screens/57ce5e02-c5ef-4349-8a2f-9dce51cc8315): large stage beside a compact secondary column, controls below the stage.
- [VEED recording](https://mobbin.com/screens/dde42152-7be1-49c9-8311-6390504a2ef5): prominent timer and persistent session actions.
- [Typeform report](https://mobbin.com/screens/71dbe2c0-580a-4814-a068-2e13cb4a5559): quiet report typography and generous separation between findings.

These inform structure, not copied assets. On mobile, stack stage and feedback; use disclosures for secondary information. Motion only communicates changing state and respects reduced motion.
