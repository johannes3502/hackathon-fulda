import type { LiveFeedback } from "./contracts";
import { cueAppearance } from "./cue-appearance";

export const needsPractice = (item: LiveFeedback) =>
  cueAppearance(item, "ready").tone === "attention";

export function reviewMoments(feedback: LiveFeedback[]) {
  return feedback
    .filter((item) => item.category !== "question")
    .sort((a, b) => a.startMs - b.startMs);
}

export function playbackAnnotation(
  feedback: LiveFeedback[],
  positionMs: number,
  selected: LiveFeedback | null,
) {
  const active = (item: LiveFeedback) =>
    positionMs >= item.startMs && positionMs <= item.endMs;
  return selected && active(selected)
    ? selected
    : (reviewMoments(feedback).find(
        (item) => active(item) && needsPractice(item),
      ) ?? null);
}
