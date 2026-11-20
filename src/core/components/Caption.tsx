import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp, ease, progress } from "../anim";
import { FONT_BODY, FONT_DISPLAY } from "../fonts";

export interface CaptionProps {
  text: string;
  /** Seconds (absolute composition time). */
  start: number;
  end: number;
  /** Vertical anchor as a fraction of frame height (0 = top). */
  y?: number;
  size?: number;
  color?: string;
  accent?: string;
  /** Words wrapped in *asterisks* get the accent colour. */
  variant?: "display" | "body";
  /** Seconds between word reveals. */
  stagger?: number;
}

/** Short-form style caption: words pop in one by one with overshoot, then lift out. */
export const Caption: React.FC<CaptionProps> = ({
  text, start, end, y = 0.2, size = 92, color = "#fff", accent = "#ffcf5a", variant = "display", stagger = 0.07,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  if (t < start - 0.01 || t > end + 0.01) return null;
  const u = Math.min(width, height) / 1080;
  const out = ease.inCubic(progress(t, end - 0.25, end));
  // *several words* = accent; track open/close across words
  let open = false;
  const words = text.split(" ").map((raw) => {
    const starts = raw.startsWith("*"), ends = raw.endsWith("*") && raw.length > 1;
    const accentWord = open || starts;
    if (starts) open = true;
    if (ends) open = false;
    return { w: raw.replace(/^\*|\*$/g, ""), accentWord };
  });
  return (
    <AbsoluteFill style={{ alignItems: "center", pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute", top: `${y * 100}%`, transform: `translateY(-50%) translateY(${-out * 40 * u}px)`,
          width: "86%", textAlign: "center", opacity: 1 - out,
          fontFamily: variant === "display" ? FONT_DISPLAY : FONT_BODY,
          fontWeight: variant === "display" ? 400 : 800,
          fontSize: size * u, lineHeight: 1.08, letterSpacing: variant === "display" ? 1 * u : 0,
          textTransform: variant === "display" ? "uppercase" : "none",
          color, textShadow: `0 ${4 * u}px ${24 * u}px rgba(0,0,0,0.85), 0 0 ${2 * u}px rgba(0,0,0,0.9)`,
        }}
      >
        {words.map(({ w, accentWord: isAccent }, i) => {
          const p = clamp((t - start - i * stagger) / 0.32);
          const s = ease.outBack(p);
          return (
            <span key={i} style={{
              display: "inline-block", margin: `0 ${0.12 * size * u}px`,
              opacity: clamp(p * 3), transform: `translateY(${(1 - s) * 30 * u}px) scale(${0.6 + 0.4 * s})`,
              color: isAccent ? accent : undefined,
            }}>
              {w}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
