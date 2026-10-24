import { useEffect, useRef } from "react";
import {
  CROSS_ARMS,
  CUE_TIMING,
  POCKET,
  crossArmsCheck,
  passes,
  pocketCheck,
  type PoseHint,
} from "@/features/pose/cues";
import type { PoseSample } from "@/features/pose/sample";

type Value = number | boolean | null;
type Row = {
  key: string;
  label: string;
  needs: string;
  values: [Value, Value];
  pass: (v: never) => boolean;
  digits?: number;
};

function readout(sample: PoseSample | null) {
  const arms = crossArmsCheck(sample);
  const pocket = pocketCheck(sample);
  const sides = (["L", "R"] as const).filter((_, i) => pocket.side[i]);
  const sections: [string, Row[]][] = [
    [
      "Arms crossed (both sides)",
      [
        {
          key: "cross",
          label: "Wrist to midline",
          needs: `≥ ${CROSS_ARMS.minCross}`,
          values: arms.cross,
          pass: passes.cross,
          digits: 2,
        },
        {
          key: "height",
          label: "Wrist height",
          needs: `${CROSS_ARMS.minWristHeight} … ${CROSS_ARMS.maxWristHeight}`,
          values: arms.height,
          pass: passes.height,
          digits: 2,
        },
        {
          key: "elbow",
          label: "Elbow angle",
          needs: `≤ ${CROSS_ARMS.maxElbowDeg}°`,
          values: arms.elbow,
          pass: passes.elbow,
          digits: 0,
        },
        {
          key: "forearm",
          label: "Forearm tilt",
          needs: `≤ ${CROSS_ARMS.maxForearmDeg}°`,
          values: arms.forearm,
          pass: passes.forearm,
          digits: 0,
        },
      ],
    ],
    [
      "Hand in pocket (either side)",
      [
        {
          key: "hipDist",
          label: "Wrist to hip",
          needs: `≤ ${POCKET.maxHipDist}`,
          values: pocket.hipDist,
          pass: passes.hipDist,
          digits: 2,
        },
        {
          key: "found",
          label: "Hand detected",
          needs: "no",
          values: pocket.found,
          pass: (v: boolean) => !v,
        },
      ],
    ],
  ];
  return {
    arms:
      arms.crossed === null
        ? "not visible"
        : arms.crossed
          ? "crossed"
          : "open",
    pocket:
      pocket.inPocket === null
        ? "not visible"
        : pocket.inPocket
          ? `in pocket (${sides.join("+")})`
          : "no",
    sections,
  };
}

const format = (v: Value, digits = 2) =>
  v === null
    ? "hidden"
    : typeof v === "boolean"
      ? v
        ? "yes"
        : "no"
      : v.toFixed(digits);

export function PoseDebug({
  sample,
  hint,
}: {
  sample: PoseSample | null;
  hint: PoseHint | null;
}) {
  const view = readout(sample);
  const logged = useRef({ key: "", at: -Infinity });
  // Console trace for tuning: on every status/hint change, else once a second.
  useEffect(() => {
    const view = readout(sample);
    const key = `${view.arms}|${view.pocket}|${hint}`;
    const now = performance.now();
    if (key === logged.current.key && now - logged.current.at < 1000) return;
    logged.current = { key, at: now };
    const values = view.sections
      .flatMap(([, rows]) => rows)
      .map(
        (row) =>
          `${row.key} ${row.values.map((v) => format(v, row.digits)).join("/")}`,
      )
      .join(" | ");
    const hands = sample?.hands
      ? `${[sample.hands.left, sample.hands.right].filter(Boolean).length} at wrists`
      : "model off";
    console.log(
      `[pose] t=${sample?.t_ms ?? "-"}ms hint=${hint ?? "none"} arms=${view.arms} pocket=${view.pocket} hips=${sample?.quality.hips_visible ? "visible" : "hidden"} hands=${hands} | ${values}`,
    );
  }, [sample, hint]);
  const cell = (row: Row, v: Value) =>
    v === null ? (
      <td className="missing">hidden</td>
    ) : (
      <td className={row.pass(v as never) ? "pass" : "fail"}>
        {format(v, row.digits)}
      </td>
    );
  return (
    <div className="live-pose-debug" aria-label="Pose debug readout">
      <strong>
        Arms: {view.arms} · Pocket: {view.pocket}
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
        {view.sections.map(([title, rows]) => (
          <tbody key={title}>
            <tr>
              <th colSpan={4} className="section">
                {title}
              </th>
            </tr>
            {rows.map((row) => (
              <tr key={row.key}>
                <th>{row.label}</th>
                {cell(row, row.values[0])}
                {cell(row, row.values[1])}
                <td>{row.needs}</td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
      <small>
        Hint: {hint ?? "none"} ·{" "}
        {sample?.hands === null && "Hand model off · "}
        {CUE_TIMING.holdMs
          ? `shows after ${CUE_TIMING.holdMs / 1000} s`
          : "shows immediately"}{" "}
        · L/R = your left/right
      </small>
    </div>
  );
}
