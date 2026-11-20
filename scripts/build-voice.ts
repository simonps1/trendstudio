/**
 * Generate narration:  npm run voice -- <video-id> [--force] [--no-align]
 *                      npm run voice -- --samples          (compare voices)
 *
 * Uses Kokoro-82M (Apache-2.0, runs locally on CPU) via the official kokoro-js
 * package, and Whisper (MIT) via transformers.js for word-level timestamps.
 * Models download once from huggingface.co into the local cache.
 *
 * Env:
 *   TTS_DTYPE      fp32 (default, best quality) | fp16 | q8 (fastest)
 *   TTS_MODEL      default onnx-community/Kokoro-82M-v1.0-ONNX
 *   ALIGN_MODEL    default onnx-community/whisper-base.en
 *   MODELS_DIR     use pre-downloaded models from this folder (offline)
 *   KOKORO_VOCAB   with MODELS_DIR: phoneme vocab JSON, when the model folder has no tokenizer files
 *
 * Output: public/voice/<id>/<line>.wav (48 kHz) and src/videos/<id>/narration.json
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { alignToScript, estimateWordTimings } from "../src/voice/align";
import { fitSpeed, scheduleLines } from "../src/voice/schedule";
import type { NarrationLine, NarrationTrack, WordTiming } from "../src/voice/types";
import { MANIFEST } from "../src/core/manifest";
import { run, runBinary } from "./lib/ffmpeg";

const TTS_MODEL = process.env.TTS_MODEL ?? "onnx-community/Kokoro-82M-v1.0-ONNX";
const ALIGN_MODEL = process.env.ALIGN_MODEL ?? "onnx-community/whisper-base.en";
const DTYPE = (process.env.TTS_DTYPE ?? "fp32") as "fp32" | "fp16" | "q8";

async function configureModels() {
  const { env } = await import("@huggingface/transformers");
  if (process.env.MODELS_DIR) {
    env.localModelPath = process.env.MODELS_DIR;
    env.allowRemoteModels = false;
  }
}

type Tts = { generate: (text: string, o: { voice: string; speed: number }) => Promise<{ audio: Float32Array; sampling_rate: number }> };
let tts: Tts | null = null;
async function loadTts(): Promise<Tts> {
  if (tts) return tts;
  await configureModels();
  const { KokoroTTS } = await import("kokoro-js");
  console.log(`[voice] loading ${TTS_MODEL} (${DTYPE})…`);
  try {
    if (process.env.KOKORO_VOCAB) {
      // Offline mode: local ONNX under MODELS_DIR + a phoneme vocab JSON ({"vocab": {symbol: id}}).
      const { StyleTextToSpeech2Model, Tensor } = await import("@huggingface/transformers");
      const vocab: Record<string, number> = JSON.parse(readFileSync(process.env.KOKORO_VOCAB, "utf8")).vocab;
      const model = await StyleTextToSpeech2Model.from_pretrained(TTS_MODEL, { dtype: DTYPE, device: "cpu" });
      const tokenizer = (phonemes: string) => {
        const ids = [0, ...[...phonemes].map((c) => vocab[c]).filter((v) => v !== undefined).slice(0, 510), 0];
        return { input_ids: new Tensor("int64", BigInt64Array.from(ids.map(BigInt)), [1, ids.length]) };
      };
      tts = new (KokoroTTS as unknown as new (m: unknown, t: unknown) => Tts)(model, tokenizer);
    } else {
      tts = (await KokoroTTS.from_pretrained(TTS_MODEL, { dtype: DTYPE, device: "cpu" })) as unknown as Tts;
    }
  } catch (e) {
    throw new Error(`Could not load the voice model ${TTS_MODEL}. It downloads once from huggingface.co — ` +
      `check your internet connection, or set MODELS_DIR to a folder with the model. (${(e as Error).message.split("\n")[0]})`);
  }
  return tts;
}

type Asr = (audio: Float32Array, o: object) => Promise<{ chunks?: { text: string; timestamp: [number, number | null] }[] }>;
let asr: Asr | null | undefined;
async function loadAsr(): Promise<Asr | null> {
  if (asr !== undefined) return asr;
  try {
    await configureModels();
    const { pipeline } = await import("@huggingface/transformers");
    console.log(`[voice] loading aligner ${ALIGN_MODEL}…`);
    asr = (await pipeline("automatic-speech-recognition", ALIGN_MODEL, { dtype: "fp32" })) as unknown as Asr;
  } catch (e) {
    console.warn(`[voice] aligner unavailable (${(e as Error).message.split("\n")[0]}); using estimated word timings`);
    asr = null;
  }
  return asr;
}

/** Which engine produced the last transcription. */
export let lastAsrEngine: "whisper" | "pocketsphinx" | "none" = "none";

/** Fallback: PocketSphinx via Python (forced alignment when `text` is given). */
function pocketsphinx(pcm16k: Float32Array, text = ""): WordTiming[] | null {
  const pcm = Buffer.alloc(pcm16k.length * 2);
  for (let i = 0; i < pcm16k.length; i++) pcm.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(pcm16k[i] * 32767))), i * 2);
  const clean = text.toLowerCase().replace(/[-—…]/g, " ").replace(/[^a-z' ]/g, "").replace(/\s+/g, " ").trim();
  for (const py of [process.env.PYTHON, "python3", "python"].filter(Boolean) as string[]) {
    const r = spawnSync(py, ["-I", join("scripts", "align_pocketsphinx.py"), clean], { input: pcm, maxBuffer: 1 << 26 });
    if (r.status === 0) {
      try { const w = JSON.parse(r.stdout.toString()); return w.length ? w : null; } catch { return null; }
    }
  }
  return null;
}

/**
 * Recognise words with timestamps (16 kHz mono input). Whisper when available,
 * otherwise PocketSphinx (force-aligned to `text` if given).
 */
export async function transcribeWords(pcm16k: Float32Array, text = ""): Promise<WordTiming[] | null> {
  const model = await loadAsr();
  if (!model) {
    const w = pocketsphinx(pcm16k, text);
    lastAsrEngine = w ? "pocketsphinx" : "none";
    return w;
  }
  lastAsrEngine = "whisper";
  const r = await model(pcm16k, { return_timestamps: "word", chunk_length_s: 30 });
  return (r.chunks ?? []).map((c) => ({ word: c.text.trim(), start: c.timestamp[0], end: c.timestamp[1] ?? c.timestamp[0] + 0.2 }));
}

/** Trim leading/trailing silence (keeps a few ms of breath room). */
function trim(audio: Float32Array, rate: number, thresholdDb = -42, padSec = 0.03) {
  const th = Math.pow(10, thresholdDb / 20);
  const win = Math.round(rate * 0.01);
  const loud = (i: number) => {
    let s = 0;
    for (let k = i; k < Math.min(audio.length, i + win); k++) s += audio[k] * audio[k];
    return Math.sqrt(s / win) > th;
  };
  let a = 0, b = audio.length - win;
  while (a < audio.length - win && !loud(a)) a += win;
  while (b > a && !loud(b)) b -= win;
  const pad = Math.round(rate * padSec);
  return audio.slice(Math.max(0, a - pad), Math.min(audio.length, b + win + pad));
}

function writeMonoFloatWav(path: string, audio: Float32Array, rate: number) {
  const buf = Buffer.alloc(44 + audio.length * 4);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + audio.length * 4, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(3, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(32, 34);
  buf.write("data", 36); buf.writeUInt32LE(audio.length * 4, 40);
  for (let i = 0; i < audio.length; i++) buf.writeFloatLE(audio[i], 44 + i * 4);
  writeFileSync(path, buf);
}

function readPcm(path: string, rate: number): Float32Array {
  const b = runBinary("ffmpeg", ["-v", "error", "-i", path, "-ac", "1", "-ar", String(rate), "-f", "f32le", "-"]);
  return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + Math.floor(b.length / 4) * 4));
}

async function synthLine(line: NarrationLine, voice: string, speed: number, outWav: string) {
  const model = await loadTts();
  const res = await model.generate(line.text, { voice, speed });
  const audio = trim(res.audio, res.sampling_rate);
  const tmp = outWav.replace(/\.wav$/, ".24k.wav");
  writeMonoFloatWav(tmp, audio, res.sampling_rate);
  run("ffmpeg", ["-v", "error", "-y", "-i", tmp, "-af", "aresample=48000:resampler=soxr", "-c:a", "pcm_s16le", outWav], { allowFail: true });
  if (!existsSync(outWav)) run("ffmpeg", ["-v", "error", "-y", "-i", tmp, "-ar", "48000", "-c:a", "pcm_s16le", outWav]);
  rmSync(tmp);
  return audio.length / res.sampling_rate;
}

export async function buildVoice(videoId: string, opts: { force?: boolean; align?: boolean } = {}) {
  const video = MANIFEST.find((v) => v.id === videoId);
  if (!video?.narration) { console.log(`[voice] ${videoId}: no narration script`); return null; }
  const { lines, voice } = await video.narration();
  const dir = join("public", "voice", videoId);
  mkdirSync(dir, { recursive: true });
  const jsonPath = join("src", "videos", videoId, "narration.json");
  const prev: NarrationTrack | null = existsSync(jsonPath) ? JSON.parse(readFileSync(jsonPath, "utf8")) : null;

  const durations: Record<string, number> = {};
  const speeds: Record<string, number> = {};
  const keyOf = (l: NarrationLine, s: number) => createHash("sha1").update([l.text, voice, s, TTS_MODEL, DTYPE].join("|")).digest("hex").slice(0, 12);
  const files: Record<string, string> = {};

  for (const line of lines) {
    let speed = line.speed ?? 1;
    const cached = prev?.lines.find((p) => p.id === line.id && p.text === line.text);
    for (let attempt = 0; attempt < 3; attempt++) {
      const file = join(dir, `${line.id}.${keyOf(line, speed)}.wav`);
      let d: number;
      if (!opts.force && cached && cached.file === file.replace(/\\/g, "/") && existsSync(file)) d = cached.duration;
      else d = await synthLine(line, voice, speed, file);
      durations[line.id] = d; speeds[line.id] = speed; files[line.id] = file.replace(/\\/g, "/");
      // window for this line given lines already placed
      const { scheduled } = scheduleLines(lines.slice(0, lines.indexOf(line) + 1), durations);
      const me = scheduled[scheduled.length - 1];
      const window = line.until - me.start;
      const next = fitSpeed(d, speed, window);
      if (next === speed || speed >= 1.25) break;
      console.log(`[voice] ${line.id}: ${d.toFixed(2)}s too long for ${window.toFixed(2)}s → speed ${next.toFixed(2)}`);
      speed = next;
    }
    console.log(`[voice] ${line.id.padEnd(8)} ${durations[line.id].toFixed(2)}s @${speeds[line.id].toFixed(2)}  "${line.text}"`);
  }

  const { scheduled, problems } = scheduleLines(lines, durations);
  const doAlign = opts.align !== false;
  let alignment: NarrationTrack["alignment"] = "estimate";
  const out: NarrationTrack = { voice, model: `${TTS_MODEL}:${DTYPE}`, alignment, lines: [] };
  for (const line of lines) {
    const s = scheduled.find((x) => x.id === line.id)!;
    const d = durations[line.id];
    let words: WordTiming[] = estimateWordTimings(line.text, d);
    if (doAlign) {
      const rec = await transcribeWords(readPcm(files[line.id], 16000), line.text);
      if (rec && rec.length) { words = alignToScript(line.text, rec, d); alignment = lastAsrEngine === "whisper" ? "whisper" : "pocketsphinx"; }
      else console.warn(`[voice] ${line.id}: no alignment, using estimated word timings`);
    }
    out.lines.push({ id: line.id, text: line.text, file: files[line.id], start: +s.start.toFixed(3), duration: +d.toFixed(3), speed: speeds[line.id],
      words: words.map((w) => ({ word: w.word, start: +(s.start + w.start).toFixed(3), end: +(s.start + w.end).toFixed(3) })) });
  }
  out.alignment = alignment;
  // remove stale takes no longer referenced
  const keep = new Set(Object.values(files).map((f) => f.split("/").pop()));
  for (const f of readdirSync(dir)) if (f.endsWith(".wav") && !keep.has(f)) rmSync(join(dir, f));
  writeFileSync(jsonPath, JSON.stringify(out, null, 2) + "\n");
  console.log(`[voice] wrote ${jsonPath} (${out.lines.length} lines, alignment: ${alignment})`);
  if (problems.length) {
    for (const p of problems) console.error(`[voice] ✘ ${p.id}: ${p.message} — shorten the line or move its slot`);
    throw new Error(`${problems.length} narration line(s) don't fit the timeline`);
  }
  return out;
}

async function samples() {
  const text = "This star will live for ten million years. And die in less than a second.";
  const dir = join("out", "voice-samples");
  mkdirSync(dir, { recursive: true });
  for (const voice of ["af_heart", "af_bella", "bf_emma", "am_fenrir", "am_michael", "am_puck", "bm_george", "bm_fable"]) {
    const d = await synthLine({ id: voice, text, until: 99 }, voice, 1.05, join(dir, `${voice}.wav`));
    console.log(`[voice] sample ${voice}: ${d.toFixed(2)}s → ${dir}/${voice}.wav`);
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/build-voice.ts")) {
  const args = process.argv.slice(2);
  if (args.includes("--samples")) await samples();
  else {
    const ids = args.filter((a) => !a.startsWith("--"));
    for (const id of ids.length ? ids : MANIFEST.map((m) => m.id)) {
      await buildVoice(id, { force: args.includes("--force"), align: !args.includes("--no-align") });
    }
  }
}
