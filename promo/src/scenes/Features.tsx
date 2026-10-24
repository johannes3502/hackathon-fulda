import React from "react";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from "remotion";
import { Card, Chip, Dot, GlowField, useEntry } from "../lib/anim";
import { COLORS, FONT } from "../theme";

const PER = 138; // frames per feature
const FADE = 16;

/* ---------------- Mock: Pose ---------------- */

const PoseMock: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const raise = spring({
    frame: frame - 24,
    fps,
    config: { damping: 200 },
    durationInFrames: 34,
  });
  return (
    <Card style={{ padding: "44px 48px", width: 720 }} delay={14}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 26,
        }}
      >
        <span
          style={{
            fontFamily: FONT,
            fontSize: 22,
            fontWeight: 600,
            color: COLORS.faint,
            letterSpacing: "0.04em",
          }}
        >
          Live-Hinweis
        </span>
        <Chip tone="accent" delay={40}>
          <Dot color={COLORS.accentSoft} pulse />
          Hand oben · 2 s gehalten
        </Chip>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "12px 0 4px",
        }}
      >
        <svg width={330} height={240} viewBox="0 0 330 240">
          <g
            stroke={COLORS.accentSoft}
            strokeWidth={7}
            strokeLinecap="round"
            fill="none"
            opacity={0.95}
          >
            <circle cx={165} cy={52} r={26} />
            <line x1={165} y1={78} x2={165} y2={158} />
            <line x1={165} y1={158} x2={140} y2={222} />
            <line x1={165} y1={158} x2={190} y2={222} />
            <line x1={118} y1={96} x2={212} y2={96} />
            <g transform={`rotate(${16 + 89 * raise} 118 96)`}>
              <line x1={118} y1={96} x2={100} y2={130} />
              <line x1={100} y1={130} x2={88} y2={152} />
            </g>
            <g transform={`rotate(${-16 - 89 * raise} 212 96)`}>
              <line x1={212} y1={96} x2={230} y2={130} />
              <line x1={230} y1={130} x2={242} y2={152} />
            </g>
          </g>
        </svg>
      </div>
      <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
        <Chip tone="neutral" delay={54}>
          <Dot color={COLORS.good} />
          Baseline kalibriert
        </Chip>
        <Chip tone="neutral" delay={66}>
          Heuristik · kein Score
        </Chip>
      </div>
    </Card>
  );
};

/* ---------------- Mock: Fact-Check ---------------- */

const FactMock: React.FC = () => (
  <Card style={{ padding: "44px 48px", width: 720 }} delay={14}>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        marginBottom: 24,
      }}
    >
      <svg width={26} height={26} viewBox="0 0 24 24" fill="none">
        <path
          d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
          stroke={COLORS.sub}
          strokeWidth={1.8}
        />
        <path d="M14 3v5h5" stroke={COLORS.sub} strokeWidth={1.8} />
      </svg>
      <span
        style={{
          fontFamily: FONT,
          fontSize: 22,
          fontWeight: 600,
          color: COLORS.faint,
        }}
      >
        thesis-quellen.pdf · Folie 12
      </span>
    </div>
    <div
      style={{
        fontFamily: FONT,
        fontSize: 33,
        fontWeight: 600,
        color: COLORS.ink,
        letterSpacing: "-0.01em",
        lineHeight: 1.35,
        marginBottom: 22,
      }}
    >
      „Das Lernlabor hat zwanzig Plätze.“
    </div>
    <div
      style={{
        borderLeft: `3px solid ${COLORS.accent}`,
        paddingLeft: 20,
        marginBottom: 26,
      }}
    >
      <span
        style={{
          fontFamily: FONT,
          fontSize: 26,
          fontWeight: 400,
          color: COLORS.sub,
          fontStyle: "italic",
          lineHeight: 1.45,
        }}
      >
        Quellenzitat: „… das Lernlabor hat zwanzig Plätze. Es öffnet um neun
        Uhr …“
      </span>
    </div>
    <div style={{ display: "flex", gap: 14 }}>
      <Chip tone="warn" delay={46}>
        <Dot color={COLORS.warn} />
        Widerspricht
      </Chip>
      <Chip tone="good" delay={58}>
        Zitat geprüft
      </Chip>
    </div>
  </Card>
);

/* ---------------- Mock: Voice ---------------- */

const VoiceMock: React.FC = () => {
  const frame = useCurrentFrame();
  const bars = Array.from({ length: 15 }, (_, i) => {
    const base =
      34 +
      46 * Math.abs(Math.sin(i * 1.7 + 1)) +
      18 * Math.sin(frame / 6 + i * 0.9);
    return Math.max(12, Math.min(120, base));
  });
  return (
    <Card style={{ padding: "44px 48px", width: 720 }} delay={14}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 30,
        }}
      >
        <span
          style={{
            fontFamily: FONT,
            fontSize: 22,
            fontWeight: 600,
            color: COLORS.faint,
            letterSpacing: "0.04em",
          }}
        >
          Signal-Analyse · adaptive Referenz
        </span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 16,
          height: 150,
          marginBottom: 30,
        }}
      >
        {bars.map((height, i) => (
          <div
            key={i}
            style={{
              width: 26,
              height,
              borderRadius: 8,
              background:
                height > 108
                  ? `linear-gradient(180deg, ${COLORS.accentSoft}, ${COLORS.accent})`
                  : "rgba(255,255,255,0.22)",
            }}
          />
        ))}
      </div>
      <div style={{ display: "flex", gap: 14 }}>
        <Chip tone="accent" delay={44}>
          <Dot color={COLORS.accentSoft} pulse />
          Stimme monoton · seit 6 s
        </Chip>
        <Chip tone="neutral" delay={58}>
          Pause · 2,1 s
        </Chip>
      </div>
    </Card>
  );
};

/* ---------------- Mock: Timeline ---------------- */

const TimelineMock: React.FC = () => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [18, 120], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const markers = [0.18, 0.42, 0.63, 0.86];
  const activeIdx = markers.reduce(
    (best, m, i) => (progress >= m - 0.035 ? i : best),
    0,
  );
  const track = 620;
  return (
    <Card style={{ padding: "44px 48px", width: 720 }} delay={14}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 30,
        }}
      >
        <span
          style={{
            fontFamily: FONT,
            fontSize: 22,
            fontWeight: 600,
            color: COLORS.faint,
            letterSpacing: "0.04em",
          }}
        >
          Deine Aufnahme · lokale Wiedergabe
        </span>
        <Chip tone="good" delay={52}>
          Sprung ±2 s
        </Chip>
      </div>
      <div style={{ position: "relative", height: 150 }}>
        {markers.map((m, i) => {
          const active = i === activeIdx;
          const ring = active ? 1 + 0.12 * Math.sin(frame / 5) : 1;
          return (
            <div
              key={m}
              style={{
                position: "absolute",
                left: m * track,
                top: active ? 40 : 46,
                transform: "translateX(-50%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
              }}
            >
              {active ? (
                <div
                  style={{
                    padding: "8px 16px",
                    borderRadius: 10,
                    background: "rgba(139,92,246,0.18)",
                    border: "1px solid rgba(139,92,246,0.45)",
                    fontFamily: FONT,
                    fontSize: 19,
                    fontWeight: 600,
                    color: COLORS.accentSoft,
                    whiteSpace: "nowrap",
                  }}
                >
                  {["Hand oben", "Pause · 2,1 s", "Widerspricht", "Frage"][i]}
                </div>
              ) : null}
              <div
                style={{
                  width: active ? 18 : 12,
                  height: active ? 18 : 12,
                  borderRadius: "50%",
                  background: active
                    ? COLORS.accent
                    : "rgba(255,255,255,0.30)",
                  boxShadow: active
                    ? `0 0 ${20 * ring}px rgba(139,92,246,0.8)`
                    : "none",
                  transform: `scale(${active ? ring : 1})`,
                }}
              />
            </div>
          );
        })}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: -40,
            top: 116,
            height: 8,
            borderRadius: 4,
            background: "rgba(255,255,255,0.10)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 116,
            height: 8,
            borderRadius: 4,
            width: progress * track,
            background: `linear-gradient(90deg, ${COLORS.brand}, ${COLORS.accent})`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: progress * track,
            top: 100,
            width: 4,
            height: 40,
            borderRadius: 2,
            background: COLORS.ink,
            boxShadow: "0 0 18px rgba(255,255,255,0.5)",
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: FONT,
          fontSize: 18,
          color: COLORS.faint,
          marginTop: 16,
          letterSpacing: "0.08em",
        }}
      >
        <span>00:00</span>
        <span>00:30</span>
      </div>
    </Card>
  );
};

/* ---------------- Mock: Chat ---------------- */

const ChatMock: React.FC = () => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const q = spring({
    frame: frame - 20,
    fps,
    config: { damping: 200 },
    durationInFrames: 26,
  });
  const a = spring({
    frame: frame - 52,
    fps,
    config: { damping: 200 },
    durationInFrames: 26,
  });
  return (
    <Card style={{ padding: "44px 48px", width: 720 }} delay={14}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 22,
          marginBottom: 28,
        }}
      >
        <div
          style={{
            alignSelf: "flex-start",
            maxWidth: 520,
            padding: "20px 26px",
            borderRadius: "22px 22px 22px 6px",
            background: "rgba(255,255,255,0.08)",
            fontFamily: FONT,
            fontSize: 27,
            fontWeight: 400,
            color: COLORS.ink,
            lineHeight: 1.4,
            opacity: interpolate(q, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(q, [0, 1], [18, 0])}px)`,
          }}
        >
          Du sagst „acht Uhr“ — deine Folie nennt neun Uhr. Wie passt das
          zusammen?
        </div>
        <div
          style={{
            alignSelf: "flex-end",
            maxWidth: 480,
            padding: "20px 26px",
            borderRadius: "22px 22px 6px 22px",
            background:
              "linear-gradient(135deg, rgba(139,92,246,0.28), rgba(99,102,241,0.22))",
            border: "1px solid rgba(139,92,246,0.4)",
            fontFamily: FONT,
            fontSize: 27,
            fontWeight: 400,
            color: COLORS.ink,
            lineHeight: 1.4,
            opacity: interpolate(a, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(a, [0, 1], [18, 0])}px)`,
          }}
        >
          Gute Frage — die Öffnungszeiten standen in meiner Quelle noch offen.
        </div>
      </div>
      <div style={{ display: "flex", gap: 14 }}>
        <Chip tone="good" delay={78}>
          Quelle: Seite 3 · Zitat geprüft
        </Chip>
        <Chip tone="neutral" delay={90}>
          Eine Frage pro Schritt
        </Chip>
      </div>
    </Card>
  );
};

/* ---------------- Feature definitions ---------------- */

const FEATURES = [
  {
    index: "01",
    title: "Haltung & Gestik",
    claim: "Sieben kalibrierte Beobachtungen — live, komplett im Browser.",
    Mock: PoseMock,
  },
  {
    index: "02",
    title: "Transkript & Fact-Check",
    claim: "Jede Aussage zitiergeprüft gegen deine eigenen Quellen.",
    Mock: FactMock,
  },
  {
    index: "03",
    title: "Stimme",
    claim: "Tempo, Pausen und Monotonie — Messwerte, keine Note.",
    Mock: VoiceMock,
  },
  {
    index: "04",
    title: "Timestamp-Review",
    claim: "Klick auf einen Moment springt zur Stelle in deinem Video.",
    Mock: TimelineMock,
  },
  {
    index: "05",
    title: "Frage-Simulator",
    claim: "Fragen wie in der Prüfung — Antworten gegen die Quellen geprüft.",
    Mock: ChatMock,
  },
];

export const Features: React.FC = () => {
  const frame = useCurrentFrame();
  const active = Math.min(FEATURES.length - 1, Math.floor(frame / PER));
  const fadeOut = interpolate(frame, [674, 690], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      <GlowField intensity={0.7} />
      <AbsoluteFill>
        {FEATURES.map((feature, i) => (
          <Sequence
            key={feature.index}
            from={i * PER}
            durationInFrames={PER + FADE}
          >
            <FeaturePanel
              feature={feature}
              isLast={i === FEATURES.length - 1}
            />
          </Sequence>
        ))}
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "flex-end",
          paddingBottom: 64,
        }}
      >
        <div style={{ display: "flex", gap: 14 }}>
          {FEATURES.map((feature, i) => (
            <div
              key={feature.index}
              style={{
                width: i === active ? 46 : 14,
                height: 6,
                borderRadius: 3,
                background:
                  i <= active ? COLORS.accent : "rgba(255,255,255,0.18)",
              }}
            />
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const FeaturePanel: React.FC<{
  feature: (typeof FEATURES)[number];
  isLast: boolean;
}> = ({ feature, isLast }) => {
  const frame = useCurrentFrame();
  const inOp = interpolate(frame, [0, FADE], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const outOp = isLast
    ? 1
    : interpolate(frame, [PER, PER + FADE], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
  const text = useEntry(6, 30);
  const Mock = feature.Mock;
  return (
    <AbsoluteFill
      style={{
        opacity: Math.min(inOp, outOp),
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 90,
        padding: "0 150px",
      }}
    >
      <div
        style={{
          flex: "0 0 640px",
          display: "flex",
          flexDirection: "column",
          gap: 26,
          opacity: text.opacity,
          transform: text.transform,
          filter: text.filter,
        }}
      >
        <span
          style={{
            fontFamily: FONT,
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: "0.18em",
            color: COLORS.accentSoft,
          }}
        >
          {feature.index}
        </span>
        <span
          style={{
            fontFamily: FONT,
            fontSize: 82,
            fontWeight: 700,
            letterSpacing: "-0.025em",
            color: COLORS.ink,
            lineHeight: 1.06,
          }}
        >
          {feature.title}
        </span>
        <span
          style={{
            fontFamily: FONT,
            fontSize: 34,
            fontWeight: 400,
            color: COLORS.sub,
            letterSpacing: "-0.01em",
            lineHeight: 1.4,
          }}
        >
          {feature.claim}
        </span>
      </div>
      <div style={{ flex: "0 0 760px", display: "flex" }}>
        <div style={{ width: "100%" }}>
          <Mock />
        </div>
      </div>
    </AbsoluteFill>
  );
};
