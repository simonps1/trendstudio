import React from "react";
import { EPISODES, episodeVideoId } from "../episodes";
import { EpisodeVideo } from "../series/EpisodeVideo";
import type { Variant } from "../series/types";
import { StarLife } from "../videos/star-life/StarLife";
import { ZoomOut } from "../videos/zoom-out/ZoomOut";

/** Video id -> root component. Episodes are registered automatically. */
export const COMPONENTS: Record<string, React.FC> = {
  "star-life": StarLife,
  "zoom-out": ZoomOut,
  ...Object.fromEntries(
    EPISODES.flatMap((e) =>
      (["short", "long"] as Variant[]).map((variant) => {
        const videoId = episodeVideoId(e.spec.id, variant);
        const track = e.tracks[variant].lines.length ? e.tracks[variant] : null;
        const C: React.FC = () => <EpisodeVideo spec={e.spec} variant={variant} track={track} videoId={videoId} />;
        return [videoId, C];
      }),
    ),
  ),
};
