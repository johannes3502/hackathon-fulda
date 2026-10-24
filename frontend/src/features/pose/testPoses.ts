import { armsCrossed } from "./cues";
import type { PoseSample } from "./sample";

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
  | "hands-hidden";

export type PoseTestEvaluation = {
  pass: boolean | null;
  value: number | null;
  display: string;
};

export type PoseTestDefinition = {
  id: PoseTestId;
  label: string;
  instruction: string;
  holdMs: number;
  releaseMs: number;
  unknownReleaseMs: number;
  evaluate: (sample: PoseSample | null) => PoseTestEvaluation;
};

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

  update(sample: PoseSample | null, now: number): PoseTestResult[] {
    return POSE_TESTS.map((test) => {
      const evaluation = test.evaluate(sample);
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
        state,
        heldMs: track.since === null ? 0 : now - track.since,
        holdMs: test.holdMs,
        value: evaluation.value,
        display: evaluation.display,
      };
    });
  }
}
