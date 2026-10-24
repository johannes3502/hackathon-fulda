import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { ClaimResult } from "@/features/factcheck/api";
import {
  boundedTime,
  DEMO_REVIEW,
  feedbackToMoment,
  performanceAt,
  timestamp,
} from "./review-data";

describe("review timeline", () => {
  it("carries checked factual evidence into the annotation without treating not-found as false", () => {
    const claim: ClaimResult = {
      claim: "Demo claim",
      transcript: "Spoken sentence",
      t_ms: 1200,
      duration_ms: 1000,
      verdict: "not_found",
      explanation: "Not in these sources",
      checked: ["upload"],
      evidence: {
        kind: "upload",
        label: "Demo, page 2",
        quote: "Source quote",
        passage: "Source quote",
        url: "javascript:alert(1)",
      },
    };
    const moment = feedbackToMoment(
      {
        id: "fact-0",
        category: "fact",
        kind: "suggestion",
        startMs: 1200,
        endMs: 2200,
        title: "Not found",
        detail: "Detail",
        action: "Add evidence",
      },
      claim,
    );
    expect(moment).toMatchObject({
      criterion: "knowledge",
      kind: "note",
      quote: "Spoken sentence",
      detail: "Not in these sources",
      source: { title: "Demo, page 2", quote: "Source quote", href: undefined },
    });
  });
  it("clamps seek targets and formats timestamps", () => {
    expect(boundedTime(-2000, 90000)).toBe(0);
    expect(boundedTime(120000, 90000)).toBe(90000);
    expect(boundedTime(NaN, 90000)).toBe(0);
    expect(timestamp(83000)).toBe("1:23");
    expect(timestamp(90000)).toBe("1:30");
  });
  it("interpolates provided values without fabricating a score for empty data", () => {
    const points = [
      { tMs: 1000, value: 20 },
      { tMs: 3000, value: 80 },
    ];
    expect(performanceAt(points, 0)).toBe(20);
    expect(performanceAt(points, 2000)).toBe(50);
    expect(performanceAt(points, 4000)).toBe(80);
    expect(performanceAt([], 2000)).toBeNull();
  });
  it("preserves event timestamps, advice and uncategorized observations", () => {
    const feedback = {
      id: "a",
      category: "pause",
      kind: "suggestion" as const,
      startMs: 1200,
      endMs: 2400,
      title: "Pause",
      detail: "Observation",
      action: "Listen",
    };
    expect(feedbackToMoment(feedback)).toMatchObject({
      tMs: 1200,
      durationMs: 1200,
      criterion: "flow",
      kind: "note",
      action: "Listen",
    });
    expect(
      feedbackToMoment({ ...feedback, category: "Framing" }).criterion,
    ).toBeNull();
    expect(
      feedbackToMoment({ ...feedback, category: "Gestures" }).criterion,
    ).toBe("gesture");
    expect(feedbackToMoment(feedback)).not.toHaveProperty("score");
  });
  it("keeps the synthetic series ordered and its source quote verifiable", () => {
    const { performance, moments, durationMs } = DEMO_REVIEW;
    performance.forEach((point, index) => {
      expect(point.tMs).toBeGreaterThanOrEqual(
        index ? performance[index - 1].tMs : 0,
      );
      expect(point.tMs).toBeLessThanOrEqual(durationMs);
      expect(point.value).toBeGreaterThanOrEqual(0);
      expect(point.value).toBeLessThanOrEqual(100);
    });
    expect(
      moments.every((moment) => moment.tMs + moment.durationMs <= durationMs),
    ).toBe(true);
    const source = readFileSync(
      new URL("../../../public/review-demo/source.txt", import.meta.url),
      "utf8",
    );
    expect(source).toContain(
      moments.find((moment) => moment.source)?.source?.quote,
    );
  });
});
