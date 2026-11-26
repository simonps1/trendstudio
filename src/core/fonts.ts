import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

export const FONT_DISPLAY = "Anton, Impact, sans-serif";
export const FONT_BODY = "Inter, system-ui, sans-serif";

let ready: Promise<unknown> | null = null;
/**
 * Load bundled (OFL) fonts once. Returns a promise that settles when every face is usable: text drawn on a
 * canvas before then silently falls back to a serif face (it did, on the first frame of each render tab).
 */
export function ensureFonts(): Promise<unknown> {
  ready ??= Promise.all([
    loadFont({ family: "Anton", url: staticFile("fonts/Anton-Regular.woff2"), weight: "400" }),
    loadFont({ family: "Inter", url: staticFile("fonts/inter-latin-500-normal.woff2"), weight: "500" }),
    loadFont({ family: "Inter", url: staticFile("fonts/inter-latin-800-normal.woff2"), weight: "800" }),
  ]).then(() => (typeof document === "undefined" ? null : Promise.all(["400 40px Anton", "500 40px Inter", "800 40px Inter"].map((f) => document.fonts.load(f)))));
  return ready;
}
