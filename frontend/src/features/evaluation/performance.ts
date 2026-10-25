import { evidenceVerdict, type FactCheckResult } from "../factcheck/api";
import type { LiveFeedback, LiveMetric, Word } from "../live/contracts";
import type { PoseEvent } from "../pose/evaluation";
import type { QuestionAnswer, QuestionResult } from "../questions/api";

import {
  reviewScores,
  REVIEW_SCORE_VERSION,
  type ScoreMoment,
} from "../live/review-scores";
import { needsPractice } from "../live/review";
import { poseFeedback } from "../pose/feedback";

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
  method: typeof REVIEW_SCORE_VERSION;
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
  "Voice and gesture use positive time divided by positive plus corrective time. Unmeasured time is excluded.",
  "“Not found in sources” does not mean a statement is wrong.",
  "The content score reflects coverage by your uploaded sources, not general knowledge.",
];

const categoryKey = (category: string) => category.trim().toLowerCase();
const plural = (count: number) => (count === 1 ? "" : "s");
const minutesOf = (durationMs: number) => Math.max(0.5, durationMs / 60000);
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
  const claims = (input.factCheck?.claims ?? []).map((claim) => ({
    ...claim,
    verdict: evidenceVerdict(claim),
  }));
  const questions = input.questions?.questions ?? [];
  const answers = input.answers ?? {};
  const answered = questions
    .map((question) => answers[question.id])
    .filter((answer): answer is QuestionAnswer => !!answer)
    .map((answer) => ({
      ...answer,
      review: { ...answer.review, verdict: evidenceVerdict(answer.review) },
    }));
  const verdicts = [
    ...claims.map((claim) => claim.verdict),
    ...answered.map((answer) => answer.review.verdict),
  ];
  const decided = verdicts.filter(
    (verdict) => verdict === "supports" || verdict === "contradicts",
  );
  return {
    score: decided.length
      ? Math.round(
          (100 * decided.filter((verdict) => verdict === "supports").length) /
            decided.length,
        )
      : null,
    claims: claims.length,
    claimSupports: claims.filter((claim) => claim.verdict === "supports")
      .length,
    claimContradicts: claims.filter((claim) => claim.verdict === "contradicts")
      .length,
    claimUnresolved: claims.filter(
      (claim) => claim.verdict === "not_found" || claim.verdict === "unchecked",
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
  const feedback = [...(input.feedback ?? [])];
  if (!feedback.some((item) => GESTURE_KINDS[categoryKey(item.category)]))
    feedback.push(...(input.poseEvents ?? []).map(poseFeedback));
  const content = contentStats(input);
  const moments: ScoreMoment[] = feedback.map((item) => ({
    criterion: VOICE_CATEGORIES.includes(categoryKey(item.category))
      ? "flow"
      : GESTURE_KINDS[categoryKey(item.category)]
        ? "gesture"
        : null,
    kind:
      item.kind === "positive"
        ? "positive"
        : needsPractice(item)
          ? "attention"
          : "note",
    tMs: item.startMs,
    durationMs: item.endMs - item.startMs,
  }));
  const scores = reviewScores(moments, durationMs);
  const voiceScore = scores.flow.value;
  const gestureScore = scores.gesture.value;
  const corrective = feedback.filter(needsPractice);
  const voice = corrective.filter((item) =>
    VOICE_CATEGORIES.includes(categoryKey(item.category)),
  );
  const poseKinds = corrective.flatMap(
    (item) => GESTURE_KINDS[categoryKey(item.category)] ?? [],
  );

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
  const gestureEvidence = countEvidence(poseKinds, ADJUSTMENT_LABELS, "marker");

  const categories: PerformanceCategory[] = [
    {
      category: "content",
      label: "Content (facts & knowledge)",
      weight: 0.5,
      score: content.score,
      summary:
        content.score === null
          ? "No source-verified, decidable statements or answers were available."
          : `${settled} of ${items} checked statements and answers fit the sources; ${differs} differed, ${unresolved} were not settled by the checked sources.`,
      evidence: contentEvidence,
      ...(content.score === null
        ? {
            limitation:
              "Run a fact-check in the review to get a content summary. Voice conversation replies are not source-verified.",
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
          ? "No assessed speech evidence was recorded."
          : `${voice.length} pace, volume, pitch, filler or pause adjustment${plural(voice.length)} — about ${(voice.length / minutesOf(durationMs)).toFixed(1)} per minute.`,
      evidence: [
        ...voiceEvidence,
        `${Math.round(scores.flow.coverage * 100)}% of the recording assessed; ${scores.flow.positiveMs / 1000} s positive, ${scores.flow.attentionMs / 1000} s corrective.`,
      ],
      ...(voiceScore === null
        ? {
            limitation:
              "A transcript alone does not establish voice quality. Missing evidence stays unscored.",
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
      evidence: [
        ...gestureEvidence,
        `${Math.round(scores.gesture.coverage * 100)}% of the recording assessed; ${scores.gesture.positiveMs / 1000} s positive, ${scores.gesture.attentionMs / 1000} s corrective.`,
      ],
      ...(gestureScore === null
        ? { limitation: "No assessed pose evidence was recorded." }
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
  strengths.push(
    ...feedback
      .filter((item) => item.kind === "positive")
      .map((item) => item.title),
  );

  const adjustments = new Map<string, number>();
  for (const item of corrective) {
    const key = categoryKey(item.category);
    const mapped = VOICE_CATEGORIES.includes(key) ? key : GESTURE_KINDS[key];
    if (mapped) adjustments.set(mapped, (adjustments.get(mapped) ?? 0) + 1);
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
    method: REVIEW_SCORE_VERSION,
  };
}
