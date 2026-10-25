import { describe, expect, it } from "vitest";
import type { ClaimResult, FactCheckResult } from "../factcheck/api";
import type { LiveFeedback } from "../live/contracts";
import type { PoseEvent } from "../pose/evaluation";
import type {
  AnswerReview,
  Question,
  QuestionAnswer,
  QuestionResult,
} from "../questions/api";
import { evaluatePerformance } from "./performance";

let sequence = 0;
const source = {
  kind: "upload" as const,
  label: "Synthetic source",
  quote: "A verified source passage.",
  passage: "A verified source passage.",
  quote_verified: "exact" as const,
};
const claim = (verdict: ClaimResult["verdict"]): ClaimResult => {
  sequence += 1;
  return {
    claim: `Claim ${sequence}`,
    transcript: `Sentence ${sequence}`,
    t_ms: (sequence - 1) * 1000,
    duration_ms: 1000,
    verdict,
    explanation: "Synthetic",
    checked: ["upload"],
    evidence:
      verdict === "supports" || verdict === "contradicts"
        ? source
        : undefined,
  };
};
const factCheck = (claims: ClaimResult[]): FactCheckResult => ({
  claims,
  config: { max_claims: 6, min_quote_chars: 12, top_k: 5, web_results: 4 },
  events: [],
  model: "test",
  notices: [],
  sources_checked: true,
  web_provider: null,
});
const question = (id: string): Question => ({
  id,
  kind: "clarification",
  query: "query",
  question: `Question ${id}?`,
  reason: "Because",
  t_ms: null,
  duration_ms: 0,
});
const review = (verdict: AnswerReview["verdict"]): AnswerReview => ({
  verdict,
  explanation: "Synthetic",
  model: "test",
  reply: "",
  checked: ["upload"],
  evidence:
    verdict === "supports" || verdict === "contradicts" ? source : null,
});
const answer = (verdict: AnswerReview["verdict"]): QuestionAnswer => ({
  answer: "My answer",
  review: review(verdict),
});
const questionResult = (questions: Question[]): QuestionResult => ({
  config: {
    max_questions: 3,
    max_follow_ups: 3,
    max_turns: 6,
    round_ttl_s: 600,
    min_quote_chars: 12,
    source_passages: 6,
    top_k: 5,
  },
  round_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  roundId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  events: [],
  model: "test",
  notices: [],
  persona: "tutor",
  presentation_mode: "thesis",
  questions,
  sources_used: true,
});
const feedback = (id: string, category: string): LiveFeedback => ({
  id,
  category,
  kind: "observation",
  startMs: 0,
  endMs: 1000,
  title: id,
  detail: "Synthetic",
  action: "Replay",
});
const poseEvent = (id: string, type: PoseEvent["type"]): PoseEvent => ({
  session_id: "test",
  id,
  t_ms: 0,
  duration_ms: 1000,
  type,
  severity: "info",
  source: "browser",
  payload: {
    rule: "hand_raised",
    rule_version: "pose-rules-v7",
    heuristic: true,
    title: id,
    detail: "Synthetic",
    action: "Replay",
    measurement: 1,
    initial_measurement: 1,
    baseline: null,
    threshold: 1,
    unit: "shoulder widths",
    confirmed_at_ms: 0,
    calibration: {
      lean: 0,
      raised: null,
      distance: null,
      centerX: 0.5,
      shoulderWidth: 0.2,
      cross: null,
      yaw: null,
      drop: null,
    },
  },
});
const words = [{ word: "hello", start_ms: 0, end_ms: 500 }];

describe("practice evidence v2", () => {
  it("reports source grounding with an estimate, range and status", () => {
    const evaluation = evaluatePerformance({
      durationMs: 60000,
      factCheck: factCheck([
        claim("supports"),
        claim("supports"),
        claim("supports"),
        claim("supports"),
        claim("contradicts"),
      ]),
    });
    const talk = evaluation.categories[0];
    expect(talk).toMatchObject({
      category: "source-talk",
      estimate: 71,
      rawValue: 80,
      status: "reportable",
      coverage: 1,
    });
    expect(talk.low).not.toBeNull();
    expect(talk.high).not.toBeNull();
    expect(talk.counts).toContain("4 supported");
    expect(evaluation.strengths).toContain(
      "4 of 5 statements were backed by your sources",
    );
    expect(evaluation.improvements).toContain(
      "Revisit the contradicted statements with your material in the moments list.",
    );
  });

  it("keeps the source formula exact and marks a small sample provisional", () => {
    const evaluation = evaluatePerformance({
      durationMs: 60000,
      factCheck: factCheck([
        claim("supports"),
        claim("supports"),
        claim("supports"),
        claim("contradicts"),
      ]),
    });
    expect(evaluation.categories[0]).toMatchObject({
      estimate: 67,
      rawValue: 75,
      status: "provisional",
    });
  });

  it("keeps talk and answer grounding as separate rows and ignores stray answers", () => {
    const evaluation = evaluatePerformance({
      durationMs: 60000,
      factCheck: factCheck([claim("supports")]),
      questions: questionResult([question("q1"), question("q2")]),
      answers: {
        q1: answer("supports"),
        q2: answer("not_found"),
        stray: answer("supports"),
      },
    });
    expect(evaluation.categories.map((item) => item.category)).toEqual([
      "source-talk",
      "source-answers",
      "speech",
      "gesture",
    ]);
    expect(evaluation.categories[1]).toMatchObject({
      estimate: 67,
      status: "provisional",
      coverage: 0.5,
    });
    expect(evaluation.strengths).toContain(
      "1 of 2 answers matched the sources",
    );
    expect(evaluation.categories[1].counts).toContain("2 of 2 answered");
  });

  it("counts speech adjustments without converting them into a score", () => {
    const evaluation = evaluatePerformance({
      durationMs: 120000,
      words,
      feedback: [
        feedback("a", "pace"),
        feedback("b", "volume"),
        feedback("c", "pace"),
      ],
    });
    expect(evaluation.categories[2]).toMatchObject({
      label: "Speech delivery",
      estimate: null,
      rawValue: null,
      low: null,
      high: null,
      status: null,
    });
    expect(evaluation.categories[2].counts).toEqual([
      "3 speech adjustments",
      "1.5 per minute",
    ]);
    expect(evaluation.categories[2].evidence).toContain("2 pacing adjustments");
  });

  it("counts pose markers from feedback or events without a gest score", () => {
    const fromEvents = evaluatePerformance({
      durationMs: 120000,
      poseEvents: [poseEvent("p1", "gesture"), poseEvent("p2", "posture")],
    });
    expect(fromEvents.categories[3]).toMatchObject({
      label: "Pose & gesture",
      estimate: null,
      status: null,
    });
    expect(fromEvents.categories[3].counts).toContain(
      "2 pose or gesture markers",
    );
    const fromFeedback = evaluatePerformance({
      durationMs: 120000,
      feedback: [
        feedback("p1", "Gestures"),
        feedback("p2", "Posture"),
        feedback("p3", "Head"),
      ],
    });
    expect(fromFeedback.categories[3].counts).toContain(
      "3 pose or gesture markers",
    );
    expect(fromFeedback.categories[3].evidence).toContain(
      "1 head direction marker",
    );
  });

  it("removes the overall score, weights and labels from the practice profile", () => {
    const evaluation = evaluatePerformance({
      durationMs: 60000,
      factCheck: factCheck([claim("supports")]),
      words,
      feedback: [feedback("a", "pace")],
    });
    expect(evaluation).not.toHaveProperty("score");
    expect(evaluation).not.toHaveProperty("label");
    expect(evaluation.method).toBe("practice.evidence.v2");
    expect(evaluation.notice).toBe(
      "No overall score: these rows measure different things.",
    );
    expect(
      evaluation.categories.every((item) => !("weight" in item)),
    ).toBe(true);
  });

  it("keeps missing data and unverified quotes open instead of scoring them", () => {
    const evaluation = evaluatePerformance({ durationMs: 60000 });
    expect(evaluation.categories[0].estimate).toBeNull();
    expect(evaluation.categories[1].estimate).toBeNull();
    expect(evaluation.categories[0].status).toBe("insufficient");
    expect(evaluation.categories[2].estimate).toBeNull();
    expect(evaluation.categories[3].estimate).toBeNull();
    expect(evaluation.strengths).toEqual([]);

    const unverified = evaluatePerformance({
      durationMs: 60000,
      factCheck: {
        ...factCheck([
          {
            ...claim("supports"),
            evidence: { ...source, quote_verified: null },
          },
          {
            ...claim("contradicts"),
            evidence: undefined,
          },
        ]),
      },
    });
    expect(unverified.categories[0]).toMatchObject({
      estimate: null,
      status: "insufficient",
    });
    expect(unverified.categories[0].counts).toContain("0 supported");
  });

  it("suggests answering remaining questions", () => {
    const evaluation = evaluatePerformance({
      durationMs: 60000,
      questions: questionResult([
        question("q1"),
        question("q2"),
        question("q3"),
      ]),
      answers: { q1: answer("supports"), q2: answer("contradicts") },
    });
    expect(evaluation.improvements).toContain(
      "Answer the remaining questions to sharpen the source grounding.",
    );
    expect(evaluation.limitations).toContain(
      "The rows measure different things and are not combined into an overall score.",
    );
  });
});
