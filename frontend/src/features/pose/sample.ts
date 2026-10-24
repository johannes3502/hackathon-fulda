export type Landmark = {
  x: number;
  y: number;
  z: number;
  visibility?: number;
  presence?: number;
};
export type HandLandmark = [number, number, number];
export type HandSample = {
  label: string;
  score: number;
  landmarks: HandLandmark[];
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
  handConfidence: 0.3,
  eyeWidthRatio: 0.65,
  eyeDepthRatio: 0.35,
  // A detected hand belongs to the nearest pose wrist within this many
  // shoulder widths (hand landmark 0 is the wrist).
  handWristDist: 0.5,
};
type PointName = keyof typeof POINTS;
type Vector = [number, number, number];
type RawPoint = [number, number, number, number | null, number | null];
const valid = (p?: Landmark): p is Landmark =>
  !!p && [p.x, p.y, p.z].every(Number.isFinite);
const confidence = (n?: number) =>
  n !== undefined && Number.isFinite(n) && n >= 0 && n <= 1 ? n : null;
const inImage = (p?: Landmark): p is Landmark =>
  valid(p) && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1;
const visible = (p?: Landmark) =>
  inImage(p) &&
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
  // null when the hand model is unavailable; [] when it found no hands.
  hands: HandSample[] | null = null,
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
  // Wrist position along the shoulder line, in shoulder widths from the body
  // midline. Positive means the wrist has crossed over to the other side.
  const cross = (w: number, side: 1 | -1) => {
    const p = get(w)?.map(planar);
    if (!p || !shoulders) return null;
    const axis = sub(shoulders[0], shoulders[1]);
    const span = axis[0] ** 2 + axis[1] ** 2;
    if (span < 1e-8) return null;
    const v = sub(p[0], mid(shoulders[0], shoulders[1]));
    return (side * (v[0] * axis[0] + v[1] * axis[1])) / span;
  };
  // Forearm direction against the shoulder line, folded to [0,90]; 0 = level.
  const forearm = (e: number, w: number) => {
    const p = get(e, w)?.map(planar);
    const a =
      p && shoulders
        ? angle(sub(p[1], p[0]), sub(shoulders[0], shoulders[1]))
        : null;
    return a === null ? null : Math.min(a, 180 - a);
  };
  // Wrist to same-side hip in shoulder widths. The wrist only needs to be an
  // in-image estimate: a hand in a pocket is hidden by design.
  const hipDist = (w: number, h: number) => {
    const hip = get(h)?.map(planar);
    const p = points[w];
    const span = shoulders ? Math.hypot(...sub(shoulders[0], shoulders[1])) : 0;
    return hip && inImage(p) && span > 1e-8
      ? Math.hypot(p.x * width - hip[0][0], p.y * height - hip[0][1]) / span
      : null;
  };
  // Highest visibility of the pinky, index and thumb points. Null when they
  // fall outside the image, where a low value only means "out of frame".
  const hand = (...indices: number[]) => {
    const values = indices.map((i) =>
      inImage(points[i]) ? confidence(points[i].visibility) : null,
    );
    return values.includes(null) ? null : Math.max(...(values as number[]));
  };
  // Each detected hand goes to the nearest pose wrist; the closer one wins.
  const span = shoulders ? Math.hypot(...sub(shoulders[0], shoulders[1])) : 0;
  const owner: [HandSample | null, HandSample | null] = [null, null];
  const ownerDist = [Infinity, Infinity];
  if (hands && span > 1e-8)
    for (const h of hands) {
      const root = h.landmarks[0];
      if (h.landmarks.length !== 21 || !root || !root.every(Number.isFinite))
        continue;
      const dist = [15, 16].map((w) =>
        valid(points[w])
          ? Math.hypot(
              (root[0] - points[w].x) * width,
              (root[1] - points[w].y) * height,
            ) / span
          : Infinity,
      );
      const side = dist[0] <= dist[1] ? 0 : 1;
      if (
        dist[side] <= HEURISTICS.handWristDist &&
        dist[side] < ownerDist[side]
      ) {
        owner[side] = h;
        ownerDist[side] = dist[side];
      }
    }
  // true = a hand was detected at this wrist. null when the hand model did
  // not run or the hand is estimated outside the image (cropped, not hidden).
  const found = (side: 0 | 1, ...fingers: number[]) =>
    owner[side]
      ? true
      : hands === null || span <= 1e-8 || hand(...fingers) === null
        ? null
        : false;
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
      left_wrist_cross: cross(15, -1),
      right_wrist_cross: cross(16, 1),
      left_forearm_deg: forearm(13, 15),
      right_forearm_deg: forearm(14, 16),
      left_wrist_hip_dist: hipDist(15, 23),
      right_wrist_hip_dist: hipDist(16, 24),
      left_hand_visibility: hand(17, 19, 21),
      right_hand_visibility: hand(18, 20, 22),
      left_hand_found: found(0, 17, 19, 21),
      right_hand_found: found(1, 18, 20, 22),
    },
    quality: {
      pose_present: true,
      hips_visible: [23, 24].every((i) => visible(points[i])),
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
  add(
    points: Landmark[],
    width: number,
    height: number,
    timestamp: number,
    hands: HandSample[] | null = null,
  ) {
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
      hands,
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
