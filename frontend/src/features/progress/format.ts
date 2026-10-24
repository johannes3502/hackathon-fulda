import type {
  Confidence,
  ExclusionReason,
  GoalStatus,
  MetricSeries,
  MetricUnit,
  PresentationMode,
  ProfileGoal,
  ProgressChangePoint,
  ProgressHighlight,
  ProgressPoint,
  TrendStatus,
} from "./contract";
import { PRESENTATION_MODE_LABEL } from "./contract";

const integerFormat = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 0,
});

export function formatNumber(value: number, digits = 1) {
  return new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(value);
}

export function unitSuffix(unit: MetricUnit) {
  switch (unit) {
    case "ratio":
      return "%";
    case "per100w":
      return "/ 100 Wörter";
    case "perMin":
      return "/ min";
    case "WPM":
      return "WPM";
    case "st":
      return "Halbtöne";
    case "deg":
      return "°";
    case "ms":
      return "ms";
    case "count":
      return "";
    case "dB":
      return "dB";
    default:
      return unit;
  }
}

export function formatValue(
  value: number | null | undefined,
  unit: MetricUnit,
): string {
  if (value == null || !Number.isFinite(value)) return "–";
  if (unit === "ratio") return `${integerFormat.format(value * 100)} %`;
  if (unit === "per100w") return `${formatNumber(value, 1)} / 100`;
  if (unit === "perMin") return `${formatNumber(value, 1)} / min`;
  if (unit === "WPM") return `${integerFormat.format(value)} WPM`;
  if (unit === "st") return `${formatNumber(value, 1)} st`;
  if (unit === "deg") return `${formatNumber(value, 1)}°`;
  if (unit === "count") return integerFormat.format(value);
  return `${formatNumber(value, 2)} ${unitSuffix(unit)}`.trim();
}

export function formatAxisValue(value: number, unit: MetricUnit) {
  if (unit === "ratio") return `${integerFormat.format(value * 100)} %`;
  if (unit === "per100w") return formatNumber(value, 1);
  if (unit === "perMin") return formatNumber(value, 1);
  if (unit === "WPM") return integerFormat.format(value);
  if (unit === "st" || unit === "deg") return formatNumber(value, 1);
  return formatNumber(value, 2);
}

export function formatDelta(
  value: number | null | undefined,
  unit: MetricUnit,
) {
  if (value == null || !Number.isFinite(value)) return null;
  const sign = value > 0 ? "+" : value < 0 ? "−" : "±";
  const absolute = Math.abs(value);
  if (unit === "ratio") return `${sign}${integerFormat.format(absolute * 100)} %-Punkte`;
  if (unit === "per100w") return `${sign}${formatNumber(absolute, 1)} / 100`;
  if (unit === "WPM") return `${sign}${integerFormat.format(absolute)} WPM`;
  if (unit === "perMin") return `${sign}${formatNumber(absolute, 1)} / min`;
  if (unit === "st") return `${sign}${formatNumber(absolute, 1)} st`;
  if (unit === "deg") return `${sign}${formatNumber(absolute, 1)}°`;
  return `${sign}${formatNumber(absolute, 2)}`;
}

export function formatPercent(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "–";
  return `${integerFormat.format(value * 100)} %`;
}

export function formatDate(iso: string, withTime = false) {
  const date = new Date(iso);
  if (Number.isNaN(date.valueOf())) return "Datum unbekannt";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    timeZone: "Europe/Berlin",
  }).format(date);
}

export function formatPeriod(first: string | null, last: string | null) {
  if (!first || !last) return "Noch kein Zeitraum";
  const start = new Date(first);
  const end = new Date(last);
  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf())) {
    return "Zeitraum unbekannt";
  }
  const month = new Intl.DateTimeFormat("de-DE", {
    month: "short",
    timeZone: "Europe/Berlin",
  });
  const year = new Intl.DateTimeFormat("de-DE", {
    year: "numeric",
    timeZone: "Europe/Berlin",
  });
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  if (sameYear) {
    return `${month.format(start)} – ${month.format(end)} ${year.format(end)}`;
  }
  return `${month.format(start)} ${year.format(start)} – ${month.format(end)} ${year.format(end)}`;
}

export const TREND_COPY: Record<
  TrendStatus,
  { label: string; description: string }
> = {
  insufficient: {
    label: "Noch kein Trend",
    description: "Zu wenige vergleichbare Aufnahmen für eine Trendaussage.",
  },
  early_signal: {
    label: "Erste Hinweise",
    description: "Vorläufig; mit mehr Aufnahmen wird die Einschätzung stabiler.",
  },
  stable: {
    label: "Stabil",
    description: "Keine belastbare Veränderung über die verglichenen Aufnahmen.",
  },
  trend_up: {
    label: "Gestiegen",
    description: "Belastbarer Aufwärtstrend; ohne Ziel keine Wertung.",
  },
  trend_down: {
    label: "Gefallen",
    description: "Belastbarer Abwärtstrend; ohne Ziel keine Wertung.",
  },
  unclear: {
    label: "Unklar",
    description: "Datenlage oder Versionen erlauben keine klare Aussage.",
  },
};

export const CONFIDENCE_COPY: Record<Confidence, string> = {
  high: "hohe Datenlage",
  medium: "mittlere Datenlage",
  low: "niedrige Datenlage",
};

export const GOAL_STATUS_COPY: Record<GoalStatus, string> = {
  not_applicable: "Kein Ziel gesetzt",
  unknown: "Zielstatus unklar",
  on_track: "Auf Kurs",
  off_track: "Nicht auf Kurs",
};

const EXCLUSION_COPY: Record<string, string> = {
  "duration-too-short": "Aufnahme kürzer als die Mindestdauer.",
  "no-profile-consent": "Keine Einwilligung für die Langzeitspeicherung.",
  "synthetic-demo": "Synthetische Demo-Aufnahme; nicht als echte Messung gewertet.",
  "pose-coverage-low": "Kameraabdeckung zu niedrig für Pose-Werte.",
  "pose-valid-ratio-low": "Zu wenige gültige Pose-Messungen.",
  "pose-not-evaluable": "Pose war in dieser Aufnahme nicht auswertbar.",
  "pose-valid-ratio-unknown": "Pose-Validität nicht berichtet.",
  "audio-active-low": "Zu wenig aktive Sprache für eine Auswertung.",
  "audio-missing": "Keine Audiodaten vorhanden.",
  "word-count-low": "Zu wenige Wörter für eine Auswertung.",
  "transcript-missing": "Kein Transkript vorhanden.",
  "claims-low": "Zu wenige geprüfte Aussagen.",
  "factcheck-missing": "Kein Quellencheck vorhanden.",
  "device-changed": "Anderes Gerät als in der Vergleichsreihe; Lautstärke nicht vergleichbar.",
  "device-unknown": "Gerät unbekannt; geräteabhängige Werte nicht vergleichbar.",
  "rule-version-break": "Regelversion geändert; Reihe unterbrochen.",
  "metric-version-break": "Metrikversion geändert; Reihe unterbrochen.",
  "metric-not-computable": "Für diese Aufnahme nicht berechenbar.",
  "gesture-measurement-missing": "Keine Gestenmessung vorhanden.",
};

export function exclusionReasonText(reason: ExclusionReason | string) {
  return EXCLUSION_COPY[reason] ?? "Nicht vergleichbar (unbekannter Grund).";
}

export function modeLabel(mode: PresentationMode | null) {
  return mode ? PRESENTATION_MODE_LABEL[mode] : "Typ unbekannt";
}

export function pointStatus(point: ProgressPoint) {
  if (point.value == null) return "Nicht berechenbar";
  if (point.eligible) return "Vergleichbar";
  return "Nicht vergleichbar";
}

export function goalTargetLabel(goal: ProfileGoal, unit: MetricUnit) {
  if (goal.direction === "target_band") {
    return `${formatValue(goal.targetMin, unit)} bis ${formatValue(goal.targetMax, unit)}`;
  }
  return formatValue(goal.targetValue, unit);
}

export function changeKindLabel(kind: ProgressChangePoint["kind"]) {
  switch (kind) {
    case "step_up":
      return "Anstieg";
    case "step_down":
      return "Rückgang";
    case "regression":
      return "Rückschritt";
    case "recovery":
      return "Erholung";
  }
}

export function changeSentence(
  change: ProgressChangePoint,
  series: MetricSeries,
) {
  const from = formatValue(change.fromValue, series.unit);
  const to = formatValue(change.toValue, series.unit);
  const direction =
    change.kind === "step_up"
      ? "höher als zuvor"
      : change.kind === "step_down"
        ? "niedriger als zuvor"
        : change.kind === "regression"
          ? "entgegen dem gesetzten Ziel"
          : "in Richtung des gesetzten Ziels";
  return `Ab Aufnahme ${change.sequence}: ${series.label.de} ${direction} (${from} → ${to}).`;
}

export function highlightSentence(
  highlight: ProgressHighlight,
  series: MetricSeries | undefined,
) {
  const label = series?.label.de ?? highlight.params.metric;
  const unit = series?.unit ?? "ratio";
  switch (highlight.kind) {
    case "goal_on_track": {
      if (!series?.goal) return `${label}: auf Kurs zum eigenen Ziel.`;
      return `${label}: Ziel ${goalTargetLabel(series.goal, unit)} – auf Kurs.`;
    }
    case "goal_off_track": {
      if (!series?.goal) return `${label}: nicht auf Kurs zum eigenen Ziel.`;
      return `${label}: Ziel ${goalTargetLabel(series.goal, unit)} – nicht auf Kurs.`;
    }
    case "trend_up":
      return `${label} ist über die verglichenen Aufnahmen gestiegen.`;
    case "trend_down":
      return `${label} ist über die verglichenen Aufnahmen gefallen.`;
    case "change_point": {
      const change = series?.changePoints.find(
        (item) =>
          item.sequence === highlight.sequence &&
          (highlight.takeId == null || item.takeId === highlight.takeId),
      );
      if (change && series) return changeSentence(change, series);
      return `${label}: beobachtete Niveauänderung ab Aufnahme ${highlight.sequence ?? "?"}.`;
    }
    case "quality_warning":
      return `${label}: Ein Teil der Aufnahmen ist nicht vergleichbar; Lücken bleiben sichtbar.`;
    case "insufficient_data":
      return `${label}: noch zu wenige vergleichbare Aufnahmen für einen Trend.`;
  }
}

export function metricStatusSentence(series: MetricSeries) {
  const trend = TREND_COPY[series.trend.status];
  if (series.trend.status === "insufficient") {
    return trend.description;
  }
  return `${trend.description} ${CONFIDENCE_COPY[series.trend.confidence]}.`;
}

export function formatShortId(id: string) {
  return id.length > 12 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
}
