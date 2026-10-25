import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { ClaimResult } from "@/features/factcheck/api";
import type { LiveRecording } from "@/features/live/contracts";
import { reviewScores } from "@/features/live/review-scores";
import {
  boundedTime,
  DEMO_REVIEW,
  feedbackToMoment,
  performanceAt,
  recordingReviewData,
  timestamp,
} from "./review-data";

const recordedTake = (
  overrides: Partial<LiveRecording> = {},
): LiveRecording => ({
  id: "recorded-take",
  config: {
    title: "Recorded presentation",
    targetMs: 10000,
    mode: "backend",
    endpoint: "/api",
  },
  durationMs: 10000,
  createdAt: "2026-10-25T00:00:00Z",
  video: new Blob(["synthetic recording"]),
  videoUrl: "blob:recorded-take",
  mimeType: "video/webm",
  feedback: [],
  metrics: [],
  chunksSent: 1,
  bytesSent: 19,
  completion: "complete",
  notice: null,
  ...overrides,
});

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
  it("derives the review from the selected take and refreshes stale source moments", () => {
    const feedback = {
      id: "speech-0",
      category: "pause",
      kind: "positive" as const,
      startMs: 1000,
      endMs: 4000,
      title: "Sentence boundary",
      detail: "Recorded pause",
      action: "Replay",
    };
    const claim: ClaimResult = {
      claim: "Synthetic claim",
      transcript: "The pilot has twelve participants.",
      t_ms: 5000,
      duration_ms: 1000,
      verdict: "contradicts",
      explanation: "The source names ten participants.",
      checked: ["upload"],
      evidence: {
        kind: "upload",
        label: "Demo source, page 2",
        quote: "Ten participants.",
        passage: "Ten participants.",
        quote_verified: "exact",
      },
    };
    const take = recordedTake({
      feedback: [
        feedback,
        {
          ...feedback,
          id: "speech-1",
          category: "filler",
          kind: "suggestion",
          startMs: 4000,
          endMs: 5000,
        },
        { ...feedback, id: "fact-0", category: "fact" },
        { ...feedback, id: "question-0", category: "question" },
      ],
      factCheck: {
        claims: [claim],
        events: [],
        notices: [],
        model: "synthetic",
        web_provider: null,
        sources_checked: true,
        config: {
          max_claims: 6,
          top_k: 5,
          web_results: 4,
          min_quote_chars: 12,
        },
      },
    });
    const data = recordingReviewData(take);
    expect(data).toMatchObject({
      title: take.config.title,
      durationMs: 10000,
      videoUrl: take.videoUrl,
      demo: false,
    });
    expect(data.moments.map((item) => item.id)).toEqual([
      "speech-0",
      "speech-1",
      "fact-0",
    ]);
    expect(data.moments[2]).toMatchObject({
      tMs: 5000,
      durationMs: 1000,
      assessment: "attention",
      quote: claim.transcript,
      source: { title: claim.evidence!.label, quote: claim.evidence!.quote },
    });
    const scores = reviewScores(data.moments, data.durationMs, data.claims);
    expect(scores.flow).toMatchObject({
      value: 75,
      assessedMs: 4000,
      coverage: 0.4,
    });
    expect(scores.knowledge).toMatchObject({ value: 0, contradicted: 1 });
    expect(scores.gesture.value).toBeNull();
    expect(Object.keys(scores)).toEqual(["gesture", "knowledge", "flow"]);
    // Source checks added or rerun after recording change the current evidence.
    const updated = recordingReviewData({
      ...take,
      factCheck: {
        ...take.factCheck!,
        claims: [{ ...claim, verdict: "supports" }],
      },
    });
    expect(
      reviewScores(updated.moments, updated.durationMs, updated.claims)
        .knowledge.value,
    ).toBe(100);
    expect(updated.moments[2].assessment).toBe("positive");
    expect(take.feedback[2].startMs).toBe(1000);
    expect(take.factCheck!.claims[0].verdict).toBe("contradicts");
  });
  it("keeps an unmeasured take empty instead of using the synthetic preview", () => {
    const data = recordingReviewData(
      recordedTake({ notice: "Analysis failed." }),
    );
    expect(data.notice).toBe("Analysis failed.");
    expect(data.moments).toEqual([]);
    expect(data.performance).toEqual([]);
    expect(
      Object.values(
        reviewScores(data.moments, data.durationMs, data.claims),
      ).every((score) => score.value === null),
    ).toBe(true);
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
    expect(
      feedbackToMoment({ ...feedback, category: "structure" }),
    ).toMatchObject({
      criterion: null,
      tMs: feedback.startMs,
      title: feedback.title,
    });
    expect(feedbackToMoment(feedback)).not.toHaveProperty("score");
  });
  it("keeps example annotations bounded and source quotes verifiable without synthetic scores", () => {
    const { performance, moments, durationMs } = DEMO_REVIEW;
    expect(performance).toEqual([]);
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
