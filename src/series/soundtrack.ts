/** Generic soundtrack for series episodes: evolving pad, beat-synced effects, voice with ducking. */
import { biquad, brown, chime, fades, impact, Mixer, pad, pop, riser, shape, shimmer, voiceChain, whoosh } from "../audio/synth";
import type { SoundtrackContext } from "../core/types";
import type { EpisodeLayout } from "./layout";
import { orbitStagger, REVEAL } from "./types";

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);
const CHORDS = [[45, 52, 57, 60], [41, 48, 53, 60], [43, 50, 55, 62], [45, 52, 57, 64]];

export function buildEpisodeSoundtrack(layout: EpisodeLayout, ctx: SoundtrackContext) {
  const D = layout.duration;
  const m = new Mixer(D);
  // bed: a slow four-chord cycle that brightens through the episode
  const seg = D / CHORDS.length;
  CHORDS.forEach((c, i) => m.add(pad(seg + 1.5, c.map(hz), 100 + i, 0.75 + 0.2 * i), Math.max(0, i * seg - 0.75), 0.5, 0, 0.5, "music"));
  m.add(shape(biquad(brown(D, 131), "lowpass", 150), fades(D, 1.5, 1.5)), 0, 0.5, 0, 0, "music");
  m.add(chime(hz(81), 2.5), 0.1, 0.1, 0.3, 0.6);

  layout.beats.forEach((b, i) => {
    const v = b.beat.visual, dur = b.end - b.start;
    if (i > 0) m.add(whoosh(0.5, 200 + i, 0.7), b.start - 0.2, 0.22, i % 2 ? 0.4 : -0.4, 0.3);
    if (v.type === "compare") {
      const land = b.start + REVEAL * dur;
      m.add(whoosh(Math.max(0.6, REVEAL * dur), 300 + i, 0.5), b.start + 0.1 * dur, 0.4, (t) => -0.5 + t, 0.4);
      if (v.big) {
        m.add(riser(Math.min(2, REVEAL * dur - 0.1), 400 + i), land - Math.min(2, REVEAL * dur - 0.1), 0.4, 0, 0.2);
        m.add(impact(1.2, 500 + i), land, 0.9, 0, 0.35);
      } else m.add(impact(0.25, 500 + i), land, 0.45, 0, 0.3);
      m.add(pop(620 + 40 * (i % 4), 600 + i), land + 0.02, 0.22, 0, 0.4);
    }
    if (v.type === "orbits") v.orbits.forEach((_, k) => m.add(pop(520 + 90 * k, 700 + k), b.start + 0.25 + k * orbitStagger(dur, v.orbits.length), 0.3, k % 2 ? 0.3 : -0.3, 0.4));
    if (v.type === "lap") {
      m.add(shape(biquad(whoosh(dur - 0.9, 800 + i, 0.4), "highpass", 900), (t) => 0.4 + 0.6 * (t / dur)), b.start + 0.4, 0.3, (t) => Math.sin((t / (dur - 0.9)) * Math.PI * 2), 0.4);
      m.add(chime(hz(84), 2), b.end - 0.5, 0.14, 0, 0.6);
    }
    if (v.type === "shrink") { m.add(shimmer(2.5, 900 + i), b.start + 0.2, 0.25, 0, 0.8); m.add(chime(hz(76), 3.5), b.start + 0.4, 0.15, 0, 0.7); }
  });

  for (const clip of ctx.voice) m.add(voiceChain(clip.audio), clip.start, 2.1, 0, 0.05, "voice");
  const out = m.master({ peakDb: -1, duckMusicDb: 9, duckFxDb: 9 });
  ctx.onMixer?.(m);
  return out;
}
