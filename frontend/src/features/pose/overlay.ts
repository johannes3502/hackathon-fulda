import { HEURISTICS, type PoseSample } from "./sample";

export const connections: [
  keyof PoseSample["pose"],
  keyof PoseSample["pose"],
][] = [
  ["nose", "left_eye"],
  ["nose", "right_eye"],
  ["left_eye", "left_ear"],
  ["right_eye", "right_ear"],
  ["left_shoulder", "right_shoulder"],
  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],
  ["left_shoulder", "left_hip"],
  ["right_shoulder", "right_hip"],
  ["left_hip", "right_hip"],
  ["left_hip", "left_knee"],
  ["left_knee", "left_ankle"],
  ["right_hip", "right_knee"],
  ["right_knee", "right_ankle"],
];

export function visiblePosePoints(sample: PoseSample) {
  return Object.fromEntries(
    Object.entries(sample.pose).filter(
      ([, point]) =>
        point &&
        point[0] >= 0 &&
        point[0] <= 1 &&
        point[1] >= 0 &&
        point[1] <= 1 &&
        (point[3] ?? 0) >= HEURISTICS.confidence &&
        (point[4] === null || point[4] >= HEURISTICS.confidence),
    ),
  );
}
/** Aspect-fill projection for the native front-camera preview. */
export function projectPose(sample: PoseSample, width: number, height: number) {
  if (
    width <= 0 ||
    height <= 0 ||
    sample.image.width <= 0 ||
    sample.image.height <= 0
  )
    return {};
  const scale = Math.max(
    width / sample.image.width,
    height / sample.image.height,
  );
  const dx = (width - sample.image.width * scale) / 2;
  const dy = (height - sample.image.height * scale) / 2;
  return Object.fromEntries(
    Object.entries(visiblePosePoints(sample)).flatMap(([name, p]) =>
      p
        ? [
            [
              name,
              {
                x: width - (p[0] * sample.image.width * scale + dx),
                y: p[1] * sample.image.height * scale + dy,
              },
            ],
          ]
        : [],
    ),
  );
}
