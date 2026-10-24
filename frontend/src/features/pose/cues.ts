import type { PoseSample } from "./sample";
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
  // Forearms roughly level with the shoulders; rejects hands pressed
  // together with fingertips up in front of the chest.
  maxForearmDeg: 40,
};
export const POCKET = {
  // Wrist estimate close to the same-side hip, in shoulder widths. The other
  // condition is that Hand Landmarker finds no hand at that wrist.
  maxHipDist: 0.45,
};
export const CUE_TIMING = {
  // No hold or cooldown for now: hints show as soon as the pose is seen.
  holdMs: 0,
  releaseMs: 500,
  // Hidden points are common in both poses, so a missing measurement ends
  // an episode later than a clear "not in the pose".
  unknownReleaseMs: 1500,
  cooldownMs: 0,
};

type Pair = [left: number | null, right: number | null];
export type CrossArmsCheck = {
  crossed: boolean | null;
  cross: Pair;
  height: Pair;
  elbow: Pair;
  forearm: Pair;
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
  const entries = Object.entries(check) as [keyof typeof check, Pair][];
  const crossed = entries.some(([, pair]) => pair.includes(null))
    ? null
    : entries.every(([key, pair]) =>
        pair.every((v) => passes[key](v as number)),
      );
  return { crossed, ...check };
}

export const armsCrossed = (sample: PoseSample | null) =>
  crossArmsCheck(sample).crossed;

export type PocketCheck = {
  /** true if either hand is in a pocket; null if undecided. */
  inPocket: boolean | null;
  side: Flags;
  hipDist: Pair;
  /** Hand Landmarker found a hand at this wrist. */
  found: Flags;
};
type Flags = [left: boolean | null, right: boolean | null];
export function pocketCheck(sample: PoseSample | null): PocketCheck {
  const d = sample?.derived;
  const hipDist: Pair = [
    d?.left_wrist_hip_dist ?? null,
    d?.right_wrist_hip_dist ?? null,
  ];
  const found: Flags = [d?.left_hand_found ?? null, d?.right_hand_found ?? null];
  const side = ([0, 1] as const).map((i) => {
    const dist = hipDist[i];
    // A detected hand is never in a pocket, even if the hip is out of view.
    if (found[i]) return false;
    return dist === null || found[i] === null ? null : passes.hipDist(dist);
  }) as Flags;
  // One hand is enough; "no" needs both sides measured.
  const inPocket = side.includes(true)
    ? true
    : side.includes(null)
      ? null
      : false;
  return { inPocket, side, hipDist, found };
}

export const handsInPockets = (sample: PoseSample | null) =>
  pocketCheck(sample).inPocket;

/**
 * Turns per-sample results into one hint per episode: active once the pose
 * holds for holdMs, inactive after it is released, then a cooldown.
 */
export class PoseCue {
  private since: number | null = null;
  private lastSeen = -Infinity;
  private cooldownUntil = -Infinity;
  private active = false;
  constructor(private timing = CUE_TIMING) {}
  update(seen: boolean | null, now: number) {
    const { holdMs, releaseMs, unknownReleaseMs, cooldownMs } = this.timing;
    if (seen) {
      this.since ??= now;
      this.lastSeen = now;
    } else if (
      this.since !== null &&
      now - this.lastSeen >= (seen === false ? releaseMs : unknownReleaseMs)
    ) {
      if (this.active) this.cooldownUntil = now + cooldownMs;
      this.active = false;
      this.since = null;
    }
    if (
      !this.active &&
      this.since !== null &&
      this.lastSeen - this.since >= holdMs &&
      now >= this.cooldownUntil
    )
      this.active = true;
    return this.active;
  }
}

const detectors = {
  arms_crossed: armsCrossed,
  hands_in_pockets: handsInPockets,
};
export type PoseHint = keyof typeof detectors;

/** At most one hint at a time: the current one stays until it ends. */
export class PoseHints {
  private cues = {
    arms_crossed: new PoseCue(),
    hands_in_pockets: new PoseCue(),
  } satisfies Record<PoseHint, PoseCue>;
  private current: PoseHint | null = null;
  update(sample: PoseSample | null, now: number) {
    const active = (Object.keys(detectors) as PoseHint[]).filter((hint) =>
      this.cues[hint].update(detectors[hint](sample), now),
    );
    if (!this.current || !active.includes(this.current))
      this.current = active[0] ?? null;
    return this.current;
  }
}
