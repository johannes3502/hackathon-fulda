import { expect, it } from "vitest";
import { poseSample, type Landmark } from "./sample";
import {
  POSE_TESTS,
  PoseTestTracker,
  faceDistance,
  headTurn,
  type PoseTestId,
} from "./testPoses";

function base(): Landmark[] {
  const p = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: 0.99,
    presence: 0.99,
  }));
  const set = (i: number, x: number, y: number) =>
    Object.assign(p[i], { x, y });
  set(0, 0.5, 0.2);
  set(1, 0.45, 0.18);
  set(2, 0.45, 0.18);
  set(3, 0.42, 0.18);
  set(4, 0.55, 0.18);
  set(5, 0.55, 0.18);
  set(6, 0.58, 0.18);
  set(7, 0.4, 0.2);
  set(8, 0.6, 0.2);
  set(11, 0.25, 0.3);
  set(12, 0.75, 0.3);
  set(13, 0.3, 0.5);
  set(14, 0.7, 0.5);
  set(15, 0.25, 0.75);
  set(16, 0.75, 0.75);
  set(23, 0.25, 0.7);
  set(24, 0.75, 0.7);
  set(25, 0.25, 0.85);
  set(26, 0.75, 0.85);
  set(27, 0.25, 0.95);
  set(28, 0.75, 0.95);
  return p;
}

const sample = (points = base()) => poseSample(points, 800, 400, 0)!;
const evaluate = (id: PoseTestId, points = base()) =>
  POSE_TESTS.find((test) => test.id === id)!.evaluate(sample(points));

function lean(): Landmark[] {
  const p = base();
  Object.assign(p[11], { x: 0.2 });
  Object.assign(p[12], { x: 0.4 });
  return p;
}

function shoulderTilt(): Landmark[] {
  const p = base();
  Object.assign(p[11], { y: 0.22 });
  Object.assign(p[12], { y: 0.4 });
  return p;
}

function headTilt(): Landmark[] {
  const p = base();
  Object.assign(p[5], { y: 0.25 });
  return p;
}

function crossed(): Landmark[] {
  const p = base();
  Object.assign(p[13], { x: 0.3, y: 0.55 });
  Object.assign(p[14], { x: 0.7, y: 0.55 });
  Object.assign(p[15], { x: 0.65, y: 0.4 });
  Object.assign(p[16], { x: 0.35, y: 0.4 });
  return p;
}

function selfTouch(): Landmark[] {
  const p = base();
  Object.assign(p[15], { x: 0.5, y: 0.22 });
  return p;
}

function lookAway(): Landmark[] {
  const p = base();
  Object.assign(p[0], { x: 0.6 });
  return p;
}

function handsUp(): Landmark[] {
  const p = base();
  Object.assign(p[15], { x: 0.1, y: 0.05 });
  Object.assign(p[16], { x: 0.9, y: 0.05 });
  return p;
}

function hipsOut(): Landmark[] {
  const p = base();
  p[23].visibility = 0;
  p[24].visibility = 0;
  return p;
}

function handsHidden(): Landmark[] {
  const p = base();
  p[15].visibility = 0;
  p[16].visibility = 0;
  return p;
}

it("measures hand-to-face distance in shoulder widths", () => {
  expect(faceDistance(sample())!).toBeGreaterThan(0.6);
  expect(faceDistance(sample(selfTouch()))!).toBeLessThan(0.1);
  const hidden = base();
  hidden[15].visibility = 0;
  hidden[16].visibility = 0;
  expect(faceDistance(sample(hidden))).toBeNull();
});

it("measures a head-turn proxy from nose and ears", () => {
  expect(headTurn(sample())).toBeCloseTo(0);
  expect(headTurn(sample(lookAway()))).toBeCloseTo(0.5);
  const hidden = base();
  hidden[7].visibility = 0;
  expect(headTurn(sample(hidden))).toBeNull();
});

it("evaluates each fixed test pose", () => {
  expect(evaluate("neutral").pass).toBe(true);
  expect(evaluate("torso-lean", lean()).pass).toBe(true);
  expect(evaluate("shoulder-tilt", shoulderTilt()).pass).toBe(true);
  expect(evaluate("head-tilt", headTilt()).pass).toBe(true);
  expect(evaluate("arms-crossed", crossed()).pass).toBe(true);
  expect(evaluate("self-touch", selfTouch()).pass).toBe(true);
  expect(evaluate("look-away", lookAway()).pass).toBe(true);
  expect(evaluate("hands-up", handsUp()).pass).toBe(true);
  expect(evaluate("hips-out", hipsOut()).pass).toBe(true);
  expect(evaluate("hands-hidden", handsHidden()).pass).toBe(true);
});

it("does not recognize the neutral pose while off baseline", () => {
  expect(evaluate("neutral", lean()).pass).toBe(false);
  expect(evaluate("neutral", crossed()).pass).toBe(false);
  expect(evaluate("neutral", hipsOut()).pass).toBeNull();
});

it("recognizes only after the hold time and resets on release", () => {
  const tracker = new PoseTestTracker();
  const at = (points: Landmark[], t: number) =>
    tracker.update(sample(points), t).find((r) => r.id === "torso-lean")!;
  expect(at(lean(), 0).state).toBe("watching");
  expect(at(lean(), 1400).state).toBe("watching");
  expect(at(lean(), 1500).state).toBe("recognized");
  expect(at(base(), 1600).state).toBe("recognized");
  expect(at(base(), 1900).state).toBe("off");
});

it("marks missing data as not evaluable after the unknown grace period", () => {
  const tracker = new PoseTestTracker();
  const at = (points: Landmark[], t: number) =>
    tracker.update(sample(points), t).find((r) => r.id === "torso-lean")!;
  expect(at(lean(), 0).state).toBe("watching");
  expect(at(lean(), 1500).state).toBe("recognized");
  expect(at(hipsOut(), 1600).state).toBe("recognized");
  expect(at(hipsOut(), 2400).state).toBe("not-evaluable");
});
