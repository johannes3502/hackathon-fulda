export type Landmark = {
  x: number;
  y: number;
  z: number;
  visibility?: number;
  presence?: number;
};
export const POINTS = {
  nose: 0,
  left_eye_inner: 1,
  left_eye: 2,
  left_eye_outer: 3,
  right_eye_inner: 4,
  right_eye: 5,
  right_eye_outer: 6,
  left_ear: 7,
  right_ear: 8,
  left_shoulder: 11,
  right_shoulder: 12,
  left_elbow: 13,
  right_elbow: 14,
  left_wrist: 15,
  right_wrist: 16,
  left_hip: 23,
  right_hip: 24,
  left_knee: 25,
  right_knee: 26,
  left_ankle: 27,
  right_ankle: 28,
} as const;
// Prototype heuristics, not validated thresholds or assessments.
export const HEURISTICS = {
  confidence: 0.5,
  eyeWidthRatio: 0.65,
  eyeDepthRatio: 0.35,
};
type PointName = keyof typeof POINTS;
type Vector = [number, number, number];
type RawPoint = [number, number, number, number | null, number | null];
const valid = (p?: Landmark): p is Landmark =>
  !!p && [p.x, p.y, p.z].every(Number.isFinite);
const confidence = (n?: number) =>
  n !== undefined && Number.isFinite(n) && n >= 0 && n <= 1 ? n : null;
const visible = (p?: Landmark) =>
  valid(p) &&
  p.x >= 0 &&
  p.x <= 1 &&
  p.y >= 0 &&
  p.y <= 1 &&
  (confidence(p.visibility) ?? 0) >= HEURISTICS.confidence &&
  (p.presence === undefined ||
    (confidence(p.presence) ?? 0) >= HEURISTICS.confidence);
const sub = (a: Vector, b: Vector): Vector => [
  a[0] - b[0],
  a[1] - b[1],
  a[2] - b[2],
];
const mid = (a: Vector, b: Vector): Vector => [
  (a[0] + b[0]) / 2,
  (a[1] + b[1]) / 2,
  (a[2] + b[2]) / 2,
];
const deg = (r: number) => (r * 180) / Math.PI;
const angle = (a: Vector, b: Vector) => {
  const length = Math.hypot(...a) * Math.hypot(...b);
  return length < 1e-8
    ? null
    : deg(
        Math.acos(
          Math.max(
            -1,
            Math.min(1, a.reduce((s, n, i) => s + n * b[i], 0) / length),
          ),
        ),
      );
};
const tilt = (a: Vector, b: Vector) => {
  const v = sub(b, a);
  if (Math.hypot(v[0], v[1]) < 1e-8) return null;
  return ((deg(Math.atan2(v[1], v[0])) + 270) % 180) - 90;
};

export function poseSample(
  points: Landmark[],
  width: number,
  height: number,
  tMs: number,
) {
  if (
    points.length !== 33 ||
    !valid(points[0]) ||
    width <= 0 ||
    height <= 0 ||
    ![width, height, tMs].every(Number.isFinite) ||
    tMs < 0
  )
    return null;
  const pose = Object.fromEntries(
    Object.entries(POINTS).map(([name, i]) => {
      const p = points[i];
      const raw: RawPoint | null =
        valid(p) && (i < 25 || visible(p))
          ? [p.x, p.y, p.z, confidence(p.visibility), confidence(p.presence)]
          : null;
      return [name, raw];
    }),
  ) as Record<PointName, RawPoint | null>;
  // Pixel geometry corrects camera aspect ratio. Depth has the model's x scale.
  const get = (...indices: number[]): Vector[] | null =>
    indices.every((i) => visible(points[i]))
      ? indices.map((i) => [
          points[i].x * width,
          points[i].y * height,
          points[i].z * width,
        ])
      : null;
  const planar = (p: Vector): Vector => [p[0], p[1], 0];
  const shoulders = get(11, 12)?.map(planar);
  const hips = get(23, 24)?.map(planar);
  const torso =
    shoulders && hips
      ? sub(
          mid(...(hips as [Vector, Vector])),
          mid(...(shoulders as [Vector, Vector])),
        )
      : null;
  const eyes = get(1, 2, 3, 4, 5, 6);
  let eyesForward = false;
  if (eyes) {
    const left = Math.hypot(...sub(eyes[0], eyes[2]));
    const right = Math.hypot(...sub(eyes[3], eyes[5]));
    const span = Math.hypot(eyes[1][0] - eyes[4][0], eyes[1][1] - eyes[4][1]);
    eyesForward =
      Math.max(left, right) > 1e-8 &&
      span > 1e-8 &&
      Math.min(left, right) / Math.max(left, right) >=
        HEURISTICS.eyeWidthRatio &&
      Math.abs(eyes[1][2] - eyes[4][2]) / span <= HEURISTICS.eyeDepthRatio;
  }
  const head = get(0, 7, 8);
  const face = head ? sub(head[0], mid(head[1], head[2])) : null;
  const elbow = (s: number, e: number, w: number) => {
    const p = get(s, e, w)?.map(planar);
    return p ? angle(sub(p[0], p[1]), sub(p[2], p[1])) : null;
  };
  const arm = (s: number, e: number) => {
    const p = get(s, e)?.map(planar);
    return p && torso ? angle(torso, sub(p[1], p[0])) : null;
  };
  const wrist = (s: number, w: number) => {
    const p = get(s, w);
    const span = shoulders ? Math.hypot(...sub(shoulders[0], shoulders[1])) : 0;
    return p && span > 1e-8 ? (p[0][1] - p[1][1]) / span : null;
  };
  return {
    t_ms: Math.round(tMs),
    image: { width, height },
    pose,
    head: {
      eyes_forward: eyesForward,
      pitch_deg:
        face && -face[2] > 1e-8 ? deg(Math.atan2(face[1], -face[2])) : null,
      roll_deg: eyes ? tilt(eyes[1], eyes[4]) : null,
    },
    derived: {
      shoulder_tilt_deg: shoulders ? tilt(shoulders[0], shoulders[1]) : null,
      torso_lean_deg:
        torso && Math.hypot(torso[0], torso[1]) > 1e-8
          ? deg(Math.atan2(torso[0], torso[1]))
          : null,
      left_elbow_deg: elbow(11, 13, 15),
      right_elbow_deg: elbow(12, 14, 16),
      left_arm_open_deg: arm(11, 13),
      right_arm_open_deg: arm(12, 14),
      left_wrist_height: wrist(11, 15),
      right_wrist_height: wrist(12, 16),
    },
    quality: {
      pose_present: true,
      legs_visible: [25, 26, 27, 28].every((i) => visible(points[i])),
    },
  };
}
export type PoseSample = NonNullable<ReturnType<typeof poseSample>>;

export class PoseLog {
  private origin: number | null = null;
  private lines: string[] = [];
  reset(recordingStart: number) {
    this.lines = [];
    this.origin = recordingStart;
  }
  get count() {
    return this.lines.length;
  }
  // shortcut: five minutes at 10 Hz; use streamed local storage for longer captures.
  get full() {
    return this.count >= 3000;
  }
  add(points: Landmark[], width: number, height: number, timestamp: number) {
    if (
      this.full ||
      !Number.isFinite(timestamp) ||
      (this.origin !== null && timestamp < this.origin)
    )
      return null;
    const sample = poseSample(
      points,
      width,
      height,
      timestamp - (this.origin ?? timestamp),
    );
    if (sample) {
      this.origin ??= timestamp;
      this.lines.push(JSON.stringify(sample));
    }
    return sample;
  }
  blob() {
    return this.count
      ? new Blob([this.lines.join("\n") + "\n"], {
          type: "application/x-ndjson",
        })
      : undefined;
  }
}
