import { describe, expect, it } from "vitest";
import { PoseEvaluator, POSE_RULES, type PoseEvaluation } from "./evaluation";
import {
  syntheticPoints,
  syntheticSample,
  type ExamplePose,
  WALKTHROUGH,
} from "./fixtures";
import { poseSample } from "./sample";

function feed(
  engine: PoseEvaluator,
  pose: ExamplePose,
  start: number,
  end: number,
  interval = 100,
) {
  let state!: PoseEvaluation;
  for (let t = start; t <= end; t += interval)
    state = engine.update(syntheticSample(pose, t), t);
  return state;
}
function ready() {
  const engine = new PoseEvaluator("take-1");
  expect(feed(engine, "neutral", 0, 3000).phase).toBe("ready");
  return engine;
}
describe("observable gesture rules", () => {
  it("retains tolerant midline crossed arms with hold time while distinguishing hands together", () => {
    const engine = ready();
    const points = syntheticPoints("crossed");
    points[15].x = 0.5144;
    points[16].x = 0.5216;
    let state!: PoseEvaluation;
    for (let t = 3100; t <= 5000; t += 100)
      state = engine.update(poseSample(points, 640, 360, t), t);
    expect(state.events).toHaveLength(0);
    state = engine.update(poseSample(points, 640, 360, 5100), 5100);
    expect(state.events.map((e) => e.payload.rule)).toEqual(["arms_crossed"]);
    expect(state.events[0].payload.confirmed_at_ms).toBe(5100);
  });
  it("requires a stable visible baseline; motion, sparse samples and missing hips never pass calibration", () => {
    const engine = new PoseEvaluator();
    expect(feed(engine, "neutral", 0, 2900).phase).toBe("calibrating");
    expect(feed(engine, "lean", 3000, 3100).phase).toBe("calibrating");
    expect(feed(engine, "neutral", 3200, 6100).phase).toBe("calibrating");
    expect(feed(engine, "neutral", 6200, 6300).phase).toBe("ready");
    expect(feed(new PoseEvaluator(), "neutral", 0, 10000, 500).phase).toBe(
      "calibrating",
    );
    const points = syntheticPoints("neutral");
    points[23].visibility = 0.1;
    expect(
      new PoseEvaluator().update(poseSample(points, 640, 360, 0), 0).phase,
    ).toBe("framing");
  });
  it("does not infer bad posture or gaze from neutral or absent evidence", () => {
    const engine = ready();
    expect(feed(engine, "neutral", 3100, 120000).events).toEqual([]);
    const state = engine.update(null, 120100);
    expect(state.phase).toBe("framing");
    expect(state.cue).toBeNull();
    expect(state.events).toEqual([]);
  });
  it("short gestures never emit; a sustained gesture has onset, confirmation and one growing event", () => {
    const engine = ready();
    expect(feed(engine, "raised", 3100, 3800).events).toEqual([]);
    const state = feed(engine, "raised", 3900, 6000);
    expect(state.events).toHaveLength(1);
    expect(state.events[0]).toMatchObject({
      session_id: "take-1",
      t_ms: 3100,
      duration_ms: 2900,
      type: "gesture",
      source: "browser",
      payload: { rule: "hand_raised", heuristic: true, confirmed_at_ms: 3900 },
    });
    expect(state.cue?.id).toBe(state.events[0].id);
  });
  it("missing frames break dwell and do not interpolate the gap", () => {
    const engine = ready();
    feed(engine, "raised", 3100, 3700);
    engine.update(null, 3800);
    expect(feed(engine, "raised", 3900, 4600).events).toEqual([]);
    expect(feed(engine, "raised", 4700, 4700).events[0].t_ms).toBe(3900);
    const gapEngine = ready();
    feed(gapEngine, "raised", 3100, 3700);
    expect(feed(gapEngine, "raised", 4500, 5200).events).toEqual([]);
  });
  it("holds are not duplicated and cooldown applies after release or loss", () => {
    const engine = ready();
    feed(engine, "raised", 3100, 5000);
    engine.update(null, 5100);
    expect(feed(engine, "raised", 5200, 9900).events).toHaveLength(1);
    expect(feed(engine, "raised", 10000, 10800).events).toHaveLength(2);
  });
  it("uses hysteresis near the raised-hand boundary", () => {
    const engine = ready();
    feed(engine, "raised", 3100, 4000);
    const sample = syntheticSample("raised", 4100)!;
    sample.derived.right_wrist_height = 0.1;
    expect(engine.update(sample, 4100).events[0].duration_ms).toBe(1000);
    sample.derived.right_wrist_height = 0;
    expect(engine.update(sample, 4200).cue).toBeNull();
  });
  it("suppresses gestures when hands are hidden without suppressing usable posture", () => {
    const engine = ready();
    let state!: PoseEvaluation;
    for (let t = 3100; t <= 6000; t += 100) {
      const points = syntheticPoints("lean");
      points[15].visibility = 0.1;
      state = engine.update(poseSample(points, 640, 360, t), t);
    }
    expect(state.handsVisible).toBe(false);
    expect(state.events.map((e) => e.payload.rule)).toEqual(["torso_lean"]);
  });
  it("rejects out-of-frame and malformed points, and never counts duplicate timestamps", () => {
    const engine = ready();
    const points = syntheticPoints("raised");
    points[16].x = 1.2;
    for (let t = 3100; t <= 6000; t += 100)
      expect(engine.update(poseSample(points, 640, 360, t), t).events).toEqual(
        [],
      );
    for (let i = 0; i < 50; i++)
      expect(
        engine.update(syntheticSample("raised", 6100), 6100).events,
      ).toEqual([]);
    points[11].x = NaN;
    expect(engine.update(poseSample(points, 640, 360, 6200), 6200).phase).toBe(
      "framing",
    );
  });
  it.each([false, true])(
    "is invariant to image mirroring (%s), translation and proportional body scale",
    (mirror) => {
      const engine = new PoseEvaluator();
      let state!: PoseEvaluation;
      for (let t = 0; t <= 20000; t += 100) {
        const pose = WALKTHROUGH.find((s) => t < s.until)!.pose;
        const points = syntheticPoints(pose).map((p) => ({
          ...p,
          x: (mirror ? 1 - p.x : p.x) * 0.8 + 0.05,
          y: p.y * 0.8 + 0.05,
        }));
        state = engine.update(poseSample(points, 1280, 720, t), t);
      }
      expect(state.events.map((e) => e.payload.rule)).toEqual([
        "hand_raised",
        "hands_together",
        "body_shift",
      ]);
      expect(state.events.map((e) => e.t_ms)).toEqual([4000, 9000, 14000]);
    },
  );
  it("keeps anatomical baseline relative: a comfortable tilted neutral pose is not a fault", () => {
    const engine = new PoseEvaluator();
    const state = feed(engine, "lean", 0, 10000);
    expect(state.phase).toBe("ready");
    expect(state.events).toEqual([]);
    expect(Math.abs(state.baseline!.lean)).toBeGreaterThan(
      POSE_RULES.leanEnterDeg,
    );
  });
  it("recognizes the reported whole-body sideways motion without calling it a lean", () => {
    const engine = ready();
    expect(feed(engine, "shift", 3100, 3800).events).toEqual([]);
    const state = feed(engine, "shift", 3900, 6000);
    expect(state.events.map((e) => e.payload.rule)).toEqual(["body_shift"]);
    expect(state.measurements?.leanDelta).toBeCloseTo(0);
    expect(state.measurements?.shiftDelta).toBeCloseTo(0.5);
    expect(state.events[0].payload).toMatchObject({
      threshold: 0.35,
      unit: "shoulder widths",
      confirmed_at_ms: 3900,
    });
  });
  it("does not mark small lateral jitter or calibrate while the body is moving", () => {
    const engine = ready();
    let state!: PoseEvaluation;
    for (let t = 3100; t <= 7000; t += 100) {
      const points = syntheticPoints("neutral").map((p) => ({
        ...p,
        x: p.x + 0.025 * Math.sin(t),
      }));
      state = engine.update(poseSample(points, 640, 360, t), t);
    }
    expect(state.events).toEqual([]);
    const calibration = new PoseEvaluator();
    feed(calibration, "neutral", 0, 2800);
    expect(feed(calibration, "shift", 2900, 3100).phase).toBe("calibrating");
  });
  it("integrates crossed arms into the same event clock and respects missing wrists and the 20-second cooldown", () => {
    const engine = ready();
    expect(feed(engine, "crossed", 3100, 5000).events).toEqual([]);
    const first = feed(engine, "crossed", 5100, 6000);
    expect(first.events.map((e) => e.payload.rule)).toEqual(["arms_crossed"]);
    expect(first.events[0].payload.confirmed_at_ms).toBe(5100);
    engine.update(null, 6100);
    expect(feed(engine, "crossed", 6200, 25900).events).toHaveLength(1);
    expect(feed(engine, "crossed", 26000, 28000).events).toHaveLength(2);
    expect(
      feed(ready(), "together", 3100, 6000).events.map((e) => e.payload.rule),
    ).toEqual(["hands_together"]);
  });
});
