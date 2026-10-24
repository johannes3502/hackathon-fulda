import { expect, it } from "vitest";
import {
  HEURISTICS,
  POINTS,
  PoseLog,
  poseSample,
  type Landmark,
} from "./sample";
function points(): Landmark[] {
  const p = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: 0.99,
    presence: 0.99,
  }));
  const set = (i: number, x: number, y: number, z = 0) =>
    Object.assign(p[i], { x, y, z });
  set(11, 0.25, 0.25);
  set(12, 0.75, 0.25);
  set(23, 0.25, 0.75);
  set(24, 0.75, 0.75);
  set(13, 0.25, 0.5);
  set(15, 0.5, 0.5);
  set(14, 0.75, 0.5);
  set(16, 0.5, 0.5);
  set(1, 0.42, 0.15, -0.1);
  set(2, 0.4, 0.15, -0.1);
  set(3, 0.38, 0.15, -0.1);
  set(4, 0.58, 0.15, -0.1);
  set(5, 0.6, 0.15, -0.1);
  set(6, 0.62, 0.15, -0.1);
  set(7, 0.3, 0.2);
  set(8, 0.7, 0.2);
  set(0, 0.5, 0.2, -0.1);
  return p;
}
it("exports exactly the requested raw points and unsmoothed geometry", () => {
  const p = points();
  const sample = poseSample(p, 800, 400, 1234)!;
  expect(Object.keys(sample.pose)).toEqual(Object.keys(POINTS));
  expect(sample.pose.nose).toEqual([0.5, 0.2, -0.1, 0.99, 0.99]);
  expect(sample.head).toEqual({
    eyes_forward: true,
    pitch_deg: 0,
    roll_deg: 0,
  });
  expect(sample.derived).toMatchObject({
    shoulder_tilt_deg: 0,
    torso_lean_deg: 0,
    left_elbow_deg: 90,
    left_arm_open_deg: 0,
    left_wrist_height: -0.25,
  });
  p[12].y = 0.75;
  expect(poseSample(p, 800, 400, 0)!.derived.shoulder_tilt_deg).toBeCloseTo(
    26.565,
  );
});
it("nulls hidden or off-image legs, gates measurements, and preserves missing presence", () => {
  const p = points();
  p[25].visibility = HEURISTICS.confidence - 0.01;
  p[26].x = 1.1;
  p[27].presence = 0.1;
  delete (p[0] as Landmark).presence;
  p[13].visibility = 0;
  p[2].visibility = 0;
  const sample = poseSample(p, 800, 400, 0)!;
  expect(sample.pose.left_knee).toBeNull();
  expect(sample.pose.right_knee).toBeNull();
  expect(sample.pose.left_ankle).toBeNull();
  expect(sample.pose.right_ankle).not.toBeNull();
  expect(sample.quality.legs_visible).toBe(false);
  expect(sample.pose.nose![4]).toBeNull();
  expect(sample.derived.left_elbow_deg).toBeNull();
  expect(sample.head.eyes_forward).toBe(false);
  expect(sample.head.roll_deg).toBeNull();
});
it("rejects absent poses and invalid inputs, and avoids invented angles for degenerate points", () => {
  expect(poseSample([], 800, 400, 0)).toBeNull();
  expect(poseSample(points(), 0, 400, 0)).toBeNull();
  const p = points();
  p[12] = { ...p[11] };
  p[15] = { ...p[13] };
  const sample = poseSample(p, 800, 400, 0)!;
  expect(sample.derived.shoulder_tilt_deg).toBeNull();
  expect(sample.derived.left_wrist_height).toBeNull();
  expect(sample.derived.left_elbow_deg).toBeNull();
});
it("uses the first present sample for previews and the recorder anchor for takes", async () => {
  const log = new PoseLog();
  log.add([], 800, 400, 500);
  expect(log.add(points(), 800, 400, 1200)!.t_ms).toBe(0);
  expect(log.add(points(), 800, 400, 1300)!.t_ms).toBe(100);
  log.reset(2000);
  expect(log.add(points(), 800, 400, 1999)).toBeNull();
  expect(log.add([], 800, 400, 2200)).toBeNull();
  expect(log.add(points(), 800, 400, 2500)!.t_ms).toBe(500);
  const lines = (await log.blob()!.text()).trim().split("\n");
  expect(lines).toHaveLength(1);
  expect(JSON.parse(lines[0]).t_ms).toBe(500);
});
it("bounds raw-log memory without replacing earlier samples", () => {
  const log = new PoseLog();
  for (let i = 0; i < 3001; i++) log.add(points(), 800, 400, i * 100);
  expect(log.count).toBe(3000);
  expect(log.full).toBe(true);
});
