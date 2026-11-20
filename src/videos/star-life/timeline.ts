/**
 * "Born to Explode" — the life of a massive star in 40 seconds.
 * Single source of truth for scene timing; both the visuals and the
 * soundtrack import from here, so audio and picture can't drift apart.
 * All times in seconds.
 */
import { clamp, ease, progress } from "../../core/anim";

export const DURATION = 40;

export const T = {
  hookEnd: 3.6,
  nebula: 3.6,
  ignition: 10.0, // flash frame
  main: 11.0,
  sunCompare: 13.6,
  giant: 19.2,
  collapse: 26.2,
  supernova: 28.4, // flash frame
  blackHole: 32.0,
  dust: 36.2,
  end: DURATION,
} as const;

/** Caption script. *word* = accent colour. */
export const CAPTIONS = [
  { start: 0.15, end: 1.75, text: "This star will live *10 million* years", y: 0.25 },
  { start: 1.85, end: 3.5, text: "and die in *under one second*", y: 0.25 },
  { start: 4.2, end: 7.4, text: "It starts as a cold cloud of gas", y: 0.27, variant: "body" as const, size: 64 },
  { start: 7.6, end: 9.8, text: "Gravity pulls it *tighter*", y: 0.27, variant: "body" as const, size: 64 },
  { start: 10.05, end: 11.7, text: "*Ignition*", y: 0.27, size: 150 },
  { start: 11.9, end: 13.4, text: "20× the mass of our Sun", y: 0.27, variant: "body" as const, size: 64 },
  { start: 13.7, end: 16.4, text: "That tiny dot? *That's the Sun*", y: 0.27, variant: "body" as const, size: 64 },
  { start: 16.6, end: 19.0, text: "It burns hydrogen for millions of years", y: 0.27, variant: "body" as const, size: 64 },
  { start: 19.5, end: 22.6, text: "Then it swells into a *red supergiant*", y: 0.27, variant: "body" as const, size: 64 },
  { start: 22.8, end: 26.0, text: "Big enough to swallow *Jupiter's orbit*", y: 0.27, variant: "body" as const, size: 64 },
  { start: 26.4, end: 28.3, text: "The core runs out of fuel…", y: 0.25, variant: "body" as const, size: 68 },
  { start: 28.5, end: 31.6, text: "*Supernova*", y: 0.25, size: 170 },
  { start: 32.4, end: 35.9, text: "What's left is a *black hole*", y: 0.27, variant: "body" as const, size: 66 },
  { start: 36.4, end: 39.7, text: "And its dust? *It became you.*", y: 0.27, variant: "body" as const, size: 68 },
];

// ------------------------------------------------------------ star physics (stylised)

/** Supergiant radius in AU at time t (used by visuals AND audio cue timing). */
export function giantRadiusAU(t: number) {
  const p = progress(t, T.giant, T.collapse - 0.3);
  return 0.05 + 6.2 * p * p;
}

export const PLANETS = [
  { name: "Mercury", au: 0.39, color: "#b9b2a8", size: 8 },
  { name: "Venus", au: 0.72, color: "#e8cf9a", size: 11 },
  { name: "Earth", au: 1.0, color: "#5aa9ff", size: 12 },
  { name: "Mars", au: 1.52, color: "#e0704a", size: 9 },
  { name: "Jupiter", au: 5.2, color: "#e2b98b", size: 20 },
];

/** Time at which the swelling star's surface reaches each planet's orbit. */
export function engulfTimes(): { name: string; t: number }[] {
  return PLANETS.map((p) => {
    let t = T.giant;
    while (t < T.collapse && giantRadiusAU(t) < p.au) t += 1 / 240;
    return { name: p.name, t };
  });
}

/** Year counter value shown on screen. */
export function counter(t: number): { label: string; value: string } {
  if (t < T.nebula) return { label: "YEARS", value: "0" };
  if (t < T.collapse) {
    const keys: [number, number][] = [
      [T.nebula, 0], [T.ignition, 600_000], [T.giant, 9_100_000], [T.collapse, 10_000_000],
    ];
    let years = 0;
    for (let i = 0; i < keys.length - 1; i++) {
      const [t0, y0] = keys[i], [t1, y1] = keys[i + 1];
      if (t >= t0 && t <= t1) years = y0 + (y1 - y0) * ease.inOutCubic((t - t0) / (t1 - t0));
    }
    return { label: "YEARS", value: Math.round(years / 1000) * 1000 + "" };
  }
  // the collapse itself takes a fraction of a second: slow-motion counter
  const sec = 0.25 * clamp((t - T.collapse) / (T.supernova - T.collapse));
  return { label: "SECONDS", value: sec.toFixed(3) };
}
