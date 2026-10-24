import { armsCrossed } from "./cues";
import type { HandSample, PoseSample } from "./sample";

type RawPoint = [number, number, number, number | null, number | null];

const usable = (p: RawPoint | null | undefined): p is RawPoint =>
  !!p && (p[3] ?? 0) >= 0.5;

const px = (p: RawPoint, image: { width: number; height: number }) => ({
  x: p[0] * image.width,
  y: p[1] * image.height,
});

export function faceDistance(sample: PoseSample | null) {
  if (!sample) return null;
  const { image, pose } = sample;
  if (!usable(pose.left_shoulder) || !usable(pose.right_shoulder)) return null;
  const left = px(pose.left_shoulder, image);
  const right = px(pose.right_shoulder, image);
  const span = Math.hypot(left.x - right.x, left.y - right.y);
  if (span < 1e-6) return null;
  const face = [pose.nose, pose.left_eye, pose.right_eye].filter(usable);
  const wrists = [pose.left_wrist, pose.right_wrist].filter(usable);
  if (!face.length || !wrists.length) return null;
  let best = Infinity;
  for (const wrist of wrists) {
    const w = px(wrist, image);
    for (const point of face) {
      const f = px(point, image);
      best = Math.min(best, Math.hypot(w.x - f.x, w.y - f.y));
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
  | "arms-crossed"
  | "self-touch"
  | "look-away"
  | "hands-up"
  | "hips-out"
  | "hands-hidden"
  | "pocket";

export type PoseTestEvaluation = {
  pass: boolean | null;
  value: number | null;
  display: string;
};

export type PoseTestDefinition = {
  id: PoseTestId;
  label: string;
  instruction: string;
  kind: "alert" | "baseline" | "framing";
  priority: number;
  holdMs: number;
  releaseMs: number;
  unknownReleaseMs: number;
  evaluate: (
    sample: PoseSample | null,
    hands: HandSample[],
  ) => PoseTestEvaluation;
};

const HAND = {
  wrist: 0,
  thumbTip: 4,
  indexTip: 8,
  middleTip: 12,
  ringTip: 16,
  pinkyTip: 20,
} as const;

export type PocketCheck = {
  evaluable: boolean;
  kind: "fingers" | "hidden" | null;
  display: string;
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
 * A relaxed open hand hangs long below the wrist and must not match.
 */
export function handAtPocket(
  sample: PoseSample | null,
  hands: HandSample[],
): PocketCheck {
  if (!sample) return { evaluable: false, kind: null, display: "no pose" };
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
    };
  const left = px(pose.left_shoulder, image);
  const right = px(pose.right_shoulder, image);
  const span = Math.hypot(left.x - right.x, left.y - right.y);
  if (span < 1e-6)
    return { evaluable: false, kind: null, display: "no shoulders" };
  const hips = [pose.left_hip, pose.right_hip]
    .filter(usable)
    .map((hip) => px(hip, image));
  const wrists = [pose.left_wrist, pose.right_wrist]
    .filter(usable)
    .map((wrist) => px(wrist, image));
  if (!hips.length || !wrists.length)
    return { evaluable: false, kind: null, display: "no hips" };
  const inZone = (p: { x: number; y: number }) =>
    hips.some((hip) => inPocket(p.x, p.y, hip, span));

  for (const hand of hands) {
    const wrist = hand.landmarks[HAND.wrist];
    const middle = hand.landmarks[HAND.middleTip];
    if (!wrist || !middle) continue;
    const w = { x: wrist[0] * image.width, y: wrist[1] * image.height };
    if (!inZone(w)) continue;
    const m = {
      x: middle[0] * image.width,
      y: middle[1] * image.height,
    };
    const length = Math.hypot(m.x - w.x, m.y - w.y) / span;
    // In a pocket the visible hand is compressed; a hanging hand is long.
    if (length <= 0.22)
      return { evaluable: true, kind: "fingers", display: `${length.toFixed(2)}×SW` };
  }

  for (const wrist of wrists) {
    if (!inZone(wrist)) continue;
    const covered = hands.every((hand) => {
      const p = hand.landmarks[HAND.wrist];
      if (!p) return true;
      const h = { x: p[0] * image.width, y: p[1] * image.height };
      return Math.hypot(h.x - wrist.x, h.y - wrist.y) > 0.35 * span;
    });
    if (covered)
      return { evaluable: true, kind: "hidden", display: "hand hidden at hip" };
  }

  return { evaluable: true, kind: null, display: "visible" };
}

const missing = (display: string): PoseTestEvaluation => ({
  pass: null,
  value: null,
  display,
});

const measured = (
  value: number | null,
  pass: boolean | null,
  display: string,
): PoseTestEvaluation => ({ value, pass, display });

export const POSE_TESTS: PoseTestDefinition[] = [
  {
    id: "neutral",
    label: "Neutral / baseline",
    instruction: "Stand centered, arms relaxed, head straight.",
    kind: "baseline",
    priority: 0,
    holdMs: 800,
    releaseMs: 300,
    unknownReleaseMs: 800,
    evaluate(sample) {
      const torso = sample?.derived.torso_lean_deg ?? null;
      const shoulder = sample?.derived.shoulder_tilt_deg ?? null;
      const head = sample?.head.roll_deg ?? null;
      const crossed = armsCrossed(sample);
      if (torso === null || shoulder === null || head === null || crossed === null)
        return missing("incomplete");
      const pass =
        Math.abs(torso) <= 8 &&
        Math.abs(shoulder) <= 6 &&
        Math.abs(head) <= 8 &&
        !crossed;
      return measured(null, pass, pass ? "centered" : "off baseline");
    },
  },
  {
    id: "torso-lean",
    label: "Torso lean",
    instruction: "Lean sideways; keep both hips in frame.",
    kind: "alert",
    priority: 40,
    holdMs: 1500,
    releaseMs: 300,
    unknownReleaseMs: 800,
    evaluate(sample) {
      const value = sample?.derived.torso_lean_deg ?? null;
      return value === null
        ? missing("hips missing")
        : measured(value, Math.abs(value) >= 20, `${value.toFixed(0)}°`);
    },
  },
  {
    id: "shoulder-tilt",
    label: "Shoulder tilt",
    instruction: "Drop one shoulder clearly below the other.",
    kind: "alert",
    priority: 30,
    holdMs: 1500,
    releaseMs: 300,
    unknownReleaseMs: 800,
    evaluate(sample) {
      const value = sample?.derived.shoulder_tilt_deg ?? null;
      return value === null
        ? missing("shoulders missing")
        : measured(value, Math.abs(value) >= 10, `${value.toFixed(0)}°`);
    },
  },
  {
    id: "head-tilt",
    label: "Head tilt",
    instruction: "Tilt your head clearly toward one shoulder.",
    kind: "alert",
    priority: 20,
    holdMs: 1500,
    releaseMs: 300,
    unknownReleaseMs: 800,
    evaluate(sample) {
      const value = sample?.head.roll_deg ?? null;
      return value === null
        ? missing("eyes missing")
        : measured(value, Math.abs(value) >= 12, `${value.toFixed(0)}°`);
    },
  },
  {
    id: "arms-crossed",
    label: "Arms crossed",
    instruction: "Cross both arms in front of your chest.",
    kind: "alert",
    priority: 70,
    holdMs: 2000,
    releaseMs: 500,
    unknownReleaseMs: 1500,
    evaluate(sample) {
      const value = armsCrossed(sample);
      return value === null
        ? missing("wrists hidden")
        : measured(null, value, value ? "crossed" : "open");
    },
  },
  {
    id: "self-touch",
    label: "Hand near face",
    instruction: "Touch your chin or cheek with one hand.",
    kind: "alert",
    priority: 50,
    holdMs: 1500,
    releaseMs: 300,
    unknownReleaseMs: 800,
    evaluate(sample) {
      const value = faceDistance(sample);
      return value === null
        ? missing("no hand/face")
        : measured(value, value <= 0.6, `${value.toFixed(2)}×SW`);
    },
  },
  {
    id: "look-away",
    label: "Look away",
    instruction: "Turn your head clearly to one side.",
    kind: "alert",
    priority: 10,
    holdMs: 1500,
    releaseMs: 300,
    unknownReleaseMs: 800,
    evaluate(sample) {
      const value = headTurn(sample);
      if (value !== null)
        return measured(
          value,
          Math.abs(value) >= 0.35,
          `${value.toFixed(2)}`,
        );
      if (
        sample?.head.eyes_forward === false &&
        sample.derived.shoulder_tilt_deg !== null
      )
        return measured(null, true, "eyes not forward");
      return missing("no head");
    },
  },
  {
    id: "hands-up",
    label: "Hands above shoulders",
    instruction: "Raise both hands above shoulder height.",
    kind: "alert",
    priority: 15,
    holdMs: 800,
    releaseMs: 300,
    unknownReleaseMs: 800,
    evaluate(sample) {
      const left = sample?.derived.left_wrist_height ?? null;
      const right = sample?.derived.right_wrist_height ?? null;
      if (left === null || right === null) return missing("hand hidden");
      const low = Math.min(left, right);
      return measured(low, low > 0.2, `${low.toFixed(2)}×SW`);
    },
  },
  {
    id: "hips-out",
    label: "Hips out of frame",
    instruction: "Keep shoulders visible but move your hips out of frame.",
    kind: "framing",
    priority: 0,
    holdMs: 1500,
    releaseMs: 300,
    unknownReleaseMs: 800,
    evaluate(sample) {
      const shoulders = sample?.derived.shoulder_tilt_deg ?? null;
      const torso = sample?.derived.torso_lean_deg ?? null;
      if (shoulders === null) return missing("no shoulders");
      return measured(
        null,
        torso === null,
        torso === null ? "torso n/a" : "hips visible",
      );
    },
  },
  {
    id: "hands-hidden",
    label: "Hands hidden",
    instruction: "Hide both hands behind your back or in pockets.",
    kind: "alert",
    priority: 60,
    holdMs: 1500,
    releaseMs: 300,
    unknownReleaseMs: 800,
    evaluate(sample) {
      const shoulders = sample?.derived.shoulder_tilt_deg ?? null;
      const left = sample?.derived.left_wrist_height ?? null;
      const right = sample?.derived.right_wrist_height ?? null;
      if (shoulders === null) return missing("no shoulders");
      const pass = left === null && right === null;
      return measured(null, pass, pass ? "both hidden" : "visible");
    },
  },
  {
    id: "pocket",
    label: "Hand in pocket",
    instruction:
      "Tuck one hand into a trouser pocket; leave the thumb out.",
    kind: "alert",
    priority: 100,
    holdMs: 1500,
    releaseMs: 500,
    unknownReleaseMs: 1200,
    evaluate(sample, hands) {
      const check = handAtPocket(sample, hands);
      return check.evaluable
        ? measured(null, check.kind !== null, check.display)
        : missing(check.display);
    },
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
      const evaluation = test.evaluate(sample, hands);
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
      };
    });
  }
}

export type PoseFeedback = {
  state: "alert" | "ok" | "idle";
  label: string;
  detail: string;
};

export function poseFeedback(results: PoseTestResult[]): PoseFeedback {
  const alerts = results.filter(
    (result) => result.kind === "alert" && result.state === "recognized",
  );
  const top = alerts.sort((a, b) => b.priority - a.priority)[0];
  if (top) return { state: "alert", label: top.label, detail: top.display };
  const neutral = results.find((result) => result.id === "neutral");
  if (neutral?.state === "recognized")
    return { state: "ok", label: "OK", detail: "posture neutral" };
  const framing = results.find(
    (result) => result.kind === "framing" && result.state === "recognized",
  );
  if (framing)
    return { state: "idle", label: "—", detail: framing.label };
  return { state: "idle", label: "—", detail: "hold a test pose" };
}
