export const FPS = 30;

export const COLORS = {
  bg: "#000000",
  ink: "#f5f5f7",
  sub: "#a1a1aa",
  faint: "#71717a",
  accent: "#8b5cf6",
  accentSoft: "#a78bfa",
  brand: "#3803bf",
  indigo: "#6366f1",
  card: "rgba(255,255,255,0.045)",
  cardBorder: "rgba(255,255,255,0.10)",
  chipBorder: "rgba(255,255,255,0.14)",
  good: "#34d399",
  warn: "#f87171",
};

export const FONT =
  '"Open Sans Variable", "Open Sans", -apple-system, "Segoe UI", sans-serif';

export const VIDEO = {
  width: 1920,
  height: 1080,
  fps: FPS,
};

// Scene timeline in frames (30 fps)
export const SCENES = {
  hook: { from: 0, duration: 140 }, // ~4.7 s
  problem: { from: 140, duration: 190 }, // ~6.3 s
  intro: { from: 330, duration: 150 }, // ~5 s
  features: { from: 480, duration: 690 }, // ~23 s (5 features)
  privacy: { from: 1170, duration: 230 }, // ~7.7 s
  outro: { from: 1400, duration: 280 }, // ~9.3 s
};

export const TOTAL_DURATION =
  SCENES.outro.from + SCENES.outro.duration; // 1680 frames = 56 s
