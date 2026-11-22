# TRENDSTUDIO — notes for Claude

- Stack: Remotion 4 (pinned exact, all `@remotion/*` must share one version), React 19, TS, Three.js, FFmpeg.
- Every visual must be a pure function of time (`frame / fps`). Never accumulate state across frames, never use `Math.random()` (use `rng(seed)` / `hash()` from `src/core/anim.ts`).
- Write timelines in **seconds**, not frames. Audio cues must come from the same `timeline.ts` as visuals.
- Scripts import `src/core/manifest.ts` (node-safe). Do not import React components from scripts.
- After changing visuals: render stills (`npm run render -- <id> vertical --still a,b,c`) and look at them before a full render.
- Never claim a render passed without the `verify` output showing OK. Report WARN lines honestly.
- Cloud sandbox only: `export REMOTION_BROWSER_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell REMOTION_GL=swangle` (remotion.media is blocked there).
- Run `npm run typecheck && npm test` before committing.
- Narration lines live in `src/videos/<id>/narration.ts`, pinned to timeline beats; `npm run voice` regenerates WAVs + `narration.json` (both committed). Keep lines short: the realism test in `tests/voice.test.ts` must pass.
- huggingface.co must be reachable for the first `npm run voice` (model download). In a restricted sandbox, allow it in the environment's network settings.
- Series episodes: `src/episodes/<id>/spec.ts` (beats = one line + one visual). Timing is voice-first via `src/series/layout.ts`; never hand-time episode beats. Short cut must stay < 59 s and long cut > 61 s (`tests/series.test.ts`). Every stated fact needs a checkable source; label uncertain values as estimates on screen.
- Voice clarity: `npm run audio` prints voice-vs-bed dB per line (speech band); keep every line >= 10 dB.
- Narrator is Chatterbox (voice `"chatterbox"`, Python worker `scripts/tts_chatterbox.py`, venv `.venv-tts` or `CHATTERBOX_PYTHON`). Write narration as flowing sentences, not fragments. In the cloud sandbox also set `HF_HUB_DISABLE_XET=1 NODE_USE_ENV_PROXY=1`.
- The channel host (astronaut) is `src/series/host.ts`; keep him identical across videos.
- Series visuals: `body`, `compare`, `pair` (similar sizes side by side), `gap` (true distance, with `ruler` / `fill` / `trip`), `orbits`, `lap`, `shrink`, `stars`. Bodies: stars, planets (`earth`, `bands`, `plain`, `rocky`, `mars`, optional `rings`) and black holes (`kind: "hole"`). Shared cast lives in `src/episodes/bodies.ts`. Use `pair`, not `compare`, when the size ratio is under about 1.6.
