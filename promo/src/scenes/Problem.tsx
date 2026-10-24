import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { GlowField, RevealText, useEntry } from "../lib/anim";
import { COLORS, FONT } from "../theme";

const PAINS: Array<{ lead: string; accent?: boolean }> = [
  { lead: "Kein ehrliches Feedback." },
  { lead: "Nie an der richtigen Stelle." },
  { lead: "Keine Prüfung, die nachfragt." },
];

export const Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const fadeOut = interpolate(frame, [176, 190], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeIn = interpolate(frame, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ opacity: Math.min(fadeIn, fadeOut) }}>
      <GlowField intensity={0.55} />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          gap: 46,
        }}
      >
        <RevealText
          text="Wenn du alleine übst, passiert das:"
          delay={6}
          size={52}
          weight={600}
          color={COLORS.sub}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 30,
            alignItems: "flex-start",
          }}
        >
          {PAINS.map((pain, i) => {
            const entry = useEntryAt(26 + i * 22);
            return (
              <div
                key={pain.lead}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 28,
                  opacity: entry.opacity,
                  transform: entry.transform,
                  filter: entry.filter,
                }}
              >
                <span
                  style={{
                    fontFamily: FONT,
                    fontSize: 30,
                    fontWeight: 600,
                    color: COLORS.faint,
                    letterSpacing: "0.06em",
                    width: 64,
                    textAlign: "right",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  style={{
                    fontFamily: FONT,
                    fontSize: 74,
                    fontWeight: 700,
                    letterSpacing: "-0.025em",
                    color: COLORS.ink,
                  }}
                >
                  {pain.lead}
                </span>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Local entry hook usable inside map callbacks (reads shared frame). */
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
