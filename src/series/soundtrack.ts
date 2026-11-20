/**
 * Soundtrack for series episodes: a 120 BPM track (kick, bass, arpeggio, hats, pad)
 * that gains a layer with every reveal, drops out for quiet moments, and hits
 * hard on the big reveal. Cuts and reveals are on the beat grid (see layout.ts).
 */
import { adEnv, biquad, chime, fades, impact, Mixer, mix, noise, pad, riser, shape, shimmer, sine, softSaw, voiceChain, whoosh } from "../audio/synth";
import type { SoundtrackContext } from "../core/types";
import { BEAT, zoomTime, type EpisodeLayout } from "./layout";
import { orbitStagger } from "./types";

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);
// A minor: Am – F – C – G, one chord per bar (4 beats)
const BARS = [[45, 57, 60, 64], [41, 57, 60, 65], [48, 55, 60, 64], [43, 55, 59, 62]];

const kick = () => mix([shape(sine(0.32, (t) => 46 + 110 * Math.exp(-t * 32)), adEnv(0.002, 0.11)), 1], [shape(biquad(noise(0.02, 3), "highpass", 1500), adEnv(0.0005, 0.004)), 0.25]);
const hat = (seed: number) => shape(biquad(noise(0.06, seed), "highpass", 7000), adEnv(0.001, 0.018));
const clap = (seed: number) => shape(biquad(noise(0.22, seed), "bandpass", 1700, 1.1), (t) => (t < 0.03 ? 0.6 + 0.4 * Math.sin(t * 700) : 1) * Math.exp(-t / 0.07));
const pluck = (f: number, bright: number, seed: number) => shape(biquad(softSaw(0.3, f, 7, seed), "lowpass", (t) => 500 + bright * Math.exp(-t * 14)), adEnv(0.003, 0.09));
const bass = (f: number, seed: number) => shape(biquad(softSaw(0.24, f, 6, seed), "lowpass", 320), adEnv(0.004, 0.13));

export function buildEpisodeSoundtrack(layout: EpisodeLayout, ctx: SoundtrackContext) {
  const D = layout.duration;
  const m = new Mixer(D);
  const K = kick();

  // --- arrangement: energy level rises with each reveal landing ---------------
  const landings = layout.beats.filter((b) => b.beat.visual.type === "compare").map((b) => b.start + zoomTime(b.beat.visual));
  const quiet = layout.beats.filter((b) => ["lap", "shrink", "stars"].includes(b.beat.visual.type)).map((b) => [b.start, b.end] as const);
  const isQuiet = (t: number) => quiet.some(([a, e]) => t >= a - 1e-6 && t < e - 1e-6);
  const level = (t: number) => landings.filter((l) => l <= t + 1e-6).length;

  const steps = Math.floor(D / (BEAT / 4));
  for (let s = 0; s < steps; s++) {
    const t = s * (BEAT / 4), beatIdx = Math.floor(s / 4), sub = s % 4;
    const chord = BARS[Math.floor(beatIdx / 4) % BARS.length];
    const L = level(t), q = isQuiet(t), prog = t / D;
    // arpeggio: 16ths, opens up as the episode builds
    const note = chord[1 + ((s * 3) % 3)] + (s % 8 >= 4 ? 12 : 0) + (L >= 3 && s % 16 >= 12 ? 12 : 0);
    m.add(pluck(hz(note), 900 + 3200 * prog + 500 * L, s), t, (q ? 0.1 : 0.07 + 0.022 * Math.min(L, 4)), ((s % 4) - 1.5) * 0.3, 0.35, "music");
    if (q) continue;
    // bass on 8ths from the first reveal
    if (L >= 1 && sub % 2 === 0) m.add(bass(hz(chord[0] - 12), s), t, 0.3, 0, 0, "music");
    // kick: every beat once the track is going (half-time before that)
    if (sub === 0 && (L >= 2 || (L >= 1 && beatIdx % 2 === 0))) m.add(K, t, 0.62, 0, 0, "music");
    if (L >= 2 && sub === 2) m.add(hat(s), t, 0.11, 0.25, 0.05, "music");
    if (L >= 3 && sub % 2 === 1) m.add(hat(s + 500), t, 0.05, -0.25, 0.05, "music");
    if (L >= 3 && sub === 0 && beatIdx % 2 === 1) m.add(clap(s), t, 0.2, 0, 0.25, "music");
  }
  // pad under everything, one chord per bar
  const bar = BEAT * 4;
  for (let b = 0; b * bar < D; b++) m.add(pad(bar + 0.6, BARS[b % BARS.length].slice(1).map(hz), 100 + b, 0.9), Math.max(0, b * bar - 0.3), 0.24, 0, 0.45, "music");
  m.add(shape(biquad(softSaw(D, hz(33), 4, 77), "lowpass", 90), fades(D, 1, 1.5)), 0, 0.12, 0, 0, "music");

  // --- beat-synced effects -----------------------------------------------------
  layout.beats.forEach((b, i) => {
    const v = b.beat.visual, dur = b.end - b.start;
    if (v.type === "compare") {
      const Z = zoomTime(v), land = b.start + Z;
      m.add(whoosh(Z, 300 + i, 0.8), b.start, 0.38, (t) => -0.6 + (1.2 * t) / Z, 0.3);
      m.add(riser(Z, 400 + i), b.start, v.big ? 0.55 : 0.25, 0, 0.2);
      m.add(impact(v.big ? 1.3 : 0.35, 500 + i), land, v.big ? 1.1 : 0.6, 0, 0.3);
      if (v.big) m.add(shimmer(2, 550 + i), land + 0.05, 0.3, 0, 0.7);
    }
    if (v.type === "body" && i > 0) m.add(impact(0.15, 600 + i), b.start, 0.4, 0, 0.2);
    if (v.type === "orbits") v.orbits.forEach((_, k) => m.add(shape(sine(0.25, hz(72 + 4 * k)), adEnv(0.002, 0.07)), b.start + 0.25 + k * orbitStagger(dur, v.orbits.length), 0.22, k % 2 ? 0.3 : -0.3, 0.4));
    if (v.type === "lap") {
      m.add(shape(biquad(whoosh(dur - 0.8, 800 + i, 0.4), "highpass", 900), (t) => 0.4 + 0.6 * (t / dur)), b.start + 0.3, 0.3, (t) => Math.sin((t / (dur - 0.8)) * Math.PI * 2), 0.4);
      m.add(chime(hz(84), 2), b.end - 0.5, 0.14, 0, 0.6);
    }
    if (v.type === "shrink") { m.add(shimmer(2.5, 900 + i), b.start + 0.2, 0.22, 0, 0.8); m.add(chime(hz(76), 3.5), b.start + BEAT, 0.16, 0, 0.7); }
  });

  // --- voice: placed by the layout, not by the generated track -----------------
  for (const clip of ctx.voice) {
    const at = layout.beats.find((b) => b.beat.id === clip.id)?.voiceStart;
    if (at !== undefined) m.add(voiceChain(clip.audio), at, 2.1, 0, 0.05, "voice");
  }
  const out = m.master({ peakDb: -1, duckMusicDb: 7, duckFxDb: 9 });
  ctx.onMixer?.(m);
  return out;
}
