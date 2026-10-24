export const STAT_LABELS = {
  gesture: "Gestik",
  knowledge: "Fachwissen",
  flow: "Flow",
  structure: "Struktur",
} as const;

export type PresentationStats = Record<keyof typeof STAT_LABELS, number>;

/** Synthetic design fixture, not an assessment of a real presentation. */
export const DEMO_STATS: PresentationStats = {
  gesture: 78,
  knowledge: 88,
  flow: 84,
  structure: 78,
};

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
