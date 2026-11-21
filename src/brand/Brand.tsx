import React, { useCallback } from "react";
import { AbsoluteFill } from "remotion";
import { CanvasLayer, type DrawContext } from "../core/components/CanvasLayer";
import { ensureFonts, FONT_BODY, FONT_DISPLAY } from "../core/fonts";
import { BodiesGL, type PlacedBody } from "../series/BodiesGL";
import { drawHost } from "../series/host";
import type { Body } from "../series/types";
import { drawStarfield } from "../videos/star-life/cosmos";

ensureFonts();

export const CHANNEL_NAME = "Tiny Astronaut";
export const TAGLINE = "One astronaut. One huge universe.";

const STAR: Body = { name: "Stephenson 2-18", kind: "star", radius: 1, temp: 0.08 };
const EARTH: Body = { name: "Earth", kind: "planet", radius: 1, color: "#2a6fd6", surface: "earth" };
const T0 = 3.2; // a fixed moment, so the art is always the same

const sky = ({ ctx, width: w, height: h }: DrawContext) => {
  ctx.fillStyle = "#03040b"; ctx.fillRect(0, 0, w, h);
  drawStarfield(ctx, T0, w, h, Math.min(w, h) / 1080, 1);
};

/** Profile picture (square; platforms crop it to a circle, so everything important is central). */
export const Avatar: React.FC = () => {
  const place = useCallback((_t: number, w: number, h: number): PlacedBody[] => [
    { body: STAR, x: w * 0.86, y: h * 0.92, r: w * 0.62 },
  ], []);
  const host = useCallback(({ ctx, width: w, height: h }: DrawContext) => {
    drawHost(ctx, w * 0.46, h * 0.5, h * 0.62, T0, { talk: 0.8, excite: 0.32 });
  }, []);
  return (
    <AbsoluteFill style={{ backgroundColor: "#03040b" }}>
      <CanvasLayer draw={sky} />
      <BodiesGL place={place} />
      <CanvasLayer draw={host} />
    </AbsoluteFill>
  );
};

/** YouTube banner 2560x1440. Text and host stay inside the central 1546x423 area that every device shows. */
export const Banner: React.FC = () => {
  const place = useCallback((_t: number, w: number, h: number): PlacedBody[] => [
    { body: STAR, x: w * 1.02, y: h * 0.5, r: h * 0.78 },
    { body: EARTH, x: w * 0.085, y: h * 0.32, r: h * 0.07 },
  ], []);
  const host = useCallback(({ ctx, width: w, height: h }: DrawContext) => {
    drawHost(ctx, w * 0.262, h * 0.5, h * 0.27, T0, { talk: 0.8, excite: 0.32 });
  }, []);
  return (
    <AbsoluteFill style={{ backgroundColor: "#03040b" }}>
      <CanvasLayer draw={sky} />
      <BodiesGL place={place} />
      <CanvasLayer draw={host} />
      <AbsoluteFill style={{ justifyContent: "center", paddingLeft: "34%" }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 172, lineHeight: 1, color: "#fff", textTransform: "uppercase", letterSpacing: 4, textShadow: "0 8px 40px rgba(0,0,0,0.9)" }}>
          Tiny <span style={{ color: "#ffd23f" }}>Astronaut</span>
        </div>
        <div style={{ fontFamily: FONT_BODY, fontWeight: 800, fontSize: 50, color: "#cfe0ff", marginTop: 22, letterSpacing: 2, textShadow: "0 4px 20px rgba(0,0,0,0.9)" }}>
          {TAGLINE}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
