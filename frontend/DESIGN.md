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
  neutral gray and white. The shared header offers System, Light and Dark;
  an explicit choice overrides the OS and persists in localStorage. A small
  initializer applies the saved choice before first paint. With System selected,
  CSS follows OS changes immediately. Both appearances share semantic tokens.
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
- `/` and `/stats-preview` begin with a presentation introduction: primary action
  “Neue Präsentation” opens `/sources` to add presentation material; the secondary
  action also prepares sources. Three steps explain preparation, recording and
  review. A recent take links back into its review; completed takes persist locally
  in IndexedDB.
  Below, `StatsDashboard` shows counts, durations and observations from actual
  recordings in the current workspace, with an empty state before the first take.
  No synthetic percentages, monthly histories or performance scores appear.
  `AppShell` provides both the header navigation (`Main navigation`) and a
  slide-over navigation drawer (`Menü`) outside the record screen. The active destination
  is identified visually and with `aria-current`. The drawer is a modal Radix
  dialog with focus containment, Escape dismissal and focus restoration. A shared
  Prepare / Record / Review strip connects sources, studio and reviews; its Review
  link uses the current or latest take, or explicitly offers an example when no
  take exists. The record screen hides this strip during both camera setup and
  recording to preserve camera space.

## Screens

- **Studio:** camera setup shares the sources page's content width and heading
  layout, with the global header and workflow steps hidden. “Back to sources” returns directly to the
  upload library, retaining the selected collection and its documents. Enabling
  the camera switches immediately to the full-size camera and feedback layout;
  the back link stays in its toolbar until recording starts. The
  camera fills the available width before feedback exists; during preview and
  recording it sits beside an equally wide feedback panel. Below 1001px they
  stack. Shared controls, speech choice and recording timer sit
  above the camera. Options links to setup, recording options and diagnostics
  below the studio. The live toolbar has no navigation menu.
  Camera setup and recording share readable controls: 52px buttons and inputs,
  17px control text, 16px instructions and consent, and 15px secondary status
  labels. Options and checkbox labels have at least 48px targets. Controls and
  camera overlays wrap on narrow screens; enlarged text can grow the page.
  Live cues use large text, contextual SVG icons, a clear panel tint and a lighter
  tint across the live workspace. Red means an adjustment to
  consider; green means explicit positive feedback or labelled tracking readiness.
  Ordinary gestures, pauses, calibration and hidden hints remain neutral. Color
  always has a text label; tracking readiness is not a performance assessment.
  Optional recording fullscreen expands the existing camera stage without
  remounting the video or recorder. A compact badge at the right edge combines
  the current cue's contextual SVG symbol, color and short title, using the same
  pacing and hint visibility as the normal panel. Green readiness is explicitly
  labelled tracking status. Timer, hint toggle, start/finish and exit remain
  reachable. Browser fullscreen is preferred; a viewport fallback supports
  Escape, contained keyboard focus and scroll locking. The camera and skeleton
  keep the same contain projection in both views; overlays stay out of the video.
- **Review:** two primary views, Review moments and Practice questions.
  Three `ReviewScores` cards (Gestik, Fachwissen, Flow) above playback show 0–100 prototype ratings on the
  user's explicit request (`evidence-share-v1`). Formula: positive assessed
  time / (positive + critical assessed time) × 100; same-kind overlaps count once.
  Neutral observations and unknown time are excluded; assessed seconds and
  coverage remain visible. Knowledge prefers supported / (supported + contradicted)
  source claims; not-found and unchecked claims are open and excluded. Missing
  evidence stays unavailable, never zero or a perfect score. Filtering moments
  does not recalculate the take's score. Methodology is a disclosure.

  Playback includes a Stockfish-inspired qualitative graph immediately below
  the video: timestamps on the horizontal axis, a dashed neutral midpoint,
  explicit positive feedback above and adjustments below. The line is the net
  count of simultaneous directional events, scaled to the take's maximum absolute
  count. A continuous angular line through unique time knots shows changes
  without smoothing or invented fluctuations. Intermediate values are labelled as interpolated;
  the area is not filled. A moving point follows this interpolation during
  playback. Height is not measured presentation quality. Ordinary observations stay
  neutral; gaps contain no directional evidence, not proof of good performance.
  The same `FeedbackGraph` serves live playback and the analysis example. A click
  selects the nearest event, the labelled slider seeks exact times, and the
  colored playback strip shares the graph's time scale and green/red/neutral
  intervals, split exactly at zero crossings. Played time is highlighted; future
  time is muted. Play/pause, native video controls and keyboard seeking stay
  synchronized through media events. The disclosure offers full timestamp buttons with at least 48px targets for dense
  or simultaneous events. The playhead follows `video.currentTime`.
  Review controls are at least 48px high, supporting text at least 0.9375rem,
  body copy 1–1.0625rem, with larger headings and comfortable line spacing.

  Playback sits beside one selected observation and a compact list of replay
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
- **Sources:** show a full-width document library with supported formats, upload
  state and errors. Continue to recording is the main action.
- **Sample:** retain explicit synthetic-data labels for the walkthrough and
  example annotations. Review scores use the disclosed rubric on the synthetic
  example evidence; the qualitative event graph uses only the
  supplied example annotations.
- **Loading:** small wordmark and announced status, with a reduced-motion-safe
  indicator. Loading must not download a font or initialize WebGL.

Camera permission is requested only on an explicit click. Consent, destination,
retention information, unavailable services, and retry paths must remain readable.
The interface must not imply that missing observations mean good performance.
Pose and voice calibration, tracking status, and errors stay visible. Model, mode,
finger tracking, and speech features lock during a take; Pose Lab is diagnostic.
Camera and skeleton use the same crop and mirror projection. Live review shows
observed events, source-backed findings and explicit evidence-share prototype
scores with visible coverage and missing-data states.
Completed local media and review data persist in IndexedDB, with visible saving
and error states, download guidance and confirmed deletion in the review.
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
