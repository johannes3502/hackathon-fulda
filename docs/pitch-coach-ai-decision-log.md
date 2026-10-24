# Pitch Coach implementation log

2026-10-24. Source: this implementation session. These are agent-made implementation decisions and observed corrections, not invented human approvals or user-study findings. Human review remains to be recorded by the team.

| Task | Agent output / risk | Decision or correction | Evidence |
|---|---|---|---|
| UI inspiration | Recording products can imply actual capture | Used Mobbin’s stage/sidebar hierarchy; kept camera optional and labeled preview separate from simulated analysis | `frontend/DESIGN.md`, `PracticeStudio.tsx` |
| Live simulation | Independent screen timers could drift or continue during pause | One monotonic mock clock and one provider subscription; pauses freeze event delivery and cue expiry | Clock and lifecycle tests in `coach.test.ts` |
| Report consistency | A prewritten report could cite a claim never delivered | Construct findings from finalized, delivered transcript segments | Early-finish and evidence-membership tests |
| Retry | Initial implementation repeated the whole pitch instead of focusing on the answer | Retry now carries prior evidence as judge context and returns directly to the evidence question | Focused-retry regression in `coach.test.ts` |
| Responsive preview | Browser testing found an aspect-ratio/minimum-height combination overflowing 375px | Explicit width bounds and independent mobile stage height | `noOverflow` assertions throughout `practice.spec.ts` |
| Demo controls | Local speed selection could disagree with the simulator after jumps or route changes | Synchronize displayed speed through session orchestration | Playback-speed regression in `practice.spec.ts` |
| Camera permissions | A delayed permission response could leak tracks after exit | Invalidate pending requests and stop returned tracks on stale completion | Late-camera cleanup browser test |
| Camera extension | A new request needs actual video while the original rehearsal only has transcript fixtures | Added a separate `/live` workspace; real silent capture with clearly labeled scripted markers or backend feedback | `frontend/tests/live.spec.ts` |
| Original backend contract (superseded) | The real endpoint was not available; the user requested a replaceable proposal | Encoded chunks over WebSocket with session acknowledgement, monotonic ranges and validated feedback; preserved local video on disconnect | Original prototype in Git history; replaced by HTTP upload/status in `docs/pitch-coach-handoff.md` |
| Replay meaning | Feedback counts or example markers could be mistaken for measured quality | Label frequencies and scripted examples; no invented performance score | Live review and category filter screens |
| Last-section looping | Encoded video can end slightly before the capture-clock duration, leaving the last section stopped | Handle the native video end event as well as the selected range boundary | End-of-file looping regression in `frontend/tests/live.spec.ts` |

Acceleration: typed contracts and deterministic fixture enabled UI integration without backend credentials; automated browser checks exercised both laptop and phone layouts.

Limits: scripted sample comparisons are not measured user improvement; browser emulation is not physical-device acceptance. No live model evaluation, public deployment, or real hardware validation is claimed.
