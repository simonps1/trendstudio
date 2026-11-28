/**
 * Soundtrack for the continuous zoom: the 120 BPM track gains a layer every few stations, each zoom is a
 * riser + whoosh that lands on an impact, and everything drops to the pad for the closing photograph.
 * Timed from the same timeline as the picture.
 */
import { addBeatTrack, addFill, addMotif } from "../../audio/beat";
import { chime, impact, Mixer, riser, shimmer, whoosh } from "../../audio/synth";
import type { SoundtrackContext } from "../../core/types";
import { CARD_START, DURATION, landing, LAST, STATIONS, ZOOM } from "./timeline";

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

export function buildSoundtrack(_ctx: SoundtrackContext = { voice: [] }) {
  const m = new Mixer(DURATION);
  // station 0-1: arpeggio only; then bass, kick, full kit by the galaxy
  const level = (t: number) => { const k = Math.floor((t + 1e-6) / (landing(1) - landing(0))); return k < 1 ? 0 : k < 3 ? 1 : k < 5 ? 2 : k < 7 ? 3 : 4; };
  addBeatTrack(m, DURATION, level, (t) => t >= CARD_START - 1e-6);

  m.add(chime(hz(81), 2.5), 0.05, 0.14, 0.2, 0.6);
  for (let k = 1; k < STATIONS.length; k++) {
    const land = landing(k), start = land - ZOOM;
    // bigger jumps (more decades crossed) hit harder
    const jump = STATIONS[k].logW - STATIONS[k - 1].logW, big = jump > 2.5;
    m.add(whoosh(ZOOM, 300 + k, 0.8), start, 0.4, (t) => -0.6 + (1.2 * t) / ZOOM, 0.3);
    m.add(riser(ZOOM, 400 + k), start, big ? 0.55 : 0.3, 0, 0.2);
    m.add(impact(big ? 1.2 : 0.4, 500 + k), land, big ? 1.0 : 0.6, 0, 0.3);
    addFill(m, land, big ? 2 : 1);
    if (big) m.add(shimmer(2, 550 + k), land + 0.05, 0.28, 0, 0.7);
  }
  addMotif(m, landing(LAST));
  // the closing card: one soft bell and a long shimmer
  m.add(shimmer(3.5, 700), CARD_START, 0.3, 0, 0.8);
  m.add(chime(hz(76), 3.5), CARD_START + 0.1, 0.18, 0, 0.7);
  return m.master({ peakDb: -1 });
}
