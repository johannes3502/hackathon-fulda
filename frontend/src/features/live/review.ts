import type { LiveFeedback, LiveRecording } from "./contracts";
import { cueAppearance } from "./cue-appearance";
import { factFeedback } from "../factcheck/api";

export const needsPractice = (item: LiveFeedback) =>
  cueAppearance(item, "ready").tone === "attention";

export function reviewMoments(feedback: LiveFeedback[]) {
  return feedback
    .filter((item) => item.category !== "question")
    .sort((a, b) => a.startMs - b.startMs);
}

/** Keep saved source-check annotations aligned with the take's latest verdicts. */
export function recordingFeedback(
  recording: Pick<LiveRecording, "feedback" | "factCheck" | "durationMs">,
) {
  if (!recording.factCheck) return reviewMoments(recording.feedback);
  return reviewMoments([
    ...recording.feedback.filter(
      (item) =>
        item.category.toLowerCase() !== "fact" && !/^fact-\d+$/.test(item.id),
    ),
    ...factFeedback(recording.factCheck, recording.durationMs),
  ]);
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
