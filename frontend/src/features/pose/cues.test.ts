import { expect, it } from "vitest";
import { armsCrossed } from "./cues";
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
