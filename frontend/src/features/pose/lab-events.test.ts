import { expect, it } from "vitest";
import { POSE_RULES } from "./evaluation";
import { LabEventTracker } from "./lab-events";
import type { PoseTestId, PoseTestResult } from "./testPoses";

const result = (
  id: PoseTestId,
  state: PoseTestResult["state"],
  heldMs = 0,
): PoseTestResult => ({
  id,
  label: id,
  instruction: "",
  kind: id === "neutral" ? "baseline" : "alert",
  priority: 0,
  state,
  heldMs,
  holdMs: 2000,
  value: null,
  display: "",
  values: { left_in_pocket: true },
  failing: [],
  praise: false,
});

it("turns a recognized pocket into one live cue and review event", () => {
  const tracker = new LabEventTracker("take");
  expect(tracker.update([result("pocket", "watching", 1000)], 1000).cue).toBe(
    null,
  );
  const first = tracker.update([result("pocket", "recognized", 2000)], 2000);
  expect(first.cue?.payload.rule).toBe("hand_in_pocket");
  expect(first.cue?.payload.title).toBe("Hand in pocket");
  expect(first.cue).toMatchObject({ t_ms: 0, duration_ms: 2000 });
  expect(first.cue?.payload.confirmed_at_ms).toBe(2000);
  const later = tracker.update([result("pocket", "recognized", 3500)], 3500);
  expect(later.events).toHaveLength(1);
  expect(later.events[0]).toMatchObject({ t_ms: 0, duration_ms: 3500 });
  const ended = tracker.update([result("pocket", "off")], 3600);
  expect(ended.cue).toBe(null);
  expect(ended.events).toHaveLength(1);
});

it("waits for the cooldown before a new episode of the same pose", () => {
  const tracker = new LabEventTracker("take");
  tracker.update([result("pocket", "recognized", 2000)], 2000);
  tracker.update([], 2100);
  const end = 2000 + POSE_RULES.cooldownMs;
  expect(
    tracker.update([result("pocket", "recognized", 2000)], end - 100).cue,
  ).toBe(null);
  const next = tracker.update(
    [result("pocket", "recognized", 6000)],
    end + 100,
  );
  expect(next.events).toHaveLength(2);
  expect(next.events[1].t_ms).toBe(end);
});

it("ignores poses that already have a calibrated live rule", () => {
  const tracker = new LabEventTracker("take");
  const state = tracker.update(
    [
      result("arms-crossed", "recognized", 2000),
      result("torso-lean", "recognized", 2000),
      result("neutral", "recognized", 2000),
    ],
    2000,
  );
  expect(state.events).toEqual([]);
});

it("follows the admin mode: off drops the rule, review hides the hint", () => {
  const off = new LabEventTracker("take", { hand_in_pocket: "off" });
  expect(
    off.update([result("pocket", "recognized", 2000)], 2000).events,
  ).toEqual([]);
  const review = new LabEventTracker("take", { hand_near_face: "review" });
  const state = review.update([result("self-touch", "recognized", 2000)], 2000);
  expect(state.cue).toBe(null);
  expect(state.events.map((e) => e.payload.rule)).toEqual(["hand_near_face"]);
  review.setModes({});
  expect(
    review.update([result("self-touch", "recognized", 2100)], 2100).cue?.payload
      .rule,
  ).toBe("hand_near_face");
});
