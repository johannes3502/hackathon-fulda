import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { GlowField, RevealText, useEntry } from "../lib/anim";
import { COLORS, FONT } from "../theme";

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const fadeOut = interpolate(frame, [136, 150], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const sub = useEntry(42, 32);
  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      <GlowField intensity={1.1} />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 34,
        }}
      >
        <div style={{ position: "relative" }}>
          <RevealText
            text="Pitch Practice"
            delay={6}
            stagger={3.2}
            size={150}
            weight={800}
          />
        </div>
        <div
          style={{
            height: 2,
            width: interpolate(frame, [24, 70], [0, 460], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            background: `linear-gradient(90deg, transparent, ${COLORS.accent}, transparent)`,
            opacity: 0.85,
          }}
        />
        <div
          style={{
            opacity: sub.opacity,
            transform: sub.transform,
            filter: sub.filter,
          }}
        >
          <span
            style={{
              fontFamily: FONT,
              fontSize: 44,
              fontWeight: 400,
              color: COLORS.sub,
              letterSpacing: "-0.01em",
            }}
          >
            Der Live-Präsentationstrainer in deinem Browser.
          </span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
