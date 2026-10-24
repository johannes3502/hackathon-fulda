"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  Calendar,
  FileText,
  LineChart,
  Play,
  TrendingUp,
  Video,
} from "lucide-react";
import "@fontsource-variable/open-sans";
import { AppShell } from "@/components/shared/AppShell";
import { StatsRing } from "./StatsRing";
import { PresentationIntro } from "./PresentationIntro";
import {
  DEMO_STATS,
  MONTHLY_STATS,
  STAT_LABELS,
  metricValue,
  summarizeMonthlyProgress,
  summarizeStats,
  type MonthlyStatsEntry,
  type PresentationStats,
  type StatMetricKey,
} from "./stats";
import "./stats-card.css";

const METRIC_OPTIONS: { key: StatMetricKey; label: string }[] = [
  { key: "overall", label: "Gesamt" },
  { key: "gesture", label: STAT_LABELS.gesture },
  { key: "knowledge", label: STAT_LABELS.knowledge },
  { key: "flow", label: STAT_LABELS.flow },
  { key: "structure", label: STAT_LABELS.structure },
];

export function StatsCard({
  stats,
  demo = false,
}: {
  stats: PresentationStats;
  demo?: boolean;
}) {
  const card = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(1);
  const overall = summarizeStats(stats);
  const signature = JSON.stringify(stats);

  useEffect(() => {
    const element = card.current;
    if (!element) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let start: number | undefined;
    const tick = (now: number) => {
      start ??= now;
      const fraction = Math.min((now - start) / 1500, 1);
      setProgress(1 - Math.pow(1 - fraction, 3));
      if (fraction < 1) frame = requestAnimationFrame(tick);
    };
    const stop = () => {
      if (motion.matches) {
        cancelAnimationFrame(frame);
        setProgress(1);
      }
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect();
          if (!motion.matches) frame = requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(element);
    motion.addEventListener("change", stop);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      motion.removeEventListener("change", stop);
    };
  }, [signature]);

  return (
    <article
      className="stats418-card"
      ref={card}
      lang="de"
      aria-label={
        demo ? "Deine Stats – Demo mit synthetischen Werten" : "Deine Stats"
      }
    >
      <div
        className="stats418-overall"
        role="img"
        aria-label={
          overall === null
            ? "Gesamtwertung nicht verfügbar"
            : `Gesamtwertung ${overall} Prozent, gleich gewichteter Durchschnitt`
        }
      >
        <StatsRing value={overall === null ? 0 : overall * progress} />
        <div className="stats418-overall-text" aria-hidden="true">
          <span className="stats418-eyebrow">Gesamt</span>
          <span className="stats418-total">
            {overall === null ? "–" : Math.round(overall * progress)}
            <span>%</span>
          </span>
          <span className="stats418-ring-caption">von 100</span>
        </div>
      </div>
      <div className="stats418-heading">
        <span className="stats418-brand" aria-hidden="true">
          418
        </span>
        <h2>Dein Auftritt.</h2>
        <p>Vier Stärken. Ein Gesamtbild.</p>
      </div>
      <dl className="stats418-grid">
        {Object.entries(STAT_LABELS).map(([key, label], index) => {
          const value = stats[key as keyof PresentationStats];
          const valid = Number.isFinite(value) && value >= 1 && value <= 100;
          const animated = valid ? Math.round(value * progress) : null;
          return (
            <div className="stats418-stat" key={key}>
              <dt>
                <span aria-hidden="true">0{index + 1}</span>
                {label}
              </dt>
              <dd aria-label={valid ? `${value} Prozent` : "Nicht verfügbar"}>
                <span aria-hidden="true">
                  {animated ?? "–"}
                  <small>%</small>
                </span>
              </dd>
              <div className="stats418-bar" aria-hidden="true">
                <span
                  style={
                    {
                      "--fill": valid ? (value * progress) / 100 : 0,
                    } as CSSProperties
                  }
                />
              </div>
            </div>
          );
        })}
      </dl>
      <footer className="stats418-footnote">
        <p>Gesamt = Durchschnitt der vier Kriterien.</p>
        {demo && (
          <span className="stats418-demo">
            <i aria-hidden="true" />
            Demo · synthetische Werte
          </span>
        )}
        {demo && (
          <Link className="stats418-review-link" href="/review-preview">
            Analyse-Beispiel ansehen ↗
          </Link>
        )}
      </footer>
    </article>
  );
}

export function DemoStatsCard() {
  return <StatsCard stats={DEMO_STATS} demo />;
}

export function MonthlyProgressChart({
  entries = MONTHLY_STATS,
}: {
  entries?: MonthlyStatsEntry[];
}) {
  const [metric, setMetric] = useState<StatMetricKey>("overall");
  const [selectedId, setSelectedId] = useState<string>(
    entries.at(-1)?.id ?? "",
  );
  const gradientId = useId().replaceAll(":", "");
  const summary = summarizeMonthlyProgress(entries, metric);
  const selected =
    summary.points.find((point) => point.id === selectedId) ??
    summary.points.at(-1);

  const width = 680;
  const height = 220;
  const left = 48;
  const right = 656;
  const plotLeft = 72;
  const plotRight = 640;
  const top = 26;
  const bottom = 178;
  const minVal = 50;
  const maxVal = 100;

  const xAt = (index: number) =>
    summary.points.length <= 1
      ? (plotLeft + plotRight) / 2
      : plotLeft +
        (index / (summary.points.length - 1)) * (plotRight - plotLeft);
  const yAt = (value: number) =>
    bottom -
    ((Math.min(maxVal, Math.max(minVal, value)) - minVal) / (maxVal - minVal)) *
      (bottom - top);

  const linePath = summary.points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"}${xAt(index)},${yAt(point.value)}`,
    )
    .join(" ");
  const areaPath =
    summary.points.length > 0
      ? `${linePath} L${xAt(summary.points.length - 1)},${bottom} L${xAt(0)},${bottom} Z`
      : "";

  return (
    <section
      className="stats418-chart-card stats418-monthly-card"
      aria-label="Fortschritt über Monate"
    >
      <div className="stats418-chart-header">
        <div>
          <span className="stats418-section-eyebrow">
            <TrendingUp size={14} /> Zeitverlauf (6 Monate)
          </span>
          <h2>Fortschritt über Monate</h2>
          <p>
            Entwicklung von Mai bis Oktober 2026 · Kriterium wählen oder Monat
            anklicken
          </p>
        </div>
        <div className="stats418-delta-badges">
          {summary.totalDelta !== null && (
            <span className="stats418-delta-pill positive">
              {summary.totalDelta >= 0
                ? `+${summary.totalDelta}`
                : summary.totalDelta}{" "}
              % seit Mai
            </span>
          )}
          {summary.monthDelta !== null && (
            <span className="stats418-delta-pill">
              {summary.monthDelta >= 0
                ? `+${summary.monthDelta}`
                : summary.monthDelta}{" "}
              % zum Vormonat
            </span>
          )}
        </div>
      </div>

      <div
        className="stats418-metric-tabs"
        role="group"
        aria-label="Kriterium für den Monatsverlauf"
      >
        {METRIC_OPTIONS.map((option) => {
          const latestVal = entries.at(-1)
            ? metricValue(entries.at(-1)!.stats, option.key)
            : null;
          return (
            <button
              key={option.key}
              type="button"
              className={`stats418-metric-tab${metric === option.key ? " active" : ""}`}
              aria-pressed={metric === option.key}
              onClick={() => setMetric(option.key)}
            >
              <span>{option.label}</span>
              {latestVal !== null && <strong>{latestVal}%</strong>}
            </button>
          );
        })}
      </div>

      <div className="stats418-svg-wrap">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Monatlicher Fortschritt (${METRIC_OPTIONS.find((m) => m.key === metric)?.label ?? "Gesamt"}) von ${summary.startValue ?? 0} Prozent im Mai auf ${summary.currentValue ?? 0} Prozent im Oktober`}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.26" />
              <stop
                offset="100%"
                stopColor="var(--primary)"
                stopOpacity="0.02"
              />
            </linearGradient>
          </defs>
          {[50, 65, 80, 95].map((gridVal) => (
            <g key={gridVal}>
              <line
                x1={left}
                x2={right}
                y1={yAt(gridVal)}
                y2={yAt(gridVal)}
                stroke="var(--border)"
                strokeDasharray={gridVal === 50 ? undefined : "4 5"}
              />
              <text
                x={left - 10}
                y={yAt(gridVal) + 4}
                textAnchor="end"
                className="stats418-axis-label"
              >
                {gridVal}%
              </text>
            </g>
          ))}
          {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {summary.points.map((point, index) => {
            const cx = xAt(index);
            const cy = yAt(point.value);
            const isSelected = selected?.id === point.id;
            return (
              <g key={point.id}>
                {isSelected && (
                  <line
                    x1={cx}
                    x2={cx}
                    y1={top}
                    y2={bottom}
                    stroke="var(--primary)"
                    strokeDasharray="3 4"
                    strokeOpacity="0.45"
                  />
                )}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isSelected ? 6.5 : 4.5}
                  fill={isSelected ? "var(--primary)" : "var(--surface)"}
                  stroke="var(--primary)"
                  strokeWidth="2.5"
                />
                <text
                  x={cx}
                  y={cy - 11}
                  textAnchor="middle"
                  className={`stats418-point-label${isSelected ? " active" : ""}`}
                >
                  {point.value}%
                </text>
                <text
                  x={cx}
                  y={bottom + 24}
                  textAnchor="middle"
                  className={`stats418-axis-month${isSelected ? " active" : ""}`}
                >
                  {point.month}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div
        className="stats418-month-picker"
        role="group"
        aria-label="Monatsdetails auswählen"
      >
        {summary.points.map((point) => (
          <button
            key={point.id}
            type="button"
            className={`stats418-month-btn${selected?.id === point.id ? " active" : ""}`}
            aria-pressed={selected?.id === point.id}
            onClick={() => setSelectedId(point.id)}
          >
            <span>{point.month}</span>
            <strong>{point.value}%</strong>
          </button>
        ))}
      </div>

      {selected && (
        <div className="stats418-month-detail" aria-live="polite">
          <div className="stats418-month-detail-head">
            <strong>
              <Calendar size={14} /> {selected.fullMonth}
            </strong>
            <span>
              {selected.sessions} Sessions · {selected.durationMinutes} Min.
              Training
            </span>
          </div>
          <div className="stats418-month-detail-metrics">
            <span>
              Gesamt: <strong>{summarizeStats(selected.stats)}%</strong>
            </span>
            <span>
              Gestik: <strong>{selected.stats.gesture}%</strong>
            </span>
            <span>
              Fachwissen: <strong>{selected.stats.knowledge}%</strong>
            </span>
            <span>
              Flow: <strong>{selected.stats.flow}%</strong>
            </span>
            <span>
              Struktur: <strong>{selected.stats.structure}%</strong>
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

export function CriteriaComparisonChart({
  entries = MONTHLY_STATS,
}: {
  entries?: MonthlyStatsEntry[];
}) {
  const first = entries[0];
  const prev = entries.length >= 2 ? entries.at(-2) : entries[0];
  const current = entries.at(-1);
  if (!first || !prev || !current) return null;

  return (
    <section
      className="stats418-chart-card"
      aria-label="Kriterien im Monatsvergleich"
    >
      <div className="stats418-chart-header">
        <div>
          <span className="stats418-section-eyebrow">
            <BarChart3 size={14} /> Kriterien-Vergleich
          </span>
          <h2>Stärken im Monatsvergleich</h2>
          <p>
            Startwert ({first.month}) vs. Vormonat ({prev.month}) vs. Aktuell (
            {current.month})
          </p>
        </div>
      </div>

      <div className="stats418-comparison-list">
        {Object.entries(STAT_LABELS).map(([key, label], index) => {
          const k = key as keyof PresentationStats;
          const startVal = first.stats[k];
          const prevVal = prev.stats[k];
          const currVal = current.stats[k];
          const delta = currVal - startVal;
          return (
            <div className="stats418-comparison-row" key={key}>
              <div className="stats418-comparison-meta">
                <span>
                  <small>0{index + 1}</small> <strong>{label}</strong>
                </span>
                <span className="stats418-comparison-values">
                  <small className="muted">
                    {first.month} {startVal}% · {prev.month} {prevVal}%
                  </small>
                  <strong>{currVal}%</strong>
                  <em className="stats418-delta-inline">
                    {delta >= 0 ? `+${delta}` : delta}%
                  </em>
                </span>
              </div>
              <div
                className="stats418-comparison-bars"
                role="img"
                aria-label={`${label}: ${first.month} ${startVal} Prozent, ${prev.month} ${prevVal} Prozent, ${current.month} ${currVal} Prozent`}
              >
                <div className="stats418-bar-row">
                  <span>{first.month}</span>
                  <div className="stats418-bar-track">
                    <i
                      className="bar-start"
                      style={{ width: `${startVal}%` }}
                    />
                  </div>
                </div>
                <div className="stats418-bar-row">
                  <span>{prev.month}</span>
                  <div className="stats418-bar-track">
                    <i className="bar-prev" style={{ width: `${prevVal}%` }} />
                  </div>
                </div>
                <div className="stats418-bar-row">
                  <span>{current.month}</span>
                  <div className="stats418-bar-track">
                    <i
                      className="bar-current"
                      style={{ width: `${currVal}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function MonthlyActivityChart({
  entries = MONTHLY_STATS,
}: {
  entries?: MonthlyStatsEntry[];
}) {
  const maxSessions = Math.max(...entries.map((e) => e.sessions), 1);
  const totalSessions = entries.reduce((sum, e) => sum + e.sessions, 0);
  const totalMinutes = entries.reduce((sum, e) => sum + e.durationMinutes, 0);

  return (
    <section
      className="stats418-chart-card"
      aria-label="Übungsaktivität pro Monat"
    >
      <div className="stats418-chart-header">
        <div>
          <span className="stats418-section-eyebrow">
            <Calendar size={14} /> Trainingsvolumen
          </span>
          <h2>Sessions & Feedback-Momente</h2>
          <p>
            {totalSessions} Übungs-Takes ({totalMinutes} Min.) über 6 Monate
          </p>
        </div>
      </div>

      <div
        className="stats418-activity-columns"
        role="img"
        aria-label="Säulendiagramm der monatlichen Übungs-Sessions von Mai bis Oktober"
      >
        {entries.map((entry) => {
          const heightPct = Math.round((entry.sessions / maxSessions) * 100);
          const totalMoments =
            entry.moments.positive +
            entry.moments.attention +
            entry.moments.note;
          const positivePct = Math.round(
            (entry.moments.positive / Math.max(1, totalMoments)) * 100,
          );
          return (
            <div className="stats418-activity-col" key={entry.id}>
              <span className="stats418-activity-count">
                {entry.sessions}
                <small>Takes</small>
              </span>
              <div className="stats418-activity-bar-wrap">
                <div
                  className="stats418-activity-bar"
                  style={{ height: `${Math.max(16, heightPct)}%` }}
                  title={`${entry.fullMonth}: ${entry.sessions} Sessions (${entry.durationMinutes} Min.)`}
                />
              </div>
              <strong className="stats418-activity-month">{entry.month}</strong>
              <span className="stats418-activity-min">
                {entry.durationMinutes} Min.
              </span>
              <span className="stats418-activity-positive">
                {positivePct}% ✓
              </span>
            </div>
          );
        })}
      </div>

      <div className="stats418-activity-footer">
        <span>
          <i className="dot-primary" aria-hidden="true" /> Sessions pro Monat
        </span>
        <span>
          <strong>✓</strong> Anteil gelungener Momente im Review
        </span>
      </div>
    </section>
  );
}

export function StatsPreview() {
  const [replay, setReplay] = useState(0);
  const summary = summarizeMonthlyProgress(MONTHLY_STATS, "overall");

  return (
    <AppShell experience="live">
      <div className="stats418-preview" lang="de">
        <div className="stats418-dashboard">
          <PresentationIntro />
          <section
            className="stats418-hero"
            aria-label="Aktuelle Präsentations-Stats"
          >
            <div className="stats418-hero-card-col">
              <DemoStatsCard key={replay} />
              <button
                type="button"
                className="stats418-replay"
                onClick={() => setReplay((value) => value + 1)}
              >
                <span aria-hidden="true">↻</span> Animation wiederholen
              </button>
            </div>

            <div className="stats418-hero-info">
              <span className="stats418-section-eyebrow">
                <BarChart3 size={14} /> Startseite · Aktuelle Stats
              </span>
              <h2>Deine Präsentations-Stats im Überblick.</h2>
              <p>
                So könnte dein Fortschritt aussehen: Entdecke die vier Kriterien
                und den Verlauf über sechs Monate anhand synthetischer
                Beispieldaten. Die Werte stammen nicht aus deinen eigenen
                Aufnahmen.
              </p>

              <dl className="stats418-kpi-grid">
                <div className="stats418-kpi">
                  <dt>Aktueller Gesamtstand</dt>
                  <dd>{summary.currentValue ?? 82}%</dd>
                  <small>+{summary.monthDelta ?? 3}% gegenüber September</small>
                </div>
                <div className="stats418-kpi">
                  <dt>Fortschritt (6 Monate)</dt>
                  <dd>+{summary.totalDelta ?? 18}%</dd>
                  <small>
                    von {summary.startValue ?? 64}% im Mai auf{" "}
                    {summary.currentValue ?? 82}%
                  </small>
                </div>
                <div className="stats418-kpi">
                  <dt>Übungs-Sessions</dt>
                  <dd>{summary.totalSessions}</dd>
                  <small>12 Präsentationen im Oktober</small>
                </div>
                <div className="stats418-kpi">
                  <dt>Trainingszeit</dt>
                  <dd>{summary.totalMinutes} Min.</dd>
                  <small>58 Minuten im aktuellen Monat</small>
                </div>
              </dl>

              <div className="stats418-hero-actions">
                <Link href="/live" className="button button-primary">
                  <Video size={17} />
                  Live-Aufnahme starten
                </Link>
                <Link href="/review-preview" className="button button-outline">
                  <LineChart size={16} />
                  Analyse-Beispiel
                </Link>
                <Link href="/sources" className="button button-outline">
                  <FileText size={16} />
                  Quellen
                </Link>
                <Link href="/demo" className="button button-outline">
                  <Play size={16} />
                  Sample Demo
                </Link>
              </div>

              <p className="stats418-prototype-note">
                <span>Demo · synthetische Verlaufsdaten</span> — In unserem
                Prototyp dienen diese Kennzahlen und Monatsdiagramme als
                Vorschau ohne Benotung echter Personen.
                <Link href="/gestures">
                  Gesten-Walkthrough ansehen <ArrowUpRight size={13} />
                </Link>
              </p>
            </div>
          </section>

          <div className="stats418-charts-grid">
            <MonthlyProgressChart />
            <div className="stats418-charts-two-col">
              <CriteriaComparisonChart />
              <MonthlyActivityChart />
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
