import type { EpisodeSpec, Variant } from "../../series/types";
import type { NarrationTrack } from "../../voice/types";
import long from "./narration.long.json";
import short from "./narration.short.json";
import { STAR_SIZES } from "./spec";

export const episode: { spec: EpisodeSpec; dir: string; tracks: Record<Variant, NarrationTrack> } = {
  spec: STAR_SIZES,
  dir: "src/episodes/star-sizes",
  tracks: { short: short as NarrationTrack, long: long as NarrationTrack },
};
