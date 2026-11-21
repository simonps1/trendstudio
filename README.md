# TRENDSTUDIO

Personal video/animation generator for YouTube Shorts, TikTok and YouTube.
Natural-language idea → editable TypeScript timeline → native 60 FPS MP4 with
synchronized, original sound — verified by automated QC.

Built on **Remotion 4 + React 19 + TypeScript**, **Three.js** for 3D and
**FFmpeg** for encoding/QC. Everything runs locally and free — no paid APIs.

## Quick start (any OS)

```bash
npm install
npm run voice -- star-life              # generate narration (first run downloads the voice model, ~330 MB)
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
| `npm run voice -- star-life` | (re)generate narration; unchanged lines are cached |
| `npm run voice:samples` | render the hook in 8 voices → `out/voice-samples/` to pick a favourite |
| `npm run verify -- out/x.mp4 --width 1080 --height 1920 --fps 60` | QC any MP4 |

Format presets (`src/core/formats.ts`): `vertical` 1080×1920, `horizontal`
1920×1080, `vertical4k` 2160×3840, `horizontal4k` 3840×2160 — all native 60 FPS.

## Series episodes

An episode is a script plus scene choices: `src/episodes/<id>/spec.ts`. Each beat is one spoken line
and one visual (`body`, `compare`, `orbits`, `lap`, `shrink`, `stars`). Timing comes from the voice,
so nothing is hand-timed. Every episode produces two videos: `<id>` (short cut, under 60 s) and
`<id>-long` (over 60 s); beats marked `only: "long"` appear only in the long cut.

```bash
npm run voice -- star-sizes star-sizes-long     # generate narration for both cuts
npm run render -- star-sizes vertical           # short cut
npm run render -- star-sizes-long vertical      # long cut
```

To add an episode: copy `src/episodes/star-sizes`, edit `spec.ts`, add it to `src/episodes/index.ts`.
Series scenes are composed for vertical video. See [docs/CHANNEL-PLAN.md](docs/CHANNEL-PLAN.md).

## Voice-over

**Narrator: Chatterbox** (Resemble AI, MIT licence), using its built-in male voice. A video uses it when
its voice is set to `"chatterbox"`. It is a Python model, so it needs a one-time setup:

```bash
python -m venv .venv-tts
.venv-tts/bin/pip install chatterbox-tts "setuptools<81"      # Windows: .venv-tts\Scripts\pip
```

`npm run voice` then starts it automatically (GPU if available, otherwise CPU at about 4 s per second
of speech). Every take is transcribed with Whisper and regenerated if words come out wrong. Chatterbox
adds an inaudible watermark marking the audio as AI-generated; it is left on.

The older engine, Kokoro, is still available by setting a voice such as `"am_fenrir"` or `"af_heart"`:

- **Engine:** [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) (Apache-2.0) via the official
  `kokoro-js` package — runs locally on CPU, free, commercial use allowed. Default voice `af_heart`
  (Kokoro's top-graded voice); change `VOICE` in `src/videos/<id>/narration.ts`.
- **Script:** `src/videos/<id>/narration.ts`. Every line is pinned to the visual timeline
  (`at` / `after` / `endAt`, plus an `until` deadline). Lines that run long are sped up
  (max 1.25×); anything that still doesn't fit fails the build with a clear message.
- **Word timing:** Whisper (`whisper-base.en`, MIT) transcribes each line for exact word timestamps,
  which drive the karaoke captions. Falls back to syllable-based estimates if unavailable.
- **Mix:** voice chain (high-pass, 3:1 compression, presence); music ducks ~9 dB and effects ~4 dB
  under speech; whole mix normalised to −14 LUFS.
- **QC:** after rendering, Whisper transcribes the *final mix* and the word error rate vs. the script
  is reported (PASS ≤ 12%).
- Generated voice WAVs (`public/voice/`) and `narration.json` are committed, so every device renders
  the identical take without re-generating.

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
  series/        episode format: types, voice-first layout, scene library, generic soundtrack
  episodes/<id>/ one folder per series episode: spec.ts + generated narration
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

- All music/SFX is synthesized from code in `src/audio/synth.ts` — original, no third-party samples.
- Narration: Kokoro-82M (Apache-2.0) and Whisper (MIT) model weights, run locally.
- Fonts: Anton and Inter, SIL Open Font License (`public/fonts/LICENSE.md`).
- Remotion is free for individuals and companies with ≤3 employees; check
  [remotion.dev/license](https://www.remotion.dev/license) if that changes.
