import { estimateWordTimings, syllables } from "../voice/align";
import type { NarrationLine, NarrationTrack, WordTiming } from "../voice/types";
import { BEAT, BPM } from "../audio/beat";
import type { Beat, EpisodeSpec, Variant, Visual } from "./types";

export interface LaidOutBeat { beat: Beat; start: number; end: number; voiceStart: number; voiceEnd: number }
export interface EpisodeLayout { beats: LaidOutBeat[]; duration: number; words: WordTiming[]; voiced: boolean }

/** Music tempo. Every cut and every reveal lands on this grid. */
export { BEAT, BPM };
/** The voice starts half a beat after the cut, so the picture leads the words. */
const LEAD = BEAT / 2;

const grid = (t: number) => Math.ceil(t / BEAT - 1e-6) * BEAT;

/** Seconds from the start of a compare beat to the moment the zoom lands (always whole beats). */
export const zoomTime = (v: Visual) => (v.type === "compare" && v.open ? 3 * BEAT : v.type === "compare" && v.big ? 3 * BEAT : 2 * BEAT);

/** Shortest time a visual needs on screen to read. */
function minDuration(v: Visual) {
  switch (v.type) {
    case "body": return 2 * BEAT;
    case "compare": return zoomTime(v) + 2 * BEAT;
    case "pair": return 5 * BEAT;
    case "gap": return 7 * BEAT;
    case "orbits": return 6 * BEAT;
    case "lap": return 7 * BEAT;
    case "shrink": return 6 * BEAT;
    case "stars": return 3 * BEAT;
  }
}

export const beatsFor = (spec: EpisodeSpec, variant: Variant) => spec.beats.filter((b) => !b.only || b.only === variant);

/** Rough spoken duration (used for previews before the voice is generated). */
export const estimateSeconds = (text: string, speed = 1) =>
  (text.split(/\s+/).reduce((n, w) => n + syllables(w), 0) / 4.3 + (text.match(/[.,?!…:]/g)?.length ?? 0) * 0.16) / speed;

/** Narration script for build-voice. Lines are synthesized one by one; layout decides where they go. */
export function narrationLines(spec: EpisodeSpec, variant: Variant): NarrationLine[] {
  const beats = beatsFor(spec, variant);
  return beats.map((b, i) => ({
    id: b.id, text: b.say, speed: b.speed, until: 1e9,
    ...(i === 0 ? { at: LEAD } : { after: beats[i - 1].id, gap: 0.4 }),
  }));
}

/**
 * Place every beat on the music grid. Voice durations come from the generated
 * track (or estimates when it is missing or stale); start times are decided here,
 * so cuts and reveals always hit the beat.
 */
export function layoutEpisode(spec: EpisodeSpec, variant: Variant, track: NarrationTrack | null): EpisodeLayout {
  const beats = beatsFor(spec, variant);
  const fresh = !!track && beats.every((b) => track.lines.find((l) => l.id === b.id)?.text === b.say);
  const out: LaidOutBeat[] = [];
  const words: WordTiming[] = [];
  let start = 0;
  for (const b of beats) {
    const line = fresh ? track!.lines.find((l) => l.id === b.id)! : null;
    const dur = line ? line.duration : estimateSeconds(b.say, b.speed ?? 1);
    const voiceStart = start + LEAD, voiceEnd = voiceStart + dur;
    const end = grid(Math.max(voiceEnd + 0.1 + (b.hold ?? 0), start + minDuration(b.visual)));
    const w = line
      ? line.words.map((x) => ({ word: x.word, start: x.start - line.start + voiceStart, end: x.end - line.start + voiceStart }))
      : estimateWordTimings(b.say, dur).map((x) => ({ word: x.word, start: voiceStart + x.start, end: voiceStart + x.end }));
    words.push(...w);
    out.push({ beat: b, start, end, voiceStart, voiceEnd });
    start = end;
  }
  return { beats: out, duration: start, words, voiced: fresh };
}
