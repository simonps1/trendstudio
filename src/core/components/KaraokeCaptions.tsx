import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { chunkWords } from "../../voice/align";
import type { WordTiming } from "../../voice/types";
import { clamp, ease } from "../anim";
import { FONT_DISPLAY } from "../fonts";

export interface KaraokeProps {
  /** Absolute word timings (seconds) for the whole video. */
  words: WordTiming[];
  /** Vertical anchor as a fraction of frame height. */
  y?: number;
  size?: number;
  color?: string;
  active?: string;
  /** Words (lowercase, no punctuation) that always get the accent colour. */
  emphasis?: string[];
  emphasisColor?: string;
  maxWords?: number;
  /** Keep every chunk on a single line, shrinking long ones to fit, so captions never grow down into the scene. */
  oneLine?: boolean;
}

const clean = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, "");

/**
 * Short-form captions synced to the voice: 1–4 word chunks, the word being
 * spoken pops in the accent colour. The very first chunk is already visible
 * on frame 0 so the opening frame (cover / first impression) carries the hook.
 */
export const KaraokeCaptions: React.FC<KaraokeProps> = ({
  words, y = 0.27, size = 100, color = "#ffffff", active = "#ffd23f", emphasis = [], emphasisColor = "#7fd4ff", maxWords = 4, oneLine = false,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const u = Math.min(width, height) / 1080;
  const chunks = useMemo(() => chunkWords(words, maxWords, 20), [words, maxWords]);
  const emph = useMemo(() => new Set(emphasis.map(clean)), [emphasis]);

  const idx = chunks.findIndex((c, i) => {
    const start = i === 0 ? 0 : c[0].start - 0.04;
    const next = chunks[i + 1];
    const end = Math.min(c[c.length - 1].end + 0.45, next ? next[0].start - 0.04 : Infinity);
    return t >= start && t < end;
  });
  if (idx < 0) return null;
  const chunk = chunks[idx];
  // estimated line width in units of the font size (condensed display face, plus the gaps between words)
  const est = chunk.reduce((n, w) => n + w.word.replace(/[.,!?;:…]+$/, "").length * 0.52 + 0.4, 0);
  const fit = oneLine ? Math.min(1, (0.9 * width) / (est * size * u)) : 1;
  const enter = idx === 0 ? 1 : ease.outBack(clamp((t - (chunk[0].start - 0.04)) / 0.14));

  return (
    <AbsoluteFill style={{ alignItems: "center", pointerEvents: "none" }}>
      <div style={{
        position: "absolute", top: `${y * 100}%`, width: "90%", textAlign: "center", ...(oneLine ? { display: "flex", justifyContent: "center", whiteSpace: "nowrap" as const } : {}),
        transform: `translateY(-50%) scale(${0.82 + 0.18 * enter})`, opacity: clamp(enter * 2),
        fontFamily: FONT_DISPLAY, fontSize: size * u * fit, lineHeight: 1.04, textTransform: "uppercase", letterSpacing: 1.5 * u,
      }}>
        {chunk.map((w, i) => {
          const speaking = t >= w.start - 0.02 && t < w.end + 0.06;
          const spoken = t >= w.start - 0.02;
          const pop = speaking ? ease.outBack(clamp((t - w.start + 0.02) / 0.12)) : 0;
          const fill = speaking ? active : emph.has(clean(w.word)) ? emphasisColor : color;
          return (
            <span key={i} style={{
              display: "inline-block", margin: `0 ${0.2 * size * u * fit}px`, color: fill, transformOrigin: "50% 70%",
              opacity: spoken || idx === 0 ? 1 : 0.88,
              transform: `scale(${1 + 0.08 * pop}) translateY(${-5 * u * pop}px)`,
              WebkitTextStroke: `${7 * u}px #000`, paintOrder: "stroke fill",
              textShadow: `0 ${6 * u}px ${18 * u}px rgba(0,0,0,0.8)`,
            }}>{w.word.replace(/[.,!?;:…]+$/, "")}</span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
