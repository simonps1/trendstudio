/**
 * "How small are we, really?" — one unbroken zoom from Earth to the observable universe.
 * No narration: words on screen and music only. Everything is a pure function of time.
 *
 * The camera is described by the width of the frame in kilometres (log10). Each station holds for a moment
 * (still drifting outward, never static), then the camera accelerates to the next one.
 */
import { clamp, ease, lerp } from "../../core/anim";

export const KM_PER_LY = 9.4607e12;
export const AU = 1.495978707e8;

export interface Station {
  /** log10 of the frame width in km when the camera lands here */
  logW: number;
  title: string;
  /** one checkable fact; estimates and artist's concepts are labelled as such */
  sub: string;
}

/** Sources: NASA Solar System Exploration (planet distances), NASA Voyager status (26 billion km, 2026),
 *  NASA "Oort Cloud" overview (outer edge 10,000–100,000 AU), NASA Imagine the Universe (Milky Way ~100,000 ly,
 *  Andromeda 2.5 million ly), NASA WMAP (observable universe ~93 billion ly across). */
export const STATIONS: Station[] = [
  { logW: Math.log10(1.76e4), title: "Earth", sub: "12,742 km wide · real photo" },
  { logW: Math.log10(1.06e6), title: "The Moon's orbit", sub: "384,400 km away · to scale" },
  { logW: Math.log10(6.3e8), title: "The inner planets", sub: "Sun to Mars: 228 million km" },
  { logW: Math.log10(1.25e10), title: "All eight planets", sub: "Neptune: 4.5 billion km out" },
  { logW: Math.log10(7.2e10), title: "Voyager 1", sub: "The farthest thing we ever sent" },
  { logW: Math.log10(4.15e13), title: "The Oort cloud", sub: "The Sun's real edge · predicted" },
  { logW: Math.log10(3.0e14), title: "The nearest stars", sub: "Alpha Centauri: 4.2 light-years" },
  { logW: Math.log10(1.31e18), title: "The Milky Way", sub: "100,000 light-years · artist's concept" },
  { logW: Math.log10(7.0e19), title: "Our Local Group", sub: "Andromeda: 2.5 million light-years" },
  { logW: Math.log10(1.22e24), title: "The observable universe", sub: "93 billion light-years across" },
];

/** Stations land on the 120 BPM grid: 3.5 s apart (7 beats), the last 2 s of each gap is the zoom. */
export const STEP = 3.5;
export const ZOOM = 2.0;
export const landing = (k: number) => k * STEP;
export const LAST = STATIONS.length - 1;
/** The zoom ends, then the real deep-field photograph fades in as the closing card. */
export const CARD_START = landing(LAST) + 2.5;
export const DURATION = CARD_START + 4;

/** Drift during a hold, in decades: the picture never stops moving. */
const DRIFT = 0.07;

/** log10(frame width in km) at time t. */
export function logWidth(t: number): number {
  const k = clamp(Math.floor((t + 1e-9) / STEP), 0, LAST);
  const from = STATIONS[k].logW;
  if (k === LAST) return from + DRIFT * clamp((t - landing(k)) / (DURATION - landing(k)));
  const holdEnd = landing(k + 1) - ZOOM;
  if (t <= holdEnd) return from + DRIFT * clamp((t - landing(k)) / (holdEnd - landing(k)));
  return lerp(from + DRIFT, STATIONS[k + 1].logW, ease.inOutCubic(clamp((t - holdEnd) / ZOOM)));
}

/** Zoom speed in decades per second (for streaks and sound). */
export const zoomSpeed = (t: number) => (logWidth(t + 1 / 120) - logWidth(t - 1 / 120)) * 60;

/** Which station's caption is showing, and how visible it is. */
export function caption(t: number): { index: number; alpha: number } {
  const k = clamp(Math.floor((t + 1e-9) / STEP), 0, LAST);
  const start = landing(k), end = k === LAST ? CARD_START : landing(k + 1) - ZOOM + 0.25;
  const a = Math.min(clamp((t - start + 0.12) / 0.3), clamp((end - t) / 0.3));
  return { index: k, alpha: k === 0 ? Math.min(1, clamp((end - t) / 0.3)) : a };
}

// ---- the world (km; origin at the Sun; y grows downward like the canvas) ----------------------------------

/** Earth's place on its orbit. */
export const EARTH = { x: AU * Math.cos(-0.62), y: AU * Math.sin(-0.62) };
/** The galactic centre: 26,000 light-years from the Sun. In NASA's artist's concept the Sun sits below the core. */
export const GALAXY = { x: 0, y: -26000 * KM_PER_LY };

const smooth = (x: number, a: number, b: number) => { const p = clamp((x - a) / (b - a)); return p * p * (3 - 2 * p); };

/** Camera centre: on Earth at first, sliding to the Sun, then to the centre of the galaxy. */
export function centre(logW: number) {
  const e = 1 - smooth(logW, 6.4, 8.1), g = smooth(logW, 15.2, 17.6);
  return { x: EARTH.x * e + GALAXY.x * g, y: EARTH.y * e + GALAXY.y * g };
}

/** "22,000 km", "4.6 billion km", "3.1 light-years", "93 billion light-years": two significant figures. */
export function formatWidth(km: number): string {
  const sig = (x: number) => { const p = Math.pow(10, Math.floor(Math.log10(x)) - 1); return Math.round(x / p) * p; };
  const small = (x: number) => { const v = sig(x); return v >= 100 ? Math.round(v).toLocaleString("en-US") : String(Number(v.toPrecision(2))); };
  const scaled = (x: number, unit: string) => {
    if (x < 1e6) return `${small(x)} ${unit}`;
    if (x < 1e9) return `${small(x / 1e6)} million ${unit}`;
    if (x < 1e12) return `${small(x / 1e9)} billion ${unit}`;
    return `${small(x / 1e12)} trillion ${unit}`;
  };
  // switch to light-years once the frame is a tenth of one wide
  return km < 0.1 * KM_PER_LY ? scaled(km, "km") : scaled(km / KM_PER_LY, "light-years");
}
