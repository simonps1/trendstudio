import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

export const FONT_DISPLAY = "Anton, Impact, sans-serif";
export const FONT_BODY = "Inter, system-ui, sans-serif";

let started = false;
/** Load bundled (OFL) fonts once; Remotion waits for them before rendering. */
export function ensureFonts() {
  if (started) return;
  started = true;
  loadFont({ family: "Anton", url: staticFile("fonts/Anton-Regular.woff2"), weight: "400" });
  loadFont({ family: "Inter", url: staticFile("fonts/inter-latin-500-normal.woff2"), weight: "500" });
  loadFont({ family: "Inter", url: staticFile("fonts/inter-latin-800-normal.woff2"), weight: "800" });
}
