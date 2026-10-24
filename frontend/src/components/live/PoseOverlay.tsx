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

// MediaPipe Hand Landmarker topology: wrist (0), then four joints per finger.
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
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20],
];

export function PoseOverlay({
  sample,
  largeView,
}: {
  sample: PoseSample;
  largeView: boolean;
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
      {[sample.hands?.left, sample.hands?.right].map(
        (hand, side) =>
          hand && (
            <g key={side} className="hand">
              {handConnections.map(([from, to]) => (
                <line
                  key={`${from}-${to}`}
                  x1={hand.points[from][0] * width}
                  y1={hand.points[from][1] * height}
                  x2={hand.points[to][0] * width}
                  y2={hand.points[to][1] * height}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {hand.points.map((p, i) => (
                <circle
                  key={i}
                  cx={p[0] * width}
                  cy={p[1] * height}
                  r={3}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </g>
          ),
      )}
    </svg>
  );
}
