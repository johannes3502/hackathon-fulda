import { expect, it } from "vitest";
import type { LiveFeedback } from "./contracts";
import { needsPractice, playbackAnnotation, reviewMoments } from "./review";

const pace: LiveFeedback = {
  id: "pace",
  kind: "suggestion",
  category: "pace",
  startMs: 2000,
  endMs: 4000,
  title: "Slow down",
  detail: "A fast passage",
  action: "Pause",
};
const hand: LiveFeedback = {
  ...pace,
  id: "hand",
  kind: "observation",
  category: "Gestures",
  startMs: 1000,
};

it("only annotates the moment being played, with selected observations taking precedence", () => {
  expect(playbackAnnotation([pace], 1999, pace)).toBeNull();
  expect(playbackAnnotation([pace], 2500, null)).toBe(pace);
  expect(playbackAnnotation([pace, hand], 2500, hand)).toBe(hand);
  expect(playbackAnnotation([pace], 4001, pace)).toBeNull();
});

it("does not turn normal gestures or question markers into performance problems", () => {
  expect(needsPractice(hand)).toBe(false);
  expect(needsPractice(pace)).toBe(true);
  expect(
    reviewMoments([pace, { ...pace, category: "question" }, hand]),
  ).toEqual([hand, pace]);
  expect(playbackAnnotation([hand], 2500, null)).toBeNull();
});

it("keeps the same posture-adjustment classification as live monitoring", () => {
  const crossed = {
    ...hand,
    evidence: { payload: { rule: "arms_crossed" } },
  } as LiveFeedback;
  expect(needsPractice(crossed)).toBe(true);
});
