import type { PoseSample } from "./sample";
// Prototype heuristics, not validated thresholds or assessments.
export const CROSS_ARMS = {
  // Each wrist past the body midline, in shoulder widths.
  minCross: 0.1,
  // Wrists between roughly shoulder and hip, in shoulder widths (up positive).
  minWristHeight: -1.3,
  maxWristHeight: 0.2,
  maxElbowDeg: 120,
  holdMs: 2000,
  cooldownMs: 20000,
};

type Pair = [left: number | null, right: number | null];
export type CrossArmsCheck = {
  crossed: boolean | null;
  cross: Pair;
  height: Pair;
  elbow: Pair;
};
export const passes = {
  cross: (v: number) => v >= CROSS_ARMS.minCross,
  height: (v: number) =>
    v >= CROSS_ARMS.minWristHeight && v <= CROSS_ARMS.maxWristHeight,
  elbow: (v: number) => v <= CROSS_ARMS.maxElbowDeg,
};

/** Per-sample inputs and result; crossed is null when points are not usable. */
export function crossArmsCheck(sample: PoseSample | null): CrossArmsCheck {
  const d = sample?.derived;
  const check = {
    cross: [d?.left_wrist_cross ?? null, d?.right_wrist_cross ?? null] as Pair,
    height: [
      d?.left_wrist_height ?? null,
      d?.right_wrist_height ?? null,
    ] as Pair,
    elbow: [d?.left_elbow_deg ?? null, d?.right_elbow_deg ?? null] as Pair,
  };
  const entries = Object.entries(check) as [keyof typeof passes, Pair][];
  const crossed = entries.some(([, pair]) => pair.includes(null))
    ? null
    : entries.every(([key, pair]) =>
        pair.every((v) => passes[key](v as number)),
      );
  return { crossed, ...check };
}

export const armsCrossed = (sample: PoseSample | null) =>
  crossArmsCheck(sample).crossed;

// Dwell, gaps and cooldown are handled by PoseEvaluator so hints and review share one clock.
