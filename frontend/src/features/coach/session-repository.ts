import type { SessionState } from "./contracts";

const key = (id: string) => `pitch-coach:v1:${id}`;
export function saveSession(state: SessionState) {
  try {
    sessionStorage.setItem(key(state.ref.sessionId), JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
export function loadSession(id: string): SessionState | null {
  try {
    const raw = sessionStorage.getItem(key(id));
    if (!raw) return null;
    const value = JSON.parse(raw) as SessionState;
    // Storage is expendable demo data. Reject malformed records and offer a fresh session.
    if (
      value.ref.sessionId !== id ||
      typeof value.ref.attemptId !== "string" ||
      typeof value.config.title !== "string" ||
      typeof value.config.context !== "string" ||
      ![60000, 180000, 300000].includes(value.config.targetDurationMs) ||
      !["coach", "simulation"].includes(value.config.mode) ||
      !["hackathon", "investor", "examiner"].includes(value.config.audience) ||
      !Array.isArray(value.config.criteria) ||
      !Array.isArray(value.transcript) ||
      !Array.isArray(value.completedReports) ||
      !Array.isArray(value.eventIds) ||
      !Array.isArray(value.cues) ||
      !Array.isArray(value.coverage) ||
      !Array.isArray(value.answerChoices) ||
      !value.metrics ||
      !value.metricUpdatedAt ||
      !Number.isFinite(value.atMs)
    )
      return null;
    if (
      !value.transcript.every(
        (s) =>
          typeof s.text === "string" &&
          typeof s.id === "string" &&
          Number.isFinite(s.startMs),
      )
    )
      return null;
    if (
      !value.completedReports.every(
        (r) =>
          r.ref.sessionId === id &&
          Array.isArray(r.transcript) &&
          Array.isArray(r.strengths) &&
          r.strengths.every((s) => typeof s === "string") &&
          Array.isArray(r.findings) &&
          r.findings.every(
            (f) =>
              typeof f.title === "string" &&
              Array.isArray(f.evidence.segmentIds),
          ),
      )
    )
      return null;
    if (
      ![
        "preflight",
        "countdown",
        "presenting",
        "judge_thinking",
        "judge_question",
        "answering",
        "report_pending",
        "review",
      ].includes(value.phase)
    )
      return null;
    return value;
  } catch {
    return null;
  }
}
