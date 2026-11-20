# TRENDSTUDIO — notes for Claude

- Stack: Remotion 4 (pinned exact, all `@remotion/*` must share one version), React 19, TS, Three.js, FFmpeg.
- Every visual must be a pure function of time (`frame / fps`). Never accumulate state across frames, never use `Math.random()` (use `rng(seed)` / `hash()` from `src/core/anim.ts`).
- Write timelines in **seconds**, not frames. Audio cues must come from the same `timeline.ts` as visuals.
- Scripts import `src/core/manifest.ts` (node-safe). Do not import React components from scripts.
- After changing visuals: render stills (`npm run render -- <id> vertical --still a,b,c`) and look at them before a full render.
- Never claim a render passed without the `verify` output showing OK. Report WARN lines honestly.
- Cloud sandbox only: `export REMOTION_BROWSER_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell REMOTION_GL=swangle` (remotion.media is blocked there).
- Run `npm run typecheck && npm test` before committing.
