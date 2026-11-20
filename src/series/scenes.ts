/**
 * Scene logic for series episodes. For any time t it answers three things:
 *   - which bodies are where (drawn by the WebGL layer, BodiesGL)
 *   - what the 2D overlay draws (labels, orbits, counters, flashes)
 *   - how the camera is moving (zoom speed, shake) for the starfield
 * Everything is a pure function of time.
 * Convention: a featured body sits at the frame centre with radius FIT, so
 * consecutive beats about the same body cut seamlessly.
 */
import { clamp, ease, lerp, noise1, progress } from "../core/anim";
import type { DrawContext } from "../core/components/CanvasLayer";
import { blob, drawStarfield, softSprite } from "../videos/star-life/cosmos";
import type { PlacedBody } from "./BodiesGL";
import { zoomTime, type EpisodeLayout, type LaidOutBeat } from "./layout";
import { FIT, orbitStagger, type Body, type Visual } from "./types";

type Ctx = CanvasRenderingContext2D;

export const centre = (w: number, h: number) => [w / 2, h > w ? h * 0.545 : h * 0.56] as const;

const active = (layout: EpisodeLayout, t: number): LaidOutBeat =>
  layout.beats.find((b) => t >= b.start && t < b.end) ?? layout.beats[t < 0 ? 0 : layout.beats.length - 1];

/** Zoom progress 0..1 of a compare beat: slow start, fast middle, hard landing on the beat. */
const zoomEase = (lt: number, v: Visual) => {
  const x = progress(lt, 0, zoomTime(v));
  return x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; // quartic in, cubic out
};

// ------------------------------------------------------------ camera feel

/** Camera shake (pixels) and flash (0..1) from reveal landings; zoom = how fast we are pulling out. */
export function cameraFx(layout: EpisodeLayout, t: number, u: number) {
  const b = active(layout, t);
  const v = b.beat.visual, lt = t - b.start;
  let shake = 0, flash = 0, zoom = 0;
  if (v.type === "compare") {
    const Z = zoomTime(v), since = lt - Z;
    if (since >= 0) {
      shake = (v.big ? 26 : 9) * Math.exp(-since * 6);
      flash = (v.big ? 0.75 : 0.28) * Math.exp(-since * (v.big ? 5 : 9));
    }
    const dt = 1 / 120;
    zoom = clamp(((zoomEase(lt + dt, v) - zoomEase(lt - dt, v)) / (2 * dt)) * Z * 0.5);
  }
  if (v.type === "shrink") zoom = 0.5 * Math.sin(Math.PI * progress(lt, 0.1, (b.end - b.start) * 0.8));
  return { shake: [noise1(t * 37) * shake * u, noise1(t * 41 + 50) * shake * u] as [number, number], flash, zoom };
}

// ------------------------------------------------------------ bodies

function compareGeometry(v: Extract<Visual, { type: "compare" }>, lt: number, cy: number, fit: number) {
  const e = zoomEase(lt, v);
  // world: `from` at the origin, `to` directly above it, almost touching
  const toY = -(v.from.radius + v.to.radius * 1.1);
  const s = Math.exp(lerp(Math.log(fit / v.from.radius), Math.log(fit / v.to.radius), e));
  // the small body slides steadily from the centre to just below the big one
  const camY = (e * toY * (fit / v.to.radius)) / s;
  const sy = (wy: number) => cy + (wy - camY) * s;
  return { e, s, toScreenY: sy(toY), fromScreenY: sy(0) };
}

/** Bodies on screen at time t (pixels). */
export function placeBodies(layout: EpisodeLayout, t: number, w: number, h: number, u: number): PlacedBody[] {
  const b = active(layout, t);
  const v = b.beat.visual, lt = t - b.start, dur = b.end - b.start;
  const [cx0, cy0] = centre(w, h);
  const { shake } = cameraFx(layout, t, u);
  const cx = cx0 + shake[0], cy = cy0 + shake[1];
  const fit = FIT * u;
  switch (v.type) {
    case "body": {
      const pop = ease.outBack(progress(lt, 0, 0.35)); // punch in on the cut
      return [{ body: v.body, x: cx, y: cy, r: fit * (0.9 + 0.1 * pop) * (1 + 0.015 * Math.sin(lt * 1.3)) }];
    }
    case "compare": {
      const g = compareGeometry(v, lt, cy, fit);
      return [
        { body: v.to, x: cx, y: g.toScreenY, r: v.to.radius * g.s },
        { body: v.from, x: cx, y: g.fromScreenY, r: v.from.radius * g.s },
      ];
    }
    case "orbits":
    case "lap":
      return [{ body: v.body, x: cx, y: cy, r: fit }];
    case "shrink": {
      const e = ease.inOutCubic(progress(lt, 0.1, dur * 0.8));
      return [{ body: v.body, x: cx, y: cy, r: Math.exp(lerp(Math.log(fit), Math.log(0.5 * u), e)) }];
    }
    case "stars":
      return [];
  }
}

// ------------------------------------------------------------ overlay (2D)

function label(ctx: Ctx, text: string, x: number, y: number, px: number, alpha: number, font = "Anton", color = "#fff", align: CanvasTextAlign = "center") {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = clamp(alpha);
  ctx.font = `${font === "Inter" ? "800 " : ""}${px}px ${font}`;
  ctx.textAlign = align; ctx.textBaseline = "middle";
  ctx.lineWidth = px * 0.18; ctx.strokeStyle = "rgba(0,0,0,0.9)"; ctx.lineJoin = "round";
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color; ctx.fillText(text, x, y);
  ctx.restore();
}

/** Name + fact above a featured body. `punch` 0..1 scales it in. */
function nameplate(d: DrawContext, b: Body, cx: number, cy: number, alpha: number, punch = 1, note = b.note) {
  const { ctx, u } = d;
  const y = cy - FIT * u - 158 * u;
  const k = 0.7 + 0.3 * ease.outBack(clamp(punch));
  label(ctx, b.name.toUpperCase(), cx, y, 76 * u * k, alpha);
  if (note) label(ctx, note.toUpperCase(), cx, y + 72 * u, 42 * u * k, alpha, "Anton", "#ffd23f");
}

export function drawOverlay(d: DrawContext, layout: EpisodeLayout) {
  const { ctx, t, width: w, height: h, u } = d;
  const b = active(layout, t);
  const v = b.beat.visual, lt = t - b.start, dur = b.end - b.start;
  const fx = cameraFx(layout, t, u);
  const [cx0, cy0] = centre(w, h);
  const cx = cx0 + fx.shake[0], cy = cy0 + fx.shake[1];
  const fit = FIT * u;

  if (v.type === "body") nameplate(d, v.body, cx, cy, progress(lt, 0.05, 0.25), progress(lt, 0.05, 0.4));

  if (v.type === "compare") {
    const Z = zoomTime(v);
    const g = compareGeometry(v, lt, cy, fit);
    nameplate(d, v.from, cx, cy, 1 - progress(lt, 0, 0.18));
    nameplate(d, v.to, cx, cy, progress(lt, Z - 0.03, Z + 0.08), progress(lt, Z - 0.03, Z + 0.3));
    // the outgoing body keeps a tag so the eye can follow it
    const fromR = v.from.radius * g.s;
    if (fromR < fit * 0.55) {
      const a = progress(g.e, 0.55, 0.9) * (1 - progress(lt, dur - 0.2, dur));
      const x0 = cx + Math.max(fromR, 4 * u) + 14 * u;
      ctx.globalAlpha = a; ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 2.5 * u;
      ctx.beginPath(); ctx.moveTo(x0, g.fromScreenY); ctx.lineTo(x0 + 34 * u, g.fromScreenY); ctx.stroke(); ctx.globalAlpha = 1;
      label(ctx, v.from.name.toUpperCase(), x0 + 46 * u, g.fromScreenY, 34 * u, a, "Inter", "#fff", "left");
    }
    // shock ring on landing
    const since = lt - Z;
    if (since >= 0 && since < 0.7) {
      const k = since / 0.7;
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = `rgba(255,240,210,${(1 - k) * (v.big ? 0.8 : 0.4)})`;
      ctx.lineWidth = (v.big ? 16 : 7) * u * (1 - k);
      ctx.beginPath(); ctx.arc(cx, cy, fit * (1.02 + ease.outCubic(k) * (v.big ? 1.6 : 0.7)), 0, Math.PI * 2); ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
    }
  }

  if (v.type === "orbits") {
    const pxPerAu = fit / v.radiusAu;
    ctx.fillStyle = `rgba(40,0,0,${0.3 * progress(lt, 0.05, 0.4)})`;
    ctx.beginPath(); ctx.arc(cx, cy, fit, 0, Math.PI * 2); ctx.fill();
    v.orbits.forEach((o, i) => {
      const t0 = 0.25 + i * orbitStagger(dur, v.orbits.length);
      const a = progress(lt, t0, t0 + 0.3);
      if (a <= 0) return;
      const r = o.au * pxPerAu;
      ctx.strokeStyle = `rgba(255,255,255,${0.85 * a})`; ctx.lineWidth = 2.6 * u;
      ctx.setLineDash([12 * u, 9 * u]); ctx.lineDashOffset = -lt * 26 * u;
      ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ease.outCubic(a)); ctx.stroke(); ctx.setLineDash([]);
      const ang = -0.7 + i * 0.9 + (lt * 0.5) / Math.max(0.5, o.au);
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.beginPath(); ctx.arc(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, 6 * u, 0, Math.PI * 2); ctx.fill();
      if (o.label !== false) label(ctx, o.name.toUpperCase(), cx, cy - r - 26 * u, 38 * u, a, "Inter");
    });
    nameplate(d, v.body, cx, cy, 1, 1, "in place of our Sun");
  }

  if (v.type === "lap") {
    const p = progress(lt, 0.3, dur - 0.5);
    const R = fit * 1.09;
    ctx.strokeStyle = "rgba(190,230,255,0.3)"; ctx.lineWidth = 2 * u;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 70; i++) { // photon with a fading trail
      const k = i / 70, pa = p - k * 0.14;
      if (pa < 0) break;
      const a = -Math.PI / 2 + pa * Math.PI * 2;
      ctx.globalAlpha = (1 - k) * 0.9;
      blob(ctx, softSprite([190, 230, 255], 0.3), cx + Math.cos(a) * R, cy + Math.sin(a) * R, (i === 0 ? 30 : 16 * (1 - k)) * u);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    label(ctx, (v.value * p).toFixed(v.decimals ?? 1), cx, cy - 14 * u, 170 * u, 1);
    label(ctx, v.unit.toUpperCase(), cx, cy + 100 * u, 50 * u, 1, "Anton", "#ffd23f");
    nameplate(d, v.body, cx, cy, 1, 1, "one lap at light speed");
  }

  if (v.type === "shrink") nameplate(d, v.body, cx, cy, 1 - progress(lt, 0, 0.3));

  if (fx.flash > 0.004) { ctx.fillStyle = `rgba(255,244,225,${fx.flash})`; ctx.fillRect(0, 0, w, h); }
  // loop: fade to the bare starfield in the last moments
  const out = progress(t, layout.duration - 0.3, layout.duration);
  if (out > 0 && v.type !== "shrink" && v.type !== "stars") { ctx.fillStyle = `rgba(3,4,11,${out})`; ctx.fillRect(0, 0, w, h); }
}

/** Background: starfield that streaks inward while the camera pulls out. */
export function drawBackground(d: DrawContext, layout: EpisodeLayout) {
  const { ctx, t, width: w, height: h, u } = d;
  ctx.fillStyle = "#03040b";
  ctx.fillRect(0, 0, w, h);
  const fx = cameraFx(layout, t, u);
  ctx.translate(fx.shake[0] * 0.5, fx.shake[1] * 0.5);
  drawStarfield(ctx, t, w, h, u, 1, fx.zoom * 0.55);
}
