# 418 presentation studio

## Design direction

The presenter rehearses at a laptop in a bright hackathon hall, or checks a take
on a phone. The interface should be quiet, readable, and consistent while the
presentation remains the focus. Apply Apple's hierarchy, legibility, familiar
controls, and progressive disclosure to the web; this is not a native Apple UI.

## Shared system

- Use locally hosted Open Sans Variable (`@fontsource-variable/open-sans`) with
  platform fallbacks, and accent `#3803bf` (`--primary` / `--primary-fill`).
  Body text is 1rem; page titles are 2rem on desktop. Small supporting text is
  at least 0.75rem. Text scales with browser preferences.
- Use the semantic tokens in `src/app/globals.css` for backgrounds, surfaces,
  foreground, secondary text, borders, and state colors. Light appearance uses
  neutral gray and white; dark appearance follows the system preference.
- Retain the 418 `#3803bf` violet for primary actions and selections. Use the lighter text
  accent separately from filled buttons in dark appearance. Warning and error
  colors always accompany a label or symbol.
- Shared content width: 1280px including gutters. Use 32px desktop gutters and
  16–24px on phones. Panels use a 16px radius; controls use 10px. Separate related
  rows with spacing and dividers, rather than nested cards or decorative stripes.
- Primary controls and icon buttons have a minimum 44px target. Native inputs
  use 1rem text. Keyboard focus, the skip link, and dialog focus restoration remain
  visible. Reduced motion disables animation; increased contrast strengthens
  separators and secondary text.
- `/` and `/stats-preview` show counts, durations and observations from actual
  recordings in the current workspace, with an empty state before the first take.
  No synthetic percentages, monthly histories or performance scores appear.
  `AppShell` provides header navigation and a navigation drawer outside the full-size live studio.
  The active destination is identified visually and with `aria-current`.

## Screens

- **Studio:** the full-size camera and feedback layout is the only view. The
  camera fills the available width before feedback exists; during preview and
  recording it sits beside an equally wide feedback panel. Below 1001px they
  stack. Shared controls, speech choice and recording timer sit
  above the camera. Options links to setup, recording options and diagnostics
  below the studio. The live toolbar has no navigation menu.
  Live cues use large text, contextual SVG icons, a clear panel tint and a lighter
  tint across the live workspace. Red means an adjustment to
  consider; green means explicit positive feedback or labelled tracking readiness.
  Ordinary gestures, pauses, calibration and hidden hints remain neutral. Color
  always has a text label; tracking readiness is not a performance assessment.
- **Review:** two primary views, Review moments and Practice questions. Large
  playback sits beside one selected observation and a compact list of replay
  sections. Annotations follow video.currentTime; ordinary gestures are not
  labelled bad performance. On phones, playback precedes the feedback.
  Timestamp jump buttons show the time and feedback title, wrapping without
  overlapping even when observations cover the same time range. Timestamp labels
  use the live feedback colors: red for adjustments, green for positive feedback,
  neutral for observations. The violet selection outline remains separate.
  Transcript, source checks, metrics and exports live in disclosures.
  Questions show one exchange at a time, with voice or typed answers. The
  presentation mode and material collection are fixed when a take starts.
  ElevenLabs only starts on an explicit click after its data-sharing notice;
  leaving the question view disconnects the agent. Missing configuration,
  unavailable services and missing transcripts have visible recovery paths.
- **Sources:** place the document library and source search beside one another on
  desktop and stack them on phones. Show supported formats, upload state, errors,
  and when search becomes available. Continue to recording is the main action.
- **Sample:** retain explicit synthetic-data labels for the walkthrough and
  example annotations. Review criteria count timestamped moments; synthetic
  quality scores and performance curves have been removed.
- **Loading:** small wordmark and announced status, with a reduced-motion-safe
  indicator. Loading must not download a font or initialize WebGL.

Camera permission is requested only on an explicit click. Consent, destination,
retention information, unavailable services, and retry paths must remain readable.
The interface must not imply that missing observations mean good performance.
Pose and voice calibration, tracking status, and errors stay visible. Model, mode,
finger tracking, and speech features lock during a take; Pose Lab is diagnostic.
Camera and skeleton use the same crop and mirror projection. Live review shows
observed events and source-backed findings, without a performance score.
Local media stays in browser memory, with download and retention guidance.
Backend transcription names Deepgram EU when streaming is enabled and explains
the local Whisper fallback. A completed stream supplies the review transcript.

## References

- [Apple: Layout](https://developer.apple.com/design/human-interface-guidelines/layout)
- [Apple: Typography](https://developer.apple.com/design/human-interface-guidelines/typography)
- [Apple: Color](https://developer.apple.com/design/human-interface-guidelines/color)
- [Apple: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)

Earlier layout references inspected by the team on 2026-10-24:

- [Riverside studio](https://mobbin.com/screens/57ce5e02-c5ef-4349-8a2f-9dce51cc8315): stage beside secondary feedback.
- [VEED recording](https://mobbin.com/screens/dde42152-7be1-49c9-8311-6390504a2ef5): visible timer and session actions.
- [Typeform report](https://mobbin.com/screens/71dbe2c0-580a-4814-a068-2e13cb4a5559): quiet report typography and separation between findings.

Browser checks cover desktop and mobile layouts, light and dark appearance,
enlarged text, keyboard navigation, synthetic recording, review, and source flows.
These checks do not establish real-camera, real-microphone, or device acceptance.
