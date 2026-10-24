import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { Chip, GlowField, RevealText, useEntry } from "../lib/anim";
import { COLORS, FONT } from "../theme";

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const fadeToBlack = interpolate(frame, [244, 280], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const logo = useEntry(4, 30);
  const tagline = useEntry(22, 32);
  const sub = useEntry(44, 32);
  const badge = useEntry(70, 32);
  return (
    <AbsoluteFill style={{ opacity: fadeToBlack }}>
      <GlowField intensity={1.0} />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 38,
        }}
      >
        <div
          style={{
            opacity: logo.opacity,
            transform: logo.transform,
            filter: `${logo.filter} drop-shadow(0 0 60px rgba(139,92,246,0.45))`,
          }}
        >
          <Img
            src={staticFile("brand.png")}
            style={{
              width: 150,
              height: 150,
              borderRadius: 34,
              objectFit: "cover",
            }}
          />
        </div>
        <div
          style={{
            opacity: tagline.opacity,
            transform: tagline.transform,
            filter: tagline.filter,
          }}
        >
          <RevealText
            text="Übe den Vortrag, nicht die Folien."
            delay={30}
            size={80}
            weight={700}
          />
        </div>
        <div
          style={{
            opacity: sub.opacity,
            transform: sub.transform,
            display: "flex",
            gap: 16,
          }}
        >
          <Chip tone="accent" delay={56}>
            localhost:3000 · kein Login
          </Chip>
          <Chip tone="neutral" delay={66}>
            Live-Demo willkommen
          </Chip>
        </div>
        <div
          style={{
            opacity: badge.opacity,
            transform: badge.transform,
            marginTop: 10,
          }}
        >
          <span
            style={{
              fontFamily: FONT,
              fontSize: 26,
              fontWeight: 600,
              color: COLORS.faint,
              letterSpacing: "0.14em",
            }}
          >
            8. HACKATHON FULDA · FUTURE EDUCATION · 2026
          </span>
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: "#000", opacity: interpolate(frame, [252, 280], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), zIndex: 60, pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};
