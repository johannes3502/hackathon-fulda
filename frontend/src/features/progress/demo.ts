import type {
  ExclusionReason,
  MetricDefinition,
  MetricSeries,
  MetricUnit,
  PresentationMode,
  ProgressChangePoint,
  ProgressPoint,
  ProgressResponse,
  ProgressTrend,
  SuggestedDirection,
} from "./contract";

/**
 * Deterministic synthetic `progress.v1` fixture.
 *
 * It exists so the interface can be reviewed without a camera or a seeded
 * database. Every point, observation and limitation is invented; the page must
 * label it as such and must never present it as a real measurement.
 */

type DemoMetric = {
  metricId: string;
  label: string;
  labelEn: string;
  description: string;
  descriptionEn: string;
  unit: MetricUnit;
  valueType: MetricDefinition["valueType"];
  suggestedDirection: SuggestedDirection;
  source: MetricDefinition["source"];
  quality: MetricDefinition["quality"];
  values: (number | null)[];
  exclusionAt?: Record<number, string[]>;
  trend: Omit<ProgressTrend, "window" | "confidence">;
  confidence: ProgressTrend["confidence"];
  status: MetricSeries["quality"]["status"];
  ruleVersions: string[];
  goal?: MetricSeries["goal"];
  goalStatus: MetricSeries["goalStatus"];
  changePoints?: Array<
    Pick<
      ProgressChangePoint,
      "sequence" | "kind" | "fromValue" | "toValue" | "magnitude" | "confidence"
    >
  >;
};

const MODES: PresentationMode[] = [
  "school",
  "school",
  "thesis",
  "school",
  "school",
  "school",
  "school",
  "thesis",
  "school",
  "school",
  "school",
  "school",
  "school",
  "thesis",
  "school",
  "school",
  "school",
  "school",
  "school",
  "school",
  "school",
  "thesis",
  "school",
  "school",
];

const DATES = [
  "2026-01-12",
  "2026-01-24",
  "2026-02-05",
  "2026-02-19",
  "2026-03-03",
  "2026-03-16",
  "2026-03-28",
  "2026-04-09",
  "2026-04-22",
  "2026-05-04",
  "2026-05-16",
  "2026-05-29",
  "2026-06-10",
  "2026-06-23",
  "2026-07-05",
  "2026-07-18",
  "2026-07-30",
  "2026-08-12",
  "2026-08-24",
  "2026-09-06",
  "2026-09-12",
  "2026-09-25",
  "2026-10-08",
  "2026-10-20",
];

const DURATIONS = [
  182000, 176000, 191000, 169000, 204000, 188000, 173000, 198000, 186000,
  171000, 213000, 194000, 180000, 199000, 175000, 184000, 190000, 177000,
  202000, 181000, 48000, 52000, 45000, 50000,
];

const DEVICE = "a3f1c9e2-4b7a-4c1d-9e2f-5a6b7c8d9e0f";

const METRICS: DemoMetric[] = [
  {
    metricId: "speech.pace_wpm",
    label: "Sprechtempo",
    labelEn: "Speaking pace",
    description:
      "Wörter pro Minute ohne lange Pausen. Es gibt keinen universell guten Zielwert.",
    descriptionEn:
      "Words per minute excluding long pauses. There is no universally good target.",
    unit: "WPM",
    valueType: "rate",
    suggestedDirection: "neutral",
    source: "asr",
    quality: {
      minDurationMs: 60000,
      minPoseCoverage: null,
      minAudioActiveRatio: null,
      minWordCount: 50,
      minClaimCount: null,
      deviceSensitive: false,
    },
    values: [
      124, 127, 121, 130, 126, 132, 125, 128, null, 127, 133, 128, 129, 131,
      126, 130, 128, 133, 127, 130, 131, 128, 132, 129,
    ],
    exclusionAt: { 9: ["metric-not-computable"] },
    trend: {
      status: "stable",
      direction: "flat",
      method: "theil-sen+mann-kendall+cusum",
      algorithmVersion: "progress-stats-2",
      n: 19,
      slopePerTake: 0.15,
      slopePer10Takes: 1.5,
      slopeCi95: [-0.2, 0.5],
      relativeChange: 0.048,
      effectSize: 0.39,
      noiseBand: 3.8,
      minimumDetectableChange: 10.5,
      mannKendallP: 0.51,
      adjustedP: 0.51,
      reliableSlope: false,
    },
    confidence: "medium",
    status: "partial",
    ruleVersions: ["asr:whisper", "speech-config-2026-10-24"],
    goalStatus: "not_applicable",
  },
  {
    metricId: "speech.pause_share",
    label: "Pausenanteil",
    labelEn: "Pause share",
    description:
      "Anteil der Aufnahme, in dem eine Pause markiert war. Stille kann gewollt sein.",
    descriptionEn:
      "Share of the recording marked as a pause. Silence can be intentional.",
    unit: "ratio",
    valueType: "ratio",
    suggestedDirection: "decrease",
    source: "speech",
    quality: {
      minDurationMs: 60000,
      minPoseCoverage: null,
      minAudioActiveRatio: 0.2,
      minWordCount: null,
      minClaimCount: null,
      deviceSensitive: false,
    },
    values: [
      0.21, 0.22, 0.2, 0.21, 0.19, 0.18, 0.2, 0.17, 0.18, 0.16, 0.17, 0.15,
      0.14, 0.16, 0.13, 0.14, 0.12, 0.13, 0.11, 0.12, 0.1, 0.11, 0.09, 0.1,
    ],
    trend: {
      status: "trend_down",
      direction: "down",
      method: "theil-sen+mann-kendall+cusum",
      algorithmVersion: "progress-stats-2",
      n: 20,
      slopePerTake: -0.0048,
      slopePer10Takes: -0.048,
      slopeCi95: [-0.0065, -0.0031],
      relativeChange: -0.428,
      effectSize: -4,
      noiseBand: 0.012,
      minimumDetectableChange: 0.033,
      mannKendallP: 0.004,
      adjustedP: 0.014,
      reliableSlope: true,
    },
    confidence: "high",
    status: "good",
    ruleVersions: ["speech-config-2026-10-24"],
    goalStatus: "not_applicable",
  },
  {
    metricId: "speech.filler_rate_per_100_words",
    label: "Füllwörter pro 100 Wörter",
    labelEn: "Fillers per 100 words",
    description:
      "Vom ASR erkannte Füllwörter. Die deutsche Erkennung ist ungeprüft.",
    descriptionEn:
      "Fillers detected by ASR. German detection quality is unverified.",
    unit: "per100w",
    valueType: "rate",
    suggestedDirection: "decrease",
    source: "asr",
    quality: {
      minDurationMs: 60000,
      minPoseCoverage: null,
      minAudioActiveRatio: null,
      minWordCount: 50,
      minClaimCount: null,
      deviceSensitive: false,
    },
    values: [
      7.4, 7.1, 7.6, 6.9, 7.2, 6.8, 6.5, 6.6, 6.2, 6.0, 5.8, 6.1, 4.6, 4.4,
      4.2, 4.5, 4.1, 4.0, 4.3, 3.9, 4.2, 4.0, 3.8, 3.7,
    ],
    trend: {
      status: "trend_down",
      direction: "down",
      method: "theil-sen+mann-kendall+cusum",
      algorithmVersion: "progress-stats-2",
      n: 20,
      slopePerTake: -0.19,
      slopePer10Takes: -1.9,
      slopeCi95: [-0.26, -0.11],
      relativeChange: -0.473,
      effectSize: -1.73,
      noiseBand: 1.1,
      minimumDetectableChange: 3.05,
      mannKendallP: 0.003,
      adjustedP: 0.012,
      reliableSlope: true,
    },
    confidence: "high",
    status: "good",
    ruleVersions: ["asr:whisper", "speech-config-2026-10-24"],
    goal: {
      direction: "decrease",
      targetValue: 4,
      targetMin: null,
      targetMax: null,
      createdAt: "2026-03-01T10:00:00Z",
      updatedAt: "2026-03-01T10:00:00Z",
    },
    goalStatus: "on_track",
    changePoints: [
      {
        sequence: 13,
        kind: "step_down",
        fromValue: 6.1,
        toValue: 4.6,
        magnitude: -1.5,
        confidence: "medium",
      },
    ],
  },
  {
    metricId: "pose.posture_share",
    label: "Haltungsanteil",
    labelEn: "Posture event share",
    description:
      "Zeitanteil mit markierten Haltungsereignissen. Eine Heuristik, keine Haltungsnote.",
    descriptionEn:
      "Share of time with marked posture events. A heuristic, not a posture grade.",
    unit: "ratio",
    valueType: "ratio",
    suggestedDirection: "decrease",
    source: "pose",
    quality: {
      minDurationMs: 60000,
      minPoseCoverage: 0.6,
      minPoseValidRatio: 0.8,
      minAudioActiveRatio: null,
      minWordCount: null,
      minClaimCount: null,
      deviceSensitive: false,
    },
    values: [
      0.18, 0.16, 0.17, 0.15, 0.14, 0.16, 0.13, 0.12, 0.14, 0.11, 0.12, 0.1,
      0.09, 0.11, 0.08, 0.09, 0.07, 0.08, 0.06, 0.07, 0.05, 0.06, 0.04, 0.05,
    ],
    exclusionAt: {
      19: ["pose-coverage-low"],
      20: ["pose-coverage-low"],
      21: ["duration-too-short"],
      22: ["duration-too-short"],
      23: ["duration-too-short"],
      24: ["duration-too-short"],
    },
    trend: {
      status: "trend_down",
      direction: "down",
      method: "theil-sen+mann-kendall+cusum",
      algorithmVersion: "progress-stats-2",
      n: 18,
      slopePerTake: -0.006,
      slopePer10Takes: -0.06,
      slopeCi95: [-0.008, -0.004],
      relativeChange: -0.529,
      effectSize: -3.33,
      noiseBand: 0.018,
      minimumDetectableChange: 0.05,
      mannKendallP: 0.006,
      adjustedP: 0.018,
      reliableSlope: true,
    },
    confidence: "low",
    status: "partial",
    ruleVersions: ["pose-rules-v7"],
    goalStatus: "not_applicable",
  },
  {
    metricId: "pose.head_away_share",
    label: "Kopf abgewandt",
    labelEn: "Head-away share",
    description:
      "Zeitanteil mit Kopforientierungs-Proxy abgewandt. Kein Blickkontakt.",
    descriptionEn:
      "Share of time with the head-orientation proxy away. Not eye contact.",
    unit: "ratio",
    valueType: "ratio",
    suggestedDirection: "decrease",
    source: "pose",
    quality: {
      minDurationMs: 60000,
      minPoseCoverage: 0.6,
      minPoseValidRatio: 0.8,
      minAudioActiveRatio: null,
      minWordCount: null,
      minClaimCount: null,
      deviceSensitive: false,
    },
    values: [
      0.14, 0.13, 0.15, 0.12, 0.13, 0.11, 0.1, 0.12, 0.09, 0.1, 0.08, 0.09,
      0.07, 0.08, 0.06, 0.07, 0.05, 0.06, 0.04, 0.05, 0.03, 0.04, 0.02, 0.03,
    ],
    exclusionAt: {
      19: ["pose-coverage-low"],
      20: ["pose-coverage-low"],
      21: ["duration-too-short"],
      22: ["duration-too-short"],
      23: ["duration-too-short"],
      24: ["duration-too-short"],
    },
    trend: {
      status: "trend_down",
      direction: "down",
      method: "theil-sen+mann-kendall+cusum",
      algorithmVersion: "progress-stats-2",
      n: 18,
      slopePerTake: -0.005,
      slopePer10Takes: -0.05,
      slopeCi95: [-0.007, -0.003],
      relativeChange: -0.571,
      effectSize: -3.57,
      noiseBand: 0.014,
      minimumDetectableChange: 0.039,
      mannKendallP: 0.01,
      adjustedP: 0.022,
      reliableSlope: true,
    },
    confidence: "low",
    status: "partial",
    ruleVersions: ["pose-rules-v7"],
    goalStatus: "not_applicable",
  },
  {
    metricId: "pose.gesture_rate_per_min",
    label: "Gesten pro Minute",
    labelEn: "Gestures per minute",
    description:
      "Anzahl markierter Gesten pro auswertbarer Minute. Häufigkeit ist nicht Qualität.",
    descriptionEn:
      "Marked gestures per evaluable minute. Frequency is not quality.",
    unit: "perMin",
    valueType: "perMin",
    suggestedDirection: "neutral",
    source: "pose",
    quality: {
      minDurationMs: 60000,
      minPoseCoverage: 0.6,
      minPoseValidRatio: 0.8,
      minAudioActiveRatio: null,
      minWordCount: null,
      minClaimCount: null,
      deviceSensitive: false,
    },
    values: [
      2.1, 2.4, 2.0, 2.6, 2.8, 2.3, 3.0, 2.4, 2.7, 3.2, 2.9, 3.4, 3.1, 2.8,
      3.3, 2.5, 3.0, 3.4, 2.9, 3.2, 3.0, 2.8, 3.1, 3.3,
    ],
    trend: {
      status: "stable",
      direction: "flat",
      method: "theil-sen+mann-kendall+cusum",
      algorithmVersion: "progress-stats-2",
      n: 20,
      slopePerTake: 0.05,
      slopePer10Takes: 0.5,
      slopeCi95: [-0.01, 0.11],
      relativeChange: 0.524,
      effectSize: 0.91,
      noiseBand: 0.55,
      minimumDetectableChange: 1.5,
      mannKendallP: 0.28,
      adjustedP: 0.28,
      reliableSlope: false,
    },
    confidence: "medium",
    status: "good",
    ruleVersions: ["pose-rules-v7"],
    goalStatus: "not_applicable",
  },
  {
    metricId: "content.contradiction_rate",
    label: "Widerspruchsquote",
    labelEn: "Contradiction rate",
    description:
      "Anteil geprüfter Aussagen, denen eine Quelle widerspricht. 'Nicht gefunden' zählt nicht als Widerspruch.",
    descriptionEn:
      "Share of checked claims contradicted by a source. 'Not found' is not a contradiction.",
    unit: "ratio",
    valueType: "ratio",
    suggestedDirection: "decrease",
    source: "factcheck",
    quality: {
      minDurationMs: 60000,
      minPoseCoverage: null,
      minAudioActiveRatio: null,
      minWordCount: 50,
      minClaimCount: 3,
      deviceSensitive: false,
    },
    values: [
      0.2, 0.18, 0.16, 0.15, 0.14, 0.12, 0.1, 0.09, 0.08, 0.07, 0.06, 0.05,
      0.04, 0.05, 0.04, 0.03, 0.04, 0.03, 0.02, 0.03, 0.02, 0.03, 0.02, 0.02,
    ],
    trend: {
      status: "trend_down",
      direction: "down",
      method: "theil-sen+mann-kendall+cusum",
      algorithmVersion: "progress-stats-2",
      n: 20,
      slopePerTake: -0.009,
      slopePer10Takes: -0.09,
      slopeCi95: [-0.011, -0.007],
      relativeChange: -0.833,
      effectSize: -4.5,
      noiseBand: 0.02,
      minimumDetectableChange: 0.055,
      mannKendallP: 0.001,
      adjustedP: 0.007,
      reliableSlope: true,
    },
    confidence: "high",
    status: "good",
    ruleVersions: ["factcheck-v1"],
    goalStatus: "not_applicable",
  },
];

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function recordedAt(index: number) {
  return `${DATES[index]}T18:00:00Z`;
}

function makePoint(metric: DemoMetric, index: number): ProgressPoint {
  const sequence = index + 1;
  const value = metric.values[index];
  const short = sequence >= 21;
  const cameraLow = sequence >= 19;
  const reasons = new Set<ExclusionReason>();
  if (short) reasons.add("duration-too-short");
  for (const reason of metric.exclusionAt?.[sequence] ?? []) {
    reasons.add(reason as ExclusionReason);
  }
  if (value == null) reasons.add("metric-not-computable");
  return {
    takeId: `demo-take-${String(sequence).padStart(2, "0")}`,
    sessionId: `demo-session-${String(sequence).padStart(2, "0")}`,
    recordedAt: recordedAt(index),
    recordedAtSource: sequence === 11 ? "server" : "client",
    sequence,
    value,
    unit: metric.unit,
    eligible: reasons.size === 0 && value != null,
    exclusionReasons: [...reasons].sort(),
    quality: {
      poseCoverage: cameraLow ? (short ? null : 0.48) : 0.94,
      poseValidRatio: cameraLow ? 0.86 : 0.95,
      audioActiveRatio: short ? 0.31 : 0.58 + (index % 5) * 0.025,
      wordCount: short ? 96 : 380 + (index % 7) * 18,
      claimCount: short ? 2 : 6 + (index % 4),
      asrProvider: "whisper",
      syntheticDemo: false,
    },
    context: {
      presentationMode: MODES[index],
      durationMs: DURATIONS[index],
      deviceKey: DEVICE,
      ruleVersions: metric.ruleVersions,
    },
  };
}

function makeSeries(metric: DemoMetric): MetricSeries {
  const points = metric.values.map((_, index) => makePoint(metric, index));
  const eligible = points.filter((point) => point.eligible);
  const baselineValue = median(
    eligible.slice(0, 3).map((point) => point.value as number),
  );
  const latest = eligible.at(-1) ?? null;
  const changeVsBaseline =
    latest?.value != null ? latest.value - baselineValue : null;
  const sequences = eligible.map((point) => point.sequence);
  const hasGaps = sequences.some(
    (sequence, index) =>
      index > 0 && sequence !== sequences[index - 1] + 1,
  );
  const limitations: MetricSeries["limitations"] = [];
  if (metric.status !== "good") {
    limitations.push({
      code: "quality-mix",
      message:
        "Ein Teil der Aufnahmen ist für diese Metrik nicht vergleichbar; Lücken bleiben sichtbar.",
    });
  }
  if (hasGaps) {
    limitations.push({
      code: "gaps-no-change-points",
      message:
        "Die Messreihe enthält Lücken; Change-Points werden deshalb nicht bestimmt.",
    });
  }
  if (metric.confidence === "low") {
    limitations.push({
      code: "low-confidence",
      message:
        "Die Datenlage ist begrenzt; die Aussage ist vorläufig und keine Messgarantie.",
    });
  }
  const trend: ProgressTrend = {
    ...metric.trend,
    confidence: metric.confidence,
    window: {
      fromTakeId: points[0]?.takeId ?? null,
      toTakeId: points.at(-1)?.takeId ?? null,
      fromRecordedAt: points[0]?.recordedAt ?? null,
      toRecordedAt: points.at(-1)?.recordedAt ?? null,
    },
  };
  const changePoints: ProgressChangePoint[] = (metric.changePoints ?? []).map(
    (change, index) => ({
      id: `demo-change-${metric.metricId}-${index + 1}`,
      metricId: metric.metricId,
      metricVersion: 1,
      takeId: `demo-take-${String(change.sequence).padStart(2, "0")}`,
      sequence: change.sequence,
      recordedAt: recordedAt(change.sequence - 1),
      kind: change.kind,
      fromValue: change.fromValue,
      toValue: change.toValue,
      magnitude: change.magnitude,
      confidence: change.confidence,
      evidenceTakeIds: [change.sequence - 2, change.sequence - 1, change.sequence, change.sequence + 1]
        .filter((sequence) => sequence >= 1 && sequence <= 24)
        .map((sequence) => `demo-take-${String(sequence).padStart(2, "0")}`),
      algorithmVersion: "progress-stats-2",
    }),
  );
  return {
    metricId: metric.metricId,
    metricVersion: 1,
    label: { de: metric.label, en: metric.labelEn },
    unit: metric.unit,
    suggestedDirection: metric.suggestedDirection,
    isPrimary: true,
    heuristic: true,
    goal: metric.goal ?? null,
    points,
    baseline: {
      kind: "first_3_eligible",
      value: baselineValue,
      n: Math.min(3, eligible.length),
      takeIds: eligible.slice(0, 3).map((point) => point.takeId),
    },
    latest:
      latest && latest.value != null
        ? {
            takeId: latest.takeId,
            recordedAt: latest.recordedAt,
            value: latest.value,
            changeVsBaseline,
            relativeChange:
              changeVsBaseline == null || baselineValue === 0
                ? null
                : changeVsBaseline / baselineValue,
            zScore:
              changeVsBaseline == null || !trend.noiseBand
                ? null
                : changeVsBaseline / trend.noiseBand,
            reliableChange:
              (trend.minimumDetectableChange ?? Infinity) <=
              Math.abs(changeVsBaseline ?? 0),
          }
        : null,
    trend,
    changePoints,
    goalStatus: metric.goalStatus,
    quality: {
      totalPoints: points.length,
      eligiblePoints: eligible.length,
      excludedPoints: points.length - eligible.length,
      missingPoints: points.filter((point) => point.value == null).length,
      versionBreak: false,
      ruleVersions: metric.ruleVersions,
      status: metric.status,
    },
    limitations,
  };
}

const SERIES = METRICS.map(makeSeries);

const DEFINITIONS: MetricDefinition[] = METRICS.map((metric) => ({
  metricId: metric.metricId,
  version: 1,
  label: { de: metric.label, en: metric.labelEn },
  description: { de: metric.description, en: metric.descriptionEn },
  unit: metric.unit,
  valueType: metric.valueType,
  suggestedDirection: metric.suggestedDirection,
  isPrimary: true,
  heuristic: true,
  source: metric.source,
  quality: metric.quality,
}));

export const DEMO_PROFILE_ID = "3e1c5f7a-9b2d-4c8e-8a61-2f4d7b0c9e15";

export const demoProgress: ProgressResponse = {
  schemaVersion: "progress.v1",
  generatedAt: "2026-10-24T20:15:00Z",
  profile: {
    profileId: DEMO_PROFILE_ID,
    displayName: "Synthetisches Demo-Profil",
    locale: "de",
    createdAt: "2026-01-08T09:00:00Z",
    consent: {
      scope: "long-term-progress",
      version: "2026-10-24",
      grantedAt: "2026-01-08T09:00:00Z",
      retentionUntil: "2027-01-08T09:00:00Z",
    },
    totalTakes: 24,
    eligibleTakes: 20,
    firstRecordedAt: recordedAt(0),
    lastRecordedAt: recordedAt(23),
  },
  range: {
    from: null,
    to: null,
    window: "all",
    presentationMode: null,
  },
  metricDefinitions: DEFINITIONS,
  series: SERIES,
  highlights: [
    {
      kind: "goal_on_track",
      metricId: "speech.filler_rate_per_100_words",
      takeId: null,
      sequence: null,
      textKey: "progress.goal.on_track",
      params: { metric: "speech.filler_rate_per_100_words" },
    },
    {
      kind: "change_point",
      metricId: "speech.filler_rate_per_100_words",
      takeId: "demo-take-13",
      sequence: 13,
      textKey: "progress.change.step_down",
      params: { metric: "speech.filler_rate_per_100_words" },
    },
    {
      kind: "trend_down",
      metricId: "speech.filler_rate_per_100_words",
      takeId: "demo-take-20",
      sequence: 20,
      textKey: "progress.trend.down",
      params: { metric: "speech.filler_rate_per_100_words" },
    },
    {
      kind: "trend_down",
      metricId: "content.contradiction_rate",
      takeId: "demo-take-20",
      sequence: 20,
      textKey: "progress.trend.down",
      params: { metric: "content.contradiction_rate" },
    },
    {
      kind: "quality_warning",
      metricId: "pose.posture_share",
      takeId: null,
      sequence: null,
      textKey: "progress.quality.partial",
      params: { metric: "pose.posture_share" },
    },
  ],
  limitations: [
    {
      code: "heuristic-metrics",
      message:
        "Die Metriken sind Prototyp-Heuristiken; es gibt keine Genauigkeits- oder Wirksamkeitszusage.",
    },
    {
      code: "missing-is-unknown",
      message:
        "Fehlende oder ausgeschlossene Punkte sind unbekannt, nicht 0 und nicht 'gut'.",
    },
    {
      code: "change-not-causal",
      message:
        "Change-Points beschreiben beobachtete Niveauänderungen, keine Ursachen.",
    },
    {
      code: "no-score",
      message:
        "Kein Gesamtscore, keine Note, kein Ranking und kein Vergleich mit anderen Personen.",
    },
    {
      code: "synthetic-demo",
      message:
        "Synthetische Demo-Daten: 24 erfundene Aufnahmen. Keine echte Aufnahme, keine ASR- oder Genauigkeitsvalidierung.",
    },
  ],
};
