import { HEURISTICS, type PoseSample } from "@/features/pose/sample";

const connections: [keyof PoseSample["pose"], keyof PoseSample["pose"]][] = [
  ["nose", "left_eye"],
  ["nose", "right_eye"],
  ["left_eye", "left_ear"],
  ["right_eye", "right_ear"],
  ["left_shoulder", "right_shoulder"],
  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],
  ["left_shoulder", "left_hip"],
  ["right_shoulder", "right_hip"],
  ["left_hip", "right_hip"],
  ["left_hip", "left_knee"],
  ["left_knee", "left_ankle"],
  ["right_hip", "right_knee"],
  ["right_knee", "right_ankle"],
];

export function PoseOverlay({
  sample,
  largeView,
  label = "Live pose landmarks",
}: {
  sample: PoseSample;
  largeView: boolean;
  label?: string;
}) {
  const points = Object.fromEntries(
    Object.entries(sample.pose).filter(
      ([, point]) =>
        point &&
        point[0] >= 0 &&
        point[0] <= 1 &&
        point[1] >= 0 &&
        point[1] <= 1 &&
        (point[3] ?? 0) >= HEURISTICS.confidence &&
        (point[4] === null || point[4] >= HEURISTICS.confidence),
    ),
  );
  const { width, height } = sample.image;
  return (
    <svg
      className="live-pose-overlay"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio={largeView ? "xMidYMid meet" : "xMidYMid slice"}
      role="img"
      aria-label={label}
    >
      {connections.map(([from, to]) => {
        const a = points[from],
          b = points[to];
        return a && b ? (
          <line
            key={`${from}-${to}`}
            x1={a[0] * width}
            y1={a[1] * height}
            x2={b[0] * width}
            y2={b[1] * height}
            vectorEffect="non-scaling-stroke"
          />
        ) : null;
      })}
      {Object.entries(points).map(
        ([name, point]) =>
          point && (
            <circle
              key={name}
              data-landmark={name}
              cx={point[0] * width}
              cy={point[1] * height}
              r={5}
              vectorEffect="non-scaling-stroke"
            />
          ),
      )}
    </svg>
  );
}
