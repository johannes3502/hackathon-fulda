# 418 presentation practice design

## Shared web interface (2026-10-24)

The web interface uses locally hosted Open Sans Variable and accent #3803bf.
Shared tokens in `src/app/globals.css` also supply the hover and soft accent
colors. Loading, stats and review previews follow the same typography and accent.
Primary buttons use white text. Neutral backgrounds and the dark camera stage
remain unchanged. The historical directions below are superseded by this update.

Both `/` and `/live` render the recording studio directly. Large view is the
default; Standard view reveals settings and navigation. The monitoring preview
leads with a central Enable camera button and explicit permission guidance.
Start recording appears only once the preview is ready. Empty feedback is hidden
until recording starts. Recording
options are collapsed; the sample remains available at `/demo`. Optional sample
context and practice options are disclosures. The home screen no longer shows
a synthetic score card or a second explanation of the rehearsal flow. Sources
lead directly into recording. Camera diagnostics, server settings, title and
duration are available on demand. Consent, upload destination, transcription
opt-in, errors and recording-retention notices remain visible. Empty observation
feeds are omitted before recording; review leads with duration and moments.

Desktop and mobile use the same buttons, fields and spacing. The sample setup
moved to `/demo`; scoring logic, recording defaults and service dependencies
are unchanged.
The sections below record earlier component directions; this shared interface
supersedes the shared green theme while retaining the common analysis header.

## 418 review analysis (2026-10-24)

White analysis workspace, Noto Serif Display headings, #42ff8c accents. Four
criterion summaries sit above the video. An SVG performance graph below it uses
a shared video clock, an advancing cursor, timestamps and selectable moments.
Green checkmarks denote strengths, dark exclamation marks practice moments,
outlined information marks annotations. Text and symbols accompany color.
The side panel combines the observation, optional source quote and next action.
The preview uses a generated, silent illustrated video and synthetic scores;
live recordings expose existing events without inventing per-time performance.
On narrow screens the chart scrolls horizontally and annotation/list stack.

## 418 stats card (2026-10-24)

Explicit user request: a simplified player-card layout with an overall circle
above Gestik, Fachwissen, Flow and Struktur (1–100%). Reuse white, #42ff8c and
Noto Serif Display. The aggregate is interpreted as an equally weighted mean,
not a digit sum. Three.js draws the ring; HTML values and SVG provide a readable
fallback. Count-up runs once on entering the viewport, pointer movement adds a
subtle card tilt, and reduced motion uses the final static state.
This is a design prototype with labeled synthetic values, not a validated
assessment. Actual criterion scoring remains undefined.

## 418 loading screen (2026-10-24)

User-provided brand direction takes precedence for the loading screen: pure white,
accent #42ff8c, black 418 typography in locally hosted Noto Serif Display.
A slowly rotating flat Three.js disc echoes the supplied logo. The mark remains
readable as HTML before JavaScript and without WebGL; reduced motion is static.
Preview at `/loading-preview`. Other workspace styling is unchanged.

The presenter is rehearsing at a laptop in a brightly lit hackathon hall, with limited time and attention. A light workspace provides readable controls; a dark stage separates the practice area from feedback.

Restrained palette: neutral page, white surfaces, dark slate text and stage, blue primary action. The explicit plan palette takes precedence over generated color suggestions. One system sans family, 16px body, tabular timers, 12–16px panels, 44px main controls. Semantic warning/error colors only signal those states.

## Mobbin references inspected, 2026-10-24
- [Riverside studio](https://mobbin.com/screens/57ce5e02-c5ef-4349-8a2f-9dce51cc8315): large stage beside a compact secondary column, controls below the stage.
- [VEED recording](https://mobbin.com/screens/dde42152-7be1-49c9-8311-6390504a2ef5): prominent timer and persistent session actions.
- [Typeform report](https://mobbin.com/screens/71dbe2c0-580a-4814-a068-2e13cb4a5559): quiet report typography and generous separation between findings.

These inform structure, not copied assets. On mobile, stack stage and feedback; use disclosures for secondary information. Motion only communicates changing state and respects reduced motion.

The added camera workspace carries the Riverside/VEED stage-and-feedback layout into actual recording. Review separates the full video from category frequencies and the next practice action; the feedback browser puts category filtering alongside a native video player. Mobile puts playback before the section list. Keep script labels adjacent to feedback and distinguish observation counts from performance scores.
