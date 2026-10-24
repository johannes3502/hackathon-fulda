import type { PoseEvent } from "@/features/pose/evaluation";

export function PoseEvidence({ event }: { event?: PoseEvent }) {
  if (!event) return null;
  const p = event.payload;
  if (
    p.threshold === null ||
    p.measurement === null ||
    p.initial_measurement === null
  )
    return (
      <details className="pose-evidence">
        <summary>How was this observed?</summary>
        <p>
          Same per-frame check as the Pose lab panel, held for{" "}
          {((p.confirmed_at_ms - event.t_ms) / 1000).toFixed(1)} seconds before
          it counted. It uses fixed image geometry, not a neutral reference.
        </p>
        <p>
          Only visible landmarks count. This image-based heuristic cannot
          establish intent, eye contact, emotion or presentation quality.
        </p>
        <span className="field-hint">
          {p.rule_version} · local browser processing
        </span>
      </details>
    );
  return (
    <details className="pose-evidence">
      <summary>How was this observed?</summary>
      <p>
        {p.rule === "torso_lean"
          ? "Sideways change from your neutral torso angle"
          : p.rule === "body_shift"
            ? "Sideways position change from neutral"
            : p.rule === "arms_crossed"
              ? "Wrist crossing past the body midline (the smaller one when both are visible)"
              : p.rule === "hand_raised"
                ? "Wrist height above its shoulder"
                : p.rule === "head_turned"
                  ? "Sideways change of the nose between the ears from neutral"
                  : p.rule === "head_down"
                    ? "Downward change of the nose below the ear line from neutral"
                    : "Distance between wrists"}
        : {p.initial_measurement.toFixed(2)} {p.unit} at confirmation.
      </p>
      <p>
        Prototype trigger: {p.threshold.toFixed(2)} {p.unit}. Neutral reference:{" "}
        {p.baseline === null
          ? "not measured for hands; shoulder geometry used"
          : `${p.baseline.toFixed(2)} ${p.unit}`}
        . Confirmed after {((p.confirmed_at_ms - event.t_ms) / 1000).toFixed(1)}{" "}
        seconds of continuous evidence.
      </p>
      <p>
        Last observed value: {p.measurement.toFixed(2)} {p.unit}. A wider
        release boundary avoids flickering for hand height, hand distance,
        sideways movement and head direction.
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
