import { episode as earthSize } from "./earth-size";
import { episode as starSizes } from "./star-sizes";
import { episode as tinyStars } from "./tiny-stars";

/** Every series episode. Add new episodes here. */
export const EPISODES = [starSizes, earthSize, tinyStars];

export const episodeVideoId = (id: string, variant: "short" | "long") => (variant === "long" ? `${id}-long` : id);
