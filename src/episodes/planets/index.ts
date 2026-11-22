import type { EpisodeSpec, Variant } from "../../series/types";
import type { NarrationTrack } from "../../voice/types";
import long from "./narration.long.json";
import short from "./narration.short.json";
import { PLANETS } from "./spec";

export const episode: { spec: EpisodeSpec; dir: string; tracks: Record<Variant, NarrationTrack> } = {
  spec: PLANETS,
  dir: "src/episodes/planets",
  tracks: { short: short as NarrationTrack, long: long as NarrationTrack },
};
