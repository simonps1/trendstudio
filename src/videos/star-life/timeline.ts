/**
 * "Born to Explode" — the life of a massive star in 40 seconds.
 * Single source of truth for scene timing; both the visuals and the
 * soundtrack import from here, so audio and picture can't drift apart.
 * All times in seconds.
 */
import { clamp, ease } from "../../core/anim";

export const DURATION = 40;

export const T = {
  hookEnd: 3.5,
  nebula: 3.5,
  ignition: 10.0, // flash frame
  main: 11.0,
  sunCompare: 13.5,
  giant: 19.0,
  collapse: 26.0,
  supernova: 28.5, // flash frame
  blackHole: 32.0,
  dust: 36.0,
  end: DURATION,
} as const;

/** Fallback caption script (used when no narration has been generated). *word* = accent colour. */
/** Big title cards shown on the visual hits (on top of narration captions). */
export const TITLES = [
  { start: 10.05, end: 11.1, text: "*Ignition*", y: 0.3, size: 150 },
  { start: 28.6, end: 29.5, text: "*Supernova*", y: 0.3, size: 170 },
];

export const CAPTIONS = [
  { start: 0.15, end: 1.75, text: "This star will live *10 million* years", y: 0.25 },
  { start: 1.85, end: 3.5, text: "and die in *under one second*", y: 0.25 },
  { start: 4.2, end: 7.4, text: "It starts as a cold cloud of gas", y: 0.27, variant: "body" as const, size: 64 },
  { start: 7.6, end: 9.8, text: "Gravity pulls it *tighter*", y: 0.27, variant: "body" as const, size: 64 },
  { start: 10.05, end: 11.7, text: "*Ignition*", y: 0.3, size: 150 },
  { start: 11.9, end: 13.4, text: "20× the mass of our Sun", y: 0.27, variant: "body" as const, size: 64 },
  { start: 13.7, end: 16.4, text: "That tiny dot? *That's the Sun*", y: 0.27, variant: "body" as const, size: 64 },
  { start: 16.6, end: 19.0, text: "It burns hydrogen for millions of years", y: 0.27, variant: "body" as const, size: 64 },
  { start: 19.5, end: 22.6, text: "Then it swells into a *red supergiant*", y: 0.27, variant: "body" as const, size: 64 },
  { start: 22.8, end: 26.0, text: "Big enough to swallow *Jupiter's orbit*", y: 0.27, variant: "body" as const, size: 64 },
  { start: 26.4, end: 28.3, text: "The core runs out of fuel…", y: 0.25, variant: "body" as const, size: 68 },
  { start: 28.5, end: 31.6, text: "*Supernova*", y: 0.3, size: 170 },
  { start: 32.4, end: 35.9, text: "What's left is a *black hole*", y: 0.27, variant: "body" as const, size: 66 },
  { start: 36.4, end: 39.7, text: "And its dust? *It became you.*", y: 0.27, variant: "body" as const, size: 68 },
];

// ------------------------------------------------------------ star physics (stylised)

export const PLANETS = [
  { name: "Mercury", au: 0.39, color: "#b9b2a8", size: 8, engulf: 21.5 },
  { name: "Venus", au: 0.72, color: "#e8cf9a", size: 11, engulf: 22.5 },
  { name: "Earth", au: 1.0, color: "#5aa9ff", size: 12, engulf: 23.5 },
  { name: "Mars", au: 1.52, color: "#e0704a", size: 9, engulf: 24.0 },
  { name: "Jupiter", au: 5.2, color: "#e2b98b", size: 20, engulf: 25.5 },
];

/** (time, radius AU) keyframes: the star's surface reaches each orbit exactly at its engulf time. */
const GIANT_KEYS: [number, number][] = [
  [T.giant, 0.05], ...PLANETS.map((p) => [p.engulf, p.au] as [number, number]), [T.collapse - 0.3, 6.2],
];

/** Monotone cubic (Fritsch–Carlson) interpolation in log-radius: smooth, never shrinks. */
function monotone(keys: [number, number][], x: number) {
  const n = keys.length;
  if (x <= keys[0][0]) return keys[0][1];
  if (x >= keys[n - 1][0]) return keys[n - 1][1];
  const xs = keys.map((k) => k[0]), ys = keys.map((k) => k[1]);
  const d = xs.slice(0, -1).map((_, i) => (ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  const m = ys.map((_, i) => (i === 0 ? d[0] : i === n - 1 ? d[n - 2] : d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2));
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], h = Math.hypot(a, b);
    if (h > 3) { m[i] = (3 * a * d[i]) / h; m[i + 1] = (3 * b * d[i]) / h; }
  }
  const i = xs.findIndex((v, k) => x >= v && x < xs[k + 1]);
  const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h;
  const h00 = 2 * t ** 3 - 3 * t ** 2 + 1, h10 = t ** 3 - 2 * t ** 2 + t, h01 = -2 * t ** 3 + 3 * t ** 2, h11 = t ** 3 - t ** 2;
  return h00 * ys[i] + h10 * h * m[i] + h01 * ys[i + 1] + h11 * h * m[i + 1];
}
const LOG_KEYS = GIANT_KEYS.map(([t, r]) => [t, Math.log(r)] as [number, number]);

/** Supergiant radius in AU at time t (used by visuals AND audio/voice timing). */
export function giantRadiusAU(t: number) {
  return Math.exp(monotone(LOG_KEYS, t));
}

/** Time at which the swelling star's surface reaches each planet's orbit. */
export function engulfTimes(): { name: string; t: number }[] {
  return PLANETS.map((p) => ({ name: p.name, t: p.engulf }));
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
