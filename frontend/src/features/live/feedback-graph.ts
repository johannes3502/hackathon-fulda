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

/** Straight segments retain sharp changes without inventing extra measurements. */
export function lineValueAt(samples: GraphSample[], tMs: number) {
  if (!samples.length) return 0;
  if (tMs <= samples[0].tMs) return samples[0].balance;
  for (let index = 1; index < samples.length; index++) {
    const before = samples[index - 1],
      after = samples[index];
    if (tMs <= after.tMs) {
      const t = (tMs - before.tMs) / Math.max(1, after.tMs - before.tMs);
      return before.balance + (after.balance - before.balance) * t;
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
      return `${index ? "L" : "M"}${x(point.tMs)},${y(point.balance)}`;
    })
    .join(" ");
}

/** Match the line's sign exactly, including crossings between event knots. */
export function playbackGradient(samples: GraphSample[], durationMs: number) {
  if (durationMs <= 0 || !Number.isFinite(durationMs)) return "var(--muted)";
  const stops: string[] = [];
  const color = (balance: number) =>
    balance < 0
      ? "var(--success)"
      : balance > 0
        ? "var(--error)"
        : "var(--muted)";
  const band = (start: number, end: number, balance: number) => {
    if (end <= start) return;
    stops.push(
      `${color(balance)} ${(start / durationMs) * 100}% ${(end / durationMs) * 100}%`,
    );
  };
  for (let index = 1; index < samples.length; index++) {
    const before = samples[index - 1],
      after = samples[index];
    if (before.balance * after.balance < 0) {
      const crossing =
        before.tMs +
        ((after.tMs - before.tMs) * Math.abs(before.balance)) /
          (Math.abs(before.balance) + Math.abs(after.balance));
      band(before.tMs, crossing, before.balance);
      band(crossing, after.tMs, after.balance);
    } else {
      band(before.tMs, after.tMs, before.balance + after.balance);
    }
  }
  return stops.length
    ? `linear-gradient(to right, ${stops.join(", ")})`
    : "var(--muted)";
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
