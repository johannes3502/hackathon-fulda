import { describe, expect, it } from "vitest";
import type { StructureAnalysis } from "../structure/types";
import {
  reviewScores,
  SCORE_LABELS,
  type ScoreMoment,
} from "./review-scores";

const evidence = {
  kind: "upload" as const,
  label: "Synthetic source",
  quote: "A verified source passage.",
  passage: "A verified source passage.",
  quote_verified: "exact" as const,
};

const moment = (
  kind: ScoreMoment["kind"],
  tMs: number,
  durationMs: number,
): ScoreMoment => ({ criterion: "flow", kind, tMs, durationMs });

const structureAnalysis = (
  overrides: Partial<StructureAnalysis> = {},
): StructureAnalysis => ({
  version: "structure-rubric-v1",
  language: "de",
  wordCount: 120,
  sentenceCount: 12,
  components: {
    opening: {
      available: true,
      score: 1,
      reason: "Einstieg erkannt.",
      evidence: [],
    },
    closing: {
      available: true,
      score: 1,
      reason: "Abschluss erkannt.",
      evidence: [],
    },
    sections: {
      available: true,
      score: 1,
      reason: "Drei Abschnitte erkannt.",
      evidence: [],
    },
    transitions: {
      available: true,
      score: 0,
      reason: "Keine Übergänge.",
      evidence: [],
    },
  },
  sections: [],
  markers: [],
  score: 75,
  dataCoverage: 1,
  confidence: "medium",
  limitations: [],
  ...overrides,
});

describe("evidence-share-v2 review scores", () => {
  it("scores assessed time with a smoothed estimate, range and actual coverage", () => {
    const flow = reviewScores(
      [
        moment("positive", 0, 20_000),
        moment("attention", 20_000, 10_000),
      ],
      60_000,
    ).flow;
    expect(flow).toMatchObject({
      value: 66,
      rawValue: 67,
      status: "reportable",
      positiveMs: 20_000,
      attentionMs: 10_000,
      assessedMs: 30_000,
      coverage: 0.5,
      source: "time",
    });
    expect(flow.low).not.toBeNull();
    expect(flow.high).not.toBeNull();
  });
  it("does not penalize overlapping duplicate warnings and balances conflicts", () => {
    const events = [
      moment("positive", 0, 10_000),
      moment("attention", 10_000, 10_000),
    ];
    expect(
      reviewScores(
        [...events, ...events, moment("attention", 12_000, 5000)],
        40_000,
      ).flow.value,
    ).toBe(50);
    expect(
      reviewScores(
        [moment("positive", 0, 20_000), moment("attention", 0, 20_000)],
        40_000,
      ).flow,
    ).toMatchObject({ value: 50, assessedMs: 20_000, coverage: 0.5 });
  });
  it("leaves missing, tiny, invalid and neutral data without a value", () => {
    expect(reviewScores([], 10_000).gesture.value).toBeNull();
    expect(
      reviewScores([moment("note", 0, 5000)], 10_000).flow.value,
    ).toBeNull();
    expect(
      reviewScores(
        [moment("positive", NaN, 5000), moment("attention", 0, -1)],
        10_000,
      ).flow.value,
    ).toBeNull();
    expect(
      reviewScores([moment("positive", 0, 5000)], 0).flow.value,
    ).toBeNull();
    expect(
      reviewScores([moment("positive", 0, 4000)], 60_000).flow,
    ).toMatchObject({ value: null, status: "insufficient" });
  });
  it("keeps 0 and 100 endpoints for sufficiently measured time only", () => {
    const small = reviewScores(
      [moment("positive", 0, 10_000)],
      60_000,
    ).flow;
    expect(small.value).toBe(92);
    expect(small.rawValue).toBe(99);
    expect(
      reviewScores([moment("positive", 0, 200_000)], 200_000).flow.value,
    ).toBe(100);
    expect(
      reviewScores([moment("attention", 0, 200_000)], 200_000).flow.value,
    ).toBe(0);
  });
  it("uses source verdicts for source grounding and excludes not-found / unchecked claims", () => {
    const knowledge = reviewScores([], 10_000, [
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
      value: 60,
      rawValue: 67,
      status: "provisional",
      source: "claims",
      supported: 2,
      contradicted: 1,
      unassessed: 2,
      coverage: 0.6,
    });
    expect(
      reviewScores([], 10_000, [{ verdict: "not_found" }]).knowledge.value,
    ).toBeNull();
    expect(reviewScores([], 10_000, []).knowledge.value).toBeNull();
    expect(reviewScores([], 10_000).knowledge.value).toBeNull();
  });
  it("leaves verdicts without a verified source quote unassessed", () => {
    const claims = [
      { verdict: "supports" as const },
      {
        verdict: "contradicts" as const,
        evidence: { ...evidence, quote_verified: null },
      },
    ];
    expect(reviewScores([], 10_000, claims).knowledge).toMatchObject({
      value: null,
      status: "insufficient",
      supported: 0,
      contradicted: 0,
      unassessed: 2,
    });
    expect(
      reviewScores([], 10_000, [...claims, { verdict: "supports", evidence }])
        .knowledge,
    ).toMatchObject({ value: 67, supported: 1, unassessed: 2 });
  });
  it("clamps evidence to the take and respects explicit classifications", () => {
    const flow = reviewScores(
      [
        { ...moment("note", -1000, 3000), assessment: "attention" },
        moment("positive", 4000, 20_000),
      ],
      50_000,
    ).flow;
    expect(flow).toMatchObject({
      value: 88,
      rawValue: 91,
      positiveMs: 20_000,
      attentionMs: 2000,
      assessedMs: 22_000,
    });
  });
  it("uses the structure analysis without mixing in structure moments", () => {
    const scores = reviewScores(
      [moment("positive", 0, 40_000)],
      60_000,
      undefined,
      structureAnalysis(),
    );
    expect(scores.structure).toMatchObject({
      value: 75,
      rawValue: 75,
      status: "reportable",
      coverage: 1,
      source: "structure",
    });
    expect(scores.structure.components).toHaveLength(4);
    expect(scores.structure.reason).toContain("4 von 4 Signalen");
    expect(scores.structure.low).not.toBeNull();
    expect(scores.structure.high).not.toBeNull();
  });
  it("keeps structure null without an analysis and explains the gate", () => {
    expect(reviewScores([], 60_000).structure).toMatchObject({
      value: null,
      status: "insufficient",
      source: "structure",
    });
    const gated = reviewScores(
      [],
      60_000,
      undefined,
      structureAnalysis({
        score: null,
        wordCount: 40,
        dataCoverage: 0.5,
      }),
    ).structure;
    expect(gated).toMatchObject({
      value: null,
      status: "insufficient",
    });
    expect(gated.reason).toContain("mindestens 50");
    expect(gated.components).toHaveLength(4);
    const lowConfidence = reviewScores(
      [],
      60_000,
      undefined,
      structureAnalysis({ confidence: "low" }),
    ).structure;
    expect(lowConfidence.status).toBe("provisional");
  });
  it("allows the marked demo path to derive structure from existing moments", () => {
    const demo = reviewScores(
      [{ ...moment("positive", 0, 10_000), criterion: "structure" }],
      60_000,
      undefined,
      undefined,
      { structureFromMoments: true },
    ).structure;
    expect(demo).toMatchObject({
      value: 92,
      status: "provisional",
      source: "moments",
    });
    expect(demo.reason).toContain("Demo");
  });
  it("keeps the German review labels of the evidence profile", () => {
    expect(SCORE_LABELS).toEqual({
      gesture: "Körper & Gesten",
      knowledge: "Quellenbezug",
      flow: "Sprechfluss",
      structure: "Aufbau",
    });
  });
});
