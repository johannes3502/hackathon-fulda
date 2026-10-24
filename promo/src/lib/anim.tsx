import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, FONT } from "../theme";

export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

/** Smooth entry transform: rise + fade, no overshoot (Apple-like). */
export const useEntry = (
  delay: number,
  duration = 30,
): { opacity: number; transform: string; filter: string } => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, mass: 1 },
    durationInFrames: duration,
  });
  const opacity = interpolate(p, [0, 1], [0, 1]);
  const y = interpolate(p, [0, 1], [26, 0]);
  const blur = interpolate(p, [0, 1], [8, 0]);
  return {
    opacity,
    transform: `translateY(${y}px)`,
    filter: `blur(${blur}px)`,
  };
};

/** Word-by-word reveal for headlines. */
export const RevealText: React.FC<{
  text: string;
  delay?: number;
  stagger?: number;
  size: number;
  weight?: number;
  color?: string;
  lineHeight?: number;
  letterSpacing?: string;
  style?: React.CSSProperties;
}> = ({
  text,
  delay = 0,
  stagger = 2.4,
  size,
  weight = 700,
  color = COLORS.ink,
  lineHeight = 1.12,
  letterSpacing = "-0.025em",
  style,
}) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
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
        lineHeight,
        letterSpacing,
        color,
        ...style,
      }}
    >
      {words.map((word, i) => {
        const p = spring({
          frame: frame - delay - i * stagger,
          fps,
          config: { damping: 200, mass: 0.9 },
          durationInFrames: 26,
        });
        const opacity = interpolate(p, [0, 1], [0, 1]);
        const y = interpolate(p, [0, 1], [22, 0]);
        const blur = interpolate(p, [0, 1], [6, 0]);
        return (
          <span
            key={`${word}-${i}`}
            style={{
              display: "inline-block",
              opacity,
              transform: `translateY(${y}px)`,
              filter: `blur(${blur}px)`,
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

/** Gradient accent text. */
export const GradientText: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => (
  <span
    style={{
      background: `linear-gradient(92deg, ${COLORS.accentSoft} 0%, ${COLORS.accent} 45%, ${COLORS.indigo} 100%)`,
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      color: "transparent",
      ...style,
    }}
  >
    {children}
  </span>
);

/** Slow drifting glow orbs behind everything. */
export const GlowField: React.FC<{ intensity?: number }> = ({
  intensity = 1,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = frame / durationInFrames;
  const breathe = 0.85 + 0.15 * Math.sin(frame / 45);
  const orb = (
    left: string,
    top: string,
    size: number,
    color: string,
    dx: number,
    dy: number,
  ): React.CSSProperties => ({
    position: "absolute",
    left,
    top,
    width: size,
    height: size,
    borderRadius: "50%",
    background: `radial-gradient(circle, ${color} 0%, transparent 65%)`,
    transform: `translate(${Math.sin(t * Math.PI * 2) * dx}px, ${
      Math.cos(t * Math.PI * 1.6) * dy
    }px)`,
    opacity: 0.55 * intensity * breathe,
  });
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <div
        style={orb("-18%", "-28%", 1300, "rgba(109,40,217,0.32)", 90, 60)}
      />
      <div
        style={orb("68%", "52%", 1500, "rgba(30,58,138,0.30)", -110, -70)}
      />
      <div
        style={orb("30%", "80%", 1000, "rgba(56,3,191,0.20)", 60, -50)}
      />
    </AbsoluteFill>
  );
};

/** Filmic vignette + subtle grain overlay. */
export const FilmLayer: React.FC = () => {
  const frame = useCurrentFrame();
  const grainShift = (frame % 3) * 37;
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        background:
          "radial-gradient(ellipse at center, transparent 52%, rgba(0,0,0,0.55) 100%)",
        zIndex: 50,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.028,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundPosition: `${grainShift}px ${grainShift}px`,
          mixBlendMode: "overlay",
        }}
      />
    </AbsoluteFill>
  );
};

/** Rounded card used by all mocks. */
export const Card: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
  delay?: number;
}> = ({ children, style, delay = 0 }) => {
  const entry = useEntry(delay, 28);
  return (
    <div
      style={{
        background: COLORS.card,
        border: `1px solid ${COLORS.cardBorder}`,
        borderRadius: 26,
        boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
        opacity: entry.opacity,
        transform: entry.transform,
        filter: entry.filter,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** Small pill chip (cues, verdicts, checks). */
export const Chip: React.FC<{
  children: React.ReactNode;
  tone?: "neutral" | "good" | "warn" | "accent";
  delay?: number;
  style?: React.CSSProperties;
}> = ({ children, tone = "neutral", delay = 0, style }) => {
  const entry = useEntry(delay, 22);
  const palette = {
    neutral: { bg: "rgba(255,255,255,0.07)", fg: COLORS.sub, bd: COLORS.chipBorder },
    good: { bg: "rgba(52,211,153,0.12)", fg: COLORS.good, bd: "rgba(52,211,153,0.35)" },
    warn: { bg: "rgba(248,113,113,0.13)", fg: COLORS.warn, bd: "rgba(248,113,113,0.4)" },
    accent: { bg: "rgba(139,92,246,0.15)", fg: COLORS.accentSoft, bd: "rgba(139,92,246,0.42)" },
  }[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 22px",
        borderRadius: 999,
        background: palette.bg,
        border: `1px solid ${palette.bd}`,
        color: palette.fg,
        fontSize: 24,
        fontWeight: 600,
        fontFamily: FONT,
        letterSpacing: "-0.01em",
        whiteSpace: "nowrap",
        opacity: entry.opacity,
        transform: entry.transform,
        filter: entry.filter,
        ...style,
      }}
    >
      {children}
    </span>
  );
};

export const Dot: React.FC<{ color: string; size?: number; pulse?: boolean }> = ({
  color,
  size = 12,
  pulse = false,
}) => {
  const frame = useCurrentFrame();
  const s = pulse ? 1 + 0.25 * Math.sin(frame / 7) : 1;
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        boxShadow: `0 0 ${pulse ? 14 : 0}px ${color}`,
        transform: `scale(${s})`,
        flexShrink: 0,
      }}
    />
  );
};
