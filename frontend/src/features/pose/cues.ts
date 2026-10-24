import { HEURISTICS, type PoseSample } from "./sample";
// Prototype heuristics, not validated thresholds or assessments.
export const CROSS_ARMS = {
  // Each wrist at, near or past the body midline, in shoulder widths.
  // MediaPipe usually places the hidden wrists of crossed arms at the
  // midline rather than on the opposite side, so "past" alone misses them.
  minCross: -0.25,
  // Wrists between roughly shoulder and hip, in shoulder widths (up positive).
  minWristHeight: -1.3,
  maxWristHeight: 0.2,
  maxElbowDeg: 120,
  maxForearmDeg: 40,
  holdMs: 2000,
  // Legacy native cue release behavior. The web PoseEvaluator only uses
  // unknownReleaseMs, to bridge hidden wrists while arms stay crossed.
  releaseMs: 500,
  // Crossed wrists are often hidden under the other arm, so a missing
  // measurement ends an episode later than a clear "not crossed".
  unknownReleaseMs: 1500,
  cooldownMs: 20000,
  // One-sided crossing: a hand tucked under the other arm is invisible, and
  // MediaPipe guesses its wrist near its own elbow. Then one arm must cross
  // the midline itself and the tucked wrist must stay apart from it, unlike
  // hands held together.
  tuckedMinCross: 0,
  tuckedMinWristGap: 0.35,
};
type Timing = Pick<
  typeof CROSS_ARMS,
  "holdMs" | "releaseMs" | "unknownReleaseMs" | "cooldownMs"
>;
export const POCKET = {
  // Wrist estimate close to the same-side hip, in shoulder widths. The other
  // condition is that Hand Landmarker finds no hand at that wrist.
  maxHipDist: 0.45,
};

type Pair = [left: number | null, right: number | null];
export type CrossArmsCheck = {
  crossed: boolean | null;
  cross: Pair;
  height: Pair;
  elbow: Pair;
  forearm: Pair;
  // Arm whose hand is tucked (0 = left, 1 = right); null for both crossed.
  tucked: 0 | 1 | null;
  // Crossing reported in events: the smaller of both, or the crossing arm.
  measure: number | null;
};
export const passes = {
  cross: (v: number) => v >= CROSS_ARMS.minCross,
  height: (v: number) =>
    v >= CROSS_ARMS.minWristHeight && v <= CROSS_ARMS.maxWristHeight,
  elbow: (v: number) => v <= CROSS_ARMS.maxElbowDeg,
  forearm: (v: number) => v <= CROSS_ARMS.maxForearmDeg,
  hipDist: (v: number) => v <= POCKET.maxHipDist,
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
    forearm: [
      d?.left_forearm_deg ?? null,
      d?.right_forearm_deg ?? null,
    ] as Pair,
  };
  const entries = Object.entries(check) as [keyof typeof passes, Pair][];
  const both = entries.some(([, pair]) => pair.includes(null))
    ? null
    : entries.every(([key, pair]) =>
        pair.every((v) => passes[key](v as number)),
      );
  if (both)
    return {
      crossed: true,
      ...check,
      tucked: null,
      measure: Math.min(...(check.cross as number[])),
    };
  const crossing = (i: 0 | 1) =>
    entries.every(([key, pair]) => {
      const v = pair[i];
      return v !== null && passes[key](v);
    }) && check.cross[i]! >= CROSS_ARMS.tuckedMinCross;
  // Bent at chest height, or hidden entirely under the other arm.
  const tucked = (i: 0 | 1) => {
    const [height, elbow] = [check.height[i], check.elbow[i]];
    if (height === null && check.cross[i] === null) return true;
    return (
      height !== null &&
      elbow !== null &&
      passes.height(height) &&
      passes.elbow(elbow)
    );
  };
  const gap = wristGap(sample);
  const arm = ([0, 1] as const).find(
    (i) =>
      crossing(i) &&
      tucked(i === 0 ? 1 : 0) &&
      (gap === null || gap >= CROSS_ARMS.tuckedMinWristGap),
  );
  if (arm !== undefined)
    return {
      crossed: true,
      ...check,
      tucked: arm === 0 ? 1 : 0,
      measure: check.cross[arm],
    };
  return { crossed: both, ...check, tucked: null, measure: null };
}

/** Distance between both visible wrists in shoulder widths. */
function wristGap(sample: PoseSample | null) {
  if (!sample) return null;
  const { pose: p, image } = sample;
  const points = [
    p.left_wrist,
    p.right_wrist,
    p.left_shoulder,
    p.right_shoulder,
  ];
  if (
    !points.every((point) => point && (point[3] ?? 0) >= HEURISTICS.confidence)
  )
    return null;
  const [lw, rw, ls, rs] = points as NonNullable<(typeof points)[number]>[];
  const dist = (a: typeof lw, b: typeof lw) =>
    Math.hypot((a[0] - b[0]) * image.width, (a[1] - b[1]) * image.height);
  const span = dist(ls, rs);
  return span > 1e-8 ? dist(lw, rw) / span : null;
}

export const armsCrossed = (sample: PoseSample | null) =>
  crossArmsCheck(sample).crossed;

export type PocketCheck = {
  /** true if either hand is in a pocket; null if undecided. */
  inPocket: boolean | null;
  side: [left: boolean | null, right: boolean | null];
  hipDist: Pair;
  /** Hand Landmarker found a hand at this wrist. */
  found: [left: boolean | null, right: boolean | null];
};
export function pocketCheck(sample: PoseSample | null): PocketCheck {
  const d = sample?.derived;
  const hipDist: Pair = [
    d?.left_wrist_hip_dist ?? null,
    d?.right_wrist_hip_dist ?? null,
  ];
  const found: PocketCheck["found"] = [
    d?.left_hand_found ?? null,
    d?.right_hand_found ?? null,
  ];
  const side = ([0, 1] as const).map((i) => {
    const dist = hipDist[i];
    // A detected hand is never in a pocket, even if the hip is out of view.
    if (found[i]) return false;
    return dist === null || found[i] === null ? null : passes.hipDist(dist);
  }) as PocketCheck["side"];
  // One hand is enough; "no" needs both sides measured.
  const inPocket = side.includes(true)
    ? true
    : side.includes(null)
      ? null
      : false;
  return { inPocket, side, hipDist, found };
}

/**
 * Native-app compatibility adapter. Web uses PoseEvaluator for canonical events.
 * Turns per-sample results into one hint per episode: active once arms stay
 * crossed for holdMs, inactive after they are released, then a cooldown.
 */
export class CrossArmsCue {
  private since: number | null = null;
  private lastCrossed = -Infinity;
  private cooldownUntil = -Infinity;
  private active = false;
  constructor(private timing: Timing = CROSS_ARMS) {}
  update(crossed: boolean | null, now: number) {
    const { holdMs, releaseMs, unknownReleaseMs, cooldownMs } = this.timing;
    if (crossed) {
      this.since ??= now;
      this.lastCrossed = now;
    } else if (
      this.since !== null &&
      now - this.lastCrossed >=
        (crossed === false ? releaseMs : unknownReleaseMs)
    ) {
      if (this.active) this.cooldownUntil = now + cooldownMs;
      this.active = false;
      this.since = null;
    }
    if (
      !this.active &&
      this.since !== null &&
      this.lastCrossed - this.since >= holdMs &&
      now >= this.cooldownUntil
    )
      this.active = true;
    return this.active;
  }
}
