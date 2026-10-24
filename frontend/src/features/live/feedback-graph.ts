import type { LiveFeedback } from "./contracts";
import { cueAppearance } from "./cue-appearance";

export type GraphMoment = {
  feedback: LiveFeedback;
  atMs: number;
  endMs: number;
  direction: -1 | 0 | 1;
};
export type GraphSample = { tMs: number; balance: number };

/** One knot per timestamp: interpolation changes presentation, not evidence. */
export function lineSamples(samples: GraphSample[]) {
  return [...new Map(samples.map((point) => [point.tMs, point])).values()].sort(
    (a, b) => a.tMs - b.tMs,
  );
}

/** Cubic easing with a linear time coordinate; cannot overshoot its evidence knots. */
export function lineValueAt(samples: GraphSample[], tMs: number) {
  if (!samples.length) return 0;
  if (tMs <= samples[0].tMs) return samples[0].balance;
  for (let index = 1; index < samples.length; index++) {
    const before = samples[index - 1],
      after = samples[index];
    if (tMs <= after.tMs) {
      const t = (tMs - before.tMs) / Math.max(1, after.tMs - before.tMs);
      return (
        before.balance + (after.balance - before.balance) * t * t * (3 - 2 * t)
      );
    }
  }
  return samples[samples.length - 1].balance;
}

export function feedbackLinePath(
  samples: GraphSample[],
  durationMs: number,
  extent: number,
) {
  const x = (t: number) => (t / Math.max(1, durationMs)) * 1000;
  const y = (balance: number) => 120 + (balance / Math.max(1, extent)) * 88;
  return samples
    .map((point, index) => {
      if (!index) return `M${x(point.tMs)},${y(point.balance)}`;
      const before = samples[index - 1];
      const third = (x(point.tMs) - x(before.tMs)) / 3;
      return `C${x(before.tMs) + third},${y(before.balance)} ${x(point.tMs) - third},${y(point.balance)} ${x(point.tMs)},${y(point.balance)}`;
    })
    .join(" ");
}

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
