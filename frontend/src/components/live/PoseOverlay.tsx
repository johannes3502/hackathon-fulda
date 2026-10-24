import type { PoseSample, HandSample } from "@/features/pose/sample";
import { connections, visiblePosePoints } from "@/features/pose/overlay";

const handConnections: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [0, 17],
];

export function PoseOverlay({
  sample,
  largeView,
  hands = [],
  showHands = false,
  label = showHands ? "Live pose and hand landmarks" : "Live pose landmarks",
}: {
  sample: PoseSample;
  largeView: boolean;
  label?: string;
  hands?: HandSample[];
  showHands?: boolean;
}) {
  const points = visiblePosePoints(sample);
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
      {showHands &&
        hands.map((hand, handIndex) => (
          <g key={`hand-${handIndex}`} data-hand={hand.label}>
            {handConnections.map(([from, to]) => {
              const a = hand.landmarks[from];
              const b = hand.landmarks[to];
              return a && b ? (
                <line
                  key={`${from}-${to}`}
                  className="hand-connection"
                  x1={a[0] * width}
                  y1={a[1] * height}
                  x2={b[0] * width}
                  y2={b[1] * height}
                  vectorEffect="non-scaling-stroke"
                />
              ) : null;
            })}
            {hand.landmarks.map((point, index) =>
              point &&
              point[0] >= 0 &&
              point[0] <= 1 &&
              point[1] >= 0 &&
              point[1] <= 1 ? (
                <circle
                  key={index}
                  className="hand-landmark"
                  data-hand-landmark={index}
                  cx={point[0] * width}
                  cy={point[1] * height}
                  r={4}
                  vectorEffect="non-scaling-stroke"
                />
              ) : null,
            )}
          </g>
        ))}
    </svg>
  );
}
