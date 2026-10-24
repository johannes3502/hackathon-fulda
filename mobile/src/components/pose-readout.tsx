import { View } from "react-native";
import { Copy, Section } from "../ui";
import {
  crossArmsCheck,
  CROSS_ARMS,
} from "../../../frontend/src/features/pose/cues";
import type { PoseSample } from "../../../frontend/src/features/pose/sample";
export function PoseReadout({
  sample,
  active,
}: {
  sample: PoseSample;
  active: boolean;
}) {
  const check = crossArmsCheck(sample);
  return (
    <Section
      title="Pose measurements"
      footer="Prototype heuristics, not calibrated scores. L/R means your left/right. Missing points stay empty."
    >
      <Copy>
        Arms:{" "}
        {check.crossed === null
          ? "not visible"
          : check.crossed
            ? "crossed"
            : "open"}
        {active ? " · hint on" : ""}
      </Copy>
      {(
        [
          ["Wrist past midline", check.cross, `≥ ${CROSS_ARMS.minCross}`],
          [
            "Wrist height",
            check.height,
            `${CROSS_ARMS.minWristHeight} … ${CROSS_ARMS.maxWristHeight}`,
          ],
          ["Elbow angle", check.elbow, `≤ ${CROSS_ARMS.maxElbowDeg}°`],
        ] as const
      ).map(([label, pair, threshold]) => (
        <View key={label} style={{ gap: 4 }}>
          <Copy caption>{label}</Copy>
          <Copy caption muted>
            L {pair[0]?.toFixed(2) ?? "hidden"} · R{" "}
            {pair[1]?.toFixed(2) ?? "hidden"} · needs {threshold}
          </Copy>
        </View>
      ))}
      <Copy caption muted>
        Head pitch {sample.head.pitch_deg?.toFixed(1) ?? "—"}° · roll{" "}
        {sample.head.roll_deg?.toFixed(1) ?? "—"}°
      </Copy>
      <Copy caption muted>
        {sample.quality.legs_visible
          ? "Legs visible"
          : "Legs not confirmed visible"}{" "}
        ·{" "}
        {sample.head.eyes_forward
          ? "Eyes roughly frontal"
          : "Frontal eyes not confirmed"}
      </Copy>
    </Section>
  );
}
