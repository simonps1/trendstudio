import type { StereoBuffer } from "../audio/synth";
import type { FormatId } from "./formats";

/** Node-safe description of a video project (no React imports). */
export interface VideoMeta {
  /** kebab-case id; used for public/audio/<id>.wav and out/<id>--<format>.mp4 */
  id: string;
  title: string;
  /** Length in seconds. Timelines are written in seconds so any fps works. */
  durationSec: number;
  /** Formats this video is designed for. */
  formats: FormatId[];
  /** Builds the soundtrack (runs in Node via `npm run audio`). */
  soundtrack?: () => Promise<StereoBuffer>;
}
