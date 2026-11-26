/**
 * Series format: an episode is a list of beats. Each beat is one spoken line
 * plus one visual. Timing comes from the voice (voice-first), so writing an
 * episode means writing a script and choosing visuals — no hand-timed frames.
 */
export interface Body {
  name: string;
  kind: "star" | "planet" | "hole" | "nebula";
  /** Relative radius; only ratios between bodies matter (e.g. Earth = 1). */
  radius: number;
  /** Stars: 0 = red … 1 = blue-white. */
  temp?: number;
  /** Planets: base colour and surface style. */
  color?: string;
  surface?: "plain" | "earth" | "bands" | "rocky" | "mars";
  /** Nebulae: second colour of the gas, and the shape ("ring" = the shell a dying star blows off). */
  color2?: string;
  /** Nebulae: a photograph (path under public/) drawn instead of the painted cloud. */
  image?: string;
  shape?: "cloud" | "ring";
  /** Planets: draw a ring system (Saturn). */
  rings?: boolean;
  /** Black holes: tilt of the accretion disc (0 = no disc, a bare hole; default 0.2 = nearly edge-on). */
  disc?: number;
  /** Black holes: strength of the jets from the poles (0 = none … 1 = a quasar). */
  jet?: number;
  /** Small line under the name, e.g. "109 Earths wide". */
  note?: string;
}

export type Visual =
  /** One body, centred, with a slow push-in. `fact` replaces the small note with a headline number. */
  | { type: "body"; body: Body; fact?: string }
  /**
   * Zoom out from `from` to reveal the larger `to`, drawn to scale. `big` = cinematic impact.
   * `open` = cold open for a video's first beat: the big body already fills the frame at 0:00 and
   * slams into place half a second later, so the first second is the spectacle, not the build-up.
   */
  | { type: "compare"; from: Body; to: Body; big?: boolean; open?: boolean }
  /** Planet orbits drawn inside a star of radius `radiusAu` (astronomical units). */
  | { type: "orbits"; body: Body; radiusAu: number; orbits: { name: string; au: number; label?: boolean }[] }
  /** A photon laps the body; counter runs 0 → `value` `unit`. */
  | { type: "lap"; body: Body; value: number; unit: string; decimals?: number }
  /** Two bodies of similar size side by side, to scale. */
  | { type: "pair"; a: Body; b: Body }
  /**
   * Two bodies with the true distance between them, to scale (`distance` = centre to centre, in radius units).
   * `ruler` marks the gap in steps; `fill` lines bodies up inside it; `trip` sends something across.
   */
  | {
      type: "gap"; a: Body; b: Body; distance: number; note?: string;
      ruler?: { step: number; label: string };
      fill?: Body[];
      trip?: { label: string; seconds?: number };
    }
  /** The body shrinks to a point among the stars (endings). */
  | { type: "shrink"; body: Body }
  /**
   * Without `body` the photograph stands on its own: `ring` is its caption, and `at` + `r` (optional) circle a detail.
   * `fit: "contain"` shows the whole picture across the frame's width over a blurred copy of itself.
   * A real photograph filling the frame, with `body` drawn on top of it to scale: centre `at` (fractions of the
   * frame) and radius `r` (fraction of the frame width). `ring` labels the circle (e.g. "≈ 20 km"). `lift` slides the photo
   * up by that fraction of the frame height (its bottom edge fades into the sky), to bring the subject to mid-frame.
   */
  | { type: "photo"; image: string; body?: Body; at?: [number, number]; r?: number; ring?: string; lift?: number; fit?: "cover" | "contain" }
  /** Just the starfield (calls to action, pauses). */
  | { type: "stars" };

export interface Beat {
  id: string;
  /** The spoken line (also the caption text). */
  say: string;
  visual: Visual;
  /** Extra seconds to hold the visual after the line ends. */
  hold?: number;
  speed?: number;
  /** Include only in this cut. Omit = both. */
  only?: Variant;
}

export type Variant = "short" | "long";

/** Every posted video gets its own number, so no two videos show the same "EP". */
export const episodeNumber = (spec: EpisodeSpec, variant: Variant) => (variant === "long" ? spec.episodeLong : spec.episode);

export interface EpisodeSpec {
  id: string;
  series: string;
  /** Number shown on screen for the short cut: its place in the posting order. */
  episode: number;
  /** Number shown on the long cut, which is posted as its own video. */
  episodeLong: number;
  title: string;
  /** Cuts that leave out the "Cosmic Scale · EP n" line at the top (e.g. a video posted as a reply to a comment). */
  hideTag?: Variant[];
  /** The long cut is its own video on a different angle of the topic, so it has its own title and question. */
  titleLong?: string;
  askLong?: string;
  voice: string;
  beats: Beat[];
  /** A question shown on screen at the very end, to give viewers something to answer in the comments. */
  ask?: string;
  /** Words (lowercase) highlighted in captions. */
  emphasis?: string[];
}

/** Radius (design px at 1080) a featured body is shown at. */
export const FIT = 300;
/** Seconds between orbit reveals (shared by visuals and soundtrack). */
export const orbitStagger = (dur: number, n: number) => Math.min(0.5, Math.max(0.15, (dur - 1.2) / Math.max(1, n)));

/** How far a body's picture reaches beyond its radius (rings, accretion disc). `full` = the whole extent. */
export const extent = (b: Body, full = false) => (b.rings ? (full ? 2.35 : 1.6) : b.kind === "hole" ? (b.disc === 0 ? 1.18 : full ? 1.9 : 1.55) : 1);

/** The channel narrator: one voice and delivery style for every video (styles are defined in scripts/build-voice.ts). */
export const NARRATOR = "chatterbox:calm";
