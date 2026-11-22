/**
 * Soundtrack for series episodes: a 120 BPM track (kick, bass, arpeggio, hats, pad)
 * that gains a layer with every reveal, drops out for quiet moments, and hits
 * hard on the big reveal. Cuts and reveals are on the beat grid (see layout.ts).
 */
import { addBeatTrack, addFill, addMotif } from "../audio/beat";
import { adEnv, biquad, chime, impact, Mixer, riser, shape, shimmer, sine, voiceChain, whoosh } from "../audio/synth";
import type { SoundtrackContext } from "../core/types";
import { BEAT, zoomTime, type EpisodeLayout } from "./layout";
import { orbitStagger } from "./types";

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

export function buildEpisodeSoundtrack(layout: EpisodeLayout, ctx: SoundtrackContext) {
  const D = layout.duration;
  const m = new Mixer(D);

  // --- arrangement: energy level rises with each reveal landing ---------------
  const landings = layout.beats.filter((b) => b.beat.visual.type === "compare").map((b) => b.start + zoomTime(b.beat.visual));
  const quiet = layout.beats.filter((b) => ["lap", "shrink", "stars"].includes(b.beat.visual.type)).map((b) => [b.start, b.end] as const);
  const isQuiet = (t: number) => quiet.some(([a, e]) => t >= a - 1e-6 && t < e - 1e-6);
  const level = (t: number) => landings.filter((l) => l <= t + 1e-6).length;

  addBeatTrack(m, D, level, isQuiet);

  // --- beat-synced effects -----------------------------------------------------
  layout.beats.forEach((b, i) => {
    const v = b.beat.visual, dur = b.end - b.start;
    if (v.type === "compare") {
      const Z = zoomTime(v), land = b.start + Z;
      m.add(whoosh(Z, 300 + i, 0.8), b.start, 0.38, (t) => -0.6 + (1.2 * t) / Z, 0.3);
      m.add(riser(Z, 400 + i), b.start, v.big ? 0.55 : 0.25, 0, 0.2);
      m.add(impact(v.big ? 1.3 : 0.35, 500 + i), land, v.big ? 1.1 : 0.6, 0, 0.3);
      if (v.big) { m.add(shimmer(2, 550 + i), land + 0.05, 0.3, 0, 0.7); addMotif(m, land); }
      if (i > 0) addFill(m, land, v.big ? 2 : 1);
    }
    if (v.type === "pair") { m.add(impact(0.3, 620 + i), b.start + 0.05, 0.5, -0.3, 0.2); m.add(impact(0.3, 640 + i), b.start + 0.3, 0.5, 0.3, 0.2); }
    if (v.type === "gap") {
      m.add(whoosh(0.8, 700 + i, 0.6), b.start + 0.1, 0.3, 0, 0.3);
      (v.fill ?? []).forEach((_, k) => m.add(shape(sine(0.2, hz(67 + 2 * k)), adEnv(0.002, 0.06)), b.start + 0.5 + k * Math.min(0.3, Math.max(0.12, (dur - 1.6) / Math.max(1, v.fill!.length))), 0.2, k % 2 ? 0.3 : -0.3, 0.4));
      if (v.trip) m.add(chime(hz(84), 1.5), b.start + 0.5, 0.12, 0, 0.6);
    }
    if (v.type === "body" && i > 0) m.add(impact(0.15, 600 + i), b.start, 0.4, 0, 0.2);
    if (v.type === "orbits") v.orbits.forEach((_, k) => m.add(shape(sine(0.25, hz(72 + 4 * k)), adEnv(0.002, 0.07)), b.start + 0.25 + k * orbitStagger(dur, v.orbits.length), 0.22, k % 2 ? 0.3 : -0.3, 0.4));
    if (v.type === "lap") {
      m.add(shape(biquad(whoosh(dur - 0.8, 800 + i, 0.4), "highpass", 900), (t) => 0.4 + 0.6 * (t / dur)), b.start + 0.3, 0.3, (t) => Math.sin((t / (dur - 0.8)) * Math.PI * 2), 0.4);
      m.add(chime(hz(84), 2), b.end - 0.5, 0.14, 0, 0.6);
    }
    if (v.type === "shrink") { addMotif(m, b.start + BEAT, 0.14); m.add(shimmer(2.5, 900 + i), b.start + 0.2, 0.22, 0, 0.8); m.add(chime(hz(76), 3.5), b.start + BEAT, 0.16, 0, 0.7); }
  });

  // --- voice: placed by the layout, not by the generated track -----------------
  for (const clip of ctx.voice) {
    const at = layout.beats.find((b) => b.beat.id === clip.id)?.voiceStart;
    if (at !== undefined) m.add(voiceChain(clip.audio), at, 2.1, 0, 0, "voice"); // dry: no reverb on the narrator
  }
  const out = m.master({ peakDb: -1, duckMusicDb: 9, duckFxDb: 11 });
  ctx.onMixer?.(m);
  return out;
}
