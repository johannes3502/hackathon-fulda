"use client";

import {
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { MetricSeries, ProgressPoint } from "./contract";
import { formatAxisValue, formatDate, formatValue, modeLabel } from "./format";

type PlotPoint = ProgressPoint & { x: number; y: number; value: number };

function extent(points: ProgressPoint[], series: MetricSeries) {
  const values = points
    .map((point) => point.value)
    .filter((value): value is number => value != null)
    .concat(
      series.baseline?.value != null ? [series.baseline.value] : [],
    );
  if (!values.length) return { min: 0, max: 1, zeroBased: true };
  const zeroBased =
    series.unit === "ratio" ||
    series.unit === "per100w" ||
    series.unit === "perMin" ||
    series.unit === "count";
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (zeroBased) {
    return { min: 0, max: Math.max(max * 1.14, 0.1), zeroBased };
  }
  const spread = Math.max(max - min, max * 0.05, 0.001);
  return {
    min: Math.max(0, min - spread * 0.2),
    max: max + spread * 0.2,
    zeroBased,
  };
}

function sequences(points: ProgressPoint[]) {
  const first = points[0]?.sequence ?? 1;
  const last = points.at(-1)?.sequence ?? first;
  return { first, last, span: Math.max(1, last - first) };
}

function position(
  sequence: number,
  value: number,
  range: { min: number; max: number },
  xRange: { first: number; span: number },
) {
  const x = ((sequence - xRange.first) / xRange.span) * 100;
  const y = valueY(value, range);
  return { x: Math.max(0, Math.min(100, x)), y };
}

function valueY(value: number, range: { min: number; max: number }) {
  return Math.max(
    0,
    Math.min(100, (1 - (value - range.min) / (range.max - range.min)) * 100),
  );
}

function usePlotPoints(points: ProgressPoint[], series: MetricSeries) {
  return useMemo(() => {
    const range = extent(points, series);
    const xRange = sequences(points);
    const plotted = points
      .filter(
        (point): point is ProgressPoint & { value: number } =>
          point.value != null,
      )
      .map((point) => {
        const { x, y } = position(point.sequence, point.value, range, xRange);
        return { ...point, x, y, value: point.value };
      });
    return { range, xRange, plotted };
  }, [points, series]);
}

function segments(points: PlotPoint[], breakOnVersion: boolean) {
  const result: PlotPoint[][] = [];
  let current: PlotPoint[] = [];
  for (const point of points) {
    const previous = current.at(-1);
    const contiguous =
      previous &&
      point.sequence === previous.sequence + 1 &&
      (!breakOnVersion ||
        point.context.ruleVersions.join("|") ===
          previous.context.ruleVersions.join("|"));
    if (point.eligible && (!previous || contiguous)) {
      current.push(point);
    } else {
      if (current.length > 1) result.push(current);
      current = point.eligible ? [point] : [];
    }
  }
  if (current.length > 1) result.push(current);
  return result;
}

function toPath(points: PlotPoint[]) {
  return points
    .map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`)
    .join(" ");
}

export function Sparkline({ series }: { series: MetricSeries }) {
  const id = useId();
  const points = series.points;
  const { range, xRange, plotted } = usePlotPoints(points, series);
  const lineSegments = segments(plotted, series.quality.versionBreak);
  const baseline =
    series.baseline?.value != null
      ? valueY(series.baseline.value, range)
      : null;
  const xFor = (sequence: number) =>
    Math.max(
      0,
      Math.min(100, ((sequence - xRange.first) / xRange.span) * 100),
    );
  const changeSequences = series.changePoints
    .filter((change) => change.sequence >= xRange.first)
    .map((change) => xFor(change.sequence));
  const excludedPoints = plotted.filter((point) => !point.eligible);
  const missingPoints = points.filter((point) => point.value == null);
  return (
    <span className="progress-sparkline-stack" aria-hidden="true">
      <svg
        className="progress-sparkline"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id={`spark-${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {baseline != null && (
          <line
            x1="0"
            x2="100"
            y1={baseline}
            y2={baseline}
            className="progress-sparkline-baseline"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {changeSequences.map((x, index) => (
          <line
            key={index}
            x1={x}
            x2={x}
            y1="0"
            y2="100"
            className="progress-sparkline-change"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {lineSegments.map((segment, index) => {
          const path = toPath(segment);
          const last = segment.at(-1);
          return (
            <g key={index}>
              <path
                d={`${path} L ${last?.x} 100 L ${segment[0].x} 100 Z`}
                fill={`url(#spark-${id})`}
                stroke="none"
                opacity="0.55"
              />
              <path
                d={path}
                fill="none"
                className="progress-sparkline-line"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          );
        })}
      </svg>
      {excludedPoints.map((point) => (
        <span
          key={point.takeId}
          className="progress-sparkline-excluded"
          style={{ left: `${point.x}%`, top: `${point.y}%` }}
        />
      ))}
      {missingPoints.map((point) => (
        <span
          key={point.takeId}
          className="progress-sparkline-gap"
          style={{ left: `${xFor(point.sequence)}%` }}
        >
          ×
        </span>
      ))}
    </span>
  );
}

export function MetricChart({
  series,
  selectedTakeId,
  onSelect,
  showExcluded,
}: {
  series: MetricSeries;
  selectedTakeId: string | null;
  onSelect: (takeId: string) => void;
  showExcluded: boolean;
}) {
  const points = showExcluded
    ? series.points
    : series.points.filter((point) => point.eligible);
  const { range, xRange, plotted } = usePlotPoints(points, series);
  const lineSegments = segments(plotted, series.quality.versionBreak);
  const baseline =
    series.baseline?.value != null
      ? valueY(series.baseline.value, range)
      : null;
  const bandTop =
    series.baseline?.value != null && series.trend.noiseBand != null
      ? valueY(series.baseline.value + series.trend.noiseBand, range)
      : null;
  const bandBottom =
    series.baseline?.value != null && series.trend.noiseBand != null
      ? valueY(series.baseline.value - series.trend.noiseBand, range)
      : null;
  const band =
    bandTop != null && bandBottom != null
      ? { top: Math.min(bandTop, bandBottom), bottom: Math.max(bandTop, bandBottom) }
      : null;
  const changeMarkers = series.changePoints.filter(
    (change) => change.sequence >= xRange.first && change.sequence <= xRange.last,
  );
  const ticks = Array.from({ length: 5 }, (_, index) => {
    const value = range.min + ((range.max - range.min) / 4) * index;
    return {
      value,
      y: (1 - (value - range.min) / (range.max - range.min)) * 100,
    };
  });
  const xTicks = [xRange.first, xRange.last].filter(
    (value, index, all) => all.indexOf(value) === index,
  );
  const midTick = Math.round((xRange.first + xRange.last) / 2);
  if (midTick !== xRange.first && midTick !== xRange.last) xTicks.splice(1, 0, midTick);
  const [hovered, setHovered] = useState<string | null>(null);
  const refs = useRef(new Map<string, HTMLButtonElement>());
  const summary = `${series.label.de}: ${series.quality.eligiblePoints} von ${series.quality.totalPoints} Aufnahmen vergleichbar, Trend ${series.trend.status}.`;

  const move = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, takeId: string) => {
      if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) {
        return;
      }
      event.preventDefault();
      const candidates = plotted.map((point) => point.takeId);
      if (!candidates.length) return;
      const current = Math.max(0, candidates.indexOf(takeId));
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? candidates.length - 1
            : event.key === "ArrowRight"
              ? Math.min(candidates.length - 1, current + 1)
              : Math.max(0, current - 1);
      onSelect(candidates[next]);
      requestAnimationFrame(() => refs.current.get(candidates[next])?.focus());
    },
    [onSelect, plotted],
  );

  return (
    <figure
      className={`progress-chart${changeMarkers.length ? " has-changes" : ""}`}
    >
      <span className="progress-chart-unit" aria-hidden="true">
        {series.label.de}
      </span>
      <div className="progress-chart-axis" aria-hidden="true">
        {ticks.map((tick) => (
          <span
            key={tick.value}
            className="progress-chart-tick"
            style={{ top: `${tick.y}%` }}
          >
            {formatAxisValue(tick.value, series.unit)}
          </span>
        ))}
      </div>
      <div className="progress-chart-main">
        <div
          className="progress-chart-plot"
          role="group"
          aria-label={`${summary} Pfeiltasten wechseln die Aufnahme.`}
        >
          <svg
            className="progress-chart-svg"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
            focusable="false"
          >
            {ticks.map((tick) => (
              <line
                key={tick.value}
                x1="0"
                x2="100"
                y1={tick.y}
                y2={tick.y}
                className="progress-grid-line"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {band && (
              <rect
                x="0"
                y={band.top}
                width="100"
                height={Math.max(0.5, band.bottom - band.top)}
                className="progress-noise-band"
              />
            )}
            {baseline != null && (
              <line
                x1="0"
                x2="100"
                y1={baseline}
                y2={baseline}
                className="progress-baseline"
                vectorEffect="non-scaling-stroke"
              />
            )}
            {series.trend.slopePerTake != null &&
              series.baseline?.value != null &&
              ["trend_up", "trend_down", "early_signal"].includes(
                series.trend.status,
              ) && (
                <line
                  x1="0"
                  x2="100"
                  y1={valueY(series.baseline.value, range)}
                  y2={valueY(
                    series.baseline.value +
                      series.trend.slopePerTake * xRange.span,
                    range,
                  )}
                  className="progress-trend-line"
                  vectorEffect="non-scaling-stroke"
                />
              )}
            {lineSegments.map((segment, index) => (
              <path
                key={index}
                d={toPath(segment)}
                fill="none"
                className="progress-series-line"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {changeMarkers.map((change) => {
              const x = ((change.sequence - xRange.first) / xRange.span) * 100;
              return (
                <line
                  key={change.id}
                  x1={x}
                  x2={x}
                  y1="0"
                  y2="100"
                  className="progress-change-line"
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </svg>

          {changeMarkers.map((change) => {
            const x = ((change.sequence - xRange.first) / xRange.span) * 100;
            const edge = x < 8 ? " is-left" : x > 92 ? " is-right" : "";
            return (
              <button
                key={change.id}
                type="button"
                className={`progress-change-flag${edge}`}
                style={{ left: `${x}%` }}
                onClick={() => onSelect(change.takeId)}
                aria-label={`Ab Aufnahme ${change.sequence}: beobachtete Niveauänderung; Details anzeigen`}
              >
                ab #{change.sequence}
              </button>
            );
          })}

          {plotted.map((point) => {
            const selected = point.takeId === selectedTakeId;
            const edge =
              point.x < 15 ? " is-left" : point.x > 85 ? " is-right" : "";
            return (
              <div
                key={point.takeId}
                className={`progress-point-wrap${edge}`}
                style={{ left: `${point.x}%`, top: `${point.y}%` }}
              >
                <button
                  ref={(node) => {
                    if (node) refs.current.set(point.takeId, node);
                    else refs.current.delete(point.takeId);
                  }}
                  type="button"
                  className={`progress-point${point.eligible ? " is-eligible" : " is-excluded"}${
                    selected ? " is-selected" : ""
                  }`}
                  tabIndex={selected || (!selectedTakeId && point === plotted.at(-1)) ? 0 : -1}
                  aria-pressed={selected}
                  aria-label={`Aufnahme ${point.sequence}, ${formatDate(point.recordedAt)}, ${formatValue(point.value, series.unit)}, ${point.eligible ? "vergleichbar" : "nicht vergleichbar"}. ${modeLabel(point.context.presentationMode)}.`}
                  onClick={() => onSelect(point.takeId)}
                  onMouseEnter={() => setHovered(point.takeId)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(point.takeId)}
                  onBlur={() => setHovered(null)}
                  onKeyDown={(event) => move(event, point.takeId)}
                >
                  <span className="progress-point-dot" />
                </button>
                {hovered === point.takeId && (
                  <span className="progress-point-tooltip" role="status">
                    <strong>
                      #{point.sequence} · {formatValue(point.value, series.unit)}
                    </strong>
                    <span>{formatDate(point.recordedAt)}</span>
                    <span>
                      {point.eligible ? "vergleichbar" : "nicht vergleichbar"}
                    </span>
                  </span>
                )}
              </div>
            );
          })}

          {points
            .filter((point) => point.value == null)
            .map((point) => {
              const x = ((point.sequence - xRange.first) / xRange.span) * 100;
              return (
                <div
                  key={point.takeId}
                  className="progress-gap-wrap"
                  style={{ left: `${x}%` }}
                >
                  <button
                    type="button"
                    className="progress-gap"
                    onClick={() => onSelect(point.takeId)}
                    aria-label={`Aufnahme ${point.sequence}, nicht berechenbar; Details anzeigen`}
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </div>
              );
            })}
        </div>
        <div className="progress-chart-x" aria-hidden="true">
          {xTicks.map((sequence) => (
            <span key={sequence} style={{ left: `${((sequence - xRange.first) / xRange.span) * 100}%` }}>
              #{sequence}
              <small>{formatDate(recordedAtFor(points, sequence))}</small>
            </span>
          ))}
        </div>
      </div>
      <figcaption className="visually-hidden">{summary}</figcaption>
    </figure>
  );
}

function recordedAtFor(points: ProgressPoint[], sequence: number) {
  return (
    points.find((point) => point.sequence === sequence)?.recordedAt ??
    new Date().toISOString()
  );
}
