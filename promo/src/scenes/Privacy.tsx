import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { GlowField, RevealText, useEntry } from "../lib/anim";
import { COLORS, FONT } from "../theme";

const ROWS = [
  "Pose, Whisper und Embeddings laufen lokal.",
  "Aufnahme temporär zur Server-Analyse.",
  "Cloud nur mit deiner Einwilligung.",
];

const CheckIcon: React.FC = () => (
  <svg width={40} height={40} viewBox="0 0 40 40" fill="none">
    <circle
      cx={20}
      cy={20}
      r={18}
      stroke={COLORS.good}
      strokeWidth={2.4}
      opacity={0.85}
    />
    <path
      d="M12.5 20.5l5 5 10-11"
      stroke={COLORS.good}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const Privacy: React.FC = () => {
  const frame = useCurrentFrame();
  const fadeOut = interpolate(frame, [214, 230], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const stack = useEntry(96, 34);
  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      <GlowField intensity={0.5} />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 44,
        }}
      >
        <RevealText
          text="Privacy by Design."
          delay={6}
          size={86}
          weight={700}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 30,
            alignItems: "flex-start",
          }}
        >
          {ROWS.map((row, i) => {
            const entry = useEntryAt(26 + i * 20);
            return (
              <div
                key={row}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 24,
                  opacity: entry.opacity,
                  transform: entry.transform,
                  filter: entry.filter,
                }}
              >
                <CheckIcon />
                <span
                  style={{
                    fontFamily: FONT,
                    fontSize: 46,
                    fontWeight: 600,
                    color: COLORS.ink,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {row}
                </span>
              </div>
            );
          })}
        </div>
        <div
          style={{
            marginTop: 14,
            opacity: stack.opacity,
            transform: stack.transform,
          }}
        >
          <span
            style={{
              fontFamily: FONT,
              fontSize: 26,
              fontWeight: 400,
              color: COLORS.faint,
              letterSpacing: "0.02em",
            }}
          >
            Next.js · FastAPI · Celery · PostgreSQL + pgvector · Docker Compose
          </span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

import { useVideoConfig, spring } from "remotion";
function useEntryAt(delay: number) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, mass: 1 },
    durationInFrames: 28,
  });
  return {
    opacity: interpolate(p, [0, 1], [0, 1]),
    transform: `translateY(${interpolate(p, [0, 1], [24, 0])}px)`,
    filter: `blur(${interpolate(p, [0, 1], [6, 0])}px)`,
  };
}
