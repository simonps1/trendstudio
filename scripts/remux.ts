/**
 * Replace a rendered video's soundtrack without re-rendering the picture, then re-run QC.
 *   npx tsx scripts/remux.ts <video-id> [format]
 * Use after a change that only affects audio (mix levels, sound effects).
 */
import { existsSync, renameSync } from "node:fs";
import { FORMATS } from "../src/core/formats";
import { MANIFEST, narrationJsonPath } from "../src/core/manifest";
import { buildAudio } from "./build-audio";
import { run } from "./lib/ffmpeg";
import { verifySpeech } from "./verify-speech";
import { verify } from "./verify";

const [id, format = "vertical"] = process.argv.slice(2);
const video = MANIFEST.find((v) => v.id === id);
if (!video) throw new Error(`Unknown video "${id}"`);
const f = FORMATS[format as keyof typeof FORMATS];
const output = `out/${id}--${format}.mp4`, tmp = `out/${id}--${format}.remux.mp4`;
if (!existsSync(output)) throw new Error(`${output} has not been rendered yet`);
await buildAudio(id);
run("ffmpeg", ["-y", "-loglevel", "error", "-i", output, "-i", `public/audio/${id}.wav`, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "320k", "-movflags", "+faststart", tmp]);
renameSync(tmp, output);
const ok = verify(output, { width: f.width, height: f.height, fps: f.fps, frames: Math.round(video.durationSec * f.fps) });
const sp = await verifySpeech(output, narrationJsonPath(video));
if (!ok || sp.status === "FAIL") process.exitCode = 1;
