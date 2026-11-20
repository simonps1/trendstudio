import type { VideoMeta } from "./types";
import { DURATION as STAR_LIFE_DURATION } from "../videos/star-life/timeline";

/**
 * Every video project. Node-safe: scripts import this; Root.tsx pairs each
 * entry with its React component from registry.ts.
 */
export const MANIFEST: VideoMeta[] = [
  {
    id: "star-life",
    title: "Born to Explode — the life of a massive star",
    durationSec: STAR_LIFE_DURATION,
    formats: ["vertical", "horizontal", "vertical4k", "horizontal4k"],
    soundtrack: async () => (await import("../videos/star-life/soundtrack")).buildSoundtrack(),
  },
];

export const findVideo = (id: string) => MANIFEST.find((v) => v.id === id);
