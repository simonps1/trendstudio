/**
 * Reusable 120 BPM backing track: arpeggio, bass, kick, hats, clap and pad.
 * `level(t)` (0..4) says how much of the arrangement plays; `isQuiet(t)` drops
 * everything but a soft arpeggio and the pad (breakdowns, endings).
 */
import { adEnv, biquad, fades, type Mixer, mix, noise, pad, shape, sine, softSaw } from "./synth";

export const BPM = 120;
export const BEAT = 60 / BPM;

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);
// A minor: Am – F – C – G, one chord per bar (4 beats)
const BARS = [[45, 57, 60, 64], [41, 57, 60, 65], [48, 55, 60, 64], [43, 55, 59, 62]];

const kick = () => mix([shape(sine(0.32, (t) => 46 + 110 * Math.exp(-t * 32)), adEnv(0.002, 0.11)), 1], [shape(biquad(noise(0.02, 3), "highpass", 1500), adEnv(0.0005, 0.004)), 0.25]);
const hat = (seed: number) => shape(biquad(noise(0.06, seed), "highpass", 7000), adEnv(0.001, 0.018));
const clap = (seed: number) => shape(biquad(noise(0.22, seed), "bandpass", 1700, 1.1), (t) => (t < 0.03 ? 0.6 + 0.4 * Math.sin(t * 700) : 1) * Math.exp(-t / 0.07));
const pluck = (f: number, bright: number, seed: number) => shape(biquad(softSaw(0.3, f, 7, seed), "lowpass", (t) => 500 + bright * Math.exp(-t * 14)), adEnv(0.003, 0.09));
const bass = (f: number, seed: number) => shape(biquad(softSaw(0.24, f, 6, seed), "lowpass", 320), adEnv(0.004, 0.13));

export function addBeatTrack(m: Mixer, D: number, level: (t: number) => number, isQuiet: (t: number) => boolean) {
  const K = kick();
  const steps = Math.floor(D / (BEAT / 4));
  for (let s = 0; s < steps; s++) {
    const t = s * (BEAT / 4), beatIdx = Math.floor(s / 4), sub = s % 4;
    const chord = BARS[Math.floor(beatIdx / 4) % BARS.length];
    const L = level(t), q = isQuiet(t), prog = t / D;
    // arpeggio: 16ths, opens up as the piece builds
    const note = chord[1 + ((s * 3) % 3)] + (s % 8 >= 4 ? 12 : 0) + (L >= 3 && s % 16 >= 12 ? 12 : 0);
    m.add(pluck(hz(note), 900 + 3200 * prog + 500 * L, s), t, (q ? 0.1 : 0.07 + 0.022 * Math.min(L, 4)), ((s % 4) - 1.5) * 0.3, 0.35, "music");
    if (q) continue;
    if (L >= 1 && sub % 2 === 0) m.add(bass(hz(chord[0] - 12), s), t, 0.3, 0, 0, "music");
    // kick: every beat once the track is going (half-time before that)
    if (sub === 0 && (L >= 2 || (L >= 1 && beatIdx % 2 === 0))) m.add(K, t, 0.62, 0, 0, "music");
    if (L >= 2 && sub === 2) m.add(hat(s), t, 0.11, 0.25, 0.05, "music");
    if (L >= 3 && sub % 2 === 1) m.add(hat(s + 500), t, 0.05, -0.25, 0.05, "music");
    if (L >= 3 && sub === 0 && beatIdx % 2 === 1) m.add(clap(s), t, 0.2, 0, 0.25, "music");
  }
  // pad under everything, one chord per bar
  const bar = BEAT * 4;
  for (let b = 0; b * bar < D; b++) {
    const at = Math.max(0, b * bar - 0.3);
    // sidechain: once the kick is running, the pad ducks on every beat and swells back ("pumping")
    const pumped = shape(pad(bar + 0.6, BARS[b % BARS.length].slice(1).map(hz), 100 + b, 0.9), (t) => {
      const abs = at + t;
      return level(abs) >= 2 && !isQuiet(abs) ? 1 - 0.55 * Math.exp(-(abs % BEAT) * 9) : 1;
    });
    m.add(pumped, at, 0.3, 0, 0.45, "music");
  }
  m.add(shape(biquad(softSaw(D, hz(33), 4, 77), "lowpass", 90), fades(D, 1, 1.5)), 0, 0.12, 0, 0, "music");
}

/** Snare-roll fill that crescendos into `landAt` (used to build into a reveal). */
export function addFill(m: Mixer, landAt: number, beats = 1) {
  const n16 = Math.round(beats * 4);
  for (let k = 0; k < n16; k++) {
    const t = landAt - (n16 - k) * (BEAT / 4);
    if (t < 0) continue;
    m.add(clap(900 + k), t, 0.07 + 0.2 * ((k + 1) / n16) ** 2, k % 2 ? 0.2 : -0.2, 0.2, "music");
  }
}

/** A short rising motif (A minor arpeggio) for the biggest moments. */
export function addMotif(m: Mixer, at: number, gain = 0.2) {
  [69, 72, 76, 81].forEach((note, k) => {
    const tone = shape(mix([softSaw(1.4, hz(note), 6, 40 + k), 0.6], [sine(1.4, hz(note)), 0.5]), adEnv(0.004, 0.45));
    m.add(biquad(tone, "lowpass", 3200), at + k * (BEAT / 2), gain, (k - 1.5) * 0.25, 0.55, "music");
  });
}
