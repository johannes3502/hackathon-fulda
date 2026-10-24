import { expect, it } from "vitest";
import { poseSample, type HandSample, type Landmark } from "./sample";
import {
  POSE_TESTS,
  PoseTestTracker,
  faceDistance,
  headTurn,
  poseFeedback,
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

const sample = (points = base(), hands: HandSample[] | null = []) =>
  poseSample(points, 800, 400, 0, hands)!;
const evaluate = (
  id: PoseTestId,
  points = base(),
  hands: HandSample[] | null = [],
) =>
  POSE_TESTS.find((test) => test.id === id)!.check(
    sample(points, hands),
    hands ?? [],
  );

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

function crossedLegs(): Landmark[] {
  const p = base();
  Object.assign(p[27], { x: 0.75, y: 0.95 });
  Object.assign(p[28], { x: 0.25, y: 0.95 });
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

function pocketPose(): Landmark[] {
  const p = base();
  Object.assign(p[13], { x: 0.38, y: 0.55 });
  Object.assign(p[15], { x: 0.25, y: 0.72 });
  return p;
}

function hand(x: number, y: number, length: number): HandSample {
  const landmarks = Array.from(
    { length: 21 },
    () => [x, y, 0] as [number, number, number],
  );
  landmarks[0] = [x, y, 0];
  for (const tip of [8, 12, 16, 20])
    landmarks[tip] = [x, y + length, 0];
  return { label: "Left", score: 0.9, landmarks };
}

it("measures hand-to-face distance in shoulder widths", () => {
  expect(faceDistance(sample())!).toBeGreaterThan(0.6);
  expect(faceDistance(sample(selfTouch()))!).toBeLessThan(0.1);
  // The hand model finds a fingertip at the chin the pose wrist misses.
  expect(faceDistance(sample(), [hand(0.5, 0.18, 0.05)])!).toBeLessThan(0.1);
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
  expect(evaluate("crossed-legs", crossedLegs()).pass).toBe(true);
  expect(evaluate("arms-crossed", crossed()).pass).toBe(true);
  expect(evaluate("self-touch", selfTouch()).pass).toBe(true);
  expect(evaluate("look-away", lookAway()).pass).toBe(true);
  expect(evaluate("hands-up", handsUp()).pass).toBe(true);
  expect(evaluate("hips-out", hipsOut()).pass).toBe(true);
  expect(evaluate("hands-hidden", handsHidden()).pass).toBe(true);
});

it("detects crossed legs from intersecting lower-leg segments", () => {
  expect(evaluate("crossed-legs", crossedLegs()).pass).toBe(true);
  expect(evaluate("crossed-legs").pass).toBe(false);
  const hidden = base();
  hidden[27].visibility = 0;
  expect(evaluate("crossed-legs", hidden).pass).toBeNull();
});

it("reports which condition failed", () => {
  const check = evaluate("torso-lean");
  expect(check.pass).toBe(false);
  expect(check.failing).toContain("torso lean");
  expect(check.values.torso_lean_deg).not.toBeNull();
  expect(evaluate("arms-crossed", crossed()).failing).toEqual([]);
});

it("reports values and failing conditions for every pose", () => {
  for (const test of POSE_TESTS) {
    const result = test.check(sample(base()), []);
    expect(result.values).toBeTypeOf("object");
    expect(Array.isArray(result.failing)).toBe(true);
  }
});

it("does not recognize the neutral pose while off baseline", () => {
  expect(evaluate("neutral", lean()).pass).toBe(false);
  expect(evaluate("neutral", crossed()).pass).toBe(false);
  expect(evaluate("neutral", hipsOut()).pass).toBeNull();
});

it("recognizes immediately and resets on release", () => {
  const tracker = new PoseTestTracker();
  const at = (points: Landmark[], t: number) =>
    tracker.update(sample(points), t).find((r) => r.id === "torso-lean")!;
  expect(at(lean(), 0).state).toBe("recognized");
  expect(at(base(), 100).state).toBe("recognized");
  expect(at(base(), 400).state).toBe("off");
});

it("marks missing data as not evaluable after the unknown grace period", () => {
  const tracker = new PoseTestTracker();
  const at = (points: Landmark[], t: number) =>
    tracker.update(sample(points), t).find((r) => r.id === "torso-lean")!;
  expect(at(lean(), 0).state).toBe("recognized");
  expect(at(hipsOut(), 100).state).toBe("recognized");
  expect(at(hipsOut(), 900).state).toBe("not-evaluable");
});

it("uses the hand model to tell a pocketed hand from a detected hand", () => {
  // No hand near the hip while the wrist sits at it: pocket heuristic.
  expect(evaluate("pocket", pocketPose(), []).pass).toBe(true);
  // The hand model sees both hands at the wrists: not a pocket.
  expect(
    evaluate("pocket", pocketPose(), [
      hand(0.25, 0.72, 0.1),
      hand(0.75, 0.75, 0.1),
    ]).pass,
  ).toBe(false);
  // Without the hand model the pocket check stays undecided.
  expect(evaluate("pocket", pocketPose(), null).pass).toBeNull();
  // Without hips there is no distance and no decision.
  const noHips = pocketPose();
  noHips[23].visibility = 0;
  noHips[24].visibility = 0;
  expect(evaluate("pocket", noHips, []).pass).toBeNull();
});

it("does not call hands hidden while the hand model sees a hand", () => {
  expect(evaluate("hands-hidden", handsHidden()).pass).toBe(true);
  expect(
    evaluate("hands-hidden", handsHidden(), [hand(0.5, 0.5, 0.1)]).pass,
  ).toBe(false);
});

it("shows exactly one prioritized output for the pose lab", () => {
  const tracker = new PoseTestTracker();
  // Both hands are seen at the wrists, so the pocket heuristic stays off.
  const detected = [hand(0.25, 0.75, 0.05), hand(0.75, 0.75, 0.05)];
  tracker.update(sample(base(), detected), 0, detected);
  expect(
    poseFeedback(tracker.update(sample(base(), detected), 800, detected)),
  ).toMatchObject({
    state: "ok",
    label: "OK",
  });
  expect(
    poseFeedback(tracker.update(sample(pocketPose()), 1500, [])),
  ).toMatchObject({
    state: "alert",
    label: "Hand in pocket",
  });
});
