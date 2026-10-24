import React from "react";
import { Composition, Sequence } from "remotion";
import { ensureFont } from "./lib/font";
import { SCENES, TOTAL_DURATION, VIDEO } from "./theme";
import { FilmLayer } from "./lib/anim";
import { Hook } from "./scenes/Hook";
import { Problem } from "./scenes/Problem";
import { Intro } from "./scenes/Intro";
import { Features } from "./scenes/Features";
import { Privacy } from "./scenes/Privacy";
import { Outro } from "./scenes/Outro";

const Promo: React.FC = () => {
  ensureFont();
  return (
    <>
      <Sequence from={SCENES.hook.from} durationInFrames={SCENES.hook.duration}>
        <Hook />
      </Sequence>
      <Sequence
        from={SCENES.problem.from}
        durationInFrames={SCENES.problem.duration}
      >
        <Problem />
      </Sequence>
      <Sequence
        from={SCENES.intro.from}
        durationInFrames={SCENES.intro.duration}
      >
        <Intro />
      </Sequence>
      <Sequence
        from={SCENES.features.from}
        durationInFrames={SCENES.features.duration}
      >
        <Features />
      </Sequence>
      <Sequence
        from={SCENES.privacy.from}
        durationInFrames={SCENES.privacy.duration}
      >
        <Privacy />
      </Sequence>
      <Sequence
        from={SCENES.outro.from}
        durationInFrames={SCENES.outro.duration}
      >
        <Outro />
      </Sequence>
      <FilmLayer />
    </>
  );
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="PitchPractice"
      component={Promo}
      durationInFrames={TOTAL_DURATION}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
    />
  );
};
