import React, { useCallback, useMemo } from "react";
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { progress } from "../core/anim";
import { CanvasLayer, type DrawContext } from "../core/components/CanvasLayer";
import { FilmFinish } from "../core/components/FilmFinish";
import { writtenCaptions } from "./captions";
import { KaraokeCaptions } from "../core/components/KaraokeCaptions";
import { ensureFonts, FONT_BODY, FONT_DISPLAY } from "../core/fonts";
import type { NarrationTrack } from "../voice/types";
import { layoutEpisode } from "./layout";
import { BodiesGL } from "./BodiesGL";
import { activePhoto, drawBackground, drawOverlay, placeBodies } from "./scenes";
import type { EpisodeSpec, Variant } from "./types";

ensureFonts();

/** The series name at the top. No episode number: videos are posted in whatever order suits the channel. */
const SeriesTag: React.FC<{ spec: EpisodeSpec; duration: number }> = ({ spec, duration }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps, u = Math.min(width, height) / 1080;
  const a = progress(t, 0.2, 0.7) * (1 - progress(t, duration - 0.6, duration - 0.2));
  return (
    <div style={{
      position: "absolute", top: (height > width ? 250 : 44) * u, left: 0, right: 0, textAlign: "center", opacity: a * 0.85,
      fontFamily: FONT_BODY, fontWeight: 800, fontSize: 24 * u, letterSpacing: 7 * u, color: "#cfe0ff",
    }}>
      {spec.series.toUpperCase()}
    </div>
  );
};

/** A silent nudge in the last two seconds: the ending stays clean enough to loop, but the ask is on screen. */
const FollowTag: React.FC<{ spec: EpisodeSpec; ask?: string; duration: number; high?: boolean }> = ({ ask, duration, high }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps, u = Math.min(width, height) / 1080;
  const a = progress(t, duration - 2.8, duration - 2.4) * (1 - progress(t, duration - 0.35, duration - 0.1));
  if (a <= 0) return null;
  return (
    <div style={{ position: "absolute", top: height * (high ? 0.268 : 0.36), left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 22 * u, opacity: a, transform: `translateY(${(1 - a) * 18 * u}px)` }}>
      {ask ? (
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 62 * u, lineHeight: 1.1, letterSpacing: 1.5 * u, color: "#fff", textAlign: "center", maxWidth: 860 * u, textTransform: "uppercase", textShadow: `0 ${4 * u}px ${24 * u}px rgba(0,0,0,0.95), 0 0 ${3 * u}px #000` }}>
          {ask}
        </div>
      ) : null}
      <div style={{
        fontFamily: FONT_DISPLAY, fontSize: 46 * u, letterSpacing: 2 * u, color: "#1c1200", background: "#ffd23f",
        padding: `${10 * u}px ${30 * u}px`, borderRadius: 10 * u, boxShadow: `0 ${10 * u}px ${40 * u}px rgba(255,180,50,0.55)`,
      }}>
        FOLLOW FOR MORE
      </div>
    </div>
  );
};

/** A real photograph behind a "photo" beat: fills the frame, pulls back slowly, and is dimmed a little so words stay readable. */
const PhotoLayer: React.FC<{ layout: ReturnType<typeof layoutEpisode> }> = ({ layout }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = activePhoto(layout, frame / fps);
  if (!p) return null;
  const lift = p.v.lift ?? 0;
  return (
    <AbsoluteFill style={{ opacity: p.alpha, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${p.zoom})`, transformOrigin: `${p.v.at[0] * 100}% ${p.v.at[1] * 100}%` }}>
        <Img src={staticFile(p.v.image)} style={{
          position: "absolute", left: 0, top: `${-lift * 100}%`, width: "100%", height: "100%", objectFit: "cover",
          filter: "brightness(0.85) saturate(1.1)",
        }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: `linear-gradient(180deg, rgba(3,4,11,0.78) 0%, rgba(3,4,11,0.2) 28%, rgba(3,4,11,0) 50%, rgba(3,4,11,0) ${(1 - lift - 0.16) * 100}%, #03040b ${(1 - lift - 0.015) * 100}%)` }} />
    </AbsoluteFill>
  );
};

/** Generic player for any series episode. */
export const EpisodeVideo: React.FC<{ spec: EpisodeSpec; variant: Variant; track: NarrationTrack | null; videoId: string }> = ({ spec, variant, track, videoId }) => {
  const layout = useMemo(() => layoutEpisode(spec, variant, track), [spec, variant, track]);
  const captionWords = useMemo(() => writtenCaptions(layout.words), [layout]);
  const background = useCallback((d: DrawContext) => drawBackground(d, layout), [layout]);
  const overlay = useCallback((d: DrawContext) => drawOverlay(d, layout), [layout]);
  const place = useCallback((t: number, w: number, h: number, u: number) => placeBodies(layout, t, w, h, u), [layout]);
  return (
    <AbsoluteFill style={{ backgroundColor: "#03040b" }}>
      <CanvasLayer draw={background} />
      <PhotoLayer layout={layout} />
      <BodiesGL place={place} />
      <CanvasLayer draw={overlay} />
      {spec.hideTag?.includes(variant) ? null : <SeriesTag spec={spec} duration={layout.duration} />}
      <FollowTag spec={spec} ask={variant === "long" ? spec.askLong ?? spec.ask : spec.ask} duration={layout.duration} high={layout.beats[layout.beats.length - 1].beat.visual.type === "body"} />
      <KaraokeCaptions words={captionWords} emphasis={spec.emphasis ?? []} y={0.215} oneLine />
      <FilmFinish />
      <Audio src={staticFile(`audio/${videoId}.wav`)} />
    </AbsoluteFill>
  );
};
