import { expect, it } from "vitest";
import { CROSS_ARMS, CrossArmsCue, armsCrossed } from "./cues";
import { poseSample, type Landmark } from "./sample";
function points(crossed: boolean): Landmark[] {
  const p = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: 0.99,
    presence: 0.99,
  }));
  const set = (i: number, x: number, y: number) =>
    Object.assign(p[i], { x, y });
  set(11, 0.25, 0.25);
  set(12, 0.75, 0.25);
  set(23, 0.25, 0.75);
  set(24, 0.75, 0.75);
  set(13, 0.3, 0.55);
  set(14, 0.7, 0.55);
  if (crossed) {
    set(15, 0.65, 0.4);
    set(16, 0.35, 0.4);
  } else {
    set(15, 0.25, 0.7);
    set(16, 0.75, 0.7);
  }
  return p;
}
const sample = (p: Landmark[]) => poseSample(p, 800, 400, 0);
it("measures each wrist past the body midline in shoulder widths", () => {
  const crossed = sample(points(true))!.derived;
  expect(crossed.left_wrist_cross).toBeCloseTo(0.3);
  expect(crossed.right_wrist_cross).toBeCloseTo(0.3);
  const open = sample(points(false))!.derived;
  expect(open.left_wrist_cross).toBeCloseTo(-0.5);
  expect(open.right_wrist_cross).toBeCloseTo(-0.5);
});
it("detects crossed arms independent of image orientation", () => {
  expect(armsCrossed(sample(points(true)))).toBe(true);
  expect(armsCrossed(sample(points(false)))).toBe(false);
  const mirrored = points(true).map((l) => ({ ...l, x: 1 - l.x }));
  expect(armsCrossed(sample(mirrored))).toBe(true);
});
it("detects crossed arms when MediaPipe places both wrists at the midline", () => {
  // Shape of a real take: hidden wrists estimated where the forearms meet.
  const p = points(true);
  const set = (i: number, x: number, y: number) =>
    Object.assign(p[i], { x, y });
  set(11, 0.4, 0.3);
  set(12, 0.6, 0.3);
  set(13, 0.38, 0.55);
  set(14, 0.62, 0.55);
  set(15, 0.512, 0.56);
  set(16, 0.518, 0.55);
  const s = poseSample(p, 1000, 500, 0)!;
  expect(s.derived.left_wrist_cross).toBeCloseTo(0.06);
  expect(s.derived.right_wrist_cross).toBeCloseTo(-0.09);
  expect(s.derived.left_forearm_deg).toBeLessThan(5);
  expect(armsCrossed(s)).toBe(true);
});
it("rejects hands pressed together with fingertips up", () => {
  const p = points(true);
  const set = (i: number, x: number, y: number) =>
    Object.assign(p[i], { x, y });
  set(11, 0.4, 0.3);
  set(12, 0.6, 0.3);
  set(13, 0.38, 0.6);
  set(14, 0.62, 0.6);
  set(15, 0.5, 0.35);
  set(16, 0.5, 0.35);
  const s = poseSample(p, 1000, 500, 0)!;
  expect(s.derived.left_forearm_deg).toBeGreaterThan(CROSS_ARMS.maxForearmDeg);
  expect(armsCrossed(s)).toBe(false);
});
it("rejects a single crossed wrist, raised hands and straight arms", () => {
  const one = points(true);
  Object.assign(one[16], { x: 0.75, y: 0.7 });
  expect(armsCrossed(sample(one))).toBe(false);
  const raised = points(true);
  raised[15].y = 0.01;
  raised[16].y = 0.01;
  expect(armsCrossed(sample(raised))).toBe(false);
  const straight = points(true);
  Object.assign(straight[13], { x: 0.45, y: 0.32 });
  expect(armsCrossed(sample(straight))).toBe(false);
});
it("returns null instead of guessing when points are not usable", () => {
  expect(armsCrossed(null)).toBeNull();
  const hidden = points(true);
  hidden[15].visibility = 0;
  expect(armsCrossed(sample(hidden))).toBeNull();
});
const timed = { ...CROSS_ARMS, holdMs: 2000, cooldownMs: 20000 };
it("hints once per episode after the hold time, then cools down", () => {
  const cue = new CrossArmsCue(timed);
  const run = (from: number, to: number, value: boolean | null) => {
    let active = false;
    for (let t = from; t <= to; t += 100) active = cue.update(value, t);
    return active;
  };
  expect(run(0, timed.holdMs - 100, true)).toBe(false);
  expect(cue.update(true, timed.holdMs)).toBe(true);
  // Brief dropouts and hidden wrists keep the episode alive.
  expect(cue.update(false, 2100)).toBe(true);
  expect(run(2200, 3000, null)).toBe(true);
  expect(run(3100, 5000, true)).toBe(true);
  expect(run(5100, 5600, false)).toBe(false);
  // Crossing again during the cooldown stays silent until it expires.
  expect(run(6000, 9000, true)).toBe(false);
  expect(cue.update(true, 5600 + timed.cooldownMs)).toBe(true);
});
it("hints immediately and again right after release with default timing", () => {
  const cue = new CrossArmsCue();
  expect(cue.update(true, 0)).toBe(true);
  expect(cue.update(false, 100)).toBe(true);
  expect(cue.update(false, 600)).toBe(false);
  expect(cue.update(true, 700)).toBe(true);
});
it("does not hint for a quick crossing", () => {
  const cue = new CrossArmsCue(timed);
  for (let t = 0; t < 1000; t += 100) cue.update(true, t);
  for (let t = 1000; t <= 1600; t += 100) cue.update(false, t);
  expect(cue.update(true, 1700)).toBe(false);
  expect(cue.update(true, 3000)).toBe(false);
});
