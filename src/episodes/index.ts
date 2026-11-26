import { episode as blackHoles } from "./black-holes";
import { episode as earthSize } from "./earth-size";
import { episode as moonDistance } from "./moon-distance";
import { episode as nebulae } from "./nebulae";
import { episode as planets } from "./planets";
import { episode as starSizes } from "./star-sizes";
import { episode as tinyStars } from "./tiny-stars";
import { episode as voyager } from "./voyager";

/** Every series episode. Add new episodes here. */
export const EPISODES = [starSizes, earthSize, tinyStars, blackHoles, planets, moonDistance, nebulae, voyager];

export const episodeVideoId = (id: string, variant: "short" | "long") => (variant === "long" ? `${id}-long` : id);
