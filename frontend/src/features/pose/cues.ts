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
  releaseMs: 500,
  // Crossed wrists are often hidden under the other arm, so a missing
  // measurement ends an episode later than a clear "not crossed".
  unknownReleaseMs: 1500,
  cooldownMs: 20000,
};

/** true/false from one sample; null when the needed points are not usable. */
export function armsCrossed(sample: PoseSample | null) {
  if (!sample) return null;
  const d = sample.derived;
  const values = [
    d.left_wrist_cross,
    d.right_wrist_cross,
    d.left_wrist_height,
    d.right_wrist_height,
    d.left_elbow_deg,
    d.right_elbow_deg,
  ];
  if (values.some((v) => v === null)) return null;
  const [leftCross, rightCross, leftHeight, rightHeight, leftElbow, rightElbow] =
    values as number[];
  const inBand = (h: number) =>
    h >= CROSS_ARMS.minWristHeight && h <= CROSS_ARMS.maxWristHeight;
  return (
    leftCross >= CROSS_ARMS.minCross &&
    rightCross >= CROSS_ARMS.minCross &&
    inBand(leftHeight) &&
    inBand(rightHeight) &&
    leftElbow <= CROSS_ARMS.maxElbowDeg &&
    rightElbow <= CROSS_ARMS.maxElbowDeg
  );
}

/**
 * Turns per-sample results into one hint per episode: active once arms stay
 * crossed for holdMs, inactive after they are released, then a cooldown.
 */
export class CrossArmsCue {
  private since: number | null = null;
  private lastCrossed = -Infinity;
  private cooldownUntil = -Infinity;
  private active = false;
  update(crossed: boolean | null, now: number) {
    if (crossed) {
      this.since ??= now;
      this.lastCrossed = now;
    } else if (
      this.since !== null &&
      now - this.lastCrossed >=
        (crossed === false
          ? CROSS_ARMS.releaseMs
          : CROSS_ARMS.unknownReleaseMs)
    ) {
      if (this.active) this.cooldownUntil = now + CROSS_ARMS.cooldownMs;
      this.active = false;
      this.since = null;
    }
    if (
      !this.active &&
      this.since !== null &&
      this.lastCrossed - this.since >= CROSS_ARMS.holdMs &&
      now >= this.cooldownUntil
    )
      this.active = true;
    return this.active;
  }
}
