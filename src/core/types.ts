import type { StereoBuffer } from "../audio/synth";
import type { FormatId } from "./formats";
import type { NarrationLine } from "../voice/types";

/** Node-safe description of a video project (no React imports). */
export interface VideoMeta {
  /** kebab-case id; used for public/audio/<id>.wav and out/<id>--<format>.mp4 */
  id: string;
  title: string;
  /** Length in seconds. Timelines are written in seconds so any fps works. */
  durationSec: number;
  /** Formats this video is designed for. */
  formats: FormatId[];
  /** Where the generated narration JSON lives (default src/videos/<id>/narration.json). */
  narrationJson?: string;
  /** Builds the soundtrack (runs in Node via `npm run audio`). */
  soundtrack?: (ctx: SoundtrackContext) => Promise<StereoBuffer>;
  /** Voice-over script (built into WAVs + word timings via `npm run voice`). */
  narration?: () => Promise<{ voice: string; lines: NarrationLine[] }>;
}

/** A rendered narration line handed to the soundtrack builder (mono, 48 kHz). */
export interface VoiceClip { id: string; start: number; audio: Float32Array }
export interface SoundtrackContext {
  voice: VoiceClip[];
  /** Receives the mixer after mastering (used for voice-clarity QC). */
  onMixer?: (m: import("../audio/synth").Mixer) => void;
}
