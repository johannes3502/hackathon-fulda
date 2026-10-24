import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { GlowField } from "../lib/anim";
import { RevealLine } from "../lib/reveal";
import { COLORS } from "../theme";

export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [126, 140], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ opacity: Math.min(fadeIn, fadeOut) }}>
      <GlowField intensity={0.9} />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <RevealLine
          text="Deine Idee verdient"
          delay={8}
          size={92}
          color={COLORS.ink}
        />
        <RevealLine
          text="einen starken Auftritt."
          delay={24}
          size={92}
          gradient
          glow
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
