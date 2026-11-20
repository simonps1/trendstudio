/**
 * Scene library for series episodes. Every scene is a pure function of the
 * beat's local time, drawn on a 2D canvas, and works in any format.
 * Convention: a featured body sits at the frame centre with radius FIT, so
 * consecutive beats about the same body cut seamlessly.
 */
import { clamp, ease, hash, lerp, progress } from "../core/anim";
import type { DrawContext } from "../core/components/CanvasLayer";
import { blob, drawStar, drawStarfield, softSprite } from "../videos/star-life/cosmos";
import type { EpisodeLayout } from "./layout";
import { FIT, orbitStagger, REVEAL, type Body, type Visual } from "./types";

type Ctx = CanvasRenderingContext2D;

export const centre = (w: number, h: number) => [w / 2, h > w ? h * 0.57 : h * 0.56] as const;

// ------------------------------------------------------------ bodies

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function drawPlanet(ctx: Ctx, b: Body, x: number, y: number, r: number, t: number) {
  const [cr, cg, cb] = hexToRgb(b.color ?? "#8899aa");
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  if (r > 6 && b.surface === "bands") {
    for (let i = 0; i < 11; i++) {
      const yy = y - r + (i / 11) * r * 2;
      const k = 0.55 + 0.6 * hash(i * 3.3);
      ctx.fillStyle = i % 2 ? `rgba(${cr * 0.62},${cg * 0.5},${cb * 0.42},0.75)` : `rgba(255,240,220,${0.22 * k})`;
      ctx.fillRect(x - r, yy + Math.sin(t * 0.3 + i) * r * 0.006, r * 2, (r * 2) / 11 * k);
    }
    ctx.fillStyle = "rgba(190,80,50,0.85)";
    ctx.beginPath(); ctx.ellipse(x + r * (0.25 + 0.05 * Math.sin(t * 0.2)), y + r * 0.28, r * 0.17, r * 0.1, 0, 0, Math.PI * 2); ctx.fill();
  }
  if (r > 6 && b.surface === "earth") {
    for (let i = 0; i < 26; i++) { // continents drift with rotation
      const lon = (hash(i * 2.1) + t * 0.02) % 1, lat = hash(i * 5.7) * 2 - 1;
      const px = x + (lon * 2.6 - 1.3) * r, py = y + lat * r * 0.85;
      ctx.globalAlpha = 0.9;
      blob(ctx, softSprite([70, 150, 80], 0.5), px, py, r * (0.12 + 0.2 * hash(i + 9)));
    }
    for (let i = 0; i < 22; i++) { // clouds
      const lon = (hash(i * 7.3) + t * 0.035) % 1, lat = hash(i * 1.9) * 2 - 1;
      ctx.globalAlpha = 0.5;
      blob(ctx, softSprite([255, 255, 255], 0.2), x + (lon * 2.6 - 1.3) * r, y + lat * r * 0.9, r * (0.1 + 0.22 * hash(i + 4)));
    }
    ctx.globalAlpha = 1;
  }
  // day/night shading, light from the upper left
  const sh = ctx.createRadialGradient(x - r * 0.45, y - r * 0.45, r * 0.1, x, y, r * 1.05);
  sh.addColorStop(0, "rgba(255,255,255,0.22)"); sh.addColorStop(0.45, "rgba(0,0,0,0)"); sh.addColorStop(1, "rgba(0,0,0,0.82)");
  ctx.fillStyle = sh; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
  if (r > 10 && b.surface === "earth") { // thin atmosphere
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(x, y, r * 0.97, x, y, r * 1.12);
    g.addColorStop(0, "rgba(110,170,255,0.5)"); g.addColorStop(1, "rgba(110,170,255,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 1.12, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  }
}

/** A star too large for the frame: just its glowing limb, cheap and precise at any radius. */
function drawGiantLimb(ctx: Ctx, b: Body, x: number, y: number, r: number, w: number, h: number) {
  const temp = b.temp ?? 0.5;
  const mid = temp > 0.6 ? "170,205,255" : temp > 0.3 ? "255,200,110" : "255,110,40";
  const limb = temp > 0.6 ? "70,110,255" : temp > 0.3 ? "235,120,30" : "150,25,10";
  const edge = Math.max(w, h) * 0.9;
  const g = ctx.createRadialGradient(x, y, Math.max(0, r - edge), x, y, r);
  g.addColorStop(0, `rgba(${mid},1)`); g.addColorStop(0.85, `rgba(${limb},1)`); g.addColorStop(1, `rgba(${limb},0.9)`);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = "lighter";
  const glow = ctx.createRadialGradient(x, y, r, x, y, r + edge * 0.25);
  glow.addColorStop(0, `rgba(${limb},0.5)`); glow.addColorStop(1, `rgba(${limb},0)`);
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, r + edge * 0.25, 0, Math.PI * 2); ctx.arc(x, y, r, 0, Math.PI * 2, true); ctx.fill();
  ctx.globalCompositeOperation = "source-over";
}

export function drawBody(d: DrawContext, b: Body, x: number, y: number, r: number) {
  const { ctx, t, width: w, height: h, u } = d;
  if (r < 0.4) return;
  // cull bodies entirely off-screen
  if (x + r * 4.5 < 0 || x - r * 4.5 > w || y + r * 4.5 < 0 || y - r * 4.5 > h) {
    if (Math.hypot(x - w / 2, y - h / 2) > r + Math.hypot(w, h)) return;
  }
  if (b.kind === "planet") return drawPlanet(ctx, b, x, y, r, t);
  const big = 1400 * u;
  if (r > big * 1.6) return drawGiantLimb(ctx, b, x, y, r, w, h);
  if (r > big) { // blend the detailed star in as it comes into frame
    drawGiantLimb(ctx, b, x, y, r, w, h);
    ctx.globalAlpha = 1 - progress(r, big, big * 1.6);
    drawStar(ctx, x, y, r, t, b.temp ?? 0.5, 0.5, 1);
    ctx.globalAlpha = 1;
    return;
  }
  if (r < 3 * u) { // a point of light
    ctx.globalCompositeOperation = "lighter";
    blob(ctx, softSprite([255, 240, 220], 0.3), x, y, Math.max(r * 3, 2.5 * u));
    ctx.globalCompositeOperation = "source-over";
    return;
  }
  drawStar(ctx, x, y, r, t, b.temp ?? 0.5, 0.3 + 0.5 * (1 - (b.temp ?? 0.5)), 1);
}

// ------------------------------------------------------------ text helpers

function label(ctx: Ctx, text: string, x: number, y: number, px: number, alpha: number, font = "Anton", color = "#fff") {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${font === "Inter" ? "800 " : ""}${px}px ${font}`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.lineWidth = px * 0.16; ctx.strokeStyle = "rgba(0,0,0,0.85)"; ctx.lineJoin = "round";
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color; ctx.fillText(text, x, y);
  ctx.restore();
}

/** Name + note above a featured body (the space below is used by the size comparison). */
function nameplate(d: DrawContext, b: Body, cx: number, cy: number, alpha: number, rise = 0) {
  const { ctx, u } = d;
  const y = cy - FIT * u - 150 * u - rise;
  label(ctx, b.name.toUpperCase(), cx, y, 70 * u, alpha);
  if (b.note) label(ctx, b.note, cx, y + 62 * u, 32 * u, alpha * 0.9, "Inter", "#cfe0ff");
}

// ------------------------------------------------------------ scenes

function sceneBody(d: DrawContext, v: Extract<Visual, { type: "body" }>, lt: number) {
  const [cx, cy] = centre(d.width, d.height);
  drawBody(d, v.body, cx, cy, FIT * d.u * (1 + 0.02 * Math.sin(lt * 0.8)));
  nameplate(d, v.body, cx, cy, progress(lt, 0.15, 0.5));
}

function sceneCompare(d: DrawContext, v: Extract<Visual, { type: "compare" }>, lt: number, dur: number) {
  const { u } = d;
  const [cx, cy] = centre(d.width, d.height);
  const fit = FIT * u;
  const e = ease.inOutCubic(progress(lt, 0.12 * dur, REVEAL * dur));
  // world: `from` at the origin, `to` directly above it, almost touching
  const toY = -(v.from.radius * 1.0 + v.to.radius * 1.1);
  const s = Math.exp(lerp(Math.log(fit / v.from.radius), Math.log(fit / v.to.radius), e));
  // camera: the small body slides steadily from the centre to just below the big one
  const camY = (e * toY * (fit / v.to.radius)) / s;
  const sy = (wy: number) => cy + (wy - camY) * s;
  drawBody(d, v.to, cx, sy(toY), v.to.radius * s);
  drawBody(d, v.from, cx, sy(0), v.from.radius * s);
  // the small body keeps a tag while it shrinks away
  const fromR = v.from.radius * s;
  const tagA = progress(e, 0.35, 0.6) * (1 - progress(lt, dur - 0.25, dur));
  if (fromR < fit * 0.5) {
    label(d.ctx, v.from.name.toUpperCase(), cx + Math.max(fromR, 6 * u) + 90 * u, sy(0), 30 * u, tagA, "Inter", "#ffffff");
    d.ctx.globalAlpha = tagA; d.ctx.strokeStyle = "rgba(255,255,255,0.8)"; d.ctx.lineWidth = 2 * u;
    d.ctx.beginPath(); d.ctx.moveTo(cx + Math.max(fromR, 3 * u) + 8 * u, sy(0)); d.ctx.lineTo(cx + Math.max(fromR, 6 * u) + 28 * u, sy(0)); d.ctx.stroke();
    d.ctx.globalAlpha = 1;
  }
  // outgoing nameplate fades as the zoom starts; the new one lands on the reveal
  nameplate(d, v.from, cx, cy, 1 - progress(lt, 0, 0.12 * dur));
  const pop = progress(lt, REVEAL * dur - 0.05, REVEAL * dur + 0.3);
  nameplate(d, v.to, cx, cy, clamp(pop * 2), (1 - ease.outBack(pop)) * 30 * u);
}

function sceneOrbits(d: DrawContext, v: Extract<Visual, { type: "orbits" }>, lt: number, dur: number) {
  const { ctx, u } = d;
  const [cx, cy] = centre(d.width, d.height);
  const fit = FIT * u;
  drawBody(d, v.body, cx, cy, fit);
  const pxPerAu = fit / v.radiusAu;
  ctx.fillStyle = `rgba(0,0,0,${0.38 * progress(lt, 0.1, 0.5)})`;
  ctx.beginPath(); ctx.arc(cx, cy, fit, 0, Math.PI * 2); ctx.fill();
  v.orbits.forEach((o, i) => {
    const a = progress(lt, 0.25 + i * orbitStagger(dur, v.orbits.length), 0.25 + i * orbitStagger(dur, v.orbits.length) + 0.35);
    if (a <= 0) return;
    const r = o.au * pxPerAu;
    ctx.strokeStyle = `rgba(255,255,255,${0.75 * a})`; ctx.lineWidth = 2.2 * u;
    ctx.setLineDash([10 * u, 8 * u]); ctx.lineDashOffset = -lt * 20 * u;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2 * ease.outCubic(a)); ctx.stroke(); ctx.setLineDash([]);
    const ang = -0.7 + i * 0.9 + lt * 0.25 / Math.max(0.5, o.au);
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.beginPath(); ctx.arc(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, 5 * u, 0, Math.PI * 2); ctx.fill();
    if (o.label !== false) label(ctx, o.name.toUpperCase(), cx, cy - r - 24 * u, 36 * u, a, "Inter");
  });
  nameplate(d, { ...v.body, note: "placed where our Sun is" }, cx, cy, 1);
}

function sceneLap(d: DrawContext, v: Extract<Visual, { type: "lap" }>, lt: number, dur: number) {
  const { ctx, u } = d;
  const [cx, cy] = centre(d.width, d.height);
  const fit = FIT * u;
  drawBody(d, v.body, cx, cy, fit);
  const p = progress(lt, 0.4, dur - 0.5);
  const R = fit * 1.09;
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 60; i++) { // photon with a fading trail
    const k = i / 60, pa = p - k * 0.12;
    if (pa < 0) break;
    const a = -Math.PI / 2 + pa * Math.PI * 2;
    ctx.globalAlpha = (1 - k) * 0.9;
    blob(ctx, softSprite([190, 230, 255], 0.3), cx + Math.cos(a) * R, cy + Math.sin(a) * R, (i === 0 ? 26 : 14 * (1 - k)) * u);
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = "rgba(190,230,255,0.25)"; ctx.lineWidth = 1.5 * u;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  const val = (v.value * p).toFixed(v.decimals ?? 1);
  label(ctx, val, cx, cy - 12 * u, 150 * u, 1);
  label(ctx, v.unit.toUpperCase(), cx, cy + 92 * u, 44 * u, 1, "Inter");
  nameplate(d, { ...v.body, note: "one lap at the speed of light" }, cx, cy, 1);
}

function sceneShrink(d: DrawContext, v: Extract<Visual, { type: "shrink" }>, lt: number, dur: number) {
  const [cx, cy] = centre(d.width, d.height);
  const e = ease.inOutCubic(progress(lt, 0.1, dur * 0.8));
  const r = Math.exp(lerp(Math.log(FIT * d.u), Math.log(0.6 * d.u), e));
  drawBody(d, v.body, cx, cy, r);
  nameplate(d, v.body, cx, cy, 1 - progress(lt, 0, 0.4));
}

export function drawVisual(d: DrawContext, v: Visual, lt: number, dur: number) {
  switch (v.type) {
    case "body": return sceneBody(d, v, lt);
    case "compare": return sceneCompare(d, v, lt, dur);
    case "orbits": return sceneOrbits(d, v, lt, dur);
    case "lap": return sceneLap(d, v, lt, dur);
    case "shrink": return sceneShrink(d, v, lt, dur);
    case "stars": return;
  }
}

/** Draw a whole episode frame: starfield + the active beat. */
export function drawEpisode(d: DrawContext, layout: EpisodeLayout) {
  const { ctx, t, width: w, height: h, u } = d;
  ctx.fillStyle = "#03040b";
  ctx.fillRect(0, 0, w, h);
  drawStarfield(ctx, t, w, h, u, 1);
  const i = Math.max(0, layout.beats.findIndex((b) => t >= b.start && t < b.end));
  const b = layout.beats[t >= layout.duration ? layout.beats.length - 1 : i];
  drawVisual(d, b.beat.visual, t - b.start, b.end - b.start);
  // loop: fade to the bare starfield in the last moments
  const out = progress(t, layout.duration - 0.35, layout.duration);
  if (out > 0 && b.beat.visual.type !== "shrink" && b.beat.visual.type !== "stars") { ctx.fillStyle = `rgba(3,4,11,${out})`; ctx.fillRect(0, 0, w, h); }
}
