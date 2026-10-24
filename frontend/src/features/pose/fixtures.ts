import { poseSample, type Landmark } from "./sample";

// Hand-authored geometry, not captured from a person and not a model benchmark.
export type ExamplePose =
  "neutral" | "raised" | "together" | "lean" | "shift" | "crossed" | "missing";
export function syntheticPoints(pose: ExamplePose): Landmark[] {
  if (pose === "missing") return [];
  const points = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.24,
    z: 0,
    visibility: 0.99,
    presence: 0.99,
  }));
  const set = (i: number, x: number, y: number) => {
    points[i] = { ...points[i], x, y };
  };
  set(0, 0.5, 0.19);
  set(2, 0.47, 0.17);
  set(5, 0.53, 0.17);
  set(7, 0.44, 0.2);
  set(8, 0.56, 0.2);
  set(11, 0.38, 0.38);
  set(12, 0.62, 0.38);
  set(13, 0.34, 0.55);
  set(14, 0.66, 0.55);
  set(15, 0.34, 0.72);
  set(16, 0.66, 0.72);
  set(23, 0.41, 0.82);
  set(24, 0.59, 0.82);
  for (let i = 25; i < 33; i++) points[i].visibility = 0.1;
  if (pose === "raised") {
    set(14, 0.73, 0.35);
    set(16, 0.72, 0.12);
  }
  if (pose === "together") {
    set(15, 0.48, 0.64);
    set(16, 0.52, 0.64);
  }
  if (pose === "lean") {
    for (let i = 0; i <= 16; i++) points[i].x += 0.12;
  }
  if (pose === "shift") {
    for (const point of points) point.x += 0.12;
  }
  if (pose === "crossed") {
    set(15, 0.59, 0.49);
    set(16, 0.41, 0.49);
  }
  return points;
}
export function syntheticSample(
  pose: ExamplePose,
  t: number,
  width = 640,
  height = 360,
) {
  return poseSample(syntheticPoints(pose), width, height, t);
}
export const WALKTHROUGH = [
  { until: 4000, pose: "neutral", label: "Neutral position · calibration" },
  { until: 7000, pose: "raised", label: "A hand above the shoulder" },
  { until: 9000, pose: "neutral", label: "Return to neutral" },
  {
    until: 12000,
    pose: "together",
    label: "Hands together in front of the torso",
  },
  { until: 14000, pose: "neutral", label: "Return to neutral" },
  { until: 18000, pose: "shift", label: "A sideways position change" },
  {
    until: 20000,
    pose: "missing",
    label: "Camera loses the person · evaluation pauses",
  },
  { until: 22000, pose: "neutral", label: "Visible again · ready to continue" },
] as const;
