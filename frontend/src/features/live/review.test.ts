import { expect, it } from "vitest";
import type { LiveFeedback } from "./contracts";
import {
  needsPractice,
  playbackAnnotation,
  recordingFeedback,
  reviewMoments,
  structureFeedback,
} from "./review";
import { analyzeStructure } from "../structure/analyze";
import { germanTalk } from "../structure/fixtures";

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

it("appends deterministic, bounded structure moments with structure ids", () => {
  const structure = analyzeStructure(germanTalk.words, germanTalk.durationMs);
  const moments = structureFeedback(structure, germanTalk.durationMs);
  expect(moments.length).toBeGreaterThan(0);
  expect(moments.every((moment) => moment.id.startsWith("structure-"))).toBe(
    true,
  );
  expect(new Set(moments.map((moment) => moment.id)).size).toBe(moments.length);
  expect(
    moments.every(
      (moment) =>
        moment.startMs >= 0 &&
        moment.endMs <= germanTalk.durationMs &&
        moment.endMs > moment.startMs,
    ),
  ).toBe(true);
  const combined = recordingFeedback({
    feedback: [],
    factCheck: undefined,
    durationMs: germanTalk.durationMs,
    words: germanTalk.words,
    structure,
  });
  expect(combined.filter((moment) => moment.category === "structure")).toEqual(
    moments,
  );
});
