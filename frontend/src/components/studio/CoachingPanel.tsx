"use client";
import {
  Activity,
  Check,
  ChevronRight,
  Hand,
  Lightbulb,
  Minus,
  Waves,
} from "lucide-react";
import { useCoachSession } from "@/features/coach/useCoachSession";
import type { Observation } from "@/features/coach/contracts";
import { currentObservation } from "@/features/coach/reducer";
const labels: Record<string, string> = {
  steady: "Steady",
  repeated_sway: "Repeated sway",
  varied: "Varied",
  limited: "Limited variation",
  visible: "Visible",
  limited_view: "Limited view",
};
function Metric({
  label,
  observation,
  unit,
}: {
  label: string;
  observation: Observation<string | number>;
  unit?: string;
}) {
  const available = observation.value !== null;
  return (
    <div
      className={`metric ${observation.quality !== "good" ? "limited" : ""}`}
    >
      <span>{label}</span>
      <strong>
        {available
          ? (labels[String(observation.value)] ?? observation.value)
          : "Not enough data"}
        {available && unit && <small> {unit}</small>}
      </strong>
      <small>
        {observation.reason ??
          (observation.quality === "good"
            ? "Sample observation"
            : "Waiting for sample data")}
      </small>
    </div>
  );
}
export function CoachingPanel() {
  const { state } = useCoachSession();
  const gestures = currentObservation(state, "gestures");
  if (state.config.mode === "simulation" && state.phase !== "review")
    return (
      <aside className="panel quiet-coach">
        <span className="quiet-icon">
          <TargetIcon />
        </span>
        <h2>You have the floor.</h2>
        <p>
          Simulation mode keeps feedback quiet while you present. Your
          observations will be waiting in the review.
        </p>
        <span className="small muted">The timer stays visible.</span>
      </aside>
    );
  return (
    <aside className="coaching-column">
      <section className="cue-panel">
        <div className="panel-title-row">
          <h2>
            <Lightbulb size={18} /> Your coach
          </h2>
          <span className="small">One step at a time</span>
        </div>
        <div aria-live="polite" aria-atomic="true">
          <p className="cue-message">
            {state.activeCue?.message ??
              (state.phase === "preflight"
                ? "Start with the problem. Give your audience a reason to care."
                : "Keep going. Give each idea a little room.")}
          </p>
        </div>
        <span className="cue-caption">
          {state.activeCue ? "From the prepared sample" : "Practice guidance"}
        </span>
      </section>
      <section className="panel observations">
        <div className="panel-title-row">
          <h2>
            <Activity size={17} /> Delivery
          </h2>
          <span className="small muted">Simulated</span>
        </div>
        <div className="metric-grid">
          <Metric
            label="Speaking pace"
            observation={currentObservation(state, "paceWpm")}
            unit="wpm"
          />
          <Metric
            label="Filler words"
            observation={currentObservation(state, "fillerCount")}
          />
          <Metric
            label="Posture"
            observation={currentObservation(state, "posture")}
          />
          <Metric
            label="Vocal variation"
            observation={currentObservation(state, "vocalVariation")}
          />
        </div>
        <details className="secondary-metrics">
          <summary>Gestures &amp; story coverage</summary>
          <div className="gesture-row">
            <Hand size={17} />
            <div>
              <strong>Gestures</strong>
              <p>
                {gestures.value === null
                  ? "Not enough data"
                  : labels[gestures.value]}
              </p>
              {gestures.reason && <small>{gestures.reason}</small>}
            </div>
          </div>
          <div className="coverage">
            <h3>Story checkpoints</h3>
            {["Problem", "Solution", "Evidence", "Next step"].map((item) => (
              <div
                key={item}
                className={state.coverage.includes(item) ? "covered" : ""}
              >
                {state.coverage.includes(item) ? (
                  <Check size={16} />
                ) : (
                  <Minus size={16} />
                )}
                <span>{item}</span>
                <span>
                  {state.coverage.includes(item) ? "Mentioned" : "Not yet"}
                </span>
              </div>
            ))}
          </div>
        </details>
      </section>
      <details className="previous-cues">
        <summary>
          View earlier feedback <ChevronRight size={15} />
        </summary>
        {state.cues.length ? (
          state.cues.map((c) => <p key={c.id}>{c.message}</p>)
        ) : (
          <p>No sample cues yet.</p>
        )}
      </details>
    </aside>
  );
}
function TargetIcon() {
  return <Waves size={24} />;
}
