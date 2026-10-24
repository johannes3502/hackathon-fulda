import type { PoseEvent } from "@/features/pose/evaluation";

export function PoseEvidence({ event }: { event?: PoseEvent }) {
  if (!event) return null;
  const p = event.payload;
  return (
    <details className="pose-evidence">
      <summary>How was this observed?</summary>
      <p>
        {p.rule === "torso_lean"
          ? "Sideways change from your neutral torso angle"
          : p.rule === "hand_raised"
            ? "Wrist height above its shoulder"
            : "Distance between wrists"}
        : {p.measurement.toFixed(2)} {p.unit}.
      </p>
      <p>
        Prototype trigger: {p.threshold.toFixed(2)} {p.unit}. Neutral reference:{" "}
        {p.baseline.toFixed(2)} {p.unit}. Confirmed after{" "}
        {((p.confirmed_at_ms - event.t_ms) / 1000).toFixed(1)} seconds of
        continuous evidence.
      </p>
      <p>
        Only visible landmarks count. Missing frames break the observation. This
        image-based heuristic cannot establish intent, eye contact, emotion or
        presentation quality.
      </p>
      <span className="field-hint">
        {p.rule_version} · local browser processing
      </span>
    </details>
  );
}
