/** Render the channel art:  npm run brand  ->  out/brand/avatar.png (1080x1080), banner.png (2560x1440) */
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition, type ChromiumOptions } from "@remotion/renderer";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const chromiumOptions: ChromiumOptions = {};
if (process.env.REMOTION_GL) chromiumOptions.gl = process.env.REMOTION_GL as ChromiumOptions["gl"];
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE || null;
const serveUrl = await bundle({ entryPoint: resolve("src/index.ts"), publicDir: resolve("public") });
mkdirSync(join("out", "brand"), { recursive: true });
for (const [id, file] of [["brand-avatar", "avatar.png"], ["brand-banner", "banner.png"]]) {
  const composition = await selectComposition({ serveUrl, id, browserExecutable, chromiumOptions });
  const output = join("out", "brand", file);
  await renderStill({ serveUrl, composition, output, browserExecutable, chromiumOptions });
  console.log(`[brand] ${output} (${composition.width}x${composition.height})`);
}
