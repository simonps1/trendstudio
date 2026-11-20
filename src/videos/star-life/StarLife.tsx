import React from "react";
import { AbsoluteFill, Audio, staticFile } from "remotion";
import { Caption } from "../../core/components/Caption";
import { CanvasLayer } from "../../core/components/CanvasLayer";
import { FilmFinish } from "../../core/components/FilmFinish";
import { ensureFonts } from "../../core/fonts";
import { BlackHole } from "./BlackHole";
import { drawBack, drawFront } from "./cosmos";
import { Hud } from "./Hud";
import { KaraokeCaptions } from "../../core/components/KaraokeCaptions";
import type { NarrationTrack } from "../../voice/types";
import narrationJson from "./narration.json";
import { CAPTIONS, TITLES } from "./timeline";

const narration = narrationJson as NarrationTrack;
const WORDS = narration.lines.flatMap((l) => l.words);
const EMPHASIS = ["million", "second", "sun", "supergiant", "jupiter", "galaxy", "light", "black", "hole", "you"];

ensureFonts();

export const StarLife: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#03040b" }}>
    <CanvasLayer draw={drawBack} />
    <BlackHole />
    <CanvasLayer draw={drawFront} />
    <Hud />
    {WORDS.length > 0 ? (
      <>
        <KaraokeCaptions words={WORDS} emphasis={EMPHASIS} />
        {TITLES.map((c, i) => <Caption key={i} {...c} />)}
      </>
    ) : (
      CAPTIONS.map((c, i) => <Caption key={i} {...c} />)
    )}
    <FilmFinish />
    <Audio src={staticFile("audio/star-life.wav")} />
  </AbsoluteFill>
);
