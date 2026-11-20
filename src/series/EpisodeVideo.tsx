import React, { useCallback, useMemo } from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { progress } from "../core/anim";
import { CanvasLayer, type DrawContext } from "../core/components/CanvasLayer";
import { FilmFinish } from "../core/components/FilmFinish";
import { KaraokeCaptions } from "../core/components/KaraokeCaptions";
import { ensureFonts, FONT_BODY } from "../core/fonts";
import type { NarrationTrack } from "../voice/types";
import { layoutEpisode } from "./layout";
import { drawEpisode } from "./scenes";
import type { EpisodeSpec, Variant } from "./types";

ensureFonts();

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
      {spec.series.toUpperCase()} · EP {spec.episode}
    </div>
  );
};

/** Generic player for any series episode. */
export const EpisodeVideo: React.FC<{ spec: EpisodeSpec; variant: Variant; track: NarrationTrack | null; videoId: string }> = ({ spec, variant, track, videoId }) => {
  const layout = useMemo(() => layoutEpisode(spec, variant, track), [spec, variant, track]);
  const draw = useCallback((d: DrawContext) => drawEpisode(d, layout), [layout]);
  return (
    <AbsoluteFill style={{ backgroundColor: "#03040b" }}>
      <CanvasLayer draw={draw} />
      <SeriesTag spec={spec} duration={layout.duration} />
      <KaraokeCaptions words={layout.words} emphasis={spec.emphasis ?? []} y={0.215} />
      <FilmFinish />
      <Audio src={staticFile(`audio/${videoId}.wav`)} />
    </AbsoluteFill>
  );
};
