/**
 * Build soundtracks: `npm run audio [-- <video-id>]`
 * Synthesizes each video's soundtrack, writes public/audio/<id>.wav,
 * then loudness-normalises it to -14 LUFS / -1.5 dBTP (YouTube/TikTok target).
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { biquad, SAMPLE_RATE } from "../src/audio/synth";
import { decodeWav, encodeWav } from "../src/audio/wav";
import type { VoiceClip } from "../src/core/types";
import type { NarrationTrack } from "../src/voice/types";
import { MANIFEST, narrationJsonPath } from "../src/core/manifest";
import { run } from "./lib/ffmpeg";

/** Narration should sit at least this far above the music + effects under it. */
export const MIN_CLARITY_DB = 10;

/** Load generated narration (if any). Missing files are an error: run `npm run voice`. */
export function loadVoiceClips(id: string): VoiceClip[] {
  const meta = MANIFEST.find((m) => m.id === id);
  const json = meta ? narrationJsonPath(meta) : "";
  if (!json || !existsSync(json)) return [];
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
  let clarity: { id: string; db: number }[] = [];
  const buf = await v.soundtrack({
    voice,
    onMixer: (m) => {
      // voice level vs. everything else (after ducking) while each line is spoken,
      // measured in the speech band (200 Hz–6 kHz): sub-bass rumble doesn't mask words
      const band = (a: Float32Array) => biquad(biquad(a, "highpass", 200), "lowpass", 6000);
      const r = { voice: band(m.rendered!.voice), background: band(m.rendered!.background) };
      const rms = (a: Float32Array, i0: number, i1: number) => { let x = 0; for (let i = i0; i < i1; i++) x += a[i] * a[i]; return Math.sqrt(x / Math.max(1, i1 - i0)); };
      clarity = voice.map((c) => {
        const i0 = Math.round(c.start * SAMPLE_RATE), i1 = Math.min(r.voice.length, i0 + c.audio.length);
        return { id: c.id, db: 20 * Math.log10(rms(r.voice, i0, i1) / Math.max(1e-9, rms(r.background, i0, i1))) };
      });
    },
  });
  if (clarity.length) {
    const worst = [...clarity].sort((a, b) => a.db - b.db);
    console.log(`[audio] voice clarity (voice vs. music+fx, dB): ` + clarity.map((c) => `${c.id} ${c.db.toFixed(0)}`).join(", "));
    const low = worst.filter((c) => c.db < MIN_CLARITY_DB);
    if (low.length) console.warn(`[audio] ! ${low.length} line(s) below ${MIN_CLARITY_DB} dB: ${low.map((c) => c.id).join(", ")} — lower the music/fx under them`);
    writeFileSync(join(dir, `${id}.clarity.json`), JSON.stringify({ minDb: worst[0].db, lines: clarity }, null, 2));
  }
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
