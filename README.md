# TRENDSTUDIO

Personal video/animation generator for YouTube Shorts, TikTok and YouTube.
Natural-language idea → editable TypeScript timeline → native 60 FPS MP4 with
synchronized, original sound — verified by automated QC.

Built on **Remotion 4 + React 19 + TypeScript**, **Three.js** for 3D and
**FFmpeg** for encoding/QC. Everything runs locally and free — no paid APIs.

## Quick start (any OS)

```bash
npm install
npm run studio                          # live preview/editor in the browser
npm run render -- star-life vertical    # 1080x1920 @60 → out/star-life--vertical.mp4 (+ QC report)
npm run render -- star-life horizontal  # 1920x1080 @60
npm run render -- star-life all         # every format, incl. 4K presets
npm test                                # unit tests
```

Useful options:

| Command | What it does |
|---|---|
| `npm run list` | list videos and formats |
| `npm run render -- star-life vertical --frames 0-299` | quick preview of a frame range |
| `npm run render -- star-life vertical --still 600,1700` | PNG stills → `out/stills/` |
| `npm run render -- star-life vertical --concurrency 8` | more parallel browser tabs |
| `npm run audio -- star-life` | rebuild only the soundtrack |
| `npm run verify -- out/x.mp4 --width 1080 --height 1920 --fps 60` | QC any MP4 |

Format presets (`src/core/formats.ts`): `vertical` 1080×1920, `horizontal`
1920×1080, `vertical4k` 2160×3840, `horizontal4k` 3840×2160 — all native 60 FPS.

## What the QC checks (`scripts/verify.ts`)

Every render is automatically checked and a `*.report.json` + `*.contact.jpg`
are written next to the MP4:

- H.264 / yuv420p, exact resolution, constant 60 FPS (`r_frame_rate` and `avg_frame_rate`), exact frame count, duration
- AAC 48 kHz stereo audio, EBU R128 loudness ≈ −14 LUFS, true peak, no long silences
- **zero exact duplicate frames** (framemd5) — guards against padded/fake 60 FPS
- motion analysis on a blurred, grain-free proxy: frozen sections and the
  alternating-static pattern that 30 FPS content doubled to 60 FPS produces
- a contact sheet for a quick visual check

## Project layout

```
src/
  core/          formats, manifest (node-safe), registry (components), anim helpers, fonts
  core/components/  CanvasLayer, Caption, FilmFinish (grain + vignette)
  audio/         synth.ts (original sound design kit + mixer + reverb), wav.ts
  videos/<id>/   one folder per video: timeline.ts (single source of truth),
                 visuals, soundtrack.ts
scripts/         render.ts, build-audio.ts, verify.ts
public/          fonts (OFL), generated audio (gitignored, rebuilt on render)
docs/            SETUP-WINDOWS.md, SETUP-MAC.md, ARCHITECTURE.md
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how to add a new video and the roadmap.

## Licensing of assets

- All sound is synthesized from code in `src/audio/synth.ts` — original, no third-party samples.
- Fonts: Anton and Inter, SIL Open Font License (`public/fonts/LICENSE.md`).
- Remotion is free for individuals and companies with ≤3 employees; check
  [remotion.dev/license](https://www.remotion.dev/license) if that changes.
