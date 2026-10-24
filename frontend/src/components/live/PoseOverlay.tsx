import type { PoseSample } from "@/features/pose/sample";
import { connections, visiblePosePoints } from "@/features/pose/overlay";

export function PoseOverlay({
  sample,
  largeView,
}: {
  sample: PoseSample;
  largeView: boolean;
}) {
  const points = visiblePosePoints(sample);
  const { width, height } = sample.image;
  return (
    <svg
      className="live-pose-overlay"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio={largeView ? "xMidYMid meet" : "xMidYMid slice"}
      role="img"
      aria-label="Live pose landmarks"
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
