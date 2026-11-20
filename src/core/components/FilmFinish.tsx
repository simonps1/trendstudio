import React, { useCallback } from "react";
import { AbsoluteFill } from "remotion";
import { rng } from "../anim";
import { CanvasLayer, type DrawContext } from "./CanvasLayer";

let tile: HTMLCanvasElement | null = null;
function grainTile() {
  if (tile) return tile;
  tile = document.createElement("canvas");
  tile.width = tile.height = 256;
  const c = tile.getContext("2d")!;
  const img = c.createImageData(256, 256);
  const r = rng(99);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = r() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  return tile;
}

/** Vignette + subtle animated film grain (also reduces gradient banding). */
export const FilmFinish: React.FC<{ grain?: number; vignette?: number }> = ({ grain = 0.05, vignette = 0.55 }) => {
  const draw = useCallback(({ ctx, frame, width, height }: DrawContext) => {
    const r = rng(frame * 7919 + 1);
    const pat = ctx.createPattern(grainTile(), "repeat")!;
    ctx.translate(-r() * 256, -r() * 256);
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, width + 256, height + 256);
  }, []);
  return (
    <>
      <CanvasLayer draw={draw} style={{ mixBlendMode: "overlay", opacity: grain }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,${vignette}) 100%)` }} />
    </>
  );
};
