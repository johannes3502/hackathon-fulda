import type { LiveFeedback, LiveMessage, LiveMetric } from "./contracts";
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown, max = 1200): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= max;
const ms = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;
export function validateEndpoint(value: string, securePage: boolean) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(
      "Enter a full WebSocket URL, such as ws://localhost:8000/live.",
    );
  }
  if (
    !["ws:", "wss:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.hash
  )
    throw new Error(
      "Use a ws:// or wss:// URL without embedded credentials or a fragment.",
    );
  if (securePage && url.protocol !== "wss:")
    throw new Error(
      "This HTTPS page needs a secure wss:// backend connection.",
    );
  return url.toString();
}
export function parseLiveMessage(
  raw: string,
  sessionId: string,
  lastSentMs: number,
): LiveMessage | null {
  if (raw.length > 64000) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!record(value) || value.sessionId !== sessionId) return null;
  if (value.type === "session.ready" || value.type === "session.complete")
    return { type: value.type, sessionId };
  if (value.type === "error" && text(value.message))
    return { type: "error", sessionId, message: value.message };
  if (value.type === "feedback") {
    const f = value.feedback;
    if (
      !record(f) ||
      !text(f.id, 100) ||
      !text(f.category, 80) ||
      !["positive", "suggestion", "attention"].includes(String(f.kind)) ||
      !ms(f.startMs) ||
      !ms(f.endMs) ||
      f.startMs > f.endMs ||
      f.endMs > lastSentMs ||
      !text(f.title, 160) ||
      !text(f.detail) ||
      !text(f.action)
    )
      return null;
    return { type: "feedback", sessionId, feedback: f as LiveFeedback };
  }
  if (
    value.type === "metrics" &&
    ms(value.atMs) &&
    value.atMs <= lastSentMs &&
    Array.isArray(value.metrics) &&
    value.metrics.length <= 12 &&
    value.metrics.every(
      (m) =>
        record(m) &&
        text(m.id, 100) &&
        text(m.label, 100) &&
        (m.value === null ||
          (typeof m.value === "number" && Number.isFinite(m.value)) ||
          text(m.value, 100)) &&
        (m.unit === undefined || text(m.unit, 30)),
    )
  )
    return {
      type: "metrics",
      sessionId,
      atMs: value.atMs,
      metrics: value.metrics as LiveMetric[],
    };
  return null;
}
export function upsertFeedback(items: LiveFeedback[], feedback: LiveFeedback) {
  const found = items.some((item) => item.id === feedback.id);
  return (
    found
      ? items.map((item) => (item.id === feedback.id ? feedback : item))
      : [...items, feedback]
  ).sort((a, b) => a.startMs - b.startMs);
}
export function clipRange(
  feedback: LiveFeedback,
  durationMs: number,
  contextMs = 2000,
) {
  return {
    start: Math.max(0, feedback.startMs - contextMs) / 1000,
    end: Math.min(durationMs, feedback.endMs + contextMs) / 1000,
  };
}
