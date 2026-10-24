export const STAT_LABELS = {
  gesture: "Gestik",
  knowledge: "Fachwissen",
  flow: "Flow",
  structure: "Struktur",
} as const;

export type PresentationStats = Record<keyof typeof STAT_LABELS, number>;

export type StatMetricKey = "overall" | keyof typeof STAT_LABELS;

/** Synthetic design fixture, not an assessment of a real presentation. */
export const DEMO_STATS: PresentationStats = {
  gesture: 78,
  knowledge: 88,
  flow: 84,
  structure: 78,
};

export type MonthlyStatsEntry = {
  id: string;
  month: string;
  fullMonth: string;
  stats: PresentationStats;
  sessions: number;
  durationMinutes: number;
  moments: {
    positive: number;
    attention: number;
    note: number;
  };
};

/** Synthetic monthly progression fixture for prototype preview (no real user scoring). */
export const MONTHLY_STATS: MonthlyStatsEntry[] = [
  {
    id: "2026-05",
    month: "Mai",
    fullMonth: "Mai 2026",
    stats: { gesture: 62, knowledge: 70, flow: 65, structure: 60 },
    sessions: 3,
    durationMinutes: 14,
    moments: { positive: 6, attention: 9, note: 4 },
  },
  {
    id: "2026-06",
    month: "Juni",
    fullMonth: "Juni 2026",
    stats: { gesture: 66, knowledge: 74, flow: 69, structure: 64 },
    sessions: 5,
    durationMinutes: 24,
    moments: { positive: 11, attention: 10, note: 5 },
  },
  {
    id: "2026-07",
    month: "Juli",
    fullMonth: "Juli 2026",
    stats: { gesture: 69, knowledge: 78, flow: 72, structure: 67 },
    sessions: 4,
    durationMinutes: 19,
    moments: { positive: 10, attention: 7, note: 4 },
  },
  {
    id: "2026-08",
    month: "Aug.",
    fullMonth: "August 2026",
    stats: { gesture: 72, knowledge: 81, flow: 77, structure: 71 },
    sessions: 7,
    durationMinutes: 34,
    moments: { positive: 18, attention: 8, note: 6 },
  },
  {
    id: "2026-09",
    month: "Sept.",
    fullMonth: "September 2026",
    stats: { gesture: 75, knowledge: 85, flow: 81, structure: 75 },
    sessions: 9,
    durationMinutes: 42,
    moments: { positive: 24, attention: 7, note: 6 },
  },
  {
    id: "2026-10",
    month: "Okt.",
    fullMonth: "Oktober 2026",
    stats: DEMO_STATS,
    sessions: 12,
    durationMinutes: 58,
    moments: { positive: 31, attention: 6, note: 8 },
  },
];

export function summarizeStats(stats: PresentationStats) {
  const values = Object.keys(STAT_LABELS).map(
    (key) => stats[key as keyof PresentationStats],
  );
  if (
    values.some((value) => !Number.isFinite(value) || value < 1 || value > 100)
  ) {
    return null;
  }
  return Math.round(
    values.reduce((sum, value) => sum + value, 0) / values.length,
  );
}

export function metricValue(
  stats: PresentationStats,
  metric: StatMetricKey,
): number | null {
  if (metric === "overall") return summarizeStats(stats);
  const value = stats[metric];
  return Number.isFinite(value) && value >= 1 && value <= 100
    ? Math.round(value)
    : null;
}

export function summarizeMonthlyProgress(
  entries: MonthlyStatsEntry[],
  metric: StatMetricKey = "overall",
) {
  const points = entries.flatMap((entry) => {
    const value = metricValue(entry.stats, metric);
    return value === null
      ? []
      : [
          {
            id: entry.id,
            month: entry.month,
            fullMonth: entry.fullMonth,
            value,
            sessions: entry.sessions,
            durationMinutes: entry.durationMinutes,
            moments: entry.moments,
            stats: entry.stats,
          },
        ];
  });
  const startValue = points[0]?.value ?? null;
  const currentValue = points.at(-1)?.value ?? null;
  const previousValue =
    points.length >= 2 ? (points.at(-2)?.value ?? null) : startValue;
  const totalDelta =
    startValue !== null && currentValue !== null
      ? currentValue - startValue
      : null;
  const monthDelta =
    previousValue !== null && currentValue !== null
      ? currentValue - previousValue
      : null;
  const totalSessions = entries.reduce((sum, item) => sum + item.sessions, 0);
  const totalMinutes = entries.reduce(
    (sum, item) => sum + item.durationMinutes,
    0,
  );
  return {
    points,
    startValue,
    previousValue,
    currentValue,
    totalDelta,
    monthDelta,
    totalSessions,
    totalMinutes,
  };
}

