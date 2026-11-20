import { EPISODES, episodeVideoId } from "../episodes";
import { layoutEpisode, narrationLines } from "../series/layout";
import type { Variant } from "../series/types";
import type { VideoMeta } from "./types";
import { DURATION as STAR_LIFE_DURATION } from "../videos/star-life/timeline";

/**
 * Every video project. Node-safe: scripts import this; Root.tsx pairs each
 * entry with its React component from registry.ts.
 */
const usable = (t: { lines: unknown[] }) => (t.lines.length ? t : null);

/** Each episode yields two videos: a Shorts cut (<60 s) and a long cut (>60 s, TikTok-eligible). */
const EPISODE_VIDEOS: VideoMeta[] = EPISODES.flatMap((e) =>
  (["short", "long"] as Variant[]).map((variant): VideoMeta => {
    const id = episodeVideoId(e.spec.id, variant);
    const layout = () => layoutEpisode(e.spec, variant, usable(e.tracks[variant]) as never);
    return {
      id,
      title: `${e.spec.series} ${e.spec.episode}: ${e.spec.title}${variant === "long" ? " (long cut)" : ""}`,
      durationSec: layout().duration,
      formats: ["vertical", "vertical4k"], // series scenes are composed for vertical; horizontal needs its own layout
      narrationJson: `${e.dir}/narration.${variant}.json`,
      narration: async () => ({ voice: e.spec.voice, lines: narrationLines(e.spec, variant) }),
      soundtrack: async (ctx) => (await import("../series/soundtrack")).buildEpisodeSoundtrack(layout(), ctx),
    };
  }),
);

export const narrationJsonPath = (v: VideoMeta) => v.narrationJson ?? `src/videos/${v.id}/narration.json`;

export const MANIFEST: VideoMeta[] = [
  {
    id: "star-life",
    title: "Born to Explode — the life of a massive star",
    durationSec: STAR_LIFE_DURATION,
    formats: ["vertical", "horizontal", "vertical4k", "horizontal4k"],
    soundtrack: async (ctx) => (await import("../videos/star-life/soundtrack")).buildSoundtrack(ctx),
    narration: async () => {
      const m = await import("../videos/star-life/narration");
      return { voice: m.VOICE, lines: m.NARRATION };
    },
  },
  ...EPISODE_VIDEOS,
];

export const findVideo = (id: string) => MANIFEST.find((v) => v.id === id);
