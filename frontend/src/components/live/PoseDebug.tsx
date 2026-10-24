import { useEffect, useRef } from "react";
import {
  CROSS_ARMS,
  crossArmsCheck,
  passes,
  type CrossArmsCheck,
} from "@/features/pose/cues";
import type { PoseSample } from "@/features/pose/sample";
import { POSE_RULES, type PoseEvaluation } from "@/features/pose/evaluation";
import type { PoseTiming } from "@/features/pose/capture";

const status = (check: CrossArmsCheck) =>
  check.crossed === null
    ? "not visible"
    : check.crossed
      ? check.tucked === null
        ? "crossed"
        : "crossed (one hand tucked)"
      : "open";

const rows = [
  ["cross", "Wrist to midline", `≥ ${CROSS_ARMS.minCross}`, 2],
  [
    "height",
    "Wrist height",
    `${CROSS_ARMS.minWristHeight} … ${CROSS_ARMS.maxWristHeight}`,
    2,
  ],
  ["elbow", "Elbow angle", `≤ ${CROSS_ARMS.maxElbowDeg}°`, 0],
  ["forearm", "Forearm tilt", `≤ ${CROSS_ARMS.maxForearmDeg}°`, 0],
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
  const logged = useRef({ key: "", at: -Infinity });
  // Console trace for tuning: on every status/hint change, else once a second.
  useEffect(() => {
    const check = crossArmsCheck(sample);
    const key = `${status(check)}|${active}`;
    const now = performance.now();
    if (key === logged.current.key && now - logged.current.at < 1000) return;
    logged.current = { key, at: now };
    const values = rows
      .map(
        ([key, , , digits]) =>
          `${key} ${check[key]
            .map((v) => (v === null ? "hidden" : v.toFixed(digits)))
            .join("/")}`,
      )
      .join(" | ");
    const failing = rows
      .filter(([key]) => check[key].some((v) => v === null || !passes[key](v)))
      .map(([key]) => key);
    console.log(
      `[pose] t=${sample?.t_ms ?? "-"}ms arms=${status(check)} hint=${active ? "on" : "off"} | ${values} | failing: ${failing.join(", ") || "none"}`,
    );
  }, [sample, active]);
  const cell = (key: keyof typeof passes, v: number | null, digits: number) =>
    v === null ? (
      <td className="missing">hidden</td>
    ) : (
      <td className={passes[key](v) ? "pass" : "fail"}>{v.toFixed(digits)}</td>
    );
  return (
    <div className="live-pose-debug" aria-label="Pose debug readout">
      <strong>
        Arms: {status(check)}
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
        {POSE_RULES.stabilizeHoldMs
          ? `Hint after ${POSE_RULES.stabilizeHoldMs / 1000} s crossed`
          : "Hint shows immediately"}{" "}
        · L/R = your left/right
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
      <p>
        Head turn: {evaluation?.measurements?.yawDelta?.toFixed(2) ?? "—"} /
        trigger {POSE_RULES.headTurnEnter} ear-distance ratio
      </p>
      <p>
        Head down: {evaluation?.measurements?.dropDelta?.toFixed(2) ?? "—"} /
        trigger {POSE_RULES.headDownEnter} shoulder widths
      </p>
      <small>
        {evaluation?.phase === "ready"
          ? `Every rule: hold ${POSE_RULES.stabilizeHoldMs / 1000} s · camera fixed`
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
