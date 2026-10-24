import { CROSS_ARMS, crossArmsCheck, passes } from "@/features/pose/cues";
import type { PoseSample } from "@/features/pose/sample";
import { POSE_RULES, type PoseEvaluation } from "@/features/pose/evaluation";
import type { PoseTiming } from "@/features/pose/capture";

const rows = [
  ["cross", "Wrist past midline", `≥ ${CROSS_ARMS.minCross}`, 2],
  [
    "height",
    "Wrist height",
    `${CROSS_ARMS.minWristHeight} … ${CROSS_ARMS.maxWristHeight}`,
    2,
  ],
  ["elbow", "Elbow angle", `≤ ${CROSS_ARMS.maxElbowDeg}°`, 0],
] as const;

export function PoseDebug({
  sample,
  active,
  evaluation,
  timing,
}: {
  sample: PoseSample | null;
  active: boolean;
  evaluation: PoseEvaluation | null;
  timing: PoseTiming;
}) {
  const check = crossArmsCheck(sample);
  const cell = (key: keyof typeof passes, v: number | null, digits: number) =>
    v === null ? (
      <td className="missing">hidden</td>
    ) : (
      <td className={passes[key](v) ? "pass" : "fail"}>{v.toFixed(digits)}</td>
    );
  return (
    <div className="live-pose-debug" aria-label="Pose debug readout">
      <strong>
        Arms:{" "}
        {check.crossed === null
          ? "not visible"
          : check.crossed
            ? "crossed"
            : "open"}
        {active && " · hint on"}
      </strong>
      <table>
        <thead>
          <tr>
            <th />
            <th>L</th>
            <th>R</th>
            <th>needs</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([key, label, needs, digits]) => (
            <tr key={key}>
              <th>{label}</th>
              {cell(key, check[key][0], digits)}
              {cell(key, check[key][1], digits)}
              <td>{needs}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <small>
        Hint after {CROSS_ARMS.holdMs / 1000} s crossed · L/R = your left/right
      </small>
      <hr />
      <p>
        Lean change: {evaluation?.measurements?.leanDelta.toFixed(1) ?? "—"}° /
        trigger {POSE_RULES.leanEnterDeg}°
      </p>
      <p>
        Sideways shift: {evaluation?.measurements?.shiftDelta.toFixed(2) ?? "—"}{" "}
        / trigger {POSE_RULES.shiftEnter} shoulder widths
      </p>
      <small>
        {evaluation?.phase === "ready"
          ? "Shift: hold 0.8 s · lean: hold 1.5 s · camera fixed"
          : "Needs a stable neutral baseline"}
      </small>
      <hr />
      <p>
        Frame latency: {timing.frameMs ?? "—"} ms · model:{" "}
        {timing.inferenceMs ?? "—"} ms
      </p>
      <p>Sampling: {timing.samplesPerSecond?.toFixed(1) ?? "—"}/s (up to 10)</p>
    </div>
  );
}
