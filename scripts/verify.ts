/**
 * Automated quality control for a rendered MP4:
 *   npm run verify -- out/star-life--vertical.mp4 [--fps 60 --width 1080 --height 1920]
 *
 * Checks (FAIL = hard error, WARN = review):
 *  - container/codec/pixel format, resolution, constant frame rate, frame count, duration
 *  - audio present (AAC, 48 kHz stereo), loudness (EBU R128) and true peak
 *  - exact duplicate consecutive frames (would indicate padded / fake 60 fps)
 *  - motion analysis on blurred, downscaled luma (grain removed) to catch
 *    frozen sections and alternating-frame stepping (30 fps content in a 60 fps file)
 *  - contact sheet of evenly spaced frames for visual inspection
 */
import { writeFileSync } from "node:fs";
import { parse } from "node:path";
import { run } from "./lib/ffmpeg";

export interface Expect { width: number; height: number; fps: number; frames?: number }
interface Check { name: string; status: "PASS" | "WARN" | "FAIL"; detail: string }

export function analyseMotion(diffs: number[], threshold: number) {
  const staticIdx = diffs.map((d, i) => (d < threshold ? i : -1)).filter((i) => i >= 0);
  let longest = 0, cur = 0;
  diffs.forEach((d) => { cur = d < threshold ? cur + 1 : 0; longest = Math.max(longest, cur); });
  // alternating pattern: static frames concentrated on one parity => frame doubling
  const even = staticIdx.filter((i) => i % 2 === 0).length, odd = staticIdx.length - even;
  const parityBias = staticIdx.length ? Math.abs(even - odd) / staticIdx.length : 0;
  return { staticFrames: staticIdx.length, staticRatio: staticIdx.length / Math.max(1, diffs.length), longestStaticRun: longest, parityBias };
}

export function countExactDuplicates(hashes: string[]) {
  let dups = 0, longest = 0, run = 0;
  for (let i = 1; i < hashes.length; i++) {
    if (hashes[i] === hashes[i - 1]) { dups++; run++; longest = Math.max(longest, run); } else run = 0;
  }
  return { dups, longest };
}

export function verify(file: string, expect?: Expect): boolean {
  const checks: Check[] = [];
  const add = (name: string, ok: boolean | "warn", detail: string) =>
    checks.push({ name, status: ok === "warn" ? "WARN" : ok ? "PASS" : "FAIL", detail });

  const probe = JSON.parse(run("ffprobe", ["-v", "error", "-count_frames", "-show_streams", "-show_format", "-of", "json", file]).stdout);
  const v = probe.streams.find((s: any) => s.codec_type === "video");
  const a = probe.streams.find((s: any) => s.codec_type === "audio");
  const frac = (s: string) => { const [n, d] = s.split("/").map(Number); return n / d; };
  const fpsR = frac(v.r_frame_rate), fpsAvg = frac(v.avg_frame_rate);
  const nb = Number(v.nb_read_frames);
  const dur = Number(probe.format.duration);

  add("video codec", v.codec_name === "h264", `${v.codec_name} ${v.profile ?? ""}`);
  add("pixel format", v.pix_fmt === "yuv420p", v.pix_fmt);
  if (expect) {
    add("resolution", v.width === expect.width && v.height === expect.height, `${v.width}x${v.height} (expected ${expect.width}x${expect.height})`);
    add("frame rate", Math.abs(fpsR - expect.fps) < 0.01 && Math.abs(fpsAvg - expect.fps) < 0.01, `r=${v.r_frame_rate} avg=${v.avg_frame_rate}`);
    if (expect.frames) add("frame count", nb === expect.frames, `${nb} decoded (expected ${expect.frames})`);
  } else add("frame rate", "warn", `r=${v.r_frame_rate} avg=${v.avg_frame_rate} (no expectation given)`);
  add("duration", Math.abs(dur - nb / fpsR) < 0.1, `${dur.toFixed(3)}s container, ${(nb / fpsR).toFixed(3)}s of frames`);
  add("audio stream", !!a && a.codec_name === "aac" && Number(a.sample_rate) === 48000 && a.channels === 2,
    a ? `${a.codec_name} ${a.sample_rate} Hz ${a.channels}ch ${Math.round(a.bit_rate / 1000)} kb/s` : "missing");

  if (a) {
    const lr = run("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-map", "0:a", "-af", "ebur128=peak=true", "-f", "null", "-"]).stderr;
    const I = Number(/I:\s+(-?[\d.]+) LUFS/.exec(lr.slice(lr.lastIndexOf("Summary")))?.[1]);
    const tp = Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(lr.slice(lr.lastIndexOf("Summary")))?.[1]);
    add("loudness", I > -16.5 && I < -11.5 ? true : "warn", `${I} LUFS integrated (target -14)`);
    add("true peak", tp <= -0.5 ? true : "warn", `${tp} dBTP`);
    const vd = run("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-map", "0:a", "-af", "silencedetect=n=-50dB:d=1.5", "-f", "null", "-"]).stderr;
    const silences = (vd.match(/silence_start/g) ?? []).length;
    add("no long silences", silences === 0 ? true : "warn", `${silences} silent gap(s) > 1.5s`);
  }

  // exact duplicate frames
  const md5 = run("ffmpeg", ["-hide_banner", "-v", "error", "-i", file, "-map", "0:v", "-f", "framemd5", "-"]).stdout;
  const hashes = md5.split("\n").filter((l) => l && !l.startsWith("#")).map((l) => l.split(",").pop()!.trim());
  const dup = countExactDuplicates(hashes);
  add("no duplicated frames", dup.dups === 0, `${dup.dups} exact duplicates among ${hashes.length} frames`);

  // motion analysis on grain-free proxy
  const ms = run("ffmpeg", ["-hide_banner", "-v", "error", "-i", file, "-map", "0:v", "-vf",
    "scale=216:-2,format=gray,gblur=sigma=2,tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-",
    "-f", "null", "-"]).stdout;
  const diffs = [...ms.matchAll(/YAVG=([\d.]+)/g)].map((m) => Number(m[1]));
  const motion = analyseMotion(diffs, 0.02);
  add("genuine motion", motion.longestStaticRun < 30 ? true : "warn",
    `${(100 * (1 - motion.staticRatio)).toFixed(1)}% of frames show motion; longest still run ${motion.longestStaticRun} frames`);
  add("no frame-doubling pattern", motion.staticRatio < 0.2 || motion.parityBias < 0.6,
    `static ratio ${(motion.staticRatio * 100).toFixed(1)}%, parity bias ${motion.parityBias.toFixed(2)}`);

  // contact sheet
  const { dir, name } = parse(file);
  const sheet = `${dir}/${name}.contact.jpg`;
  const every = Math.max(1, Math.floor(nb / 12));
  const portrait = v.height > v.width;
  run("ffmpeg", ["-hide_banner", "-v", "error", "-y", "-i", file, "-vf",
    `select='not(mod(n\\,${every}))',scale=${portrait ? 270 : 384}:-2,drawtext=text='%{pts\\:hms}':x=8:y=8:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.5,tile=${portrait ? "6x2" : "4x3"}`,
    "-frames:v", "1", "-q:v", "3", sheet], { allowFail: true });

  const failed = checks.some((c) => c.status === "FAIL");
  const report = { file, ok: !failed, checks, motion, frames: nb, durationSec: dur, contactSheet: sheet };
  writeFileSync(`${dir}/${name}.report.json`, JSON.stringify(report, null, 2));
  console.log(`\n[verify] ${file}`);
  for (const c of checks) console.log(`  ${c.status === "PASS" ? "✔" : c.status === "WARN" ? "!" : "✘"} ${c.status.padEnd(4)} ${c.name.padEnd(26)} ${c.detail}`);
  console.log(`  → ${failed ? "FAILED" : "OK"}  (report: ${dir}/${name}.report.json, contact sheet: ${sheet})\n`);
  return !failed;
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/verify.ts")) {
  const args = process.argv.slice(2);
  const get = (k: string) => { const i = args.indexOf(`--${k}`); return i >= 0 ? Number(args[i + 1]) : undefined; };
  const file = args.find((a) => a.endsWith(".mp4"));
  if (!file) throw new Error("usage: npm run verify -- <file.mp4> [--width W --height H --fps F --frames N]");
  const w = get("width"), h = get("height"), fps = get("fps");
  const ok = verify(file, w && h && fps ? { width: w, height: h, fps, frames: get("frames") } : undefined);
  process.exit(ok ? 0 : 1);
}
