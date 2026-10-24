import { expect, it } from "vitest";
import { analysisResult } from "./analysis";
import { DEFAULT_FEATURE_FLAGS, feedbackEnabled } from "./feature-flags";

const events = [
  "pause",
  "pace",
  "filler",
  "volume",
  "pitch",
  "gesture",
  "fact",
].map((type) => ({
  t_ms: 100,
  duration_ms: 500,
  type,
  severity: "info",
  payload: {},
}));

it("filters pause feedback in both audio and imported transcript results without dropping measurements", () => {
  const flags = { ...DEFAULT_FEATURE_FLAGS, pauseFeedback: false };
  for (const source of ["speech", "words"] as const) {
    const result = analysisResult(
      { summary: { pause_count: 1 }, events },
      source,
      1000,
      flags,
    );
    expect(result.feedback.map((f) => f.category)).toEqual([
      "pace",
      "filler",
      "volume",
      "pitch",
      "gesture",
      "fact",
    ]);
    expect(result.metrics[0].value).toBe(1);
  }
});

it("disables speech feedback together while preserving pose and fact-check feedback", () => {
  const flags = { ...DEFAULT_FEATURE_FLAGS, speechFeedback: false };
  expect(
    events.filter((e) => feedbackEnabled(e.type, flags)).map((e) => e.type),
  ).toEqual(["gesture", "fact"]);
});

it.each([
  ["pause", "pauseFeedback"],
  ["pace", "paceFeedback"],
  ["filler", "fillerFeedback"],
  ["volume", "volumeFeedback"],
  ["pitch", "pitchFeedback"],
] as const)("toggles %s independently", (category, key) => {
  expect(
    feedbackEnabled(category, { ...DEFAULT_FEATURE_FLAGS, [key]: false }),
  ).toBe(false);
  expect(
    feedbackEnabled(category, { ...DEFAULT_FEATURE_FLAGS, [key]: true }),
  ).toBe(true);
  expect(
    feedbackEnabled("Posture", { ...DEFAULT_FEATURE_FLAGS, [key]: false }),
  ).toBe(true);
});
