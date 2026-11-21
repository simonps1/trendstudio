import type { EpisodeSpec, Variant } from "../../series/types";
import type { NarrationTrack } from "../../voice/types";
import long from "./narration.long.json";
import short from "./narration.short.json";
import { EARTH_SIZE } from "./spec";

export const episode: { spec: EpisodeSpec; dir: string; tracks: Record<Variant, NarrationTrack> } = {
  spec: EARTH_SIZE,
  dir: "src/episodes/earth-size",
  tracks: { short: short as NarrationTrack, long: long as NarrationTrack },
};
