import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";
import { ensureFonts } from "../fonts";

export interface DrawContext {
  ctx: CanvasRenderingContext2D;
  frame: number;
  /** Seconds since the start of the composition (or Sequence). */
  t: number;
  width: number;
  height: number;
  /** Design unit: 1 = 1px at 1080 on the short edge. Scales to any format. */
  u: number;
}

/**
 * Full-frame 2D canvas redrawn synchronously for every frame.
 * `draw` must be a pure function of time (no state carried between frames).
 */
export const CanvasLayer: React.FC<{
  draw: (d: DrawContext) => void;
  style?: React.CSSProperties;
}> = ({ draw, style }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  // canvas text needs the fonts to be usable, not just requested: hold the frame until they are, then redraw
  const [fonts, setFonts] = useState(false);
  const [hold] = useState(() => delayRender("canvas fonts"));
  useEffect(() => {
    let live = true;
    ensureFonts().catch(() => null).then(() => { if (live) setFonts(true); continueRender(hold); });
    return () => { live = false; };
  }, [hold]);
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, width, height);
    draw({ ctx, frame, t: frame / fps, width, height, u: Math.min(width, height) / 1080 });
  }, [draw, frame, fps, width, height, fonts]);
  return (
    <AbsoluteFill style={style}>
      <canvas ref={ref} width={width} height={height} style={{ width: "100%", height: "100%" }} />
    </AbsoluteFill>
  );
};
