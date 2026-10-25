export type EvidenceStatus = "insufficient" | "provisional" | "reportable";

export type EvidenceInterval = {
  startMs: number;
  endMs: number;
};

export type EvidenceEstimate = {
  value: number | null;
  rawValue: number | null;
  low: number | null;
  high: number | null;
  status: EvidenceStatus;
  coverage: number;
};

export type TimeEvidence = EvidenceEstimate & {
  positiveMs: number;
  concernMs: number;
  assessedMs: number;
  overlapMs: number;
};

export type CountEvidence = EvidenceEstimate & {
  supports: number;
  contradicts: number;
  unassessed: number;
  decided: number;
  total: number;
};

const MIN_ASSESSED_MS = 5000;
const MIN_COVERAGE = 0.1;
const REPORTABLE_MS = 30000;
const REPORTABLE_COVERAGE = 0.3;
const REPORTABLE_DECISIONS = 5;
const ENDPOINT_MS = 30000;
const ENDPOINT_DECISIONS = 10;
const Z = 1.96;

function finite(value: number) {
  return Number.isFinite(value) ? value : 0;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function percent(value: number, endpointAllowed: boolean) {
  const rounded = Math.round(100 * clamp(value, 0, 1));
  return endpointAllowed ? rounded : clamp(rounded, 1, 99);
}

export function mergeIntervals(
  intervals: readonly EvidenceInterval[],
  durationMs?: number,
): EvidenceInterval[] {
  const maximum =
    typeof durationMs === "number" && Number.isFinite(durationMs)
      ? Math.max(0, durationMs)
      : Number.POSITIVE_INFINITY;
  const cleaned = intervals
    .map((interval) => {
      const start = Math.max(0, finite(interval.startMs));
      const end = Math.min(maximum, finite(interval.endMs));
      return { startMs: start, endMs: Math.max(start, end) };
    })
    .filter((interval) => interval.endMs > interval.startMs)
    .sort((left, right) => left.startMs - right.startMs || left.endMs - right.endMs);
  const merged: EvidenceInterval[] = [];
  for (const interval of cleaned) {
    const last = merged[merged.length - 1];
    if (last && interval.startMs <= last.endMs)
      last.endMs = Math.max(last.endMs, interval.endMs);
    else merged.push({ ...interval });
  }
  return merged;
}

export function intersectIntervals(
  left: readonly EvidenceInterval[],
  right: readonly EvidenceInterval[],
  durationMs?: number,
): EvidenceInterval[] {
  const a = mergeIntervals(left, durationMs);
  const b = mergeIntervals(right, durationMs);
  const result: EvidenceInterval[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    const start = Math.max(a[i].startMs, b[j].startMs);
    const end = Math.min(a[i].endMs, b[j].endMs);
    if (end > start) result.push({ startMs: start, endMs: end });
    if (a[i].endMs < b[j].endMs) i += 1;
    else j += 1;
  }
  return result;
}

export function unionLength(intervals: readonly EvidenceInterval[]) {
  return mergeIntervals(intervals).reduce(
    (sum, interval) => sum + interval.endMs - interval.startMs,
    0,
  );
}

export function intersectionLength(
  left: readonly EvidenceInterval[],
  right: readonly EvidenceInterval[],
  durationMs?: number,
) {
  return unionLength(intersectIntervals(left, right, durationMs));
}

export function smoothedShare(
  successes: number,
  failures: number,
  pseudoSuccess = 1,
  pseudoTotal = 2,
) {
  const total = Math.max(0, successes) + Math.max(0, failures);
  return (
    (Math.max(0, successes) + pseudoSuccess) / (total + pseudoTotal)
  );
}

export function wilsonInterval(successes: number, trials: number, z = Z) {
  if (!(trials > 0)) return { low: 0, high: 1 };
  const success = clamp(successes, 0, trials);
  const proportion = success / trials;
  const denominator = 1 + (z * z) / trials;
  const centre =
    (proportion + (z * z) / (2 * trials)) / denominator;
  const margin =
    (z *
      Math.sqrt(
        (proportion * (1 - proportion)) / trials +
          (z * z) / (4 * trials * trials),
      )) /
    denominator;
  return {
    low: clamp(centre - margin, 0, 1),
    high: clamp(centre + margin, 0, 1),
  };
}

function estimate(
  successes: number,
  failures: number,
  status: EvidenceStatus,
  endpointAllowed: boolean,
  pseudoSuccess: number,
  pseudoTotal: number,
): Omit<EvidenceEstimate, "coverage"> {
  const trials = Math.max(0, successes) + Math.max(0, failures);
  const raw = trials > 0 ? Math.max(0, successes) / trials : null;
  if (status === "insufficient")
    return { value: null, rawValue: null, low: null, high: null, status };
  const share = smoothedShare(
    successes,
    failures,
    pseudoSuccess,
    pseudoTotal,
  );
  const interval = wilsonInterval(
    Math.max(0, successes) + pseudoSuccess,
    trials + pseudoTotal,
  );
  return {
    value: percent(share, endpointAllowed),
    rawValue: raw === null ? null : percent(raw, endpointAllowed),
    low: percent(interval.low, endpointAllowed),
    high: percent(interval.high, endpointAllowed),
    status,
  };
}

export function timeEvidence(
  positive: readonly EvidenceInterval[],
  concern: readonly EvidenceInterval[],
  durationMs: number,
): TimeEvidence {
  const duration = Math.max(0, finite(durationMs));
  const positiveIntervals = mergeIntervals(positive, duration);
  const concernIntervals = mergeIntervals(concern, duration);
  const overlapMs = intersectionLength(
    positiveIntervals,
    concernIntervals,
    duration,
  );
  const positiveMs = unionLength(positiveIntervals);
  const concernMs = unionLength(concernIntervals);
  const assessedMs = unionLength([
    ...positiveIntervals,
    ...concernIntervals,
  ]);
  const coverage = duration
    ? clamp(assessedMs / duration, 0, 1)
    : 0;
  const status: EvidenceStatus =
    assessedMs < MIN_ASSESSED_MS || coverage < MIN_COVERAGE
      ? "insufficient"
      : assessedMs < REPORTABLE_MS || coverage < REPORTABLE_COVERAGE
        ? "provisional"
        : "reportable";
  const successes = positiveMs - overlapMs / 2;
  const failures = concernMs - overlapMs / 2;
  return {
    ...estimate(
      successes / 1000,
      failures / 1000,
      status,
      assessedMs >= ENDPOINT_MS,
      1,
      2,
    ),
    coverage,
    positiveMs,
    concernMs,
    assessedMs,
    overlapMs,
  };
}

export function countEvidence(input: {
  supports: number;
  contradicts: number;
  unassessed?: number;
}): CountEvidence {
  const supports = Math.max(0, Math.floor(finite(input.supports)));
  const contradicts = Math.max(
    0,
    Math.floor(finite(input.contradicts)),
  );
  const unassessed = Math.max(
    0,
    Math.floor(finite(input.unassessed ?? 0)),
  );
  const decided = supports + contradicts;
  const total = decided + unassessed;
  const coverage = total ? decided / total : 0;
  const status: EvidenceStatus =
    decided < 1
      ? "insufficient"
      : decided < REPORTABLE_DECISIONS
        ? "provisional"
        : "reportable";
  return {
    ...estimate(
      supports,
      contradicts,
      status,
      decided >= ENDPOINT_DECISIONS,
      1,
      2,
    ),
    coverage,
    supports,
    contradicts,
    unassessed,
    decided,
    total,
  };
}
