import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONT } from "../theme";

/** Word-by-word reveal for a single centered line. */
export const RevealLine: React.FC<{
  text: string;
  delay?: number;
  stagger?: number;
  size: number;
  weight?: number;
  color?: string;
  gradient?: boolean;
  glow?: boolean;
  letterSpacing?: string;
}> = ({
  text,
  delay = 0,
  stagger = 2.6,
  size,
  weight = 700,
  color = COLORS.ink,
  gradient = false,
  glow = false,
  letterSpacing = "-0.025em",
}) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const enter = (d: number) => {
    const p = spring({
      frame: frame - d,
      fps,
      config: { damping: 200, mass: 0.9 },
      durationInFrames: 26,
    });
    return {
      opacity: interpolate(p, [0, 1], [0, 1]) as number,
      transform: `translateY(${interpolate(p, [0, 1], [22, 0])}px)`,
      filter: `blur(${interpolate(p, [0, 1], [6, 0])}px)`,
    };
  };

  if (gradient) {
    // Animated children inside a background-clip:text parent break the
    // glyph mask in Chromium — animate one clean wrapper instead.
    const style = enter(delay);
    return (
      <div
        style={{
          filter: glow
            ? "drop-shadow(0 0 44px rgba(139,92,246,0.35))"
            : undefined,
        }}
      >
        <div style={style}>
          <span
            style={{
              fontSize: size,
              fontWeight: weight,
              fontFamily: FONT,
              lineHeight: 1.12,
              letterSpacing,
              display: "inline-block",
              background: `linear-gradient(92deg, ${COLORS.accentSoft} 0%, ${COLORS.accent} 50%, ${COLORS.indigo} 100%)`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            {text}
          </span>
        </div>
      </div>
    );
  }

  const words = text.split(" ");
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: `0 ${size * 0.26}px`,
        fontSize: size,
        fontWeight: weight,
        fontFamily: FONT,
        lineHeight: 1.12,
        letterSpacing,
        color,
      }}
    >
      {words.map((word, i) => {
        const style = enter(delay + i * stagger);
        return (
          <span
            key={`${word}-${i}`}
            style={{
              display: "inline-block",
              ...style,
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};
