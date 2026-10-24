# Live Pitch Coach Frontend Plan with Next.js

Build a Next.js frontend that demonstrates a complete pitch rehearsal: configure a session, present with live coaching, answer a demanding judge, review evidence, and retry one weak section.

The UI team owns the screens, interactions, session state, and simulated incoming data. All transcription, posture and gesture analysis, vocal analysis, questions, and report findings come from a deterministic mock adapter. An optional real camera preview is independent of that analysis and is labeled accordingly.

The first deliverable is a complete, repeatable rehearsal flow that runs without a backend or provider credentials. The architecture allows a future API and streaming adapter to supply the same typed data.

## Product scope

### First deliverable

Implement these connected capabilities:

- Session setup with a title, pitch context, audience, target duration, and coaching mode.

- A practice studio with countdown, time remaining, media preview or placeholder, live transcript, delivery observations, and one coaching cue at a time.

- Judge Q&A with a question tied to a transcript excerpt and one scripted answer-aware follow-up.

- Review with prioritized findings, selectable evidence, and a targeted retry.

- Demo controls that reproduce the same scenario, pause it, reset it, and jump to useful development states.

- Loading, missing-data, permission-denied, interrupted-session, and failed-request states.

Keep the initial navigation focused on practice. Accounts, subscriptions, a marketing site, a session-history dashboard, PDF parsing, real AI integration, and avatar animation are later work.

### Completion target

A teammate can open the app, complete the full flow without granting camera or microphone permission, inspect why the judge asked a question, retry that answer, and compare the relevant finding. Every visible primary action has working behavior.

## Stack and frontend boundaries

| Area | Decision |
| --- | --- |
| Framework | Next.js App Router with TypeScript in strict mode |
| Styling | Tailwind CSS and a small set of shared design tokens |
| UI primitives | shadcn/ui for buttons, inputs, dialogs, selects, tabs, tooltips, and accessible form structure |
| Icons | lucide-react |
| Session state | React useReducer, exposed through a session context and useCoachSession |
| Incoming data | One CoachGateway interface, implemented by MockCoachGateway first |
| Persistence | A small sessionStorage repository for setup and completed demo reports |
| Simple visuals | CSS bars and small SVG sparklines where they add information |
| Validation | TypeScript contracts for the prototype; runtime validation at the future live-adapter boundary |

Initialize with create-next-app and select TypeScript, App Router, Tailwind, ESLint, a src directory, and the @/* import alias. Commit the generated lockfile and use its installed versions consistently. Next.js includes its own development and build tooling. [Next.js installation](https://nextjs.org/docs/app/getting-started/installation).

Keep route and layout wrappers as Server Components. Place the interactive session provider and workspace behind a Client Component boundary. Browser APIs, storage, timers, and camera access belong in effects or user actions. Client Components can still be prerendered, so do not read window, navigator, or sessionStorage at module scope or during the initial render. [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components).

The data boundary is:

**Screen components → useCoachSession → reducer and CoachGateway → mock adapter now, API and stream adapter later.**

Only the mock adapter imports fixture files. Screen components receive props or normalized state; they never run simulation timers or import scenario data directly.

## Routes and session flow

| Route | Responsibility |
| --- | --- |
| / | Setup form and entry to the sample demo |
| /practice/[sessionId] | Preflight, countdown, presentation, and judge Q&A |
| /practice/[sessionId]/review | Findings, evidence, retry, and comparison |

Mount SessionProvider in the shared /practice/[sessionId]/layout.tsx so the studio and review use the same session state. A retry returns to the studio within the same session and creates a new attemptId.

Use explicit phases:

**preflight → countdown → presenting → judge_thinking → judge_question → answering → judge_thinking → judge_question or report_pending → review**

Keep isPaused separate from phase. Error and connection states are also separate; a temporary transport failure should not erase the current transcript or phase.

A normal presentation moves to Q&A only when the user ends it or the configured limit is reached. A question remains visible until the user starts answering. The next scripted question begins after answer submission. User actions control these transitions; one global timeout must not advance the entire experience automatically.

Refresh behavior is deliberate: restore session context and completed reports, then offer to restart an interrupted active attempt. Do not imply that a lost live stream or camera recording was restored. A missing session ID shows a useful not-found state with Start new practice.

## Screen specifications

### Setup

Use one focused form with a short session preview beside it.

Fields:

- Pitch title.

- Context: What are you presenting, and what should the audience understand?

- Audience: hackathon jury, investor, or university examiner.

- Target duration: one, three, or five minutes.

- Mode: Coach or Simulation.

- Optional short list of evaluation criteria.

Primary action: Start practice. Secondary action: Try sample demo.

The sample demo loads a complete preset and a known fixture. Custom form values must appear in the studio and review. The mock uses scenario fixtures, so changing arbitrary pitch text does not generate new analysis; make the sample nature visible.

Validate the title and context before creating a custom session. Show a pending state while createSession resolves and prevent duplicate submissions. Associate field errors with their inputs and focus the first invalid field.

### Preflight

Show the session summary and two paths: Continue with demo preview and Enable camera preview.

The demo path requires no device permissions. The optional camera path has idle, permission pending, active, denied, unavailable, and failed states. A user can continue while permission is pending or after it is denied.

Use an explicit user action to request the camera. Request only media needed by the implemented preview. Camera permission and secure-context requirements are documented by MDN; a permission prompt may also remain unanswered. [getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).

Do not display a recording indicator unless media is actually being recorded. In the first deliverable, use Session running and Simulated coaching. Real recording is optional follow-up work.

### Practice studio

Desktop layout: a flexible main stage taking roughly two-thirds of the width, plus a coaching column of about 320–360 pixels. Keep critical controls visible at a typical laptop viewport.

Header:

- Pitch title and audience.

- Persistent Simulated coaching badge.

- Current phase.

- Remaining presentation time.

- Exit control.

Main stage:

- Camera preview, matching sample clip, or a deliberate neutral placeholder.

- Three-second start countdown.

- A quiet timer and media status.

- The latest transcript lines beneath the stage, with an expandable full transcript.

- Controls for Start, Pause or Resume, and End pitch.

Coaching column:

- One active coaching cue with an icon, short action, and optional evidence link.

- Four primary observations: speaking pace, filler count, posture, and vocal variation.

- A compact gesture observation and content coverage checklist.

- Earlier cues available behind a secondary View feedback action.

Use observable labels such as Steady, Repeated sway, Hands outside frame, and Limited variation. Values and labels are simulated. Missing tracking is displayed as Not enough data, not as a failing score.

Coach mode displays live cues. Simulation mode keeps the presentation quiet and reveals coaching in the review; the timer and capture-status information remain available.

In narrow layouts, stack the stage and coaching content, keep the main action reachable, and collapse secondary metrics into an accessible disclosure.

### Judge Q&A

Keep Q&A in the studio route so it shares the current session.

Replace the presentation emphasis with:

- Judge role and question count.

- Current question.

- A compact evidence card quoting the pitch and linking its timestamp.

- The answer transcript.

- Start answer and Submit answer controls.

- A small thinking state between turns.

Offer two clearly labeled sample answers in demo mode: a vague answer and a direct answer that explains what is known and what still needs validation. The chosen sample determines the scripted follow-up.

Do not imply that arbitrary speech or typed text is semantically evaluated by the mock. If a free-text answer is included, label the response as scripted sample feedback. The cleanest first version uses visible sample-answer choices.

The judge must stay tied to the current question and answer. Keep a turnId and parent question reference so late events cannot appear in the wrong conversation.

### Review

Lead with the next useful improvement and up to three prioritized findings.

Suggested order:

1. Session summary: audience, mode, duration, completion state, and demo badge.

2. One recommended next action.

3. Evidence viewer with transcript selection and optional matching video.

4. Findings grouped into delivery, content, and Q&A.

5. A strength worth preserving.

6. Practice this section again on eligible findings.

7. A before-and-after comparison after retry.

Each finding shows what happened, its evidence, and one concrete action. Clicking a timestamp selects the corresponding transcript segment. Enable video seeking only when the attempt has matching media and a valid time mapping.

Keep the report consistent with the events already delivered. An early-ended presentation must not include observations from later fixture timestamps.

### Retry

Create a new attempt under the same session, retaining the original report. Carry forward the selected finding, pitch context, and target criterion.

Show a short instruction such as Answer the evidence question in 30 seconds. Use the same studio components with a shorter target.

After the retry, compare only the relevant criterion: directness of the answer, whether supporting evidence was provided, whether limitations were acknowledged, or the selected delivery observation. Show before and after evidence, not a fabricated overall confidence improvement.

## Visual system and interaction rules

Use a restrained presentation workspace: light neutral page background, white panels, a dark media stage, and a single blue primary accent. Reserve warning and error colors for their actual states.

| Token | Starting value |
| --- | --- |
| Page background | #F6F7F9 |
| Panel background | #FFFFFF |
| Main text | #17212F |
| Muted text | #526071 |
| Primary action | #1D4ED8 |
| Studio background | #111827 |
| Warning | #B45309 |
| Error | #B91C1C |
| Panel radius | 12–16 px |
| Spacing scale | 4, 8, 12, 16, 24, 32 px |

Use a single font stack, consistent button heights, and readable text. Start with 16-pixel body text. Make numeric timers tabular so the layout does not shift.

Only one coaching cue is active at a time. Apply priority, expiry, and a cooldown; repeated equivalent cues should not repeatedly interrupt the presenter.

Use text and icons alongside colors. Provide visible keyboard focus, labels for icon-only controls, clear disabled states, and reduced-motion behavior. Announce new judge questions and important coaching cues politely. Do not announce every timer tick or partial transcript revision.

Primary component inventory:

| Group | Components |
| --- | --- |
| Shared | AppShell, SessionHeader, DemoBadge, StatusMessage |
| Setup | SessionSetupForm, AudiencePicker, ModePicker, PreflightPanel |
| Studio | CameraPreview, CountdownOverlay, SessionTimer, PracticeControls |
| Coaching | CoachCue, MetricTile, GestureStatus, CoverageChecklist |
| Transcript | TranscriptPanel, TranscriptSegmentRow, EvidenceLink |
| Judge | JudgePanel, QuestionEvidence, AnswerControls, DemoAnswerPicker |
| Review | SessionSummary, FeedbackCard, EvidenceViewer, RetryComparison |
| Development | DemoControls |

## Shared data contracts

Agree the names and semantics below before parallel implementation. The following is a proposed frontend contract, not a claim about an existing backend API.

### Session and observations

```ts
type SessionPhase =
  | "preflight"
  | "countdown"
  | "presenting"
  | "judge_thinking"
  | "judge_question"
  | "answering"
  | "report_pending"
  | "review";

type AttemptRef = {
  sessionId: string;
  attemptId: string;
};

type SessionConfig = {
  title: string;
  context: string;
  audience: "hackathon" | "investor" | "examiner";
  targetDurationMs: number;
  mode: "coach" | "simulation";
  criteria: string[];
};

type Observation<T> = {
  value: T | null;
  quality: "good" | "limited" | "unavailable";
  reason?: string;
};

type Metrics = {
  paceWpm: Observation<number>;
  fillerCount: Observation<number>;
  posture: Observation<"steady" | "repeated_sway">;
  gestures: Observation<"visible" | "limited_view">;
  vocalVariation: Observation<"varied" | "limited">;
};

type TranscriptSegment = {
  id: string;
  revision: number;
  speaker: "presenter" | "judge";
  turnId?: string;
  startMs: number;
  endMs: number;
  text: string;
  isFinal: boolean;
};

type EvidenceRef = {
  attemptId: string;
  segmentIds: string[];
  startMs: number;
  endMs: number;
  quote?: string;
};

type CoachCue = {
  id: string;
  category: "delivery" | "content" | "capture";
  message: string;
  priority: 1 | 2 | 3;
  expiresAtMs: number;
  evidence?: EvidenceRef;
};

type JudgeQuestion = {
  id: string;
  turnId: string;
  parentQuestionId?: string;
  text: string;
  evidence: EvidenceRef;
};
```

All times are milliseconds on the active attempt timeline. Pauses do not advance that timeline. Define a separate recording offset when mapping to video time. A selected evidence range is valid only for its matching attempt.

Metric messages are patches: a missing key means unchanged; an explicit value of null means unavailable. Do not turn null into zero. Lower-quality or stale values must lose their normal status styling.

Transcript updates upsert the same segment ID. A higher revision replaces an earlier partial; a final segment is committed once. Keep judge speech separate from presenter speech and metrics.

### Findings and reports

```ts
type FeedbackItem = {
  id: string;
  category: "delivery" | "content" | "qa";
  title: string;
  observation: string;
  nextAction: string;
  priority: 1 | 2 | 3;
  evidence: EvidenceRef;
  retryable: boolean;
};

type SessionReport = {
  ref: AttemptRef;
  completion: "complete" | "partial";
  durationMs: number;
  strengths: string[];
  findings: FeedbackItem[];
  comparison?: {
    priorAttemptId: string;
    findingId: string;
    criterion: string;
    before: string;
    after: string;
    result: "improved" | "needs_work" | "not_comparable";
  };
};

type SessionSnapshot = {
  ref: AttemptRef;
  config: SessionConfig;
  phase: SessionPhase;
  completedReports: SessionReport[];
};
```

Reports must use the same transcript and observation IDs as the studio. Preserve prior reports so a retry does not overwrite the evidence used for comparison.

### Event envelope and gateway

```ts
type EventMeta = AttemptRef & {
  eventId: string;
  seq: number;
  atMs: number;
  origin: "mock" | "live";
};

type EventPayload =
  | { type: "phase.changed"; phase: SessionPhase }
  | { type: "transcript.updated"; segment: TranscriptSegment }
  | { type: "metrics.updated"; patch: Partial<Metrics> }
  | { type: "cue.created"; cue: CoachCue }
  | { type: "coverage.updated"; items: string[] }
  | { type: "judge.question"; question: JudgeQuestion }
  | { type: "report.ready"; report: SessionReport }
  | {
      type: "stream.status";
      status: "connected" | "interrupted" | "closed";
    }
  | {
      type: "session.error";
      message: string;
      recoverable: boolean;
    };

type CoachEvent = EventMeta & EventPayload;

type CoachCommand =
  | { type: "start" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "finish_pitch" }
  | { type: "start_answer"; turnId: string }
  | { type: "submit_answer"; turnId: string; text: string }
  | { type: "finish_qa" };

interface CoachGateway {
  createSession(config: SessionConfig): Promise<SessionSnapshot>;
  getSession(sessionId: string): Promise<SessionSnapshot>;
  subscribe(
    ref: AttemptRef,
    onEvent: (event: CoachEvent) => void
  ): () => void;
  send(ref: AttemptRef, command: CoachCommand): Promise<void>;
  getReport(ref: AttemptRef): Promise<SessionReport>;
  createRetry(
    ref: AttemptRef,
    findingId: string
  ): Promise<SessionSnapshot>;
}
```

The normalized event stream has increasing sequence numbers within an attempt. Deduplicate event IDs and reject events for another session or attempt. The live adapter must normalize any separate provider streams before they reach the reducer.

Keep mock-specific controls in a separate development interface. Scenario selection, simulated failures, jumping, and speed changes must not become requirements of the real backend API.

## Deterministic mock implementation

### Fixture structure

Create one central scenario containing:

- Setup defaults.

- Ordered presentation events.

- Judge questions linked to those transcript segments.

- A vague-answer branch and a direct-answer branch.

- Report finding templates linked to observed event IDs.

- A short retry scenario.

- Optional matching sample media metadata.

Each scheduled item has an offset relative to the phase or command that activates it. The mock gateway stamps it with the current attempt ID, sequence number, and active-attempt timestamp.

The scheduler uses one monotonic clock and emits due events in order. Do not increment time by counting interval callbacks. Pause freezes the clock, event delivery, cue expiry, and any matching sample playback.

Use fixed delays for simulated create, thinking, and report generation. Keep scenario content deterministic; avoid randomly changing scores or unrelated metrics.

### Example event

```ts
const exampleMetricEvent: CoachEvent = {
  eventId: "demo-event-012",
  sessionId: "demo-hackathon",
  attemptId: "attempt-1",
  seq: 12,
  atMs: 18000,
  origin: "mock",
  type: "metrics.updated",
  patch: {
    paceWpm: { value: 182, quality: "good" },
    gestures: {
      value: null,
      quality: "unavailable",
      reason: "Hands outside the sample frame"
    }
  }
};
```

These are fixture values, not prescribed speaking targets or measurements of the person viewing the prototype.

### Default demo story

| Trigger or moment | Incoming data and visible result |
| --- | --- |
| Start | Countdown, empty transcript, unavailable initial metrics |
| Early presentation | A partial transcript grows and then finalizes in place |
| About 10 seconds into the pitch | Pace increases and one brief slowing cue appears |
| About 18 seconds | The presenter claims a 50 percent improvement |
| About 22 seconds | Gesture visibility becomes unavailable; the tile shows a capture limitation |
| About 28 seconds | Tracking recovers and the normal observation returns |
| End pitch | Judge asks what the 50 percent figure measures, citing the claim |
| Submit vague sample answer | Judge asks a follow-up about the missing measurement |
| Submit direct sample answer | Judge acknowledges the explanation or the honest validation gap |
| Finish Q&A | Report appears after a short pending state |
| Retry selected finding | A new attempt uses the same issue with a clearer sample answer |

The entire presentation can be short. The chosen target duration remains a maximum; a sample fixture does not need to fill a three- or five-minute session.

### Mock controls

Provide a small Demo controls menu containing scenario choice, pause, reset, next event, jump to Q&A, jump to review, simulated interruption, and playback speed.

Jumping must replay the required preceding fixture events through the reducer to produce a coherent state. Suppress repeated announcements during that fast replay. Do not set a report score independently of its transcript and evidence.

A mocked interruption retains the current state. Resume continues from the mock's last delivered position. Do not imply that the same resume behavior is already supported by a future backend.

### Consistent review and media

Build report values from delivered events and eligible finding templates. If the user stops early, show a partial report and omit future findings.

For the first deliverable, timestamp clicks can select transcript evidence. Add replay only when a matching bundled clip or actual recording exists. A real webcam preview combined with sample analysis must never be presented as proof that those sample findings occurred in the webcam footage.

Every mock view carries the Simulated coaching badge, including the review and retry comparison.

## State and lifecycle behavior

Use one reducer for session transitions, transcript upserts, metric patches, cues, questions, reports, and connection state. Components emit commands; they do not independently advance phases.

Keep three useful timers: active attempt time, presentation time, and current answer time. Presentation time advances only in the presenting phase. Answer time resets for each new turn. The active clock pauses when the session is paused.

On retry, create a new attempt ID, reset current metrics, transcript, cues, clocks, and sequence tracking, and retain completed reports. Cancel subscriptions for the previous attempt. Ignore late question events for an old turn.

Subscribe once from the session orchestration layer. Cleanup cancels scheduled work, removes listeners, and stops optional media tracks. If a camera request resolves after its owner has unmounted, stop the returned tracks immediately.

React runs an extra development setup and cleanup cycle for effects in Strict Mode. The subscription setup must therefore be safe to recreate, and its cleanup must fully undo the old subscription. Do not reuse a disposed mock connection. [React useEffect](https://react.dev/reference/react/useEffect).

Persist setup and completed report JSON after hydration. Keep active MediaStreams, object URLs, timers, and callbacks in memory. Browser storage must not be read during server rendering. A failed storage read should fall back to a clear restart path.

When leaving the practice route tree, stop the session and media. Switching between studio and review inside the shared layout preserves the session record. Completed processing must not restart simply because the review component remounts.

## File organization

| Location | Purpose |
| --- | --- |
| src/app/layout.tsx | Global metadata, fonts, and styling |
| src/app/page.tsx | Setup entry |
| src/app/practice/[sessionId]/layout.tsx | Shared session provider boundary |
| src/app/practice/[sessionId]/page.tsx | Practice studio entry |
| src/app/practice/[sessionId]/review/page.tsx | Review entry |
| src/components/ui/ | Shared UI primitives |
| src/components/setup/ | Setup and preflight components |
| src/components/studio/ | Preview, controls, transcript, coaching observations |
| src/components/judge/ | Question, evidence, and answer components |
| src/components/review/ | Summary, findings, evidence viewer, comparison |
| src/components/demo/ | Development and demo controls |
| src/features/coach/contracts.ts | Shared domain and event types |
| src/features/coach/reducer.ts | Normalized session state transitions |
| src/features/coach/SessionProvider.tsx | Session ownership and context |
| src/features/coach/useCoachSession.ts | UI-facing state and commands |
| src/features/coach/gateway.ts | Adapter interface and factory |
| src/features/coach/mock/ | Mock gateway, clock, and scripted branches |
| src/features/coach/mock/fixtures/ | Scenario data and event sequences |
| src/features/coach/session-repository.ts | Browser persistence and hydration |
| src/hooks/useCameraPreview.ts | Optional camera lifecycle |
| public/demo/ | Matching sample media, if provided |

Keep gateway selection in one factory. A public configuration flag may select mock or live mode, but no provider credentials belong in public environment variables. Selecting an unimplemented live adapter should show an explicit configuration error.

## Team ownership and build sequence

### Parallel work

Agree contracts, route names, design tokens, and the default fixture before splitting work.

| Workstream | Ownership | Integration boundary |
| --- | --- | --- |
| A | App setup, routes, contracts, reducer, mock gateway, persistence | useCoachSession and shared types |
| B | Practice studio, preview, transcript, observations, controls | Props and session commands |
| C | Setup, judge Q&A, review, evidence, retry comparison | Session config, questions, reports |

With two developers, combine A and C initially and keep B focused on the studio. One person owns shared contract changes so parallel work does not silently introduce incompatible shapes.

### Ordered implementation tickets

| Ticket | Work | Exit condition |
| --- | --- | --- |
| UI 01 | Bootstrap Next.js, tokens, primitives, and route shells | Setup, studio, and review render with consistent navigation |
| UI 02 | Define contracts and one scenario | Every required screen has coherent typed fixture data |
| UI 03 | Implement reducer and mock gateway | Start, pause, resume, end, Q&A, and report work through one interface |
| UI 04 | Build the static studio and transcript | All primary states render cleanly at laptop size |
| UI 05 | Connect the studio to mock events | Transcript revisions, observations, and single cues update coherently |
| UI 06 | Build judge Q&A | Vague and direct sample answers trigger different scripted outcomes |
| UI 07 | Build review and evidence navigation | Findings point to the actual delivered transcript |
| UI 08 | Add retry and comparison | New attempt retains the original report and targets the selected issue |
| UI 09 | Add recovery, optional camera, and polish | Permission denial, interruption, refresh, and narrow layouts remain usable |
| UI 10 | Run the demo and required checks | One person can repeat the full story reliably |

The first integration milestone is a complete plain flow through all three screens. Once that works, refine visual hierarchy, transitions, and device preview. A polished isolated screen is not the milestone.

## Backend integration handoff

Give the backend team the TypeScript contracts, one serialized event sequence, sample questions and reports, and the timing rules before they implement the real stream.

Agree these points explicitly:

- Session and attempt IDs, and how retry is represented.

- Whether transcript timestamps and recording timestamps share an origin.

- Partial transcript revisions and finalization.

- Metric units, missing values, quality, and stale-data behavior.

- Command acknowledgments and duplicate command handling.

- Question and answer turn IDs.

- Streaming transport, reconnection, and event ordering.

- Report readiness and whether reports may be partial.

- Authentication and any temporary client-token flow.

The frontend contract is independent of the transport. One possible backend mapping is createSession to an HTTP create endpoint, send to command requests, subscribe to a WebSocket stream, and getReport to an HTTP report endpoint. Agree actual endpoint names with the backend team.

Implement a future LiveCoachGateway that translates those responses into the existing contracts. Keep network errors and validation at that boundary. UI components should continue to consume the same state and actions.

Replacing the adapter also requires real capture, transcription, and model behavior from the responsible teams; the mock does not implement those capabilities.

## Acceptance criteria

### Functional

- The whole setup, presentation, Q&A, review, and retry flow works without a backend or API key.

- Form values appear consistently throughout the session.

- Simulation mode suppresses live coaching while retaining the debrief.

- Every primary control produces the intended state change.

- A vague and a direct sample answer produce distinguishable scripted judge responses.

- Review evidence exists in the transcript for that attempt.

- Ending early produces a partial, internally consistent report.

- A retry creates a new attempt and preserves its baseline report.

### Timing and data

- Pausing for ten seconds leaves the active timer, transcript, cue expiry, and script position unchanged.

- Partial transcript revisions update one segment instead of duplicating text.

- Missing measurements show an unavailable state rather than zero.

- Old-attempt and old-turn events cannot contaminate the current attempt.

- Reset and demo jumps produce the same state each time.

- Development remounts do not create duplicate subscriptions or timers.

### UX and device behavior

- The complete flow works without camera permission.

- Permission pending, denied, and unavailable states have a usable continuation.

- Mock feedback is visibly labeled even when real camera preview is enabled.

- Transcript evidence selection works without video.

- Playback controls appear only when matching media is available.

- Laptop and narrow-screen layouts remain readable, keyboard-operable, and free of clipped primary controls.

- Loading and error states preserve context and offer a meaningful next action.

### Verification scope

Run lint, TypeScript checks, and a production build. Add focused fake-clock checks for pause, transcript upserts, stale-event rejection, and cleanup; these protect the core simulator behavior. Run one end-to-end demo without device permission and manually inspect the main screens at a laptop viewport and a narrow mobile viewport.

Use the actual presentation browser for the final rehearsal. Check an additional browser only where media or layout behavior creates a concrete remaining risk.

## Suggested presentation demo

Use the sample hackathon scenario and a short walkthrough:

1. Load the preset and start practice.

2. Show a partial transcript becoming final and one restrained live cue.

3. End the pitch after the unsupported improvement claim.

4. Show the judge quoting that exact claim.

5. Choose the vague sample answer and let the follow-up target its missing evidence.

6. Open the review and select the corresponding transcript moment.

7. Start a short retry and show the prepared direct-answer comparison.

Use the demo menu to jump between states when time is limited. The simulator and all its feedback remain labeled throughout.

The UI team's success is a coherent experience that shows the presenter what to do next and gives the backend team a precise interface to connect.

## Technical references

- [Next.js installation and project setup](https://nextjs.org/docs/app/getting-started/installation)

- [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)

- [React effect setup and cleanup](https://react.dev/reference/react/useEffect)

- [MDN camera and microphone permissions](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)

Component names, routes, event contracts, demo timings, fixture values, and acceptance criteria above are implementation decisions for this proposed frontend. The snippets define interfaces; they are not a completed or tested application.

