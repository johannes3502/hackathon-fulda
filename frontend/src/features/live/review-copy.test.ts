import { expect, it } from "vitest";
import { analysisResult } from "./analysis";

function feedback(
  type: string,
  payload: Record<string, unknown>,
  source = "asr",
) {
  return analysisResult(
    {
      summary: {},
      events: [
        {
          type,
          payload,
          source,
          severity: "hint",
          t_ms: 1000,
          duration_ms: 2000,
        },
      ],
    },
    "speech",
    10_000,
  ).feedback[0];
}

it.each([
  [
    "pace",
    { direction: "fast", window_wpm: [210, 230, 220], baseline_wpm: 150 },
    "220 words/min",
    "word endings",
    "thought groups",
  ],
  [
    "pace",
    { direction: "slow", window_wpm: [80], baseline_wpm: 150 },
    "80 words/min",
    "emphasize",
    "short sentence",
  ],
  [
    "volume",
    { direction: "quiet", window_delta_db: [-8, -6] },
    "-7 dB",
    "harder to distinguish",
    "distance steady",
  ],
  [
    "volume",
    { direction: "loud", delta_db_median: 8 },
    "8 dB",
    "does not establish clipping",
    "relaxed volume",
  ],
  [
    "pitch",
    { window_std_st: [0.4, 0.6] },
    "0.5 semitones",
    "key words less distinct",
    "one key word",
  ],
  [
    "filler",
    { kind: "filler", word: "ähm" },
    "ähm",
    "Occasional fillers are normal",
    "silent thinking pause",
  ],
  [
    "filler",
    { kind: "repetition", word: "ich" },
    "ich",
    "recognition error",
    "restart with the main point",
  ],
] as const)(
  "explains measured %s evidence and a concrete practice step",
  (type, payload, value, why, action) => {
    const item = feedback(type, payload);
    expect(item.detail).toContain(value);
    expect(item.detail).toContain(why);
    expect(item.action).toContain(action);
    expect(item.kind).toBe("suggestion");
  },
);

it("keeps syllable proxies separate from words per minute", () => {
  const item = feedback(
    "pace",
    { direction: "fast", window_syllables_per_s: [5, 7] },
    "speech",
  );
  expect(item.detail).toContain("6 syllables/s (proxy)");
  expect(item.detail).not.toContain("words/min");
});

it("recognizes an evidenced sentence pause as a strength without claiming intent", () => {
  const item = feedback("pause", {
    gap_ms: 2000,
    before: "Gedanke.",
    after: "Danach",
    mid_sentence: false,
  });
  expect(item.kind).toBe("positive");
  expect(item.startMs).toBe(1000);
  expect(item.endMs).toBe(3000);
  expect(item.detail).toContain("2 s gap");
  expect(item.detail).toContain("does not establish intent");
  expect(item.action).toContain("keep this space");
});

it("does not turn unknown silence or missing sentence evidence into praise or a problem", () => {
  for (const payload of [
    {},
    { mid_sentence: false },
    { before: "word", mid_sentence: false },
  ]) {
    expect(feedback("pause", payload).kind).toBe("observation");
  }
  expect(
    feedback("pause", { before: "word.", mid_sentence: false }, "speech").kind,
  ).toBe("observation");
  const item = feedback("pause", { before: "mitten", mid_sentence: true });
  expect(item.kind).toBe("suggestion");
  expect(item.detail).toContain("inside a sentence");
  expect(item.action).toContain("one keyword");
});

it("does not invent measurements, strengths or issues for empty data", () => {
  expect(
    analysisResult({ summary: {}, events: [] }, "speech", 10_000).feedback,
  ).toEqual([]);
  const item = feedback("volume", {
    direction: "quiet",
    window_delta_db: [null, false, "-8"],
  });
  expect(item.detail).not.toContain("dB");
  expect(item.detail).not.toContain("null");
});
