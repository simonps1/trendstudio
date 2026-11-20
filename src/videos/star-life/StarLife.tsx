import React from "react";
import { AbsoluteFill, Audio, staticFile } from "remotion";
import { Caption } from "../../core/components/Caption";
import { CanvasLayer } from "../../core/components/CanvasLayer";
import { FilmFinish } from "../../core/components/FilmFinish";
import { ensureFonts } from "../../core/fonts";
import { BlackHole } from "./BlackHole";
import { BodiesGL } from "../../series/BodiesGL";
import { drawBack, drawFront, placeStarLife } from "./cosmos";
import { Hud } from "./Hud";
import { KaraokeCaptions } from "../../core/components/KaraokeCaptions";
import type { NarrationTrack } from "../../voice/types";
import narrationJson from "./narration.json";
import { drawHost, hostAppear, hostSpot, talkLevel } from "../../series/host";
import type { DrawContext } from "../../core/components/CanvasLayer";
import { PLANETS, CAPTIONS, T, TITLES } from "./timeline";

const narration = narrationJson as NarrationTrack;
const WORDS = narration.lines.flatMap((l) => l.words);
const EMPHASIS = ["million", "second", "sun", "supergiant", "jupiter", "galaxy", "light", "black", "hole", "you"];

ensureFonts();

/** The host reacts to ignition, each swallowed planet and the supernova. */
const drawHostLayer = ({ ctx, t, width: w, height: h, u }: DrawContext) => {
  const cy = h > w ? h * 0.53 : h / 2;
  const spot = hostSpot(w, h, u, cy);
  const hit = (at: number, rate: number) => (t >= at ? Math.exp(-(t - at) * rate) : 0);
  const excite = Math.min(1, hit(T.ignition, 1.6) + hit(T.supernova, 1.1) + PLANETS.reduce((a, p) => a + 0.6 * hit(p.engulf, 5), 0));
  const leaving = 1 - Math.min(1, Math.max(0, (t - (T.end - 0.5)) / 0.35));
  drawHost(ctx, spot.x, spot.y, spot.size, t, { talk: talkLevel(WORDS, t), excite, appear: hostAppear(t) * leaving });
};

export const StarLife: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#03040b" }}>
    <CanvasLayer draw={drawBack} />
    <BodiesGL place={placeStarLife} />
    <BlackHole />
    <CanvasLayer draw={drawFront} />
    <CanvasLayer draw={drawHostLayer} />
    <Hud />
    {WORDS.length > 0 ? (
      <>
        <KaraokeCaptions words={WORDS} emphasis={EMPHASIS} y={0.3} />
        {TITLES.map((c, i) => <Caption key={i} {...c} />)}
      </>
    ) : (
      CAPTIONS.map((c, i) => <Caption key={i} {...c} />)
    )}
    <FilmFinish />
    <Audio src={staticFile("audio/star-life.wav")} />
  </AbsoluteFill>
);
