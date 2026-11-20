/**
 * Build soundtracks: `npm run audio [-- <video-id>]`
 * Synthesizes each video's soundtrack, writes public/audio/<id>.wav,
 * then loudness-normalises it to -14 LUFS / -1.5 dBTP (YouTube/TikTok target).
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SAMPLE_RATE } from "../src/audio/synth";
import { decodeWav, encodeWav } from "../src/audio/wav";
import type { VoiceClip } from "../src/core/types";
import type { NarrationTrack } from "../src/voice/types";
import { MANIFEST } from "../src/core/manifest";
import { run } from "./lib/ffmpeg";

/** Load generated narration (if any). Missing files are an error: run `npm run voice`. */
export function loadVoiceClips(id: string): VoiceClip[] {
  const json = join("src", "videos", id, "narration.json");
  if (!existsSync(json)) return [];
  const track: NarrationTrack = JSON.parse(readFileSync(json, "utf8"));
  return track.lines.map((l) => {
    if (!existsSync(l.file)) throw new Error(`Voice file missing: ${l.file}. Run: npm run voice -- ${id}`);
    const wav = decodeWav(readFileSync(l.file));
    if (wav.sampleRate !== SAMPLE_RATE) throw new Error(`${l.file} must be ${SAMPLE_RATE} Hz`);
    return { id: l.id, start: l.start, audio: wav.left };
  });
}

export async function buildAudio(id: string) {
  const v = MANIFEST.find((m) => m.id === id);
  if (!v) throw new Error(`Unknown video: ${id}`);
  if (!v.soundtrack) return null;
  const dir = join("public", "audio");
  mkdirSync(dir, { recursive: true });
  const raw = join(dir, `${id}.raw.wav`), out = join(dir, `${id}.wav`);
  const t0 = Date.now();
  const voice = loadVoiceClips(id);
  const buf = await v.soundtrack({ voice });
  writeFileSync(raw, encodeWav(buf));
  // two-pass EBU R128 loudness normalisation
  const target = "I=-14:TP=-1.5:LRA=11";
  const pass1 = run("ffmpeg", ["-hide_banner", "-i", raw, "-af", `loudnorm=${target}:print_format=json`, "-f", "null", "-"]);
  const m = JSON.parse(pass1.stderr.slice(pass1.stderr.lastIndexOf("{"), pass1.stderr.lastIndexOf("}") + 1));
  run("ffmpeg", [
    "-hide_banner", "-y", "-i", raw, "-af",
    `loudnorm=${target}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`,
    "-ar", "48000", "-c:a", "pcm_s16le", out + ".tmp.wav",
  ]);
  renameSync(out + ".tmp.wav", out);
  if (voice.length) console.log(`[audio] ${id}: mixed ${voice.length} narration lines`);
  console.log(`[audio] ${id}: ${buf.left.length / buf.sampleRate}s, input ${m.input_i} LUFS -> -14 LUFS (${Date.now() - t0} ms) -> ${out}`);
  return out;
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/build-audio.ts")) {
  const ids = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  for (const id of ids.length ? ids : MANIFEST.map((m) => m.id)) await buildAudio(id);
}
