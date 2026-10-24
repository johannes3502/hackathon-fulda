import { expect, it } from "vitest";
import {
  CROSS_ARMS,
  POCKET,
  CrossArmsCue,
  armsCrossed,
  handsInPockets,
  pocketCheck,
} from "./cues";
import { poseSample, type HandSample, type Landmark } from "./sample";
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
const timed = CROSS_ARMS;
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
it("supports explicit immediate timing for a diagnostic adapter", () => {
  const cue = new CrossArmsCue({ ...CROSS_ARMS, holdMs: 0, cooldownMs: 0 });
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

type Side = "pocket" | "hang" | "hip";
/** Standing pose; hands are detected unless they are in a pocket. */
function pocketPose(left: Side, right: Side) {
  const p = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: 0.99,
    presence: 0.99,
  }));
  const hands: HandSample[] = [];
  const set = (i: number, x: number, y: number, visibility = 0.99) =>
    Object.assign(p[i], { x, y, visibility });
  set(11, 0.4, 0.3);
  set(12, 0.6, 0.3);
  set(23, 0.42, 0.7);
  set(24, 0.58, 0.7);
  set(13, 0.36, 0.5);
  set(14, 0.64, 0.5);
  const side = (
    pose: Side,
    wrist: number,
    fingers: number[],
    x: [pocket: number, hang: number],
  ) => {
    const [wx, wy] = pose === "hang" ? [x[1], 0.85] : [x[0], 0.72];
    set(wrist, wx, wy, pose === "pocket" ? 0.3 : 0.99);
    fingers.forEach((i) =>
      set(i, wx, wy + 0.03, pose === "pocket" ? 0.1 : 0.99),
    );
    if (pose !== "pocket")
      hands.push({
        label: "",
        score: 0.95,
        landmarks: Array.from(
          { length: 21 },
          (_, i) => [wx, wy + i * 0.002, 0] as [number, number, number],
        ),
      });
  };
  side(left, 15, [17, 19, 21], [0.44, 0.36]);
  side(right, 16, [18, 20, 22], [0.56, 0.64]);
  return { p, hands };
}
const standing = (
  { p, hands }: ReturnType<typeof pocketPose>,
  found: HandSample[] | null = hands,
) => poseSample(p, 1000, 500, 0, found);

it("detects one hand in a front pocket when no hand is found near the hip", () => {
  const s = standing(pocketPose("pocket", "hang"))!;
  expect(s.quality.hips_visible).toBe(true);
  expect(s.derived.left_wrist_hip_dist).toBeCloseTo(0.11, 1);
  expect(s.derived.left_hand_found).toBe(false);
  expect(s.derived.right_hand_found).toBe(true);
  expect(pocketCheck(s).side).toEqual([true, false]);
  expect(handsInPockets(s)).toBe(true);
});
it("ignores hanging arms and detected hands resting on the hips", () => {
  const hang = standing(pocketPose("hang", "hang"))!;
  expect(hang.derived.left_wrist_hip_dist).toBeGreaterThan(POCKET.maxHipDist);
  expect(handsInPockets(hang)).toBe(false);
  expect(handsInPockets(standing(pocketPose("hip", "hang")))).toBe(false);
});
it("assigns each detected hand to its nearest wrist only", () => {
  const pose = pocketPose("hang", "hang");
  // Both hands next to the right wrist: the left wrist has no hand.
  const right = pose.hands[1]!;
  const s = standing(pose, [right, { ...right }])!;
  expect(s.derived.left_hand_found).toBe(false);
  expect(s.derived.right_hand_found).toBe(true);
  // A hand far from both wrists belongs to neither.
  const far: HandSample = {
    label: "",
    score: 0.9,
    landmarks: right.landmarks.map(
      () => [0.05, 0.05, 0] as [number, number, number],
    ),
  };
  expect(standing(pose, [far])!.derived.right_hand_found).toBe(false);
});
it("stays undecided without the hand model, hips or an in-frame hand", () => {
  expect(
    handsInPockets(standing(pocketPose("pocket", "hang"), null)),
  ).toBeNull();
  const hips = pocketPose("pocket", "pocket");
  hips.p[23].visibility = 0;
  hips.p[24].visibility = 0;
  const hidden = standing(hips)!;
  expect(hidden.quality.hips_visible).toBe(false);
  expect(handsInPockets(hidden)).toBeNull();
  const cropped = pocketPose("hang", "hang");
  [17, 19, 21].forEach((i) => (cropped.p[i].y = 1.05));
  const out = standing(cropped, [cropped.hands[1]!])!;
  expect(out.derived.left_hand_found).toBeNull();
  expect(handsInPockets(out)).toBeNull();
});
