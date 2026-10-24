import type {
  CoachEvent,
  EvidenceRef,
  Metrics,
  Observation,
  SessionSnapshot,
  SessionState,
} from "./contracts";

export function emptyMetrics(): Metrics {
  const missing = { value: null, quality: "unavailable" as const };
  return {
    paceWpm: { ...missing },
    fillerCount: { ...missing },
    posture: { ...missing },
    gestures: { ...missing },
    vocalVariation: { ...missing },
  };
}
export function initialState(snapshot: SessionSnapshot): SessionState {
  return {
    ...snapshot,
    transcript: [],
    metrics: emptyMetrics(),
    metricUpdatedAt: {},
    cues: [],
    activeCue: null,
    coverage: [],
    question: null,
    answerChoices: [],
    atMs: 0,
    presentationMs: 0,
    answerMs: 0,
    phaseStartedMs: 0,
    isPaused: false,
    connection: "connected",
    error: null,
    seq: 0,
    eventIds: [],
    selectedEvidence: null,
    retryTarget: null,
  };
}
export function currentObservation<K extends keyof Metrics>(
  state: SessionState,
  key: K,
): Observation<string | number> {
  const observation = state.metrics[key];
  const updated = state.metricUpdatedAt[key];
  if (
    updated !== undefined &&
    state.atMs - updated > 15000 &&
    observation.value !== null
  ) {
    return {
      value: null,
      quality: "unavailable",
      reason: "No recent sample observation",
    };
  }
  return observation;
}
export function validEvidence(state: SessionState, evidence: EvidenceRef) {
  return (
    evidence.attemptId === state.ref.attemptId &&
    evidence.segmentIds.length > 0 &&
    evidence.segmentIds.every((id) =>
      state.transcript.some((s) => s.id === id && s.isFinal),
    )
  );
}
export type SessionAction =
  | { type: "hydrate"; state: SessionState }
  | { type: "event"; event: CoachEvent }
  | { type: "select"; evidence: EvidenceRef };
export function sessionReducer(
  state: SessionState,
  action: SessionAction,
): SessionState {
  if (action.type === "hydrate") return action.state;
  if (action.type === "select")
    return validEvidence(state, action.evidence)
      ? { ...state, selectedEvidence: action.evidence }
      : state;
  const e = action.event;
  if (
    e.sessionId !== state.ref.sessionId ||
    e.attemptId !== state.ref.attemptId ||
    e.seq <= state.seq ||
    state.eventIds.includes(e.eventId)
  )
    return state;
  if (
    e.type === "judge.question" &&
    (state.phase !== "judge_thinking" ||
      (e.question.parentQuestionId
        ? e.question.parentQuestionId !== state.question?.id
        : state.question !== null))
  )
    return state;
  if (
    e.type === "transcript.updated" &&
    e.segment.turnId &&
    e.segment.turnId !== state.question?.turnId
  )
    return state;
  let next = {
    ...state,
    seq: e.seq,
    eventIds: [...state.eventIds.slice(-255), e.eventId],
    atMs: e.atMs,
  };
  if (next.activeCue && next.activeCue.expiresAtMs <= e.atMs)
    next.activeCue = null;
  switch (e.type) {
    case "phase.changed":
      next = {
        ...next,
        phase: e.phase,
        phaseStartedMs: e.atMs,
        answerMs: e.phase === "answering" ? 0 : next.answerMs,
      };
      break;
    case "transcript.updated": {
      const existing = state.transcript.find((s) => s.id === e.segment.id);
      if (
        existing &&
        (existing.isFinal || existing.revision >= e.segment.revision)
      )
        break;
      next.transcript = existing
        ? state.transcript.map((s) => (s.id === e.segment.id ? e.segment : s))
        : [...state.transcript, e.segment];
      break;
    }
    case "metrics.updated":
      next.metrics = { ...state.metrics, ...e.patch };
      next.metricUpdatedAt = { ...state.metricUpdatedAt };
      for (const key of Object.keys(e.patch) as (keyof Metrics)[])
        next.metricUpdatedAt[key] = e.atMs;
      break;
    case "cue.created": {
      const repeated = state.cues.some(
        (c) => c.message === e.cue.message && e.atMs < c.expiresAtMs + 6000,
      );
      if (
        !repeated &&
        (!next.activeCue || e.cue.priority < next.activeCue.priority)
      )
        next.activeCue = e.cue;
      if (!repeated) next.cues = [...state.cues, e.cue];
      break;
    }
    case "coverage.updated":
      next.coverage = e.items;
      break;
    case "judge.question":
      next.question = e.question;
      next.answerChoices = e.choices;
      break;
    case "report.ready":
      if (
        e.report.ref.attemptId === state.ref.attemptId &&
        e.report.ref.sessionId === state.ref.sessionId &&
        e.report.findings.every((f) => validEvidence(state, f.evidence))
      ) {
        next.completedReports = [
          ...state.completedReports.filter(
            (r) => r.ref.attemptId !== e.report.ref.attemptId,
          ),
          e.report,
        ];
      }
      break;
    case "stream.status":
      next.connection = e.status;
      break;
    case "session.error":
      next.error = e.message;
      break;
    case "clock.updated":
      next.presentationMs = e.presentationMs;
      next.answerMs = e.answerMs;
      break;
    case "pause.changed":
      next.isPaused = e.isPaused;
      if (!e.isPaused) next.error = null;
      break;
  }
  return next;
}
