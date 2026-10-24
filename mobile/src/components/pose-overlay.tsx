import { useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  connections,
  projectPose,
} from "../../../frontend/src/features/pose/overlay";
import type { PoseSample } from "../../../frontend/src/features/pose/sample";
export function PoseOverlay({ sample }: { sample: PoseSample }) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const points = projectPose(sample, size.width, size.height);
  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={StyleSheet.absoluteFill}
      onLayout={({ nativeEvent }) => setSize(nativeEvent.layout)}
    >
      {connections.map(([from, to]) => {
        const a = points[from],
          b = points[to];
        if (!a || !b) return null;
        const length = Math.hypot(b.x - a.x, b.y - a.y);
        return (
          <View
            key={`${from}-${to}`}
            style={{
              position: "absolute",
              left: (a.x + b.x - length) / 2,
              top: (a.y + b.y) / 2 - 1,
              width: length,
              height: 2,
              backgroundColor: "#79e9d2",
              transform: [{ rotate: `${Math.atan2(b.y - a.y, b.x - a.x)}rad` }],
            }}
          />
        );
      })}
      {Object.entries(points).map(([name, p]) => (
        <View
          key={name}
          style={{
            position: "absolute",
            left: p.x - 3,
            top: p.y - 3,
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: "white",
          }}
        />
      ))}
    </View>
  );
}
