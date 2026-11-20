/**
 * Speech-clarity QC: transcribe the FINAL mix with Whisper and compare it to
 * the narration script. Catches voice buried under music/SFX, clipped words
 * and wrong timing. Skips (WARN) when the speech model isn't available.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { parse } from "node:path";
import { wordErrorRate } from "../src/voice/align";
import type { NarrationTrack } from "../src/voice/types";
import { transcribeWords } from "./build-voice";
import { runBinary } from "./lib/ffmpeg";

export async function verifySpeech(file: string, narrationJson: string) {
  const track: NarrationTrack = JSON.parse(readFileSync(narrationJson, "utf8"));
  if (!track.lines.length) return { status: "SKIP", detail: "no narration" };
  const b = runBinary("ffmpeg", ["-v", "error", "-i", file, "-map", "0:a", "-ac", "1", "-ar", "16000", "-f", "f32le", "-"]);
  const pcm = new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + Math.floor(b.length / 4) * 4));
  let words;
  try { words = await transcribeWords(pcm); } catch (e) { words = null; }
  const ref = track.lines.map((l) => l.text).join(" ");
  let result: { status: "PASS" | "WARN" | "FAIL"; detail: string; wer?: number; heard?: string };
  if (!words) result = { status: "WARN", detail: "speech model unavailable — intelligibility not checked" };
  else {
    const heard = words.map((w) => w.word).join(" ");
    const wer = wordErrorRate(ref, heard);
    result = { status: wer <= 0.12 ? "PASS" : wer <= 0.25 ? "WARN" : "FAIL", detail: `word error rate ${(wer * 100).toFixed(1)}% on the final mix`, wer, heard };
  }
  const { dir, name } = parse(file);
  const reportPath = `${dir}/${name}.report.json`;
  try {
    const report = JSON.parse(readFileSync(reportPath, "utf8"));
    report.checks.push({ name: "speech intelligibility", status: result.status, detail: result.detail });
    report.speech = result;
    if (result.status === "FAIL") report.ok = false;
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
  } catch { /* report not written yet */ }
  const icon = result.status === "PASS" ? "✔" : result.status === "FAIL" ? "✘" : "!";
  console.log(`  ${icon} ${result.status.padEnd(4)} ${"speech intelligibility".padEnd(26)} ${result.detail}`);
  if (result.heard) console.log(`      heard: "${result.heard}"`);
  return result;
}
