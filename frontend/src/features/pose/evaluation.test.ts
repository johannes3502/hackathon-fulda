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
  it("records measured stable torso intervals for review without praising calibration, missing frames or disabled rules", () => {
    const engine = ready();
    expect(engine.positiveFeedback).toEqual([]);
    feed(engine, "neutral", 3100, 6000);
    expect(engine.positiveFeedback).toEqual([
      expect.objectContaining({ startMs: 3000, endMs: 6000, kind: "positive" }),
    ]);
    feed(engine, "lean", 6100, 9000);
    engine.update(null, 9100);
    feed(engine, "neutral", 15000, 18000);
    expect(
      engine.positiveFeedback.map(({ startMs, endMs }) => [startMs, endMs]),
    ).toEqual([
      [3000, 6000],
      [15000, 18000],
    ]);
    engine.setModes({ torso_lean: "off" });
    feed(engine, "neutral", 18100, 22000);
    expect(engine.positiveFeedback.at(-1)?.endMs).toBe(18000);
  });
  it("calibrates a smaller, confidently detected torso while the hands move", () => {
    const engine = new PoseEvaluator();
    let state!: PoseEvaluation;
    for (let t = 0; t <= 4000; t += 100) {
      const points = syntheticPoints(
        t % 400 < 200 ? "neutral" : "together",
      ).map((p) => ({ ...p, x: 0.5 + (p.x - 0.5) * 0.45 }));
      state = engine.update(poseSample(points, 640, 480, t), t);
    }
    expect(state.phase).toBe("ready");
    expect(state.baseline!.shoulderWidth).toBeLessThan(0.12);
  });
  it("calibrates posture without hands and still detects an individually visible raised wrist", () => {
    const engine = new PoseEvaluator();
    let state!: PoseEvaluation;
    for (let t = 0; t <= 3000; t += 100) {
      const p = syntheticPoints("neutral");
      p[15].visibility = 0;
      p[16].visibility = 0;
      state = engine.update(poseSample(p, 640, 480, t), t);
    }
    expect(state.phase).toBe("ready");
    expect(state.baseline!.raised).toBeNull();
    for (let t = 3100; t <= 5100; t += 100) {
      const p = syntheticPoints("raised");
      p[15].visibility = 0;
      state = engine.update(poseSample(p, 640, 480, t), t);
    }
    expect(state.events.map((e) => e.payload.rule)).toEqual(["hand_raised"]);
    expect(state.events[0].payload.baseline).toBeNull();
  });
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
  it("keeps a crossed-arms hold through briefly hidden wrists", () => {
    const engine = ready();
    const points = (t: number) => {
      const p = syntheticPoints("crossed");
      if (t % 300 === 200) p[15].visibility = p[16].visibility = 0.1;
      return p;
    };
    let state!: PoseEvaluation;
    for (let t = 3100; t <= 5100; t += 100)
      state = engine.update(poseSample(points(t), 640, 360, t), t);
    expect(state.events.map((e) => e.payload.rule)).toEqual(["arms_crossed"]);
    expect(state.events[0].t_ms).toBe(3100);
    // Wrists hidden longer than the grace period end the observation.
    const lost = ready();
    feed(lost, "crossed", 3100, 3500);
    for (let t = 3600; t <= 5200; t += 100) {
      const p = syntheticPoints("crossed");
      p[15].visibility = p[16].visibility = 0.1;
      state = lost.update(poseSample(p, 640, 360, t), t);
    }
    expect(feed(lost, "crossed", 5300, 5300).events).toEqual([]);
  });
  it("respects admin modes: off drops a rule, review keeps the event without a hint", () => {
    const engine = new PoseEvaluator("take-1", POSE_RULES, {
      hand_raised: "off",
      body_shift: "review",
    });
    feed(engine, "neutral", 0, 3000);
    expect(feed(engine, "raised", 3100, 6000).events).toEqual([]);
    feed(engine, "neutral", 6100, 7000);
    const state = feed(engine, "shift", 7100, 9500);
    expect(state.events.map((e) => e.payload.rule)).toEqual(["body_shift"]);
    expect(state.cue).toBeNull();
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
    expect(feed(engine, "raised", 3100, 5000).events).toEqual([]);
    const state = feed(engine, "raised", 5100, 7000);
    expect(state.events).toHaveLength(1);
    expect(state.events[0]).toMatchObject({
      session_id: "take-1",
      t_ms: 3100,
      duration_ms: 3900,
      type: "gesture",
      source: "browser",
      payload: { rule: "hand_raised", heuristic: true, confirmed_at_ms: 5100 },
    });
    expect(state.cue?.id).toBe(state.events[0].id);
  });
  it("missing frames break dwell and do not interpolate the gap", () => {
    const engine = ready();
    feed(engine, "raised", 3100, 4900);
    engine.update(null, 5000);
    expect(feed(engine, "raised", 5100, 7000).events).toEqual([]);
    expect(feed(engine, "raised", 7100, 7100).events[0].t_ms).toBe(5100);
    const gapEngine = ready();
    feed(gapEngine, "raised", 3100, 4900);
    expect(feed(gapEngine, "raised", 5700, 7600).events).toEqual([]);
  });
  it("holds are not duplicated and cooldown applies after release or loss", () => {
    const engine = ready();
    feed(engine, "raised", 3100, 5100);
    engine.update(null, 5200);
    expect(feed(engine, "raised", 5300, 10000).events).toHaveLength(1);
    expect(feed(engine, "raised", 10100, 12100).events).toHaveLength(2);
  });
  it("uses hysteresis near the raised-hand boundary", () => {
    const engine = ready();
    feed(engine, "raised", 3100, 5100);
    const sample = syntheticSample("raised", 5200)!;
    sample.derived.right_wrist_height = 0.1;
    expect(engine.update(sample, 5200).events[0].duration_ms).toBe(2100);
    sample.derived.right_wrist_height = 0;
    expect(engine.update(sample, 5300).cue).toBeNull();
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
    expect(feed(engine, "shift", 3100, 5000).events).toEqual([]);
    const state = feed(engine, "shift", 5100, 7000);
    expect(state.events.map((e) => e.payload.rule)).toEqual(["body_shift"]);
    expect(state.measurements?.leanDelta).toBeCloseTo(0);
    expect(state.measurements?.shiftDelta).toBeCloseTo(0.5);
    expect(state.events[0].payload).toMatchObject({
      threshold: 0.35,
      unit: "shoulder widths",
      confirmed_at_ms: 5100,
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
  const head = (
    engine: PoseEvaluator,
    start: number,
    end: number,
    move: (p: ReturnType<typeof syntheticPoints>) => void,
  ) => {
    let state!: PoseEvaluation;
    for (let t = start; t <= end; t += 100) {
      const points = syntheticPoints("neutral");
      move(points);
      state = engine.update(poseSample(points, 640, 360, t), t);
    }
    return state;
  };
  it("marks a sustained sideways head turn as a gaze-type head proxy, not a short glance", () => {
    const engine = ready();
    expect(
      engine.update(syntheticSample("neutral", 3000), 3000).baseline!.yaw,
    ).toBeCloseTo(0);
    const turn = (p: ReturnType<typeof syntheticPoints>) => {
      p[0].x = 0.535;
      // The far ear is partly occluded but still estimated in the image.
      p[8].visibility = 0.3;
    };
    expect(head(engine, 3100, 4900, turn).events).toEqual([]);
    expect(head(engine, 5000, 6000, () => {}).events).toEqual([]);
    const state = head(engine, 6100, 8500, turn);
    expect(state.events).toHaveLength(1);
    expect(state.events[0]).toMatchObject({
      t_ms: 6100,
      type: "gaze",
      payload: {
        rule: "head_turned",
        threshold: POSE_RULES.headTurnEnter,
        unit: "ear-distance ratio",
        confirmed_at_ms: 8100,
      },
    });
    expect(state.measurements?.yawDelta).toBeCloseTo(7 / 12);
    expect(state.cue?.payload.rule).toBe("head_turned");
  });
  it("marks a sustained downward head tilt relative to the calibrated head", () => {
    const engine = ready();
    const state = head(engine, 3100, 5500, (p) => {
      p[0].y = 0.25;
    });
    expect(state.events.map((e) => [e.type, e.payload.rule])).toEqual([
      ["gaze", "head_down"],
    ]);
    expect(state.events[0].payload.confirmed_at_ms).toBe(5100);
    expect(state.measurements?.dropDelta).toBeGreaterThan(
      POSE_RULES.headDownEnter,
    );
    // Looking up is not reported as looking down.
    expect(
      head(ready(), 3100, 6000, (p) => {
        p[0].y = 0.14;
      }).events,
    ).toEqual([]);
  });
  it("keeps the head reference relative and pauses head rules without ears", () => {
    // A comfortable tilted neutral head is not a fault.
    const engine = new PoseEvaluator();
    const state = head(engine, 0, 10000, (p) => {
      p[0].x = 0.535;
      p[0].y = 0.25;
    });
    expect(state.phase).toBe("ready");
    expect(state.events).toEqual([]);
    const hidden = head(ready(), 3100, 6000, (p) => {
      p[0].y = 0.25;
      p[7].visibility = 0.1;
    });
    expect(hidden.events).toEqual([]);
    expect(hidden.measurements?.dropDelta).toBeNull();
  });
});
