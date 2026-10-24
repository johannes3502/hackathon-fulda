import type { ClaimResult } from "../factcheck/api";

export const REVIEW_SCORE_VERSION = "evidence-share-v1";
export const SCORE_LABELS = {
  gesture: "Gestik",
  knowledge: "Fachwissen",
  flow: "Flow",
  structure: "Struktur",
} as const;
export type ScoreCriterion = keyof typeof SCORE_LABELS;
export type ScoreMoment = {
  criterion: ScoreCriterion | null;
  tMs: number;
  durationMs: number;
  kind: "positive" | "attention" | "note";
  assessment?: "positive" | "attention" | "neutral";
};
export type ReviewScore = {
  value: number | null;
  positiveMs: number;
  attentionMs: number;
  assessedMs: number;
  coverage: number;
  source: "time" | "claims";
  supported: number;
  contradicted: number;
  unassessed: number;
};
type Interval = [number, number];

function unionLength(intervals: Interval[]) {
  const sorted = intervals.slice().sort(([a], [b]) => a - b);
  let total = 0,
    end = 0;
  for (const [start, stop] of sorted) {
    total += Math.max(0, stop - Math.max(start, end));
    end = Math.max(end, stop);
  }
  return total;
}

/** A transparent prototype rubric over assessed evidence, never an inferred grade. */
export function reviewScores(
  moments: ScoreMoment[],
  durationMs: number,
  claims?: Pick<ClaimResult, "verdict">[],
) {
  const duration = Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0;
  return Object.fromEntries(
    Object.keys(SCORE_LABELS).map((key) => {
      const positive: Interval[] = [],
        attention: Interval[] = [];
      for (const moment of moments) {
        if (
          moment.criterion !== key ||
          !Number.isFinite(moment.tMs) ||
          !Number.isFinite(moment.durationMs) ||
          moment.durationMs <= 0
        )
          continue;
        const start = Math.max(0, moment.tMs),
          end = Math.min(duration, moment.tMs + moment.durationMs);
        if (end <= start) continue;
        const kind = moment.assessment ?? moment.kind;
        if (kind === "positive") positive.push([start, end]);
        else if (kind === "attention") attention.push([start, end]);
      }
      const positiveMs = unionLength(positive),
        attentionMs = unionLength(attention);
      const assessedMs = unionLength([...positive, ...attention]);
      const total = positiveMs + attentionMs;
      const result: ReviewScore = {
        value: total ? Math.round((100 * positiveMs) / total) : null,
        positiveMs,
        attentionMs,
        assessedMs,
        coverage: duration ? assessedMs / duration : 0,
        source: "time",
        supported: 0,
        contradicted: 0,
        unassessed: 0,
      };
      if (key === "knowledge" && claims !== undefined) {
        result.source = "claims";
        result.supported = claims.filter(
          (claim) => claim.verdict === "supports",
        ).length;
        result.contradicted = claims.filter(
          (claim) => claim.verdict === "contradicts",
        ).length;
        result.unassessed =
          claims.length - result.supported - result.contradicted;
        const checked = result.supported + result.contradicted;
        result.value = checked
          ? Math.round((100 * result.supported) / checked)
          : null;
      }
      return [key, result];
    }),
  ) as Record<ScoreCriterion, ReviewScore>;
}
