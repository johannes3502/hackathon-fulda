import type { LiveFeedback } from "./contracts";
import { cueAppearance } from "./cue-appearance";

export type GraphMoment = {
  feedback: LiveFeedback;
  atMs: number;
  endMs: number;
  direction: -1 | 0 | 1;
};
export type GraphSample = { tMs: number; balance: number };

/** An event balance, not a score. The renderer places praise above neutral. */
export function feedbackGraph(feedback: LiveFeedback[], durationMs: number) {
  const duration = Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0;
  const moments: GraphMoment[] = feedback
    .filter(
      (item) =>
        item.category !== "question" &&
        Number.isFinite(item.startMs) &&
        Number.isFinite(item.endMs) &&
        item.startMs <= duration &&
        item.endMs >= 0 &&
        item.endMs >= item.startMs,
    )
    .map((item) => {
      const tone = cueAppearance(item, "ready").tone;
      return {
        feedback: item,
        atMs: Math.max(0, item.startMs),
        endMs: Math.min(duration, item.endMs),
        direction:
          tone === "positive"
            ? (-1 as const)
            : tone === "attention"
              ? (1 as const)
              : (0 as const),
      };
    })
    .sort(
      (a, b) => a.atMs - b.atMs || a.feedback.id.localeCompare(b.feedback.id),
    );
  const changes = new Map<number, number>();
  for (const moment of moments) {
    if (moment.atMs === moment.endMs) continue;
    changes.set(
      moment.atMs,
      (changes.get(moment.atMs) ?? 0) + moment.direction,
    );
    changes.set(
      moment.endMs,
      (changes.get(moment.endMs) ?? 0) - moment.direction,
    );
  }
  const samples: GraphSample[] = [{ tMs: 0, balance: 0 }];
  let balance = 0;
  for (const [tMs, delta] of [...changes].sort(([a], [b]) => a - b)) {
    samples.push({ tMs, balance });
    balance += delta;
    samples.push({ tMs, balance });
  }
  samples.push({ tMs: duration, balance: 0 });
  const extent = Math.max(
    1,
    ...samples.map((sample) => Math.abs(sample.balance)),
  );
  return { durationMs: duration, moments, samples, extent };
}
