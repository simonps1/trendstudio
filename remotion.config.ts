// Settings used by `npm run studio` and the `remotion` CLI.
// Programmatic renders (scripts/render.ts) set the same options explicitly.
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setChromiumOpenGlRenderer("angle");
Config.setConcurrency(null);
if (process.env.REMOTION_BROWSER_EXECUTABLE) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER_EXECUTABLE);
}
