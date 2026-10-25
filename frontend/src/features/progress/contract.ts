/** `progress.v1` — the read contract produced by backend/app/progress. */

export type PresentationMode = "startup" | "thesis" | "school" | "nonprofit";

export type TrendStatus =
  | "insufficient"
  | "early_signal"
  | "stable"
  | "trend_up"
  | "trend_down"
  | "unclear";

export type GoalStatus =
  | "not_applicable"
  | "unknown"
  | "on_track"
  | "off_track";

export type SuggestedDirection =
  | "increase"
  | "decrease"
  | "target_band"
  | "neutral";

export type Confidence = "low" | "medium" | "high";

export type MetricUnit =
  | "ratio"
  | "WPM"
  | "per100w"
  | "st"
  | "deg"
  | "perMin"
  | "ms"
  | "count"
  | "dB"
  | (string & {});

export type ExclusionReason =
  | "duration-too-short"
  | "no-profile-consent"
  | "synthetic-demo"
  | "pose-coverage-low"
  | "pose-valid-ratio-low"
  | "pose-not-evaluable"
  | "audio-active-low"
  | "audio-missing"
  | "word-count-low"
  | "transcript-missing"
  | "claims-low"
  | "factcheck-missing"
  | "device-changed"
  | "device-unknown"
  | "rule-version-break"
  | "metric-version-break"
  | "metric-not-computable"
  | (string & {});

export interface LocalizedText {
  de: string;
  en: string;
}

export interface ProgressResponse {
  schemaVersion: "progress.v1";
  generatedAt: string;
  profile: ProgressProfile;
  range: ProgressRange;
  metricDefinitions: MetricDefinition[];
  series: MetricSeries[];
  highlights: ProgressHighlight[];
  limitations: ProgressLimitation[];
}

export interface ProfileIdentity {
  profileId: string;
  displayName: string;
  locale: "de" | "en";
  createdAt: string;
  consent: {
    scope: "long-term-progress";
    version: string;
    grantedAt: string;
    retentionUntil: string | null;
  };
}

export interface ProgressProfile extends ProfileIdentity {
  totalTakes: number;
  eligibleTakes: number;
  firstRecordedAt: string | null;
  lastRecordedAt: string | null;
}

export interface ProgressRange {
  from: string | null;
  to: string | null;
  window: "all" | "last_20" | "last_10" | "last_5";
  presentationMode: PresentationMode | null;
}

export interface MetricDefinition {
  metricId: string;
  version: number;
  label: LocalizedText;
  description: LocalizedText;
  unit: MetricUnit;
  valueType:
    | "ratio"
    | "rate"
    | "count"
    | "duration"
    | "level"
    | "angle"
    | "perMin";
  suggestedDirection: SuggestedDirection;
  isPrimary: boolean;
  heuristic: boolean;
  source: "pose" | "speech" | "asr" | "factcheck" | "derived";
  quality: {
    minDurationMs: number;
    minPoseCoverage: number | null;
    minPoseValidRatio?: number | null;
    minAudioActiveRatio: number | null;
    minWordCount: number | null;
    minClaimCount: number | null;
    deviceSensitive: boolean;
  };
}

export interface MetricSeries {
  metricId: string;
  metricVersion: number;
  label: LocalizedText;
  unit: MetricUnit;
  suggestedDirection: SuggestedDirection;
  isPrimary: boolean;
  heuristic: boolean;
  goal: ProfileGoal | null;
  points: ProgressPoint[];
  baseline: ProgressBaseline | null;
  latest: ProgressLatest | null;
  trend: ProgressTrend;
  changePoints: ProgressChangePoint[];
  goalStatus: GoalStatus;
  quality: ProgressSeriesQuality;
  limitations: ProgressLimitation[];
}

export interface ProgressPoint {
  takeId: string;
  sessionId: string;
  recordedAt: string;
  recordedAtSource: "client" | "server";
  sequence: number;
  value: number | null;
  unit: MetricUnit;
  eligible: boolean;
  exclusionReasons: ExclusionReason[];
  quality: {
    poseCoverage: number | null;
    poseValidRatio: number | null;
    audioActiveRatio: number | null;
    wordCount: number | null;
    claimCount: number | null;
    asrProvider: string | null;
    syntheticDemo: boolean;
  };
  context: {
    presentationMode: PresentationMode | null;
    durationMs: number;
    deviceKey: string | null;
    ruleVersions: string[];
  };
}

export interface ProgressBaseline {
  kind:
    | "first_3_eligible"
    | "first_5_eligible"
    | "same_mode_first_3"
    | "rolling_5"
    | "none";
  value: number | null;
  n: number;
  takeIds: string[];
}

export interface ProgressLatest {
  takeId: string;
  recordedAt: string;
  value: number | null;
  changeVsBaseline: number | null;
  relativeChange: number | null;
  zScore: number | null;
  reliableChange: boolean;
}

export interface ProgressTrend {
  status: TrendStatus;
  direction: "up" | "down" | "flat" | "unknown";
  method: string;
  algorithmVersion: string;
  n: number;
  window: {
    fromTakeId: string | null;
    toTakeId: string | null;
    fromRecordedAt: string | null;
    toRecordedAt: string | null;
  };
  slopePerTake: number | null;
  slopePer10Takes: number | null;
  slopeCi95: [number, number] | null;
  relativeChange: number | null;
  effectSize: number | null;
  noiseBand: number | null;
  minimumDetectableChange: number | null;
  mannKendallP: number | null;
  adjustedP: number | null;
  reliableSlope: boolean;
  confidence: Confidence;
}

export interface ProgressChangePoint {
  id: string;
  metricId: string;
  metricVersion: number;
  takeId: string;
  sequence: number;
  recordedAt: string;
  kind: "step_up" | "step_down" | "regression" | "recovery";
  fromValue: number | null;
  toValue: number | null;
  magnitude: number | null;
  confidence: Confidence;
  evidenceTakeIds: string[];
  algorithmVersion: string;
}

export interface ProgressSeriesQuality {
  totalPoints: number;
  eligiblePoints: number;
  excludedPoints: number;
  missingPoints: number;
  versionBreak: boolean;
  ruleVersions: string[];
  status: "good" | "partial" | "poor";
}

export interface ProfileGoal {
  direction: "increase" | "decrease" | "target_band";
  targetValue: number | null;
  targetMin: number | null;
  targetMax: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileGoalRecord extends ProfileGoal {
  metricId: string;
  metricVersion: number;
}

export interface ProgressHighlight {
  kind:
    | "insufficient_data"
    | "trend_up"
    | "trend_down"
    | "goal_on_track"
    | "goal_off_track"
    | "change_point"
    | "quality_warning";
  metricId: string;
  takeId: string | null;
  sequence: number | null;
  textKey: string;
  params: Record<string, string | number>;
}

export interface ProgressLimitation {
  code: string;
  message: string;
}

export const PRESENTATION_MODES: PresentationMode[] = ["school", "thesis"];

export const PRESENTATION_MODE_LABEL: Record<PresentationMode, string> = {
  startup: "Startup-Pitch",
  thesis: "Thesis-Verteidigung",
  school: "Schulvortrag",
  nonprofit: "Nonprofit / Verein",
};

export const WINDOWS = ["last_20", "last_10", "last_5", "all"] as const;
export type ProgressWindow = (typeof WINDOWS)[number];

export const WINDOW_LABEL: Record<ProgressWindow, string> = {
  last_20: "Letzte 20 Aufnahmen",
  last_10: "Letzte 10 Aufnahmen",
  last_5: "Letzte 5 Aufnahmen",
  all: "Alle Aufnahmen",
};
