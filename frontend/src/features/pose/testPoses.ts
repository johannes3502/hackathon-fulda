import { crossArmsCheck, passes } from "./cues";
import {
  HEURISTICS,
  type HandLandmark,
  type HandSample,
  type PoseSample,
} from "./sample";

type RawPoint = [number, number, number, number | null, number | null];
type Point = { x: number; y: number };
type PoseValue = number | boolean | string | null;

const usable = (p: RawPoint | null | undefined): p is RawPoint =>
  !!p && (p[3] ?? 0) >= 0.5;

const px = (p: RawPoint, image: { width: number; height: number }) => ({
  x: p[0] * image.width,
  y: p[1] * image.height,
});

export function faceDistance(
  sample: PoseSample | null,
  hands: HandSample[] = [],
) {
  if (!sample) return null;
  const { image, pose } = sample;
  if (!usable(pose.left_shoulder) || !usable(pose.right_shoulder)) return null;
  const left = px(pose.left_shoulder, image);
  const right = px(pose.right_shoulder, image);
  const span = Math.hypot(left.x - right.x, left.y - right.y);
  if (span < 1e-6) return null;
  const face = [pose.nose, pose.left_eye, pose.right_eye].filter(usable);
  const wrists = [pose.left_wrist, pose.right_wrist].filter(usable);
  if (!face.length) return null;
  const handPoints = wrists.map((wrist) => px(wrist, image));
  // Fingertips are closer to the face than the pose wrist on a chin touch.
  for (const hand of hands) {
    if (hand.score < HEURISTICS.handConfidence) continue;
    for (const index of [8, 12]) {
      const tip = hand.landmarks[index];
      if (tip)
        handPoints.push({
          x: tip[0] * image.width,
          y: tip[1] * image.height,
        });
    }
  }
  if (!handPoints.length) return null;
  let best = Infinity;
  for (const hand of handPoints) {
    for (const point of face) {
      const f = px(point, image);
      best = Math.min(best, Math.hypot(hand.x - f.x, hand.y - f.y));
    }
  }
  return best / span;
}

export function headTurn(sample: PoseSample | null) {
  if (!sample) return null;
  const { pose } = sample;
  if (
    !usable(pose.nose) ||
    !usable(pose.left_ear) ||
    !usable(pose.right_ear)
  )
    return null;
  const span = Math.abs(pose.left_ear[0] - pose.right_ear[0]);
  if (span < 0.02) return null;
  return (pose.nose[0] - (pose.left_ear[0] + pose.right_ear[0]) / 2) / span;
}

export type PoseTestId =
  | "neutral"
  | "torso-lean"
  | "shoulder-tilt"
  | "head-tilt"
  | "crossed-legs"
  | "arms-crossed"
  | "self-touch"
  | "look-away"
  | "hands-up"
  | "hips-out"
  | "hands-hidden"
  | "pocket";

export type PoseCheck = {
  pass: boolean | null;
  value: number | null;
  display: string;
  values: Record<string, PoseValue>;
  failing: string[];
};

const check = (
  pass: boolean | null,
  display: string,
  values: Record<string, PoseValue> = {},
  failing: string[] = [],
  value: number | null = null,
): PoseCheck => ({ pass, value, display, values, failing });

const missing = (display: string, failing: string[] = []): PoseCheck =>
  check(null, display, {}, failing);

const measured = (
  value: number,
  pass: boolean,
  display: string,
  values: Record<string, PoseValue> = {},
  failing: string[] = [],
): PoseCheck => check(pass, display, { value, ...values }, failing, value);

export type PoseTestDefinition = {
  id: PoseTestId;
  label: string;
  instruction: string;
  kind: "alert" | "baseline" | "framing";
  priority: number;
  holdMs: number;
  releaseMs: number;
  unknownReleaseMs: number;
  check: (sample: PoseSample | null, hands: HandSample[]) => PoseCheck;
};

const HAND = {
  wrist: 0,
  thumbTip: 4,
  indexTip: 8,
  middleTip: 12,
  ringTip: 16,
  pinkyTip: 20,
} as const;

const FINGER_TIPS = [
  HAND.indexTip,
  HAND.middleTip,
  HAND.ringTip,
  HAND.pinkyTip,
] as const;

export const POCKET = {
  // Visible fingertips of a pocketed hand stay compressed near the wrist.
  maxReach: 0.24,
  // A hanging arm is almost straight; a hand in a pocket usually bends it.
  // Only the weak "hand hidden" branch needs this; visible fingertips are
  // stronger evidence and also catch a straight arm at a side pocket.
  maxElbowDeg: 120,
  minDownTips: 2,
  minTipsInZone: 2,
  // A detected hand within this distance is not "hidden".
  hiddenRadius: 0.35,
} as const;

export type PocketCheck = {
  evaluable: boolean;
  kind: "fingers" | "hidden" | null;
  display: string;
  values: Record<string, PoseValue>;
  failing: string[];
};

const inPocket = (
  x: number,
  y: number,
  hip: { x: number; y: number },
  span: number,
) => {
  const dx = (x - hip.x) / span;
  const dy = (y - hip.y) / span;
  return Math.abs(dx) <= 0.24 && dy >= -0.02 && dy <= 0.45;
};

/**
 * Fingertracking heuristic. A hand tucked into a pocket is either partly
 * visible and compressed, or not found near a wrist that sits at the hip.
 * A relaxed open hand hangs long below the wrist and must not match. The
 * elbow angle separates a hanging arm (nearly straight) from a pocket.
 */
export function handAtPocket(
  sample: PoseSample | null,
  hands: HandSample[],
): PocketCheck {
  if (!sample)
    return {
      evaluable: false,
      kind: null,
      display: "no pose",
      values: {},
      failing: ["pose"],
    };
  const { image, pose } = sample;
  if (
    !usable(pose.left_shoulder) ||
    !usable(pose.right_shoulder) ||
    (!usable(pose.left_wrist) && !usable(pose.right_wrist))
  )
    return {
      evaluable: false,
      kind: null,
      display: "no hips/hands",
      values: {},
      failing: ["hips/hands"],
    };
  const left = px(pose.left_shoulder, image);
  const right = px(pose.right_shoulder, image);
  const span = Math.hypot(left.x - right.x, left.y - right.y);
  if (span < 1e-6)
    return {
      evaluable: false,
      kind: null,
      display: "no shoulders",
      values: {},
      failing: ["shoulders"],
    };
  const hips = [pose.left_hip, pose.right_hip]
    .filter(usable)
    .map((hip) => px(hip, image));
  const wrists = [
    { point: pose.left_wrist, elbow: sample.derived.left_elbow_deg },
    { point: pose.right_wrist, elbow: sample.derived.right_elbow_deg },
  ]
    .filter(
      (wrist): wrist is { point: RawPoint; elbow: number | null } =>
        usable(wrist.point),
    )
    .map(({ point, elbow }) => ({ ...px(point, image), elbow }));
  if (!hips.length || !wrists.length)
    return {
      evaluable: false,
      kind: null,
      display: "no hips",
      values: {},
      failing: ["hips"],
    };
  const inZone = (p: { x: number; y: number }) =>
    hips.some((hip) => inPocket(p.x, p.y, hip, span));
  const elbowFor = (p: { x: number; y: number }) =>
    wrists.reduce(
      (best, wrist) => {
        const distance = Math.hypot(wrist.x - p.x, wrist.y - p.y);
        return distance < best.distance
          ? { distance, elbow: wrist.elbow }
          : best;
      },
      { distance: Infinity, elbow: null as number | null },
    ).elbow;

  let fallback: PocketCheck | null = null;
  for (const hand of hands) {
    if (hand.score < HEURISTICS.handConfidence) continue;
    const wrist = hand.landmarks[HAND.wrist];
    if (!wrist) continue;
    const w = { x: wrist[0] * image.width, y: wrist[1] * image.height };
    if (!inZone(w)) continue;
    const elbow = elbowFor(w);
    const tips = FINGER_TIPS.map((index) => hand.landmarks[index])
      .filter((tip): tip is HandLandmark => !!tip)
      .map((tip) => ({
        x: tip[0] * image.width,
        y: tip[1] * image.height,
      }));
    if (!tips.length) continue;
    const reach =
      Math.max(
        ...tips.map((tip) => Math.hypot(tip.x - w.x, tip.y - w.y)),
      ) / span;
    const down = tips.filter((tip) => tip.y > w.y).length;
    const tipsInZone = tips.filter((tip) => inZone(tip)).length;
    const values = {
      hand_score: hand.score,
      wrist_in_zone: true,
      elbow,
      reach,
      down_tips: down,
      tips_in_zone: tipsInZone,
    };
    // A straight arm at the hip is a relaxed hand, not a pocket.
    if (elbow === null || elbow > POCKET.maxElbowDeg) {
      fallback ??= {
        evaluable: true,
        kind: null,
        display: "arm straight",
        values,
        failing: ["elbow"],
      };
      continue;
    }
    if (reach > POCKET.maxReach) {
      fallback ??= {
        evaluable: true,
        kind: null,
        display: "hand open",
        values,
        failing: ["fingertips"],
      };
      continue;
    }
    if (
      down < POCKET.minDownTips &&
      tipsInZone < POCKET.minTipsInZone
    ) {
      fallback ??= {
        evaluable: true,
        kind: null,
        display: "fingers up",
        values,
        failing: ["tips"],
      };
      continue;
    }
    return {
      evaluable: true,
      kind: "fingers",
      display: `${reach.toFixed(2)}×SW`,
      values,
      failing: [],
    };
  }
  if (fallback) return fallback;

  let hiddenFallback: PocketCheck | null = null;
  for (const wrist of wrists) {
    if (!inZone(wrist)) continue;
    const values = { wrist_in_zone: true, elbow: wrist.elbow };
    // Straight arms hang at the hip in the neutral pose; do not call that a pocket.
    if (wrist.elbow === null || wrist.elbow > POCKET.maxElbowDeg) {
      hiddenFallback ??= {
        evaluable: true,
        kind: null,
        display: "arm straight",
        values,
        failing: ["elbow"],
      };
      continue;
    }
    const covered = hands.every((hand) => {
      if (hand.score < HEURISTICS.handConfidence) return true;
      const p = hand.landmarks[HAND.wrist];
      if (!p) return true;
      const h = { x: p[0] * image.width, y: p[1] * image.height };
      return (
        Math.hypot(h.x - wrist.x, h.y - wrist.y) >
        POCKET.hiddenRadius * span
      );
    });
    if (!covered) {
      hiddenFallback ??= {
        evaluable: true,
        kind: null,
        display: "hand visible",
        values,
        failing: ["hand"],
      };
      continue;
    }
    return {
      evaluable: true,
      kind: "hidden",
      display: "hand hidden at hip",
      values,
      failing: [],
    };
  }
  return (
    hiddenFallback ?? {
      evaluable: true,
      kind: null,
      display: "visible",
      values: {},
      failing: ["no pocket"],
    }
  );
}

const orientation = (a: Point, b: Point, c: Point) =>
  (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

const segmentsIntersect = (a: Point, b: Point, c: Point, d: Point) => {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  return o1 * o2 < 0 && o3 * o4 < 0;
};

export type CrossedLegsCheck = {
  crossed: boolean | null;
  values: Record<string, PoseValue>;
};

export function crossedLegsCheck(
  sample: PoseSample | null,
): CrossedLegsCheck {
  if (!sample) return { crossed: null, values: {} };
  const { image, pose } = sample;
  const point = (p: RawPoint | null) => (usable(p) ? px(p, image) : null);
  const leftKnee = point(pose.left_knee);
  const rightKnee = point(pose.right_knee);
  const leftAnkle = point(pose.left_ankle);
  const rightAnkle = point(pose.right_ankle);
  if (!leftKnee || !rightKnee || !leftAnkle || !rightAnkle)
    return {
      crossed: null,
      values: {
        left_knee: !!leftKnee,
        right_knee: !!rightKnee,
        left_ankle: !!leftAnkle,
        right_ankle: !!rightAnkle,
      },
    };
  const crossed = segmentsIntersect(
    leftKnee,
    leftAnkle,
    rightKnee,
    rightAnkle,
  );
  return {
    crossed,
    values: {
      left_knee_x: leftKnee.x,
      right_knee_x: rightKnee.x,
      left_ankle_x: leftAnkle.x,
      right_ankle_x: rightAnkle.x,
      crossed,
    },
  };
}

function neutralCheck(sample: PoseSample | null): PoseCheck {
  const torso = sample?.derived.torso_lean_deg ?? null;
  const shoulder = sample?.derived.shoulder_tilt_deg ?? null;
  const head = sample?.head.roll_deg ?? null;
  const arms = crossArmsCheck(sample).crossed;
  const values = {
    torso_lean_deg: torso,
    shoulder_tilt_deg: shoulder,
    head_roll_deg: head,
    arms_crossed: arms,
  };
  const absent: string[] = [];
  if (torso === null) absent.push("torso");
  if (shoulder === null) absent.push("shoulder");
  if (head === null) absent.push("head");
  if (arms === null) absent.push("arms");
  if (torso === null || shoulder === null || head === null || arms === null)
    return check(null, "incomplete", values, absent);
  const failing: string[] = [];
  if (Math.abs(torso) > 8) failing.push("torso");
  if (Math.abs(shoulder) > 6) failing.push("shoulder");
  if (Math.abs(head) > 8) failing.push("head");
  if (arms) failing.push("arms crossed");
  return check(failing.length === 0, failing.length ? "off baseline" : "centered", values, failing);
}

function torsoLeanCheck(sample: PoseSample | null): PoseCheck {
  const value = sample?.derived.torso_lean_deg ?? null;
  if (value === null) return missing("hips missing", ["torso"]);
  const pass = Math.abs(value) >= 20;
  return measured(
    value,
    pass,
    `${value.toFixed(0)}°`,
    { torso_lean_deg: value, threshold: 20 },
    pass ? [] : ["torso lean"],
  );
}

function shoulderTiltCheck(sample: PoseSample | null): PoseCheck {
  const value = sample?.derived.shoulder_tilt_deg ?? null;
  if (value === null) return missing("shoulders missing", ["shoulder"]);
  const pass = Math.abs(value) >= 10;
  return measured(
    value,
    pass,
    `${value.toFixed(0)}°`,
    { shoulder_tilt_deg: value, threshold: 10 },
    pass ? [] : ["shoulder tilt"],
  );
}

function headTiltCheck(sample: PoseSample | null): PoseCheck {
  const value = sample?.head.roll_deg ?? null;
  if (value === null) return missing("eyes missing", ["head"]);
  const pass = Math.abs(value) >= 12;
  return measured(
    value,
    pass,
    `${value.toFixed(0)}°`,
    { head_roll_deg: value, threshold: 12 },
    pass ? [] : ["head tilt"],
  );
}

function crossedLegsPoseCheck(sample: PoseSample | null): PoseCheck {
  const result = crossedLegsCheck(sample);
  if (result.crossed === null)
    return missing("legs not visible", ["legs"]);
  return check(
    result.crossed,
    result.crossed ? "legs crossed" : "open",
    result.values,
    result.crossed ? [] : ["legs crossed"],
  );
}

function armsCrossedCheck(sample: PoseSample | null): PoseCheck {
  const result = crossArmsCheck(sample);
  const values = {
    left_cross: result.cross[0],
    right_cross: result.cross[1],
    left_height: result.height[0],
    right_height: result.height[1],
    left_elbow: result.elbow[0],
    right_elbow: result.elbow[1],
    left_forearm: result.forearm[0],
    right_forearm: result.forearm[1],
  };
  const conditions: [string, (number | null)[], (value: number) => boolean][] =
    [
      ["cross", result.cross, passes.cross],
      ["height", result.height, passes.height],
      ["elbow", result.elbow, passes.elbow],
      ["forearm", result.forearm, passes.forearm],
    ];
  const failing: string[] = [];
  for (const [name, pair, pass] of conditions) {
    if (pair.includes(null)) failing.push(`${name} missing`);
    else if (!pair.every((value) => value !== null && pass(value)))
      failing.push(name);
  }
  if (result.crossed === null)
    return check(null, "wrists hidden", values, failing);
  return check(
    result.crossed,
    result.crossed ? "crossed" : "open",
    values,
    result.crossed ? [] : failing,
  );
}

function selfTouchCheck(
  sample: PoseSample | null,
  hands: HandSample[],
): PoseCheck {
  const distance = faceDistance(sample, hands);
  const model = hands.some(
    (hand) => hand.score >= HEURISTICS.handConfidence,
  );
  if (distance === null) return missing("no hand/face", ["hand", "face"]);
  const pass = distance <= 0.6;
  return measured(
    distance,
    pass,
    `${distance.toFixed(2)}×SW`,
    { distance, threshold: 0.6, hand_model: model },
    pass ? [] : ["hand near face"],
  );
}

function lookAwayCheck(sample: PoseSample | null): PoseCheck {
  const turn = headTurn(sample);
  const eyes = sample?.head.eyes_forward ?? null;
  const values = { head_turn: turn, eyes_forward: eyes, threshold: 0.35 };
  if (turn !== null) {
    const pass = Math.abs(turn) >= 0.35;
    return measured(
      turn,
      pass,
      turn.toFixed(2),
      values,
      pass ? [] : ["head turn"],
    );
  }
  if (eyes === false && sample?.derived.shoulder_tilt_deg !== null)
    return check(true, "eyes not forward", values, []);
  return missing("no head", ["head"]);
}

function handsUpCheck(sample: PoseSample | null): PoseCheck {
  const left = sample?.derived.left_wrist_height ?? null;
  const right = sample?.derived.right_wrist_height ?? null;
  const values = {
    left_wrist_height: left,
    right_wrist_height: right,
    threshold: 0.2,
  };
  if (left === null || right === null)
    return missing("hand hidden", ["left hand", "right hand"]);
  const low = Math.min(left, right);
  const failing = [
    left <= 0.2 ? "left hand" : null,
    right <= 0.2 ? "right hand" : null,
  ].filter((value): value is string => !!value);
  return measured(low, low > 0.2, `${low.toFixed(2)}×SW`, values, failing);
}

function hipsOutCheck(sample: PoseSample | null): PoseCheck {
  const shoulders = sample?.derived.shoulder_tilt_deg ?? null;
  const torso = sample?.derived.torso_lean_deg ?? null;
  if (shoulders === null) return missing("no shoulders", ["shoulders"]);
  const pass = torso === null;
  return check(
    pass,
    pass ? "torso n/a" : "hips visible",
    { shoulder_tilt_deg: shoulders, torso_lean_deg: torso },
    pass ? [] : ["hips visible"],
  );
}

function handsHiddenCheck(
  sample: PoseSample | null,
  hands: HandSample[],
): PoseCheck {
  const shoulders = sample?.derived.shoulder_tilt_deg ?? null;
  const left = sample?.derived.left_wrist_height ?? null;
  const right = sample?.derived.right_wrist_height ?? null;
  if (shoulders === null) return missing("no shoulders", ["shoulders"]);
  const detected = hands.filter(
    (hand) => hand.score >= HEURISTICS.handConfidence,
  ).length;
  const failing: string[] = [];
  if (left !== null) failing.push("left wrist visible");
  if (right !== null) failing.push("right wrist visible");
  if (detected > 0) failing.push("hand detected");
  return check(
    failing.length === 0,
    failing.length ? "visible" : "both hidden",
    { left_wrist_height: left, right_wrist_height: right, hands: detected },
    failing,
  );
}

function pocketPoseCheck(
  sample: PoseSample | null,
  hands: HandSample[],
): PoseCheck {
  const result = handAtPocket(sample, hands);
  return check(
    result.evaluable ? result.kind !== null : null,
    result.display,
    result.values,
    result.failing,
  );
}

export const POSE_TESTS: PoseTestDefinition[] = [
  {
    id: "neutral",
    label: "Neutral / baseline",
    instruction: "Stand centered, arms relaxed, head straight.",
    kind: "baseline",
    priority: 0,
    holdMs: 0,
    releaseMs: 300,
    unknownReleaseMs: 800,
    check: neutralCheck,
  },
  {
    id: "torso-lean",
    label: "Torso lean",
    instruction: "Lean sideways; keep both hips in frame.",
    kind: "alert",
    priority: 40,
    holdMs: 0,
    releaseMs: 300,
    unknownReleaseMs: 800,
    check: torsoLeanCheck,
  },
  {
    id: "shoulder-tilt",
    label: "Shoulder tilt",
    instruction: "Drop one shoulder clearly below the other.",
    kind: "alert",
    priority: 30,
    holdMs: 0,
    releaseMs: 300,
    unknownReleaseMs: 800,
    check: shoulderTiltCheck,
  },
  {
    id: "head-tilt",
    label: "Head tilt",
    instruction: "Tilt your head clearly toward one shoulder.",
    kind: "alert",
    priority: 20,
    holdMs: 0,
    releaseMs: 300,
    unknownReleaseMs: 800,
    check: headTiltCheck,
  },
  {
    id: "crossed-legs",
    label: "Crossed legs",
    instruction: "Cross one leg over the other; keep both feet and hips in frame.",
    kind: "alert",
    priority: 25,
    holdMs: 0,
    releaseMs: 500,
    unknownReleaseMs: 800,
    check: crossedLegsPoseCheck,
  },
  {
    id: "arms-crossed",
    label: "Arms crossed",
    instruction: "Cross both arms in front of your chest.",
    kind: "alert",
    priority: 70,
    holdMs: 0,
    releaseMs: 500,
    unknownReleaseMs: 1500,
    check: armsCrossedCheck,
  },
  {
    id: "self-touch",
    label: "Hand near face",
    instruction: "Touch your chin or cheek with one hand.",
    kind: "alert",
    priority: 50,
    holdMs: 0,
    releaseMs: 300,
    unknownReleaseMs: 800,
    check: selfTouchCheck,
  },
  {
    id: "look-away",
    label: "Look away",
    instruction: "Turn your head clearly to one side.",
    kind: "alert",
    priority: 10,
    holdMs: 0,
    releaseMs: 300,
    unknownReleaseMs: 800,
    check: lookAwayCheck,
  },
  {
    id: "hands-up",
    label: "Hands above shoulders",
    instruction: "Raise both hands above shoulder height.",
    kind: "alert",
    priority: 15,
    holdMs: 0,
    releaseMs: 300,
    unknownReleaseMs: 800,
    check: handsUpCheck,
  },
  {
    id: "hips-out",
    label: "Hips out of frame",
    instruction: "Keep shoulders visible but move your hips out of frame.",
    kind: "framing",
    priority: 0,
    holdMs: 0,
    releaseMs: 300,
    unknownReleaseMs: 800,
    check: hipsOutCheck,
  },
  {
    id: "hands-hidden",
    label: "Hands hidden",
    instruction: "Hide both hands behind your back or in pockets.",
    kind: "alert",
    priority: 60,
    holdMs: 0,
    releaseMs: 300,
    unknownReleaseMs: 800,
    check: handsHiddenCheck,
  },
  {
    id: "pocket",
    label: "Hand in pocket",
    instruction:
      "Tuck one hand into a trouser pocket; leave the thumb out.",
    kind: "alert",
    priority: 100,
    holdMs: 0,
    releaseMs: 500,
    unknownReleaseMs: 1200,
    check: pocketPoseCheck,
  },
];

export type PoseTestState =
  | "off"
  | "watching"
  | "recognized"
  | "not-evaluable";

export type PoseTestResult = {
  id: PoseTestId;
  label: string;
  instruction: string;
  kind: PoseTestDefinition["kind"];
  priority: number;
  state: PoseTestState;
  heldMs: number;
  holdMs: number;
  value: number | null;
  display: string;
  values: Record<string, PoseValue>;
  failing: string[];
};

type Track = {
  since: number | null;
  lastTrue: number;
  active: boolean;
};

export class PoseTestTracker {
  private tracks = new Map<PoseTestId, Track>();

  reset() {
    this.tracks.clear();
  }

  update(
    sample: PoseSample | null,
    now: number,
    hands: HandSample[] = [],
  ): PoseTestResult[] {
    return POSE_TESTS.map((test) => {
      const evaluation = test.check(sample, hands);
      const track = this.tracks.get(test.id) ?? {
        since: null,
        lastTrue: -Infinity,
        active: false,
      };
      let state: PoseTestState;
      if (evaluation.pass === null) {
        if (track.active) {
          if (now - track.lastTrue >= test.unknownReleaseMs) {
            track.active = false;
            track.since = null;
          }
        } else {
          track.since = null;
        }
        state = track.active ? "recognized" : "not-evaluable";
      } else if (evaluation.pass) {
        track.since ??= now;
        track.lastTrue = now;
        if (!track.active && now - track.since >= test.holdMs)
          track.active = true;
        state = track.active ? "recognized" : "watching";
      } else {
        if (track.active) {
          if (now - track.lastTrue >= test.releaseMs) {
            track.active = false;
            track.since = null;
          }
        } else {
          track.since = null;
        }
        state = track.active ? "recognized" : "off";
      }
      this.tracks.set(test.id, track);
      return {
        id: test.id,
        label: test.label,
        instruction: test.instruction,
        kind: test.kind,
        priority: test.priority,
        state,
        heldMs: track.since === null ? 0 : now - track.since,
        holdMs: test.holdMs,
        value: evaluation.value,
        display: evaluation.display,
        values: evaluation.values,
        failing: evaluation.failing,
      };
    });
  }
}

export type PoseFeedback = {
  state: "alert" | "ok" | "idle";
  id: PoseTestId | null;
  label: string;
  detail: string;
  failing: string[];
};

export function poseFeedback(results: PoseTestResult[]): PoseFeedback {
  const alerts = results.filter(
    (result) => result.kind === "alert" && result.state === "recognized",
  );
  const top = alerts.sort((a, b) => b.priority - a.priority)[0];
  if (top)
    return {
      state: "alert",
      id: top.id,
      label: top.label,
      detail: top.display,
      failing: top.failing,
    };
  const neutral = results.find((result) => result.id === "neutral");
  if (neutral?.state === "recognized")
    return {
      state: "ok",
      id: "neutral",
      label: "OK",
      detail: "posture neutral",
      failing: [],
    };
  const framing = results.find(
    (result) => result.kind === "framing" && result.state === "recognized",
  );
  if (framing)
    return {
      state: "idle",
      id: framing.id,
      label: "—",
      detail: framing.label,
      failing: framing.failing,
    };
  return {
    state: "idle",
    id: null,
    label: "—",
    detail: "hold a test pose",
    failing: [],
  };
}

const COACH_MESSAGES: Record<PoseTestId, string> = {
  neutral: "Nice, open posture.",
  "torso-lean": "Straighten up a little.",
  "shoulder-tilt": "Level your shoulders.",
  "head-tilt": "Keep your head upright.",
  "crossed-legs": "Uncross your legs.",
  "arms-crossed": "Try uncrossing your arms!",
  "self-touch": "Hands away from your face.",
  "look-away": "Look back toward the camera.",
  "hands-up": "Lower your hands.",
  "hips-out": "Step back so your hips are in frame.",
  "hands-hidden": "Bring your hands into view.",
  pocket: "Take your hand out of your pocket.",
};

export function coachMessage(id: PoseTestId | null) {
  return id ? COACH_MESSAGES[id] : "Hold a test pose.";
}
