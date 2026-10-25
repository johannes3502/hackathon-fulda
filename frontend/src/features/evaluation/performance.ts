import type { ClaimResult, FactCheckResult } from "../factcheck/api";
import type { LiveFeedback, LiveMetric, Word } from "../live/contracts";
import type { PoseEvent } from "../pose/evaluation";
import type { QuestionAnswer, QuestionResult } from "../questions/contracts";

export type EvaluationCategory = "content" | "voice" | "gesture";
export type PoseKind = "posture" | "gesture" | "gaze";

export type PerformanceCategory = {
  category: EvaluationCategory;
  label: string;
  weight: number;
  score: number | null;
  summary: string;
  evidence: string[];
  limitation?: string;
};

export type PerformanceEvaluation = {
  categories: PerformanceCategory[];
  score: number | null;
  label: string;
  strengths: string[];
  improvements: string[];
  limitations: string[];
  method: "evidence-count-heuristic.v1";
};

export type PerformanceInput = {
  durationMs: number;
  factCheck?: FactCheckResult | null;
  questions?: QuestionResult | null;
  answers?: Record<string, QuestionAnswer> | null;
  words?: Word[] | null;
  feedback?: LiveFeedback[];
  poseEvents?: PoseEvent[];
  metrics?: LiveMetric[];
};

/**
 * Scoring formulas for "evidence-count-heuristic.v1" — a transparent
 * aggregation of moments the prototype already measured, not a validated
 * grade and never a claim about the person.
 *
 * Content (weight 0.5)
 *   Every fact-check claim and every answered question (an answer counts only
 *   when its key is the id of a question in questions.questions) adds points
 *   by verdict: supports = 1, contradicts = 0, not_found/unchecked = 0.5.
 *   score = round(100 * points / items); null without claims and answers.
 * Voice (weight 0.25)
 *   events = feedback items with category pace/volume/pitch/filler/pause
 *   (case-insensitive). eventsPerMin = events / max(0.5, durationMs / 60000).
 *   score = round(max(40, 100 - eventsPerMin * 15)).
 *   Null when there are no words and no such events.
 * Gesture (weight 0.25)
 *   events = feedback items with category posture/gesture/gaze (case-
 *   insensitive, browser labels "Posture"/"Gestures"/"Head" included);
 *   poseEvents are counted only when feedback has no pose category — one
 *   source consistently. Same formula as voice; null without any pose events.
 * Overall
 *   Weighted mean over non-null categories with weights renormalized
 *   (content + voice only -> 2/3 and 1/3); null when all categories are null.
 *   Labels: >= 85 "Strong", >= 70 "Solid", >= 55 "Fair", else "Keep practicing".
 */

const VERDICT_POINTS: Record<ClaimResult["verdict"], number> = {
  supports: 1,
  contradicts: 0,
  not_found: 0.5,
  unchecked: 0.5,
};
const VOICE_CATEGORIES = ["pace", "volume", "pitch", "filler", "pause"];
const GESTURE_KINDS: Record<string, PoseKind> = {
  posture: "posture",
  gesture: "gesture",
  gestures: "gesture",
  gaze: "gaze",
  head: "gaze",
};
const ADJUSTMENT_LABELS: Record<string, string> = {
  pace: "pacing",
  volume: "volume",
  pitch: "pitch variation",
  filler: "filler words",
  pause: "pauses",
  posture: "posture",
  gesture: "gestures",
  gaze: "head direction",
};
const LIMITATIONS = [
  "This is a heuristic summary from measured moments, not a validated grade.",
  "It counts events from prototype rules; it does not compare you with other speakers.",
  "“Not found in sources” does not mean a statement is wrong.",
  "The content score reflects coverage by your uploaded sources, not general knowledge.",
];

const categoryKey = (category: string) => category.trim().toLowerCase();
const plural = (count: number) => (count === 1 ? "" : "s");
const minutesOf = (durationMs: number) =>
  Math.max(0.5, durationMs / 60000);
const deductionScore = (events: number, durationMs: number) =>
  Math.round(Math.max(40, 100 - (events / minutesOf(durationMs)) * 15));
const overallLabel = (score: number | null) =>
  score === null
    ? "Not enough data"
    : score >= 85
      ? "Strong"
      : score >= 70
        ? "Solid"
        : score >= 55
          ? "Fair"
          : "Keep practicing";

type ContentStats = {
  score: number | null;
  claims: number;
  claimSupports: number;
  claimContradicts: number;
  claimUnresolved: number;
  answers: number;
  answerSupports: number;
  answerContradicts: number;
  answerUnresolved: number;
  unanswered: number;
};

function contentStats(input: PerformanceInput): ContentStats {
  const claims = input.factCheck?.claims ?? [];
  const questions = input.questions?.questions ?? [];
  const answers = input.answers ?? {};
  const answered = questions
    .map((question) => answers[question.id])
    .filter((answer): answer is QuestionAnswer => !!answer);
  const verdicts = [
    ...claims.map((claim) => claim.verdict),
    ...answered.map((answer) => answer.review.verdict),
  ];
  const points = verdicts.reduce(
    (sum, verdict) => sum + VERDICT_POINTS[verdict],
    0,
  );
  return {
    score: verdicts.length
      ? Math.round((100 * points) / verdicts.length)
      : null,
    claims: claims.length,
    claimSupports: claims.filter((claim) => claim.verdict === "supports")
      .length,
    claimContradicts: claims.filter((claim) => claim.verdict === "contradicts")
      .length,
    claimUnresolved: claims.filter(
      (claim) =>
        claim.verdict === "not_found" || claim.verdict === "unchecked",
    ).length,
    answers: answered.length,
    answerSupports: answered.filter(
      (answer) => answer.review.verdict === "supports",
    ).length,
    answerContradicts: answered.filter(
      (answer) => answer.review.verdict === "contradicts",
    ).length,
    answerUnresolved: answered.filter(
      (answer) =>
        answer.review.verdict === "not_found" ||
        answer.review.verdict === "unchecked",
    ).length,
    unanswered: questions.length - answered.length,
  };
}

function poseKindsFrom(
  feedback: LiveFeedback[],
  poseEvents: PoseEvent[],
): PoseKind[] {
  const fromFeedback = feedback.flatMap((item) => {
    const kind = GESTURE_KINDS[categoryKey(item.category)];
    return kind ? [kind] : [];
  });
  if (fromFeedback.length) return fromFeedback;
  return poseEvents.map((event) => event.type);
}

function countEvidence(
  kinds: string[],
  labels: Record<string, string>,
  noun: string,
): string[] {
  return [...new Set(kinds)].map((kind) => {
    const count = kinds.filter((item) => item === kind).length;
    return `${count} ${labels[kind] ?? kind} ${noun}${plural(count)}`;
  });
}

export function evaluatePerformance(
  input: PerformanceInput,
): PerformanceEvaluation {
  const durationMs = Number.isFinite(input.durationMs) ? input.durationMs : 0;
  const feedback = input.feedback ?? [];
  const content = contentStats(input);

  const voice = feedback.filter((item) =>
    VOICE_CATEGORIES.includes(categoryKey(item.category)),
  );
  const hasWords = (input.words ?? []).length > 0;
  const voiceScore =
    hasWords || voice.length ? deductionScore(voice.length, durationMs) : null;

  const poseKinds = poseKindsFrom(feedback, input.poseEvents ?? []);
  const gestureScore = poseKinds.length
    ? deductionScore(poseKinds.length, durationMs)
    : null;

  const settled = content.claimSupports + content.answerSupports;
  const differs = content.claimContradicts + content.answerContradicts;
  const unresolved = content.claimUnresolved + content.answerUnresolved;
  const items = content.claims + content.answers;

  const contentEvidence = [
    content.claimSupports
      ? `${content.claimSupports} of ${content.claims} statements were backed by your sources`
      : "",
    content.claimContradicts
      ? `${content.claimContradicts} statement${plural(content.claimContradicts)} differ from a source`
      : "",
    content.claimUnresolved
      ? `${content.claimUnresolved} statement${plural(content.claimUnresolved)} not settled by the checked sources`
      : "",
    content.answerSupports
      ? `${content.answerSupports} of ${content.answers} answers matched the sources`
      : "",
    content.answerContradicts
      ? `${content.answerContradicts} answer${plural(content.answerContradicts)} differed from the sources`
      : "",
    content.answerUnresolved
      ? `${content.answerUnresolved} answer${plural(content.answerUnresolved)} not settled by the checked sources`
      : "",
  ].filter(Boolean);

  const voiceEvidence = countEvidence(
    voice.map((item) => categoryKey(item.category)),
    ADJUSTMENT_LABELS,
    "adjustment",
  );
  const gestureEvidence = countEvidence(
    poseKinds,
    ADJUSTMENT_LABELS,
    "marker",
  );

  const categories: PerformanceCategory[] = [
    {
      category: "content",
      label: "Content (facts & knowledge)",
      weight: 0.5,
      score: content.score,
      summary:
        content.score === null
          ? "No checked statements or answered questions were available."
          : `${settled} of ${items} checked statements and answers fit the sources; ${differs} differed, ${unresolved} were not settled by the checked sources.`,
      evidence: contentEvidence,
      ...(content.score === null
        ? {
            limitation:
              "Run a fact-check or answer the practice questions to get a content summary.",
          }
        : {}),
    },
    {
      category: "voice",
      label: "Voice",
      weight: 0.25,
      score: voiceScore,
      summary:
        voiceScore === null
          ? "No transcript or speech adjustments were recorded."
          : `${voice.length} pace, volume, pitch, filler or pause adjustment${plural(voice.length)} — about ${(voice.length / minutesOf(durationMs)).toFixed(1)} per minute.`,
      evidence: voiceEvidence,
      ...(voiceScore === null
        ? {
            limitation:
              "Without words or speech feedback no voice score is calculated.",
          }
        : {}),
    },
    {
      category: "gesture",
      label: "Gesture",
      weight: 0.25,
      score: gestureScore,
      summary:
        gestureScore === null
          ? "Posture was not evaluated."
          : `${poseKinds.length} posture, gesture or head-direction marker${plural(poseKinds.length)} — about ${(poseKinds.length / minutesOf(durationMs)).toFixed(1)} per minute.`,
      evidence: gestureEvidence,
      ...(gestureScore === null
        ? { limitation: "No pose markers were recorded." }
        : {}),
    },
  ];

  const scored = categories.filter(
    (category): category is PerformanceCategory & { score: number } =>
      category.score !== null,
  );
  const weightSum = scored.reduce((sum, category) => sum + category.weight, 0);
  const score = weightSum
    ? Math.round(
        scored.reduce(
          (sum, category) => sum + category.score * category.weight,
          0,
        ) / weightSum,
      )
    : null;

  const strengths: string[] = [];
  if (content.claims && content.claimSupports)
    strengths.push(
      `${content.claimSupports} of ${content.claims} statements were backed by your sources`,
    );
  if (content.answers && content.answerSupports)
    strengths.push(
      `${content.answerSupports} of ${content.answers} answers matched the sources`,
    );
  if (voiceScore !== null && voiceScore >= 85)
    strengths.push("Few pacing, volume or pitch adjustments were detected");
  if (gestureScore !== null && gestureScore >= 85)
    strengths.push("Few posture or gesture adjustments were detected");

  const adjustments = new Map<string, number>();
  for (const item of feedback) {
    const key = categoryKey(item.category);
    const mapped = VOICE_CATEGORIES.includes(key)
      ? key
      : GESTURE_KINDS[key];
    if (mapped)
      adjustments.set(mapped, (adjustments.get(mapped) ?? 0) + 1);
  }
  let mostAdjusted: { label: string; count: number } | null = null;
  for (const [key, count] of adjustments)
    if (!mostAdjusted || count > mostAdjusted.count)
      mostAdjusted = { label: ADJUSTMENT_LABELS[key] ?? key, count };

  const improvements: string[] = [];
  if (differs)
    improvements.push(
      "Revisit the contradicted statements with your material in the moments list.",
    );
  if (mostAdjusted)
    improvements.push(
      `Most adjustments were in ${mostAdjusted.label} — replay those moments on the timeline.`,
    );
  if (content.unanswered)
    improvements.push(
      "Answer the remaining questions to sharpen the content evaluation.",
    );

  return {
    categories,
    score,
    label: overallLabel(score),
    strengths: strengths.slice(0, 3),
    improvements: improvements.slice(0, 3),
    limitations: LIMITATIONS,
    method: "evidence-count-heuristic.v1",
  };
}
