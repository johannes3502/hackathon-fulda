import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, FONT } from "../theme";

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

/** Slow drifting glow orbs behind everything. */
export const GlowField: React.FC<{ intensity?: number }> = ({
  intensity = 1,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = frame / durationInFrames;
  const breathe = 0.85 + 0.15 * Math.sin(frame / 45);

  // Eased multi-stop falloff (statt linear → transparent): vermeidet
  // sichtbare Banding-Stufen in den dunklen Glow-Verläufen.
  const orbGradient = (color: string): string => {
    const m = color.match(/rgba?\(([^)]+)\)/);
    if (!m) return `radial-gradient(circle, ${color} 0%, transparent 70%)`;
    const [r, g, b, a] = m[1].split(",").map((s) => s.trim());
    const base = Number.parseFloat(a ?? "1");
    const stop = (alpha: number, pct: number) =>
      `rgba(${r},${g},${b},${(base * alpha).toFixed(4)}) ${pct}%`;
    return `radial-gradient(circle, ${stop(1, 0)}, ${stop(0.58, 30)}, ${stop(
      0.28,
      52,
    )}, ${stop(0.1, 72)}, ${stop(0.028, 88)}, rgba(0,0,0,0) 100%)`;
  };

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
    background: orbGradient(color),
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
      {/* Feines Dither direkt über den Glows, unter dem Content:
          bricht letzte Banding-Stufen, ohne Text/Mocks zu betreffen. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.05,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='d'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23d)'/%3E%3C/svg%3E")`,
          mixBlendMode: "screen",
        }}
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
          opacity: 0.05,
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
