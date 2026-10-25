import { describe, expect, it } from "vitest";
import { reviewScores, type ScoreMoment } from "./review-scores";

const evidence = {
  kind: "upload" as const,
  label: "Synthetic source",
  quote: "A verified source passage.",
  passage: "A verified source passage.",
  quote_verified: "exact" as const,
  weak: false,
};

const moment = (
  kind: ScoreMoment["kind"],
  tMs: number,
  durationMs: number,
): ScoreMoment => ({ criterion: "flow", kind, tMs, durationMs });

describe("evidence-share review scores", () => {
  it("scores assessed time instead of event count and reports actual coverage", () => {
    const flow = reviewScores(
      [moment("positive", 0, 3000), moment("attention", 3000, 1000)],
      10000,
    ).flow;
    expect(flow).toMatchObject({
      value: 75,
      positiveMs: 3000,
      attentionMs: 1000,
      assessedMs: 4000,
      coverage: 0.4,
    });
  });
  it("does not penalize overlapping duplicate warnings and balances conflicting evidence", () => {
    const events = [
      moment("positive", 0, 2000),
      moment("attention", 2000, 2000),
    ];
    expect(
      reviewScores([...events, ...events, moment("attention", 2500, 500)], 4000)
        .flow.value,
    ).toBe(50);
    expect(
      reviewScores(
        [moment("positive", 0, 2000), moment("attention", 0, 2000)],
        4000,
      ).flow,
    ).toMatchObject({ value: 50, coverage: 0.5 });
  });
  it("does not turn missing data or ordinary observations into zero or a perfect score", () => {
    expect(reviewScores([], 10000).gesture.value).toBeNull();
    expect(
      reviewScores([moment("note", 0, 5000)], 10000).flow.value,
    ).toBeNull();
    expect(
      reviewScores(
        [moment("positive", NaN, 5000), moment("attention", 0, -1)],
        10000,
      ).flow.value,
    ).toBeNull();
    expect(
      reviewScores([moment("positive", 0, 5000)], 0).flow.value,
    ).toBeNull();
    expect(reviewScores([moment("attention", 0, 1000)], 10000).flow.value).toBe(
      0,
    );
    expect(reviewScores([moment("positive", 0, 1000)], 10000).flow.value).toBe(
      100,
    );
  });
  it("uses source verdicts for knowledge and excludes not-found / unchecked claims", () => {
    const knowledge = reviewScores([], 10000, [
      { verdict: "supports", evidence },
      {
        verdict: "supports",
        evidence: { ...evidence, quote_verified: "fuzzy" },
      },
      { verdict: "contradicts", evidence },
      { verdict: "not_found" },
      { verdict: "unchecked" },
    ]).knowledge;
    expect(knowledge).toMatchObject({
      value: 67,
      source: "claims",
      supported: 2,
      contradicted: 1,
      unassessed: 2,
    });
    expect(
      reviewScores([], 10000, [{ verdict: "not_found" }]).knowledge.value,
    ).toBeNull();
    expect(reviewScores([], 10000, []).knowledge.value).toBeNull();
  });
  it("leaves verdicts without a verified source quote unassessed", () => {
    const claims = [
      { verdict: "supports" as const },
      {
        verdict: "contradicts" as const,
        evidence: { ...evidence, quote_verified: null },
      },
    ];
    expect(reviewScores([], 10000, claims).knowledge).toMatchObject({
      value: null,
      supported: 0,
      contradicted: 0,
      unassessed: 2,
    });
    expect(
      reviewScores([], 10000, [...claims, { verdict: "supports", evidence }])
        .knowledge,
    ).toMatchObject({ value: 100, supported: 1, unassessed: 2 });
  });
  it("clamps evidence to the take and respects explicit classification without changing the annotation", () => {
    const flow = reviewScores(
      [
        { ...moment("note", -1000, 3000), assessment: "attention" },
        moment("positive", 4000, 2000),
      ],
      5000,
    ).flow;
    expect(flow).toMatchObject({
      value: 33,
      positiveMs: 1000,
      attentionMs: 2000,
      assessedMs: 3000,
    });
  });
});
