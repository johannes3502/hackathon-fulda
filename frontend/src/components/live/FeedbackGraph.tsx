"use client";

import { useId, useMemo, useState } from "react";
import type { LiveFeedback } from "@/features/live/contracts";
import { feedbackGraph } from "@/features/live/feedback-graph";
import { time } from "@/lib/utils";
import "./feedback-graph.css";

export function FeedbackGraph({
  feedback,
  durationMs,
  positionMs,
  selectedId,
  onSelect,
  onSeek,
  language = "en",
}: {
  feedback: LiveFeedback[];
  durationMs: number;
  positionMs: number;
  selectedId?: string;
  onSelect: (item: LiveFeedback) => void;
  onSeek: (tMs: number) => void;
  language?: "en" | "de";
}) {
  const id = useId();
  const graph = useMemo(
    () => feedbackGraph(feedback, durationMs),
    [feedback, durationMs],
  );
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const de = language === "de";
  const clamp = (value: number) =>
    Math.max(0, Math.min(graph.durationMs, Number.isFinite(value) ? value : 0));
  const x = (value: number) =>
    (clamp(value) / Math.max(1, graph.durationMs)) * 1000;
  const y = (value: number) => 120 + (value / graph.extent) * 88;
  const path = graph.samples
    .map(
      (point, index) =>
        `${index ? "L" : "M"}${x(point.tMs)},${y(point.balance)}`,
    )
    .join(" ");
  const signalPath = graph.samples
    .slice(1)
    .map((point, index) => {
      const previous = graph.samples[index];
      return previous.balance || point.balance
        ? `M${x(previous.tMs)},${y(previous.balance)} L${x(point.tMs)},${y(point.balance)}`
        : "";
    })
    .join(" ");
  const area = `${path} L1000,120 L0,120 Z`;
  const selected = graph.moments.find(
    (moment) => moment.feedback.id === (hoveredId ?? selectedId),
  );
  const label = (direction: number) =>
    direction > 0
      ? de
        ? "Weiterüben"
        : "Adjustment"
      : direction < 0
        ? de
          ? "Gelungen"
          : "Positive"
        : de
          ? "Beobachtung"
          : "Observation";
  const nearest = (clientX: number, bounds: DOMRect) => {
    const tMs = clamp(
      ((clientX - bounds.left) / bounds.width) * graph.durationMs,
    );
    const moment = graph.moments.reduce<
      (typeof graph.moments)[number] | undefined
    >(
      (best, candidate) =>
        !best || Math.abs(candidate.atMs - tMs) < Math.abs(best.atMs - tMs)
          ? candidate
          : best,
      undefined,
    );
    return { tMs, moment };
  };
  return (
    <section
      className="feedback-graph"
      aria-labelledby={`${id}-title`}
      lang={language}
    >
      <div className="feedback-graph-heading">
        <div>
          <h2 id={`${id}-title`}>
            {de ? "Dein Performance-Verlauf" : "Performance timeline"}
          </h2>
          <p>
            {de
              ? "Momente im Kontext. Ein Klick bringt dich zurück."
              : "See the moment. Jump back into the context."}
          </p>
        </div>
        <span className="feedback-graph-clock">
          {time(clamp(positionMs))} / {time(graph.durationMs)}
        </span>
      </div>
      <p className="feedback-graph-explanation" id={`${id}-description`}>
        {de
          ? "Qualitatives Feedback, kein Score: Gelungene Momente nach oben, Hinweise nach unten. Größere Ausschläge bedeuten mehr gleichzeitige Hinweise. Ohne Feedback bleibt die Leistung unbekannt."
          : "Qualitative feedback, not a score: positive moments rise, adjustments dip. Larger changes mean more concurrent feedback. No feedback means performance is unknown."}
      </p>
      <div className="feedback-graph-layout">
        <div className="feedback-graph-axis" aria-hidden="true">
          <span>{de ? "Gelungen" : "Positive"} ↑</span>
          <span>{de ? "Neutral" : "Neutral"}</span>
          <span>{de ? "Weiterüben" : "Adjust"} ↓</span>
        </div>
        <div className="feedback-graph-main">
          <div
            className="feedback-graph-plot"
            onPointerLeave={() => setHoveredId(null)}
          >
            <svg
              viewBox="0 0 1000 240"
              preserveAspectRatio="none"
              role="img"
              aria-label={
                de
                  ? "Feedback-Verlauf mit neutraler Mittellinie. Zeitmarken und Videoregler folgen unter dem Graphen."
                  : "Feedback over time around a neutral midpoint. Use the timestamp buttons or video position slider below."
              }
              aria-describedby={`${id}-description`}
              onPointerMove={(event) =>
                setHoveredId(
                  nearest(
                    event.clientX,
                    event.currentTarget.getBoundingClientRect(),
                  ).moment?.feedback.id ?? null,
                )
              }
              onClick={(event) => {
                const { tMs, moment } = nearest(
                  event.clientX,
                  event.currentTarget.getBoundingClientRect(),
                );
                if (moment) onSelect(moment.feedback);
                else onSeek(tMs);
              }}
            >
              <defs>
                <clipPath id={`${id}-upper`}>
                  <rect width="1000" height="120" />
                </clipPath>
                <clipPath id={`${id}-lower`}>
                  <rect y="120" width="1000" height="120" />
                </clipPath>
              </defs>
              <rect
                width="1000"
                height="120"
                fill="var(--success)"
                opacity="0.035"
              />
              <rect
                y="120"
                width="1000"
                height="120"
                fill="var(--error)"
                opacity="0.035"
              />
              {[0, 1, 2, 3, 4].map((tick) => (
                <line
                  key={tick}
                  x1={tick * 250}
                  x2={tick * 250}
                  y1="0"
                  y2="240"
                  className="feedback-graph-grid"
                />
              ))}
              <line
                x1="0"
                x2="1000"
                y1="120"
                y2="120"
                className="feedback-graph-baseline"
              />
              <path
                d={area}
                fill="var(--success)"
                opacity="0.16"
                clipPath={`url(#${id}-upper)`}
              />
              <path
                d={area}
                fill="var(--error)"
                opacity="0.16"
                clipPath={`url(#${id}-lower)`}
              />
              <path
                d={signalPath}
                className="feedback-graph-line"
                clipPath={`url(#${id}-upper)`}
                stroke="var(--success)"
              />
              <path
                d={signalPath}
                className="feedback-graph-line"
                clipPath={`url(#${id}-lower)`}
                stroke="var(--error)"
              />
              <line
                x1={x(positionMs)}
                x2={x(positionMs)}
                y1="0"
                y2="240"
                className="feedback-graph-playhead"
              />
            </svg>
            {graph.moments.map((moment) => (
              <i
                key={moment.feedback.id}
                className={`feedback-graph-dot ${moment.direction > 0 ? "attention" : moment.direction < 0 ? "positive" : "neutral"}${selectedId === moment.feedback.id ? " selected" : ""}`}
                style={{
                  left: `${x(moment.atMs) / 10}%`,
                  top: `${y(moment.direction) / 2.4}%`,
                }}
              />
            ))}
            {!graph.moments.length && (
              <span className="feedback-graph-empty">
                {de
                  ? "Noch keine Feedback-Momente"
                  : "No feedback moments in this take"}
              </span>
            )}
          </div>
          <div className="feedback-graph-times" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((tick) => (
              <span key={tick}>{time((graph.durationMs * tick) / 4)}</span>
            ))}
          </div>
          <input
            className="feedback-graph-scrubber"
            type="range"
            min="0"
            max={Math.max(1, graph.durationMs)}
            step="100"
            value={clamp(positionMs)}
            disabled={!graph.durationMs}
            aria-label={de ? "Zeitpunkt im Video" : "Video position"}
            aria-valuetext={time(clamp(positionMs))}
            onChange={(event) => onSeek(Number(event.target.value))}
          />
        </div>
      </div>
      <div className="feedback-graph-selection" aria-live="polite">
        <span>
          {selected
            ? `${time(selected.atMs)} · ${label(selected.direction)}`
            : de
              ? "Zeitachse · min:sek"
              : "Time · min:sec"}
        </span>
        <strong>
          {selected?.feedback.title ??
            (de
              ? "Wähle einen Moment im Graphen."
              : "Choose a moment in the graph.")}
        </strong>
      </div>
      {!!graph.moments.length && (
        <details className="feedback-graph-moments">
          <summary>
            {de
              ? `Alle ${graph.moments.length} Zeitmarken`
              : `All ${graph.moments.length} timestamped moments`}
          </summary>
          <div
            role="group"
            aria-label="Feedback timeline"
            className="feedback-graph-moment-list"
          >
            {graph.moments.map(({ feedback: item, atMs, direction }) => (
              <button
                key={item.id}
                className={`feedback-graph-moment ${direction > 0 ? "attention" : direction < 0 ? "positive" : "neutral"}`}
                aria-label={
                  de
                    ? `${time(atMs)} · ${item.title}`
                    : `Replay ${item.category}: ${item.title} at ${time(atMs)}`
                }
                aria-pressed={selectedId === item.id}
                data-feedback={
                  direction > 0
                    ? "attention"
                    : direction < 0
                      ? "positive"
                      : "neutral"
                }
                onClick={() => onSelect(item)}
              >
                <span className="timeline-time">{time(atMs)}</span>
                <span>{direction > 0 ? "↓" : direction < 0 ? "↑" : "·"}</span>
                <span className="timeline-title">{item.title}</span>
              </button>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
