import type { LiveFeedback } from "./contracts";

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
