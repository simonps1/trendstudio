import React from "react";
import { AbsoluteFill, Audio, staticFile } from "remotion";
import { Caption } from "../../core/components/Caption";
import { CanvasLayer } from "../../core/components/CanvasLayer";
import { FilmFinish } from "../../core/components/FilmFinish";
import { ensureFonts } from "../../core/fonts";
import { BlackHole } from "./BlackHole";
import { drawBack, drawFront } from "./cosmos";
import { Hud } from "./Hud";
import { CAPTIONS } from "./timeline";

ensureFonts();

export const StarLife: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#03040b" }}>
    <CanvasLayer draw={drawBack} />
    <BlackHole />
    <CanvasLayer draw={drawFront} />
    <Hud />
    {CAPTIONS.map((c, i) => <Caption key={i} {...c} />)}
    <FilmFinish />
    <Audio src={staticFile("audio/star-life.wav")} />
  </AbsoluteFill>
);
