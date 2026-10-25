import { HEURISTICS, type PoseSample } from "./sample";
import { CROSS_ARMS, crossArmsCheck } from "./cues";
import type { PoseRuntime } from "./options";
import type { LabRule } from "./lab-events";
import { PositiveFeedback } from "../live/positive-feedback";

// Engineering settings for a visible, reproducible prototype, NOT validated
// presentation-quality cutoffs. Rationale and acceptance protocol: docs/04-gesture-evaluation.md.
export const POSE_RULES = Object.freeze({
  version: "pose-rules-v7",
  calibrationMs: 3000,
  calibrationSamples: 15,
  maxGapMs: 350,
  minimumTorsoHeight: 0.12,
  baselineLeanRangeDeg: 6,
  baselineHandRange: 0.3,
  neutralRaisedMax: -0.15,
  neutralDistanceMin: 0.65,
  staleFrameMs: 700,
  inferenceTimeoutMs: 5000,
  raisedEnter: 0.15,
  raisedExit: 0.05,
  raisedDelta: 0.5,
  togetherEnter: 0.35,
  togetherExit: 0.5,
  leanEnterDeg: 12,
  leanExitDeg: 8,
  shiftEnter: 0.35,
  shiftExit: 0.2,
  // Head direction relative to the calibrated neutral head, not gaze.
  headTurnEnter: 0.5,
  headTurnExit: 0.35,
  headDownEnter: 0.1,
  headDownExit: 0.06,
  cooldownMs: 5000,
  // Live hint timing; the admin panel can override these defaults per browser.
  // A pose must hold this long before it becomes an event and a hint.
  stabilizeHoldMs: 2000,
  // A shown hint, pose or voice, stays at least this long.
  minDisplayMs: 3000,
  // Blank bubble between two consecutive hints; 0 swaps back-to-back.
  minDisplayGapMs: 2000,
});
export const POSE_RULE_IDS = [
  "hand_raised",
  "hands_together",
  "arms_crossed",
  "torso_lean",
  "body_shift",
  "head_turned",
  "head_down",
] as const;
export type PoseRule = (typeof POSE_RULE_IDS)[number];
// on: live hint and review; review: timeline only; off: not observed.
export type PoseRuleMode = "on" | "review" | "off";
// Title, detail and action per rule.
export const RULE_COPY: Record<PoseRule, readonly [string, string, string]> = {
  hand_raised: [
    "Hand above shoulder",
    "A wrist stayed above its shoulder in the camera image. A held gesture can mark emphasis; its purpose depends on the spoken point.",
    "Replay this emphasis: did the movement support the point you were making?",
  ],
  hands_together: [
    "Hands held together",
    "Your wrists stayed close together in front of your torso. This can be a comfortable resting position; check whether it limits a gesture you wanted to make.",
    "Review whether this was intentional. Try opening your hands for the next explanation if comfortable.",
  ],
  torso_lean: [
    "Sideways lean",
    "Your torso angle changed sideways from your neutral position. A held lean may shift your balance; check whether it was comfortable and intentional.",
    "Check the moment in context. Return to your comfortable starting position if you want to compare.",
  ],
  body_shift: [
    "Sideways position change",
    "Your torso moved sideways in the camera image from its neutral position. Movement can support a transition; check whether you remained in frame. Camera movement can also cause this marker.",
    "Was this move intentional? Replay it in context. Camera movement can also cause this observation.",
  ],
  arms_crossed: [
    "Arms crossed in front of torso",
    "A wrist crossed the body midline with a bent elbow; the other hand was crossed or tucked under the arm in the camera image. Holding this position can limit room for an explanatory gesture; it says nothing about personality or emotion.",
    "If comfortable, release your arms and try an open hand movement with the main point. Compare the versions in the video.",
  ],
  head_turned: [
    "Head turned to the side",
    "Your nose moved towards one ear compared with your neutral head position in the camera image. Staying turned can direct your explanation towards the slides; check the context. Eye contact is not measured.",
    "Replay this moment: were you reading the slides? Turn back towards the audience when it fits. Eye contact is not measured.",
  ],
  head_down: [
    "Head tilted down",
    "Your nose dropped below your neutral head position relative to the ears in the camera image. Check whether reading notes kept your head down through an explanation. Eye contact is not measured.",
    "Replay this moment: were you reading notes? Lift your head towards the audience if comfortable. Eye contact is not measured.",
  ],
};
export type PoseEvent = {
  session_id: string;
  id: string;
  t_ms: number;
  duration_ms: number;
  type: "gesture" | "posture" | "gaze";
  severity: "info" | "hint";
  source: "browser";
  payload: {
    runtime?: PoseRuntime;
    rule: PoseRule | LabRule;
    rule_version: string;
    heuristic: true;
    title: string;
    detail: string;
    action: string;
    // Pose lab rules have no calibrated baseline or single threshold.
    measurement: number | null;
    initial_measurement: number | null;
    baseline: number | null;
    threshold: number | null;
    unit: "shoulder widths" | "degrees" | "ear-distance ratio" | null;
    confirmed_at_ms: number;
    calibration: Baseline | null;
    values?: Record<string, number | boolean | string | null>;
  };
};
type Features = {
  lean: number;
  raised: number | null;
  distance: number | null;
  centerX: number;
  shoulderWidth: number;
  cross: number | null;
  yaw: number | null;
  drop: number | null;
  handsVisible: boolean;
};
type Baseline = {
  lean: number;
  raised: number | null;
  distance: number | null;
  centerX: number;
  shoulderWidth: number;
  cross: number | null;
  yaw: number | null;
  drop: number | null;
};
export type PoseEvaluation = {
  phase: "framing" | "calibrating" | "ready";
  message: string;
  calibrationProgress: number;
  baseline: Baseline | null;
  handsVisible: boolean;
  cue: PoseEvent | null;
  events: PoseEvent[];
  measurements: {
    leanDelta: number;
    shiftDelta: number;
    yawDelta: number | null;
    dropDelta: number | null;
  } | null;
};
type Hold = { start: number; last: number; event: PoseEvent | null };
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};
const spread = (values: number[]) => Math.max(...values) - Math.min(...values);
function usable(point: PoseSample["pose"][keyof PoseSample["pose"]]) {
  return (
    !!point &&
    point.slice(0, 3).every(Number.isFinite) &&
    point[0] >= 0 &&
    point[0] <= 1 &&
    point[1] >= 0 &&
    point[1] <= 1 &&
    (point[3] ?? 0) >= HEURISTICS.confidence &&
    (point[4] === null || point[4] >= HEURISTICS.confidence)
  );
}
function features(sample: PoseSample | null): Features | null {
  if (!sample || !sample.quality.pose_present) return null;
  const {
    pose: p,
    image: { width, height },
    derived: d,
  } = sample;
  if (
    ![width, height].every((n) => Number.isFinite(n) && n > 0) ||
    ![p.left_shoulder, p.right_shoulder, p.left_hip, p.right_hip].every(
      usable,
    ) ||
    d.torso_lean_deg === null ||
    !Number.isFinite(d.torso_lean_deg)
  )
    return null;
  const ls = p.left_shoulder!,
    rs = p.right_shoulder!,
    lh = p.left_hip!,
    rh = p.right_hip!;
  const span = Math.hypot((ls[0] - rs[0]) * width, (ls[1] - rs[1]) * height);
  const top = (ls[1] + rs[1]) / 2;
  const bottom = (lh[1] + rh[1]) / 2;
  if (span <= 1e-8 || bottom - top < POSE_RULES.minimumTorsoHeight) return null;
  const hands = [
    p.left_elbow,
    p.right_elbow,
    p.left_wrist,
    p.right_wrist,
  ].every(usable);
  const heights = [d.left_wrist_height, d.right_wrist_height].filter(
    (value, i): value is number =>
      usable(i === 0 ? p.left_wrist : p.right_wrist) &&
      value !== null &&
      Number.isFinite(value),
  );
  const raised = heights.length ? Math.max(...heights) : null;
  // Only compare hands in the torso band; overlapping wrists elsewhere are not "together".
  const inBand =
    hands &&
    [p.left_wrist!, p.right_wrist!].every((w) => w[1] >= top && w[1] <= bottom);
  const distance = inBand
    ? Math.hypot(
        (p.left_wrist![0] - p.right_wrist![0]) * width,
        (p.left_wrist![1] - p.right_wrist![1]) * height,
      ) / span
    : null;
  const cross = crossArmsCheck(sample);
  return {
    lean: d.torso_lean_deg,
    raised,
    distance,
    centerX: (ls[0] + rs[0] + lh[0] + rh[0]) / 4,
    shoulderWidth: span / width,
    cross:
      cross.crossed === null
        ? null
        : (cross.measure ?? Math.min(...(cross.cross as number[]))),
    yaw: sample.head.yaw_ratio,
    drop: sample.head.drop_ratio,
    handsVisible: hands,
  };
}

export class PoseEvaluator {
  private positive = new PositiveFeedback(
    {
      id: `${this.sessionId}-steady-posture`,
      category: "Posture",
      title: "Torso steady near your reference",
      detail:
        "Measured sideways torso angle and position stayed within the calibrated reference ranges. Prototype heuristic; this does not assess the meaning of a gesture.",
      action:
        "Replay this stable position and compare it with a flagged passage.",
    },
    POSE_RULES.maxGapMs,
    POSE_RULES.stabilizeHoldMs,
  );
  get positiveFeedback() {
    return this.positive.feedback;
  }
  private baseline: Baseline | null = null;
  private calibration: { t: number; f: Features }[] = [];
  private previous = -Infinity;
  private holds = new Map<PoseRule, Hold>();
  private cooldown = new Map<PoseRule, number>();
  private events: PoseEvent[] = [];
  private lastCueId: string | null = null;
  private cueUntil = 0;
  constructor(
    private sessionId = "preview",
    // Admin-adjustable timing; defaults come from POSE_RULES.
    private timing: {
      stabilizeHoldMs: number;
      minDisplayMs: number;
    } = POSE_RULES,
    // Admin switches per rule; missing rules are on.
    private modes: Partial<Record<PoseRule, PoseRuleMode>> = {},
  ) {}

  setModes(modes: Partial<Record<PoseRule, PoseRuleMode>>) {
    this.modes = modes;
  }

  update(sample: PoseSample | null, t: number): PoseEvaluation {
    const state = (
      phase: PoseEvaluation["phase"],
      message: string,
      progress = 0,
      handsVisible = false,
      cue: PoseEvent | null = null,
    ): PoseEvaluation => ({
      phase,
      message,
      calibrationProgress: progress,
      baseline: this.baseline,
      handsVisible,
      cue,
      events: [...this.events],
      measurements: null,
    });
    // Duplicated/backwards frames cannot add evidence or advance dwell time.
    if (!Number.isFinite(t) || t < 0 || t <= this.previous)
      return state("framing", "Waiting for a fresh camera frame.");
    const gap = t - this.previous > POSE_RULES.maxGapMs;
    this.previous = t;
    const f = features(sample);
    if (gap || !f) this.positive.update(t, false);
    if (gap || !f) {
      for (const [rule, hold] of this.holds) {
        if (hold.event)
          this.cooldown.set(
            rule,
            hold.last +
              (rule === "arms_crossed"
                ? CROSS_ARMS.cooldownMs
                : POSE_RULES.cooldownMs),
          );
      }
      this.holds.clear();
      this.calibration = [];
      this.lastCueId = null;
    }
    if (!f)
      return state(
        "framing",
        "Keep shoulders and hips in frame, facing the camera. Move back if cropped, or closer if too small.",
      );
    if (!this.baseline) {
      this.calibration.push({ t, f });
      const lean = this.calibration.map((s) => s.f.lean);
      if (
        spread(lean) > POSE_RULES.baselineLeanRangeDeg ||
        spread(this.calibration.map((s) => s.f.centerX)) / f.shoulderWidth >
          POSE_RULES.baselineHandRange
      ) {
        this.calibration = [{ t, f }];
        return state(
          "calibrating",
          "Hold your comfortable neutral position still for 3 seconds.",
        );
      }
      const duration = t - this.calibration[0].t;
      if (
        duration < POSE_RULES.calibrationMs ||
        this.calibration.length < POSE_RULES.calibrationSamples
      )
        return state(
          "calibrating",
          "Calibrating your neutral position… hold still for 3 seconds.",
          Math.min(1, duration / POSE_RULES.calibrationMs),
          true,
        );
      // Moving or cropped hands must not block the torso baseline. Only record
      // a neutral hand reference when enough genuinely neutral samples exist.
      const neutral = this.calibration
        .map((s) => s.f)
        .filter(
          (s) =>
            s.raised !== null &&
            s.distance !== null &&
            s.raised <= POSE_RULES.neutralRaisedMax &&
            s.distance >= POSE_RULES.neutralDistanceMin,
        );
      const handReference = (key: "raised" | "distance" | "cross") => {
        const values = neutral
          .map((s) => s[key])
          .filter((v): v is number => v !== null);
        return values.length >= POSE_RULES.calibrationSamples
          ? median(values)
          : null;
      };
      // The head reference uses every calibration frame with a measurable head.
      const headReference = (key: "yaw" | "drop") => {
        const values = this.calibration
          .map((s) => s.f[key])
          .filter((v): v is number => v !== null);
        return values.length >= POSE_RULES.calibrationSamples
          ? median(values)
          : null;
      };
      this.baseline = {
        lean: median(lean),
        raised: handReference("raised"),
        distance: handReference("distance"),
        centerX: median(this.calibration.map((s) => s.f.centerX)),
        shoulderWidth: median(this.calibration.map((s) => s.f.shoulderWidth)),
        cross: handReference("cross"),
        yaw: headReference("yaw"),
        drop: headReference("drop"),
      };
      this.calibration = [];
    }
    const baseline = this.baseline;
    const raisedThreshold = Math.max(
      POSE_RULES.raisedEnter,
      baseline.raised === null
        ? POSE_RULES.raisedEnter
        : baseline.raised + POSE_RULES.raisedDelta,
    );
    const togetherThreshold = Math.min(
      POSE_RULES.togetherEnter,
      baseline.distance === null
        ? POSE_RULES.togetherEnter
        : baseline.distance / 2,
    );
    const crossCheck = crossArmsCheck(sample);
    // Tolerant wrist geometry also matches hands held together on their own
    // sides. Keep the existing together rule for this ambiguous configuration.
    // A wrist reaching the opposite side still permits the tolerant arm rule.
    const togetherLimit = this.holds.has("hands_together")
      ? togetherThreshold + (POSE_RULES.togetherExit - POSE_RULES.togetherEnter)
      : togetherThreshold;
    const togetherOnOwnSides =
      f.distance !== null &&
      f.distance <= togetherLimit &&
      crossCheck.cross.every((value) => value !== null && value < 0);
    const crossed = togetherOnOwnSides ? false : crossCheck.crossed;
    this.rule(
      "hand_raised",
      f.raised,
      baseline.raised,
      raisedThreshold,
      f.raised !== null &&
        f.raised >=
          (this.holds.has("hand_raised")
            ? raisedThreshold - (POSE_RULES.raisedEnter - POSE_RULES.raisedExit)
            : raisedThreshold),
      this.timing.stabilizeHoldMs,
      t,
    );
    this.rule(
      "hands_together",
      f.distance,
      baseline.distance,
      togetherThreshold,
      crossed !== true && f.distance !== null && f.distance <= togetherLimit,
      this.timing.stabilizeHoldMs,
      t,
    );
    this.rule(
      "arms_crossed",
      f.cross,
      baseline.cross,
      CROSS_ARMS.minCross,
      crossed === true,
      this.timing.stabilizeHoldMs,
      t,
      // Crossed wrists hide each other; unknown frames do not end the hold.
      crossed === null ? CROSS_ARMS.unknownReleaseMs : 0,
    );
    const leanDelta = Math.abs(f.lean - baseline.lean);
    this.rule(
      "torso_lean",
      leanDelta,
      baseline.lean,
      POSE_RULES.leanEnterDeg,
      leanDelta >=
        (this.holds.has("torso_lean")
          ? POSE_RULES.leanExitDeg
          : POSE_RULES.leanEnterDeg),
      this.timing.stabilizeHoldMs,
      t,
    );
    const shiftDelta =
      Math.abs(f.centerX - baseline.centerX) / baseline.shoulderWidth;
    this.positive.update(
      t,
      this.modes.torso_lean !== "off" &&
        this.modes.body_shift !== "off" &&
        leanDelta < POSE_RULES.leanExitDeg &&
        shiftDelta < POSE_RULES.shiftExit,
    );
    this.rule(
      "body_shift",
      shiftDelta,
      0,
      POSE_RULES.shiftEnter,
      leanDelta < POSE_RULES.leanExitDeg &&
        shiftDelta >=
          (this.holds.has("body_shift")
            ? POSE_RULES.shiftExit
            : POSE_RULES.shiftEnter),
      this.timing.stabilizeHoldMs,
      t,
    );
    // Without a head reference, a centred nose is the neutral turn.
    const yawDelta =
      f.yaw === null ? null : Math.abs(f.yaw - (baseline.yaw ?? 0));
    this.rule(
      "head_turned",
      yawDelta,
      baseline.yaw,
      POSE_RULES.headTurnEnter,
      yawDelta !== null &&
        yawDelta >=
          (this.holds.has("head_turned")
            ? POSE_RULES.headTurnExit
            : POSE_RULES.headTurnEnter),
      this.timing.stabilizeHoldMs,
      t,
    );
    // Only a downward change counts; looking down has no absolute reference.
    const dropDelta =
      f.drop === null || baseline.drop === null ? null : f.drop - baseline.drop;
    this.rule(
      "head_down",
      dropDelta,
      baseline.drop,
      POSE_RULES.headDownEnter,
      dropDelta !== null &&
        dropDelta >=
          (this.holds.has("head_down")
            ? POSE_RULES.headDownExit
            : POSE_RULES.headDownEnter),
      this.timing.stabilizeHoldMs,
      t,
    );
    // One cue at a time; retain it while that observation is active, then allow the next.
    const active = [...this.holds.values()].flatMap((h) =>
      h.event && this.modes[h.event.payload.rule as PoseRule] !== "review"
        ? [h.event]
        : [],
    );
    let cue = active.find((e) => e.id === this.lastCueId) ?? null;
    if (!cue || t >= this.cueUntil) {
      cue = active.at(-1) ?? null;
      if (cue?.id !== this.lastCueId)
        this.cueUntil = t + this.timing.minDisplayMs;
      this.lastCueId = cue?.id ?? null;
    }
    return {
      ...state(
        "ready",
        !f.handsVisible
          ? "Posture ready. Bring your wrists into view for more gesture feedback."
          : "Ready. Raise a hand, bring your hands together, or move sideways with the camera fixed.",
        1,
        f.handsVisible,
        cue,
      ),
      measurements: { leanDelta, shiftDelta, yawDelta, dropDelta },
    };
  }

  private rule(
    rule: PoseRule,
    value: number | null,
    baseline: number | null,
    threshold: number,
    matches: boolean,
    dwell: number,
    t: number,
    unknownGraceMs = 0,
  ) {
    if (this.modes[rule] === "off") {
      this.holds.delete(rule);
      return;
    }
    if (!matches || value === null) {
      const previous = this.holds.get(rule);
      if (previous && t - previous.last <= unknownGraceMs) return;
      if (previous?.event)
        this.cooldown.set(
          rule,
          previous.last +
            (rule === "arms_crossed"
              ? CROSS_ARMS.cooldownMs
              : POSE_RULES.cooldownMs),
        );
      this.holds.delete(rule);
      return;
    }
    let hold = this.holds.get(rule);
    if (!hold) {
      if (t < (this.cooldown.get(rule) ?? 0)) return;
      hold = { start: t, last: t, event: null };
      this.holds.set(rule, hold);
    }
    hold.last = t;
    if (t - hold.start < dwell) return;
    const copy = RULE_COPY[rule];
    const event: PoseEvent = {
      session_id: this.sessionId,
      id: hold.event?.id ?? `${this.sessionId}-${rule}-${hold.start}`,
      t_ms: Math.round(hold.start),
      duration_ms: Math.round(t - hold.start),
      type:
        rule === "torso_lean" || rule === "body_shift"
          ? "posture"
          : rule === "head_turned" || rule === "head_down"
            ? "gaze"
            : "gesture",
      severity: "info",
      source: "browser",
      payload: {
        rule,
        rule_version: POSE_RULES.version,
        heuristic: true,
        title: copy[0],
        detail: copy[1],
        action: copy[2],
        measurement: value,
        initial_measurement: hold.event?.payload.initial_measurement ?? value,
        baseline,
        threshold,
        unit:
          rule === "torso_lean"
            ? "degrees"
            : rule === "head_turned"
              ? "ear-distance ratio"
              : "shoulder widths",
        confirmed_at_ms: hold.event?.payload.confirmed_at_ms ?? Math.round(t),
        calibration: { ...this.baseline! },
      },
    };
    if (hold.event)
      this.events = this.events.map((e) => (e.id === event.id ? event : e));
    else this.events.push(event);
    hold.event = event;
  }
}
