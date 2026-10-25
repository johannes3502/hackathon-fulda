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
});
const answer = (verdict: AnswerReview["verdict"]): QuestionAnswer => ({
  answer: "My answer",
  review: review(verdict),
});
const questionResult = (questions: Question[]): QuestionResult => ({
  config: {
    max_questions: 3,
    min_quote_chars: 12,
    source_passages: 6,
    source_queries: 4,
    top_k: 5,
  },
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

describe("performance evaluation", () => {
  it("scores content from claim verdicts with not-found counting half", () => {
    const evaluation = evaluatePerformance({
      durationMs: 60000,
      factCheck: factCheck([
        claim("supports"),
        claim("supports"),
        claim("contradicts"),
        claim("not_found"),
      ]),
    });
    expect(evaluation.categories[0].score).toBe(63);
    expect(evaluation.score).toBe(63);
    expect(evaluation.strengths).toContain(
      "2 of 4 statements were backed by your sources",
    );
    expect(evaluation.improvements).toContain(
      "Revisit the contradicted statements with your material in the moments list.",
    );
  });
  it("keeps the formula exact for a three-of-four outcome", () => {
    const evaluation = evaluatePerformance({
      durationMs: 60000,
      factCheck: factCheck([
        claim("supports"),
        claim("supports"),
        claim("supports"),
        claim("contradicts"),
      ]),
    });
    expect(evaluation.categories[0].score).toBe(75);
  });
  it("merges answered question verdicts with claims and ignores stray answers", () => {
    const evaluation = evaluatePerformance({
      durationMs: 60000,
      factCheck: factCheck([
        claim("supports"),
        claim("supports"),
        claim("contradicts"),
        claim("not_found"),
      ]),
      questions: questionResult([question("q1"), question("q2")]),
      answers: {
        q1: answer("supports"),
        q2: answer("not_found"),
        stray: answer("supports"),
      },
    });
    expect(evaluation.categories[0].score).toBe(67);
    expect(evaluation.strengths).toContain(
      "1 of 2 answers matched the sources",
    );
  });
  it("deducts voice points per adjustment per minute and keeps the floor", () => {
    const evaluation = evaluatePerformance({
      durationMs: 120000,
      words,
      feedback: [
        feedback("a", "pace"),
        feedback("b", "volume"),
        feedback("c", "pace"),
      ],
    });
    expect(evaluation.categories[1].score).toBe(78);
    const floor = evaluatePerformance({
      durationMs: 60000,
      words,
      feedback: Array.from({ length: 50 }, (_, index) =>
        feedback(`f${index}`, "filler"),
      ),
    });
    expect(floor.categories[1].score).toBe(40);
  });
  it("leaves gesture empty without pose data and renormalizes overall weights", () => {
    const evaluation = evaluatePerformance({
      durationMs: 120000,
      factCheck: factCheck([
        claim("supports"),
        claim("supports"),
        claim("contradicts"),
        claim("not_found"),
      ]),
      words,
      feedback: [
        feedback("a", "pace"),
        feedback("b", "volume"),
        feedback("c", "pace"),
      ],
    });
    expect(evaluation.categories[2].score).toBeNull();
    expect(evaluation.categories[2].limitation).toBe(
      "No pose markers were recorded.",
    );
    expect(evaluation.score).toBe(68);
  });
  it("counts pose events only when feedback has no pose categories", () => {
    const fromEvents = evaluatePerformance({
      durationMs: 120000,
      poseEvents: [poseEvent("p1", "gesture"), poseEvent("p2", "posture")],
    });
    expect(fromEvents.categories[2].score).toBe(85);
    const fromFeedback = evaluatePerformance({
      durationMs: 120000,
      feedback: [
        feedback("p1", "Gestures"),
        feedback("p2", "Posture"),
        feedback("p3", "Head"),
      ],
    });
    expect(fromFeedback.categories[2].score).toBe(78);
  });
  it("returns no score without measured data", () => {
    const evaluation = evaluatePerformance({ durationMs: 60000 });
    expect(evaluation.score).toBeNull();
    expect(evaluation.label).toBe("Not enough data");
    expect(
      evaluation.categories.every((category) => category.score === null),
    ).toBe(true);
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
      "Answer the remaining questions to sharpen the content evaluation.",
    );
  });
});
