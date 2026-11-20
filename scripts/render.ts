/**
 * Render a video:  npm run render -- <video-id> [format] [options]
 *
 *   formats:  vertical (default) | horizontal | vertical4k | horizontal4k | all
 *   --frames 0-299     render a frame range (quick previews)
 *   --still 600,1200   render individual frames to PNG (out/stills/) instead of a video
 *   --concurrency 4    parallel browser tabs (default: Remotion picks)
 *   --no-verify        skip automatic QC
 *   --list             list videos and formats
 *
 * Env: REMOTION_BROWSER_EXECUTABLE (custom Chrome), REMOTION_GL (angle|swangle|egl|vulkan|swiftshader)
 *      X264_PRESET (default "medium")
 */
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition, type ChromiumOptions } from "@remotion/renderer";
import { existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { compositionId, FORMATS, type FormatId } from "../src/core/formats";
import { MANIFEST, narrationJsonPath } from "../src/core/manifest";
import { buildAudio } from "./build-audio";
import { verifySpeech } from "./verify-speech";
import { verify } from "./verify";

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? (args[i + 1] ?? "") : undefined;
};
const positional = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--") && !["--no-verify", "--list"].includes(args[i - 1])));

if (args.includes("--list")) {
  for (const v of MANIFEST) console.log(`${v.id}  (${v.durationSec}s)  formats: ${v.formats.join(", ")}  — ${v.title}`);
  process.exit(0);
}

const videoId = positional[0] ?? MANIFEST[0].id;
const video = MANIFEST.find((v) => v.id === videoId);
if (!video) throw new Error(`Unknown video "${videoId}". Try --list.`);
const formatArg = positional[1] ?? "vertical";
const formats = (formatArg === "all" ? video.formats : [formatArg]) as FormatId[];
for (const f of formats) if (!FORMATS[f]) throw new Error(`Unknown format "${f}"`);

const chromiumOptions: ChromiumOptions = {};
if (process.env.REMOTION_GL) chromiumOptions.gl = process.env.REMOTION_GL as ChromiumOptions["gl"];
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE || null;
const concurrency = flag("concurrency") ? Number(flag("concurrency")) : null;

if (video.soundtrack && flag("still") === undefined) await buildAudio(video.id);

console.log("[bundle] bundling…");
const serveUrl = await bundle({ entryPoint: resolve("src/index.ts"), publicDir: resolve("public") });
mkdirSync("out", { recursive: true });

for (const format of formats) {
  const id = compositionId(video.id, format);
  const composition = await selectComposition({ serveUrl, id, browserExecutable, chromiumOptions });
  const still = flag("still");
  if (still !== undefined) {
    for (const f of still.split(",").map(Number)) {
      const output = join("out", "stills", `${id}-f${String(f).padStart(5, "0")}.png`);
      await renderStill({ serveUrl, composition, output, frame: f, browserExecutable, chromiumOptions });
      console.log(`[still] ${output}`);
    }
    continue;
  }
  const frames = flag("frames")?.split("-").map(Number) as [number, number] | undefined;
  const output = join("out", frames ? `${id}.f${frames[0]}-${frames[1]}.mp4` : `${id}.mp4`);
  const t0 = Date.now();
  let last = -1;
  await renderMedia({
    serveUrl, composition, outputLocation: output, codec: "h264",
    crf: FORMATS[format].crf, pixelFormat: "yuv420p", x264Preset: (process.env.X264_PRESET as "medium") ?? "medium",
    audioCodec: "aac", audioBitrate: "320k", imageFormat: "jpeg", jpegQuality: 95,
    colorSpace: "bt709", frameRange: frames ?? null, concurrency, browserExecutable, chromiumOptions,
    onProgress: ({ progress, renderedFrames, encodedFrames }) => {
      const pct = Math.floor(progress * 100);
      if (pct !== last && pct % 5 === 0) {
        last = pct;
        const el = (Date.now() - t0) / 1000;
        console.log(`[render] ${id} ${pct}%  rendered ${renderedFrames}  encoded ${encodedFrames}  ${el.toFixed(0)}s  (${(renderedFrames / el).toFixed(1)} fps)`);
      }
    },
  });
  console.log(`[render] done: ${output} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  if (!args.includes("--no-verify") && existsSync(output)) {
    const expectedFrames = frames ? frames[1] - frames[0] + 1 : composition.durationInFrames;
    const ok = verify(output, { width: composition.width, height: composition.height, fps: composition.fps, frames: expectedFrames });
    if (!ok) process.exitCode = 1;
    const narr = narrationJsonPath(video);
    if (existsSync(narr) && !frames) {
      const sp = await verifySpeech(output, narr);
      if (sp.status === "FAIL") process.exitCode = 1;
    }
  }
}
