import type { EpisodeSpec, Variant } from "../../series/types";
import type { NarrationTrack } from "../../voice/types";
import long from "./narration.long.json";
import short from "./narration.short.json";
import { BLACK_HOLES } from "./spec";

export const episode: { spec: EpisodeSpec; dir: string; tracks: Record<Variant, NarrationTrack> } = {
  spec: BLACK_HOLES,
  dir: "src/episodes/black-holes",
  tracks: { short: short as NarrationTrack, long: long as NarrationTrack },
};
