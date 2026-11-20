/**
 * Original soundtrack for "Born to Explode", synthesized from code and
 * timed from the same timeline the visuals use.
 */
import {
  biquad, brown, chime, fades, impact, Mixer, pad, pop, riser, shape, shimmer, sizzle, thump, whoosh,
} from "../../audio/synth";
import { CAPTIONS, DURATION, engulfTimes, T } from "./timeline";

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

export function buildSoundtrack() {
  const m = new Mixer(DURATION);

  // --- music beds -------------------------------------------------------
  // A minor-ish space pad -> darker as the star ages -> silence before the blast
  m.add(pad(T.ignition + 0.5, [hz(45), hz(52), hz(57), hz(60)], 1, 0.8), 0, 0.5, 0, 0.5);
  m.add(pad(T.giant - T.ignition + 1, [hz(45), hz(52), hz(57), hz(64), hz(69)], 2, 1.3), T.ignition, 0.45, 0, 0.5);
  m.add(pad(T.collapse - T.giant + 0.5, [hz(41), hz(48), hz(53), hz(56)], 3, 0.9), T.giant - 0.5, 0.5, 0, 0.5);
  m.add(pad(T.end - T.blackHole + 0.5, [hz(38), hz(45), hz(50), hz(57), hz(62)], 4, 0.7), T.blackHole - 0.5, 0.55, 0, 0.6);
  // low rumble under the nebula and the black hole
  m.add(shape(biquad(brown(T.ignition - T.nebula, 31), "lowpass", 180), fades(T.ignition - T.nebula, 1.5, 0.2)), T.nebula, 0.6);
  m.add(shape(biquad(brown(T.end - T.blackHole, 32), "lowpass", 120), fades(T.end - T.blackHole, 1.0, 2.5)), T.blackHole, 0.7);

  // --- hook --------------------------------------------------------------
  for (const c of CAPTIONS.slice(0, 2)) m.add(whoosh(0.6, Math.round(c.start * 10)), c.start - 0.15, 0.35, (t) => -0.6 + t * 2, 0.3);
  m.add(chime(hz(81), 2.5), 0.12, 0.12, 0.3, 0.6);

  // --- nebula collapse -> ignition --------------------------------------
  m.add(riser(T.ignition - 7.2, 41), 7.2, 0.55, 0, 0.3);
  m.add(impact(0.8, 42), T.ignition, 0.9, 0, 0.35);
  m.add(shimmer(2.8, 43), T.ignition + 0.05, 0.5, (t) => Math.sin(t * 3) * 0.6, 0.7);
  m.add(whoosh(1.0, 44, 0.6), T.ignition, 0.4, 0, 0.3);

  // --- main sequence: star "heartbeat" synced to its 1 Hz visual pulse
  for (let t = T.main + 0.5; t < T.giant - 0.5; t += 1) {
    m.add(thump(52), t - 0.02, 0.45, 0, 0.1);
  }
  m.add(pop(780, 51), T.sunCompare, 0.35, 0.4, 0.4);

  // --- red supergiant: each planet vaporised as the surface reaches it
  m.add(whoosh(2.2, 60, 0.3), T.giant - 0.4, 0.35, 0, 0.5);
  engulfTimes().forEach((e, i) => {
    if (e.t < T.collapse) m.add(sizzle(0.9, 61 + i), e.t, 0.45, (i % 2 ? 0.4 : -0.4), 0.35);
  });

  // --- collapse & supernova -------------------------------------------
  m.add(riser(T.supernova - T.collapse, 70), T.collapse, 0.8, 0, 0.2);
  m.add(impact(2.4, 71), T.supernova, 1.25, 0, 0.45);
  m.add(whoosh(2.0, 72, 1.2), T.supernova + 0.05, 0.6, (t) => -1 + t, 0.6);
  m.add(whoosh(2.0, 73, 1.2), T.supernova + 0.1, 0.6, (t) => 1 - t, 0.6);
  m.add(shimmer(3.5, 74), T.supernova + 0.2, 0.4, 0, 0.8);

  // --- black hole & ending --------------------------------------------
  m.add(whoosh(1.6, 80, 0.5), T.blackHole - 0.8, 0.4, 0, 0.5);
  m.add(chime(hz(76), 4), T.dust + 0.2, 0.18, -0.3, 0.7);
  m.add(chime(hz(81), 4), T.dust + 1.0, 0.15, 0.3, 0.7);
  m.add(chime(hz(84), 3.5), T.dust + 1.8, 0.13, 0, 0.7);
  m.add(shimmer(3, 81), T.dust + 0.3, 0.25, 0, 0.8);

  return m.master(-1);
}
