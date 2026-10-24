import { expect, it } from "vitest";
import { poseSample } from "./sample";
import { visiblePosePoints, projectPose } from "./overlay";
it("shares confidence filtering and mirrors/crops native preview without changing raw points", () => {
  const landmarks = Array.from({ length: 33 }, () => ({
    x: 0.25,
    y: 0.5,
    z: 0,
    visibility: 1,
    presence: 1,
  }));
  landmarks[7].visibility = 0.1;
  const sample = poseSample(landmarks, 640, 480, 100)!;
  expect(visiblePosePoints(sample).left_ear).toBeUndefined();
  const projected = projectPose(sample, 320, 240);
  expect(projected.nose).toEqual({ x: 240, y: 120 });
  const cropped = projectPose(sample, 240, 320);
  expect(cropped.nose.x).toBeCloseTo(226.6667, 3);
  expect(cropped.nose.y).toBe(160);
  expect(sample.pose.nose![0]).toBe(0.25);
  expect(projectPose(sample, 0, 0)).toEqual({});
});
