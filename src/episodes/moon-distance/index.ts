import type { EpisodeSpec, Variant } from "../../series/types";
import type { NarrationTrack } from "../../voice/types";
import long from "./narration.long.json";
import short from "./narration.short.json";
import { MOON_DISTANCE } from "./spec";

export const episode: { spec: EpisodeSpec; dir: string; tracks: Record<Variant, NarrationTrack> } = {
  spec: MOON_DISTANCE,
  dir: "src/episodes/moon-distance",
  tracks: { short: short as NarrationTrack, long: long as NarrationTrack },
};
