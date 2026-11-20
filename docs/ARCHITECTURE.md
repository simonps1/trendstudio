# Architecture

## Principles

1. **Time is the only input.** Every visual is a pure function of `t` (seconds).
   No state carried between frames → frames render in parallel, in any order, on any machine,
   and every one of the 60 frames per second is genuinely computed (never duplicated).
2. **One timeline per video** (`src/videos/<id>/timeline.ts`) drives visuals, captions,
   HUD *and* the soundtrack, so audio-visual sync is structural, not manual.
3. **Format-independent design.** Layouts use a design unit `u = min(width,height)/1080`,
   so one composition renders to vertical, horizontal and 4K.
4. **Original, local assets.** Sound is synthesized; fonts are OFL; no paid services.
5. **Verify, don't assume.** Every render goes through `scripts/verify.ts`.

## Render pipeline

```
manifest.ts ──► build-audio.ts ──► public/audio/<id>.wav  (synth → mixer → reverb → loudnorm −14 LUFS)
     │
     └──► render.ts ──► @remotion/bundler ──► headless Chrome (canvas 2D + WebGL) ──► x264 CRF16 + AAC 320k
                                                                                      │
                                                                         verify.ts ◄──┘ (ffprobe, framemd5, motion, R128, contact sheet)
```

## Adding a new video

1. Create `src/videos/<id>/timeline.ts` with scene times (seconds), captions and any physics/state functions.
2. Write the visuals as React components / `CanvasLayer` draw functions / `ThreeCanvas` scenes reading `t`.
3. Write `narration.ts` (voice lines pinned to timeline beats), run `npm run voice -- <id>`.
4. Write `soundtrack.ts` using the kit in `src/audio/synth.ts` (`whoosh`, `riser`, `impact`, `shimmer`,
   `pop`, `sizzle`, `chime`, `thump`, `pad`) placed at timeline times.
5. Register it in `src/core/manifest.ts` (metadata) and `src/core/registry.ts` (component).
6. `npm run studio`, then `npm run render -- <id> vertical`.

## Roadmap (designed-for, not yet built)

| Capability | Planned home | Notes |
|---|---|---|
| Trend research (YouTube/TikTok) | `src/research/` + `scripts/research.ts` | Pulls public trend signals into a JSON brief; YouTube Data API free tier |
| Creative direction (idea → timeline) | `src/director/` | Claude generates a typed `VideoSpec` (scenes, captions, cues) validated by schema, rendered by generic scene templates |
| Scene template library | `src/templates/` | Reusable parametric formats: explainer, countdown, physics sim, data race, 3D reveal |
| Simulation formats | `src/sim/` | Deterministic physics (fixed-step, seeded) precomputed per frame |
| Narration | `src/voice/`, `scripts/build-voice.ts` | **Done:** Kokoro TTS, Whisper word alignment, karaoke captions, ducking, intelligibility QC |
| Audiovisual QC with vision | `scripts/verify.ts` + `scripts/review.ts` | Contact sheets + audio summary reviewed by Claude; checks text legibility/safe areas |
| Batch production | `scripts/batch.ts` | Queue of specs → renders → reports |
| Personal UI | Remotion Studio + small local page | No accounts, no cloud |

Safe areas: keep critical text out of the bottom ~20% and right ~12% of vertical videos (platform UI).
