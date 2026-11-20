import { estimateWordTimings, syllables } from "../voice/align";
import type { NarrationLine, NarrationTrack, WordTiming } from "../voice/types";
import type { Beat, EpisodeSpec, Variant } from "./types";

export interface LaidOutBeat { beat: Beat; start: number; end: number; voiceStart: number; voiceEnd: number }
export interface EpisodeLayout { beats: LaidOutBeat[]; duration: number; words: WordTiming[]; voiced: boolean }

const GAP = 0.38; // breath between lines
const LEAD = 0.22; // visual changes this long before its line starts
const FIRST = 0.1;
const TAIL = 1.1;
/** Default pause after a line so the visual can land (a size reveal needs a beat). */
const holdOf = (b: Beat) => b.hold ?? (b.visual.type === "compare" ? 0.3 : 0);

export const beatsFor = (spec: EpisodeSpec, variant: Variant) => spec.beats.filter((b) => !b.only || b.only === variant);

/** Rough spoken duration (used for previews before the voice is generated). */
export const estimateSeconds = (text: string, speed = 1) =>
  (text.split(/\s+/).reduce((n, w) => n + syllables(w), 0) / 4.3 + (text.match(/[.,?!…]/g)?.length ?? 0) * 0.16) / speed;

/** Narration script for build-voice: lines chained one after another. */
export function narrationLines(spec: EpisodeSpec, variant: Variant): NarrationLine[] {
  const beats = beatsFor(spec, variant);
  return beats.map((b, i) => ({
    id: b.id, text: b.say, speed: b.speed, until: 1e9,
    ...(i === 0 ? { at: FIRST } : { after: beats[i - 1].id, gap: GAP + holdOf(beats[i - 1]) }),
  }));
}

/** Beat timings from the generated voice track, or estimates if it isn't generated / is stale. */
export function layoutEpisode(spec: EpisodeSpec, variant: Variant, track: NarrationTrack | null): EpisodeLayout {
  const beats = beatsFor(spec, variant);
  const fresh = !!track && beats.every((b) => track.lines.find((l) => l.id === b.id)?.text === b.say);
  let cursor = FIRST;
  const voiced = beats.map((b) => {
    const line = fresh ? track!.lines.find((l) => l.id === b.id)! : null;
    const start = line ? line.start : cursor;
    const dur = line ? line.duration : estimateSeconds(b.say, b.speed ?? 1);
    cursor = start + dur + GAP + holdOf(b);
    const words = line ? line.words : estimateWordTimings(b.say, dur).map((w) => ({ word: w.word, start: start + w.start, end: start + w.end }));
    return { b, start, end: start + dur, words };
  });
  const out: LaidOutBeat[] = voiced.map((v, i) => ({
    beat: v.b, voiceStart: v.start, voiceEnd: v.end,
    start: i === 0 ? 0 : v.start - LEAD,
    end: i < voiced.length - 1 ? voiced[i + 1].start - LEAD : v.end + holdOf(v.b) + TAIL,
  }));
  const duration = Math.ceil(out[out.length - 1].end * 10) / 10;
  out[out.length - 1].end = duration;
  return { beats: out, duration, words: voiced.flatMap((v) => v.words), voiced: fresh };
}
