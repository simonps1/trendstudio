/**
 * The channel's host: a small astronaut drawn in code, identical in every video.
 * He floats in a lower corner, his chest lights pulse while he talks, and he
 * throws his arm up on big moments. Pure function of time.
 */
import { clamp, ease, noise1, progress } from "../core/anim";
import type { WordTiming } from "../voice/types";

type Ctx = CanvasRenderingContext2D;

export interface HostState {
  /** 0..1 how strongly he is speaking right now. */
  talk: number;
  /** 0..1 reaction to a big moment (arm up, lean back). */
  excite: number;
  /** 0..1 fade/scale in. */
  appear?: number;
}

/** Speaking level at time t from word timings (with a syllable-like flutter). */
export function talkLevel(words: WordTiming[], t: number) {
  const speaking = words.some((w) => t >= w.start - 0.03 && t < w.end + 0.04);
  return speaking ? 0.45 + 0.55 * Math.abs(Math.sin(t * 21)) * (0.6 + 0.4 * Math.abs(noise1(t * 9))) : 0;
}

function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

/** Draw the host with his centre at (x, y); `size` is his height in pixels. */
export function drawHost(ctx: Ctx, x: number, y: number, size: number, t: number, st: HostState) {
  const appear = st.appear ?? 1;
  if (appear <= 0) return;
  const k = size / 2.5; // model units: about 2.5 tall
  const bob = Math.sin(t * 1.7) * 0.05 + Math.sin(t * 0.6) * 0.03;
  const tilt = Math.sin(t * 0.9) * 0.07 - st.excite * 0.22;
  ctx.save();
  ctx.translate(x, y + bob * k + (1 - ease.outBack(clamp(appear))) * size * 0.6);
  ctx.rotate(tilt);
  ctx.scale(k, k);
  ctx.globalAlpha = clamp(appear * 2);
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  const line = "#10141f", suit = "#f2f4f8", shade = "#c5ccd8", lw = 0.07;
  const part = (fill: string) => { ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = line; ctx.lineWidth = lw; ctx.stroke(); };

  // soft halo so he reads against any background
  const halo = ctx.createRadialGradient(0, 0, 0.3, 0, 0, 1.9);
  halo.addColorStop(0, "rgba(120,170,255,0.20)"); halo.addColorStop(1, "rgba(120,170,255,0)");
  ctx.fillStyle = halo; ctx.fillRect(-2, -2, 4, 4);

  // backpack
  rr(ctx, -0.62, -0.15, 1.24, 1.0, 0.2); part("#8d97a8");
  // legs (gentle zero-g paddle)
  for (const side of [-1, 1]) {
    ctx.save(); ctx.translate(side * 0.22, 0.78); ctx.rotate(side * 0.12 + Math.sin(t * 1.3 + side) * 0.12);
    rr(ctx, -0.17, 0, 0.34, 0.52, 0.15); part(suit);
    rr(ctx, -0.19, 0.4, 0.38, 0.17, 0.08); part("#5c6678");
    ctx.restore();
  }
  // far arm
  ctx.save(); ctx.translate(-0.46, 0.08); ctx.rotate(0.5 + Math.sin(t * 1.1) * 0.12);
  rr(ctx, -0.14, 0, 0.28, 0.62, 0.14); part(shade);
  ctx.restore();
  // torso
  rr(ctx, -0.48, -0.08, 0.96, 0.95, 0.26); part(suit);
  // chest panel: three bars that move with his voice
  rr(ctx, -0.26, 0.3, 0.52, 0.3, 0.07); part("#1b2233");
  for (let i = 0; i < 3; i++) {
    const hgt = 0.04 + 0.18 * st.talk * (0.5 + 0.5 * Math.abs(Math.sin(t * (17 + i * 5) + i)));
    ctx.fillStyle = st.talk > 0 ? "#5fe3ff" : "#3a6f86";
    ctx.fillRect(-0.17 + i * 0.13, 0.56 - hgt, 0.08, hgt);
  }
  // near arm: swings up when excited, small gestures while talking
  const raise = st.excite * 2.3 + st.talk * 0.25 * Math.sin(t * 6);
  ctx.save(); ctx.translate(0.46, 0.08); ctx.rotate(-0.45 - raise);
  rr(ctx, -0.14, 0, 0.28, 0.64, 0.14); part(suit);
  ctx.beginPath(); ctx.arc(0, 0.68, 0.16, 0, Math.PI * 2); part("#5c6678");
  ctx.restore();
  // helmet
  ctx.beginPath(); ctx.arc(0, -0.6, 0.62, 0, Math.PI * 2); part(suit);
  // visor with a reflection of whatever he is looking at
  ctx.beginPath(); ctx.ellipse(0.06, -0.58, 0.44, 0.36, 0, 0, Math.PI * 2);
  const v = ctx.createLinearGradient(-0.4, -0.9, 0.5, -0.2);
  v.addColorStop(0, "#0b1530"); v.addColorStop(0.55, "#16305e"); v.addColorStop(1, "#ff9a4d");
  part(v as unknown as string);
  ctx.save();
  ctx.beginPath(); ctx.ellipse(0.06, -0.58, 0.44, 0.36, 0, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath(); ctx.ellipse(-0.14, -0.74, 0.2, 0.07, -0.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = `rgba(95,227,255,${0.18 * st.talk})`; ctx.fillRect(-1, -1.2, 2, 1.4); // faint glow when speaking
  ctx.restore();
  // antenna
  ctx.strokeStyle = line; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(-0.42, -1.05); ctx.lineTo(-0.56, -1.36); ctx.stroke();
  ctx.beginPath(); ctx.arc(-0.56, -1.4, 0.08, 0, Math.PI * 2); part(st.talk > 0 ? "#ff5a5a" : "#b94848");
  ctx.restore();
}

/** Where the host stands in a vertical or horizontal frame (centre x, centre y, height). */
export function hostSpot(w: number, h: number, u: number, cy: number) {
  return h > w ? { x: 165 * u, y: cy + 285 * u, size: 250 * u } : { x: 190 * u, y: h - 190 * u, size: 250 * u };
}

/** Fly-in at the start of a video. */
export const hostAppear = (t: number) => progress(t, 0.15, 0.7);
