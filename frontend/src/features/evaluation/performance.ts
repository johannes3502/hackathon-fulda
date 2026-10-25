import type { ClaimResult, FactCheckResult } from "../factcheck/api";
import { evidenceVerdict } from "../factcheck/api";
import type { LiveFeedback, LiveMetric, Word } from "../live/contracts";
import type { PoseEvent } from "../pose/evaluation";
import type { QuestionAnswer, QuestionResult } from "../questions/api";
import {
  countEvidence,
  type CountEvidence,
  type EvidenceStatus,
} from "../scoring/evidence";

export const PRACTICE_EVIDENCE_VERSION = "practice.evidence.v2";
export type EvaluationCategory =
  | "source-talk"
  | "source-answers"
  | "speech"
  | "gesture";
export type PoseKind = "posture" | "gesture" | "gaze";

export type PerformanceCategory = {
  category: EvaluationCategory;
  label: string;
  estimate: number | null;
  rawValue: number | null;
  low: number | null;
  high: number | null;
  status: EvidenceStatus | null;
  coverage: number | null;
  counts: string[];
  summary: string;
  evidence: string[];
  limitation?: string;
};

export type PerformanceEvaluation = {
  categories: PerformanceCategory[];
  strengths: string[];
  improvements: string[];
  limitations: string[];
  notice: string;
  method: "practice.evidence.v2";
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
const NOTICE = "No overall score: these rows measure different things.";
const LIMITATIONS = [
  "This profile reports measured evidence, not a validated grade.",
  "The rows measure different things and are not combined into an overall score.",
  "“Not found in sources” does not mean a statement is wrong.",
  "Speech and pose rows count prototype markers; missing markers do not prove the skill was good.",
];

const categoryKey = (category: string) => category.trim().toLowerCase();
const plural = (count: number) => (count === 1 ? "" : "s");
const minutesOf = (durationMs: number) =>
  Math.max(0.5, durationMs / 60000);

function sourceCategory(
  category: EvaluationCategory,
  label: string,
  estimate: CountEvidence,
  summary: string,
  counts: string[],
  evidence: string[],
  limitation?: string,
): PerformanceCategory {
  return {
    category,
    label,
    estimate: estimate.value,
    rawValue: estimate.rawValue,
    low: estimate.low,
    high: estimate.high,
    status: estimate.status,
    coverage: estimate.coverage,
    counts,
    summary,
    evidence,
    ...(estimate.value === null && limitation ? { limitation } : {}),
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

function countEvidenceItems(
  kinds: string[],
  labels: Record<string, string>,
  noun: string,
): string[] {
  return [...new Set(kinds)].map((kind) => {
    const count = kinds.filter((item) => item === kind).length;
    const label = labels[kind] ?? kind;
    return `${count} ${count === 1 ? label.replace(/s$/, "") : label} ${noun}${plural(count)}`;
  });
}

function claimVerdicts(factCheck?: FactCheckResult | null) {
  return (factCheck?.claims ?? []).map((claim) => evidenceVerdict(claim));
}

function answerVerdicts(
  questions: QuestionResult["questions"],
  answers: Record<string, QuestionAnswer>,
) {
  return questions
    .map((question) => answers[question.id])
    .filter((answer): answer is QuestionAnswer => !!answer)
    .map((answer) =>
      evidenceVerdict({
        verdict: answer.review.verdict,
        evidence: answer.review.evidence,
      }),
    );
}

function verdictCounts(verdicts: ClaimResult["verdict"][]) {
  const supports = verdicts.filter((verdict) => verdict === "supports").length;
  const contradicts = verdicts.filter(
    (verdict) => verdict === "contradicts",
  ).length;
  return {
    supports,
    contradicts,
    unassessed: verdicts.length - supports - contradicts,
  };
}

export function evaluatePerformance(
  input: PerformanceInput,
): PerformanceEvaluation {
  const durationMs = Number.isFinite(input.durationMs)
    ? Math.max(0, input.durationMs)
    : 0;
  const feedback = input.feedback ?? [];
  const claims = claimVerdicts(input.factCheck);
  const talk = verdictCounts(claims);
  const talkEstimate = countEvidence(talk);
  const questions = input.questions?.questions ?? [];
  const answers = input.answers ?? {};
  const answered = questions
    .map((question) => answers[question.id])
    .filter((answer): answer is QuestionAnswer => !!answer);
  const answerChecks = answerVerdicts(questions, answers);
  const answersCount = verdictCounts(answerChecks);
  const answerEstimate = countEvidence(answersCount);

  const talkEvidence = [
    talk.supports
      ? `${talk.supports} of ${claims.length} statements were backed by your sources`
      : "",
    talk.contradicts
      ? `${talk.contradicts} statement${plural(talk.contradicts)} differ from a source`
      : "",
    talk.unassessed
      ? `${talk.unassessed} statement${plural(talk.unassessed)} not settled by the checked sources`
      : "",
  ].filter(Boolean);
  const answerEvidence = [
    answersCount.supports
      ? `${answersCount.supports} of ${answered.length} answers matched the sources`
      : "",
    answersCount.contradicts
      ? `${answersCount.contradicts} answer${plural(answersCount.contradicts)} differed from the sources`
      : "",
    answersCount.unassessed
      ? `${answersCount.unassessed} answer${plural(answersCount.unassessed)} not settled by the checked sources`
      : "",
    questions.length > answered.length
      ? `${questions.length - answered.length} question${plural(questions.length - answered.length)} still unanswered`
      : "",
  ].filter(Boolean);

  const voice = feedback.filter((item) =>
    VOICE_CATEGORIES.includes(categoryKey(item.category)),
  );
  const hasWords = (input.words ?? []).length > 0;
  const voiceMeasured = hasWords || voice.length > 0;
  const voiceRate = voice.length / minutesOf(durationMs);
  const poseKinds = poseKindsFrom(feedback, input.poseEvents ?? []);
  const poseRate = poseKinds.length / minutesOf(durationMs);

  const categories: PerformanceCategory[] = [
    sourceCategory(
      "source-talk",
      "Source grounding (talk)",
      talkEstimate,
      claims.length
        ? `${talk.supports} supported, ${talk.contradicts} differed and ${talk.unassessed} not settled by the checked sources. Only statements with a verified source quote decide the estimate.`
        : "No checked statements were available for the talk.",
      [
        `${claims.length} checked statement${plural(claims.length)}`,
        `${talk.supports} supported`,
        `${talk.contradicts} differed`,
        `${talk.unassessed} not settled`,
      ],
      talkEvidence,
      "Run a source check with verified quotes to estimate source grounding.",
    ),
    sourceCategory(
      "source-answers",
      "Source grounding (answers)",
      answerEstimate,
      !questions.length
        ? "No practice questions were available."
        : !answered.length
          ? `${questions.length} question${plural(questions.length)} available; none answered yet.`
          : `${answered.length} of ${questions.length} questions answered. ${answersCount.supports} supported, ${answersCount.contradicts} differed and ${answersCount.unassessed} not settled by the checked sources.`,
      [
        `${answered.length} of ${questions.length} answered`,
        `${answersCount.supports} supported`,
        `${answersCount.contradicts} differed`,
        `${answersCount.unassessed} not settled`,
      ],
      answerEvidence,
      "Answer at least one practice question to estimate answer grounding.",
    ),
    {
      category: "speech",
      label: "Speech delivery",
      estimate: null,
      rawValue: null,
      low: null,
      high: null,
      status: null,
      coverage: null,
      counts: voiceMeasured
        ? [
            `${voice.length} speech adjustment${plural(voice.length)}`,
            `${voiceRate.toFixed(1)} per minute`,
          ]
        : [],
      summary: voiceMeasured
        ? "Counts of measured pacing, volume, pitch, filler and pause markers."
        : "No transcript or speech feedback was recorded.",
      evidence: voiceMeasured
        ? countEvidenceItems(
            voice.map((item) => categoryKey(item.category)),
            ADJUSTMENT_LABELS,
            "adjustment",
          )
        : [],
      ...(!voiceMeasured
        ? { limitation: "Without words or speech feedback no markers are counted." }
        : {
            limitation:
              "Counts are not converted to a score; missing markers do not prove the skill was good.",
          }),
    },
    {
      category: "gesture",
      label: "Pose & gesture",
      estimate: null,
      rawValue: null,
      low: null,
      high: null,
      status: null,
      coverage: null,
      counts: poseKinds.length
        ? [
            `${poseKinds.length} pose or gesture marker${plural(poseKinds.length)}`,
            `${poseRate.toFixed(1)} per minute`,
          ]
        : [],
      summary: poseKinds.length
        ? "Counts of posture, gesture and head-direction markers from pose feedback."
        : "Posture was not evaluated.",
      evidence: countEvidenceItems(
        poseKinds,
        ADJUSTMENT_LABELS,
        "marker",
      ),
      ...(!poseKinds.length
        ? { limitation: "No pose markers were recorded." }
        : {
            limitation:
              "Counts are not converted to a score; missing markers do not prove the skill was good.",
          }),
    },
  ];

  const strengths: string[] = [];
  if (talk.supports)
    strengths.push(
      `${talk.supports} of ${claims.length} statements were backed by your sources`,
    );
  if (answersCount.supports)
    strengths.push(
      `${answersCount.supports} of ${answered.length} answers matched the sources`,
    );

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
  if (talk.contradicts || answersCount.contradicts)
    improvements.push(
      "Revisit the contradicted statements with your material in the moments list.",
    );
  if (mostAdjusted)
    improvements.push(
      `Most adjustments were in ${mostAdjusted.label} — replay those moments on the timeline.`,
    );
  if (questions.length > answered.length)
    improvements.push(
      "Answer the remaining questions to sharpen the source grounding.",
    );

  return {
    categories,
    strengths: strengths.slice(0, 3),
    improvements: improvements.slice(0, 3),
    limitations: LIMITATIONS,
    notice: NOTICE,
    method: PRACTICE_EVIDENCE_VERSION,
  };
}
