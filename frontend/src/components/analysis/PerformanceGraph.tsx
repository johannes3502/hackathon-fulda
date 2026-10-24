"use client";

import { useId } from "react";
import {
  boundedTime,
  performanceAt,
  timestamp,
  type PerformancePoint,
  type ReviewMoment,
} from "./review-data";

export function PerformanceGraph({
  durationMs,
  points,
  moments,
  positionMs,
  selectedId,
  onSeek,
  onSelect,
}: {
  durationMs: number;
  points: PerformancePoint[];
  moments: ReviewMoment[];
  positionMs: number;
  selectedId?: string;
  onSeek: (tMs: number) => void;
  onSelect: (moment: ReviewMoment) => void;
}) {
  const gradient = useId().replaceAll(":", "");
  const width = 800,
    left = 48,
    right = 780,
    top = 24,
    bottom = 180;
  const x = (t: number) =>
    left +
    (boundedTime(t, durationMs) / Math.max(1, durationMs)) * (right - left);
  const y = (value: number) =>
    bottom - (Math.min(100, Math.max(0, value)) / 100) * (bottom - top);
  const path = points
    .map(
      (point, index) => `${index ? "L" : "M"}${x(point.tMs)},${y(point.value)}`,
    )
    .join(" ");
  const cursorX = x(positionMs);
  return (
    <section
      className="review418-graph-panel"
      aria-label="Performance im Zeitverlauf"
    >
      <div className="review418-panel-title">
        <div>
          <h2>Dein Verlauf</h2>
          <p>
            {points.length
              ? "Gesamt-Performance · markierte Momente anklicken"
              : "Events auf der Zeitachse · noch keine Performance-Werte"}
          </p>
        </div>
        <span className="review418-time">{timestamp(positionMs)}</span>
      </div>
      <div className="review418-chart-scroll">
        <div className="review418-chart">
          <svg
            viewBox={`0 0 ${width} 225`}
            role="img"
            aria-label={
              points.length
                ? "Performance von 0 bis 100 über die Zeit. Die Zeitsteuerung und Moment-Buttons sind per Tastatur bedienbar."
                : "Zeitachse der vorhandenen Events ohne Performance-Bewertung."
            }
            onClick={(event) => {
              const bounds = event.currentTarget.getBoundingClientRect();
              const chartX =
                ((event.clientX - bounds.left) / bounds.width) * width;
              onSeek(
                boundedTime(
                  ((chartX - left) / (right - left)) * durationMs,
                  durationMs,
                ),
              );
            }}
          >
            <defs>
              <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#42ff8c" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#42ff8c" stopOpacity="0.015" />
              </linearGradient>
            </defs>
            <text x={left} y="13" className="review418-axis-title">
              {points.length ? "Performance" : "Momente"}
            </text>
            {[0, 25, 50, 75, 100].map((value) => (
              <g key={value}>
                <line
                  x1={left}
                  x2={right}
                  y1={y(value)}
                  y2={y(value)}
                  stroke="#e7ece8"
                  strokeDasharray={value === 0 ? undefined : "3 5"}
                />
                {points.length > 0 && (
                  <text x="30" y={y(value) + 4} textAnchor="end">
                    {value}
                  </text>
                )}
              </g>
            ))}
            {points.length > 0 && (
              <>
                <path
                  d={`${path} L${x(points[points.length - 1].tMs)},${bottom} L${x(points[0].tMs)},${bottom} Z`}
                  fill={`url(#${gradient})`}
                />
                <path
                  d={path}
                  fill="none"
                  stroke="#17271c"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </>
            )}
            {!points.length && (
              <text x="414" y="95" textAnchor="middle">
                Für diese Aufnahme ist keine Bewertung hinterlegt.
              </text>
            )}
            <line
              x1={cursorX}
              x2={cursorX}
              y1={top}
              y2={bottom}
              stroke="#536659"
              strokeDasharray="4 4"
            />
            {Array.from({ length: 7 }, (_, index) => (
              <text
                key={index}
                x={x((durationMs * index) / 6)}
                y="206"
                textAnchor={
                  index === 0 ? "start" : index === 6 ? "end" : "middle"
                }
              >
                {timestamp((durationMs * index) / 6)}
              </text>
            ))}
            <text
              x={right}
              y="222"
              textAnchor="end"
              className="review418-axis-title"
            >
              Zeit (min:sek)
            </text>
          </svg>
          {moments.map((moment) => (
            <button
              type="button"
              key={moment.id}
              className={`review418-plot-moment ${moment.kind} ${selectedId === moment.id ? "selected" : ""}`}
              style={{
                left: `${(x(moment.tMs) / width) * 100}%`,
                top: `${((points.length ? y(performanceAt(points, moment.tMs) ?? 50) : bottom) / 225) * 100}%`,
              }}
              aria-label={`${timestamp(moment.tMs)} · ${moment.title}`}
              aria-pressed={selectedId === moment.id}
              title={`${timestamp(moment.tMs)} · ${moment.title}`}
              onClick={() => onSelect(moment)}
            >
              {moment.kind === "positive"
                ? "✓"
                : moment.kind === "attention"
                  ? "!"
                  : "i"}
            </button>
          ))}
        </div>
      </div>
      <input
        className="review418-scrubber"
        type="range"
        min="0"
        max={Math.max(1, durationMs)}
        step="100"
        value={boundedTime(positionMs, durationMs)}
        aria-label="Zeitpunkt im Video"
        aria-valuetext={timestamp(positionMs)}
        onChange={(event) => onSeek(Number(event.target.value))}
      />
      <div className="review418-legend">
        <span>
          <i className="positive">✓</i>Gelungen
        </span>
        <span>
          <i className="attention">!</i>Üben
        </span>
        <span>
          <i>i</i>Anmerkung
        </span>
      </div>
    </section>
  );
}
