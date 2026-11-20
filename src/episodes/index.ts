import { episode as starSizes } from "./star-sizes";

/** Every series episode. Add new episodes here. */
export const EPISODES = [starSizes];

export const episodeVideoId = (id: string, variant: "short" | "long") => (variant === "long" ? `${id}-long` : id);
