import React, { useCallback } from "react";
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp, ease, hash, lerp, rng } from "../../core/anim";
import { CanvasLayer, type DrawContext } from "../../core/components/CanvasLayer";
import { FilmFinish } from "../../core/components/FilmFinish";
import { FONT_BODY, FONT_DISPLAY } from "../../core/fonts";
import {
  AU, caption, CARD_START, centre, DURATION, EARTH, formatWidth, GALAXY, KM_PER_LY, landing, LAST, logWidth, STATIONS, STEP, zoomSpeed,
} from "./timeline";

const GOLD = "#ffd23f", CYAN = "#7fe7ff", INK = "#f4f7ff";
/** Vertical position of the picture's centre (kept clear of the apps' bottom and right-hand buttons). */
const CY = 0.485;
const TAU = Math.PI * 2;
const smooth = (x: number, a: number, b: number) => { const p = clamp((x - a) / (b - a)); return p * p * (3 - 2 * p); };
/** 1 while a thing is between `lo` and `hi` pixels on screen, fading out at both ends. */
const vis = (px: number, lo: number, hi: number) => smooth(px, lo, lo * 2.2) * (1 - smooth(px, hi, hi * 2));

// ---- the edit: every landing is a hit ----------------------------------------------------------------------
/** Seconds since the most recent landing (the opening frame counts as one). */
const sinceHit = (t: number) => { const k = clamp(Math.floor((t + 1e-9) / STEP), 0, LAST); return t - landing(k); };
/** 1 at the hit, decaying to 0: drives the punch-in, flash, shake and colour split. */
const hit = (t: number, len = 0.42) => 1 - ease.outExpo(clamp(sinceHit(t) / len));
const cardIn = (t: number) => smooth(t, CARD_START, CARD_START + 0.7);

// ---- the world ---------------------------------------------------------------------------------------------
const LY = KM_PER_LY;
const PLANETS = [
  { name: "MERCURY", au: 0.387, a: 2.1, c: "#b9b2a8" }, { name: "VENUS", au: 0.723, a: 0.9, c: "#e8cf9a" },
  { name: "EARTH", au: 1, a: -0.62, c: "#6fb7ff" }, { name: "MARS", au: 1.524, a: -2.5, c: "#e0744f" },
  { name: "JUPITER", au: 5.203, a: 1.35, c: "#e2b98a" }, { name: "SATURN", au: 9.537, a: -1.2, c: "#ecd9a0" },
  { name: "URANUS", au: 19.19, a: -2.75, c: "#9fe6ea" }, { name: "NEPTUNE", au: 30.07, a: -0.2, c: "#6f8dff" },
];
const VOYAGER = { r: 2.6e10, a: -2.15 };
// distances in light-years (to scale); directions are a flat sketch, not a sky map
const STARS = [
  { name: "ALPHA CENTAURI", ly: 4.24, a: -2.4, s: 1.5, c: "#fff1c9" }, { name: "BARNARD'S STAR", ly: 5.96, a: -1.15, s: 0.8, c: "#ffb18a" },
  { name: "", ly: 7.9, a: 0.45, s: 0.6, c: "#ff9d7a" }, { name: "", ly: 8.3, a: -2.7, s: 0.7, c: "#ffb18a" },
  { name: "SIRIUS", ly: 8.6, a: 1.05, s: 1.9, c: "#cfe3ff" }, { name: "", ly: 10.5, a: 2.95, s: 0.9, c: "#ffd9a8" },
  { name: "", ly: 11.4, a: -1.95, s: 0.8, c: "#ffc79a" }, { name: "PROCYON", ly: 11.5, a: -0.3, s: 1.4, c: "#fff6e0" },
  { name: "", ly: 11.9, a: 1.75, s: 0.9, c: "#ffe7b8" },
];
const ANDROMEDA = { x: GALAXY.x + 2.5e6 * LY * Math.cos(-0.82), y: GALAXY.y + 2.5e6 * LY * Math.sin(-0.82) };
const TRIANGULUM = { x: GALAXY.x + 2.73e6 * LY * Math.cos(-1.2), y: GALAXY.y + 2.73e6 * LY * Math.sin(-1.2) };
const UNIVERSE_R = 46.5e9 * LY;

const OORT = (() => { const r = rng(41); return Array.from({ length: 1500 }, () => { const a = r() * TAU, d = lerp(0.08, 1, Math.pow(r(), 0.6)); return { x: Math.cos(a) * d, y: Math.sin(a) * d, s: 0.6 + r() * 1.2, o: 0.25 + r() * 0.6 }; }); })();
const DWARFS = (() => { const r = rng(57); return Array.from({ length: 46 }, () => { const a = r() * TAU, d = 3.4e6 * LY * Math.sqrt(r()); return { x: GALAXY.x + Math.cos(a) * d, y: GALAXY.y + Math.sin(a) * d, s: 0.8 + r() * 1.4 }; }); })();
// a web of galaxies: clumps strung along filaments
const WEB = (() => {
  const r = rng(73), pts: { x: number; y: number; s: number; o: number; warm: boolean }[] = [];
  const knots = Array.from({ length: 150 }, () => { const a = r() * TAU, d = Math.sqrt(r()) * 0.98; return { x: Math.cos(a) * d, y: Math.sin(a) * d }; });
  for (let i = 0; i < 5200; i++) {
    const k = knots[Math.floor(r() * knots.length)], k2 = knots[Math.floor(r() * knots.length)];
    const near = Math.hypot(k.x - k2.x, k.y - k2.y) < 0.28, f = near ? r() : 0;
    const g = () => (r() + r() + r() - 1.5) * 0.045;
    const x = lerp(k.x, k2.x, f) + g(), y = lerp(k.y, k2.y, f) + g();
    if (x * x + y * y < 1) pts.push({ x, y, s: 0.7 + r() * 1.5, o: 0.3 + r() * 0.7, warm: r() < 0.35 });
  }
  return pts;
})();
const FLOW = (() => { const r = rng(11); return Array.from({ length: 260 }, () => { const a = r() * TAU, d = 0.05 + Math.sqrt(r()); return { x: Math.cos(a) * d, y: Math.sin(a) * d, s: 0.5 + r() * 1.4, l: Math.floor(r() * 4), tw: r() }; }); })();

function glowDot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string, alpha = 1) {
  if (alpha <= 0.01) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
  g.addColorStop(0, colour); g.addColorStop(0.25, colour); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = alpha * 0.55; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 4, 0, TAU); ctx.fill();
  ctx.globalAlpha = alpha; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x, y, r * 0.6, 0, TAU); ctx.fill();
  ctx.globalAlpha = 1;
}

function tag(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, u: number, alpha: number, colour = INK, align: CanvasTextAlign = "left") {
  const w = ctx.canvas.width;
  if (alpha <= 0.01 || x < 0 || x > w || y < 0 || y > ctx.canvas.height) return;
  // a label on the right-hand side of the frame hangs to the left of its dot, so it never runs off the edge
  if (align === "left" && x > w * 0.62) { align = "right"; x -= 32 * u; }
  ctx.save();
  ctx.globalAlpha = alpha; ctx.font = `800 ${24 * u}px ${FONT_BODY}`; ctx.textAlign = align; ctx.textBaseline = "middle";
  (ctx as unknown as { letterSpacing: string }).letterSpacing = `${3 * u}px`;
  ctx.lineWidth = 5 * u; ctx.lineJoin = "round"; ctx.strokeStyle = "rgba(2,4,12,0.85)"; ctx.strokeText(text, x, y);
  ctx.fillStyle = colour; ctx.fillText(text, x, y);
  ctx.restore();
}

/** Everything drawn in world space: orbits, clouds, stars, galaxies, and the streaks of the zoom itself. */
function drawWorld({ ctx, t, width, height, u }: DrawContext) {
  const lw = logWidth(t), W = Math.pow(10, lw), C = centre(lw), k = width / W;
  const cx = width / 2, cy = height * CY;
  const sx = (x: number) => cx + (x - C.x) * k, sy = (y: number) => cy + (y - C.y) * k;
  const speed = zoomSpeed(t), card = cardIn(t);
  ctx.globalAlpha = 1;

  // --- the rush: four layers of points streaming toward the centre as the frame widens -----------
  const R = Math.hypot(width, height) * 0.62;
  ctx.lineCap = "round";
  for (const p of FLOW) {
    const f = (((lw * 0.5 + p.l / 4 + p.tw * 0.25) % 1) + 1) % 1;
    const z = 3.2 * Math.pow(0.05 / 3.2, f), a = Math.sin(Math.PI * f) * (0.35 + 0.65 * hash(p.tw * 91 + Math.floor(t * 3))) * (1 - card);
    const x = cx + p.x * R * z, y = cy + p.y * R * z;
    if (x < -50 || x > width + 50 || y < -50 || y > height + 50 || a < 0.02) continue;
    const stretch = Math.min(0.5, Math.abs(speed) * 0.11);
    ctx.globalAlpha = a * 0.8; ctx.strokeStyle = p.l % 2 ? "#cfe6ff" : "#ffffff"; ctx.lineWidth = p.s * u * (1 + stretch * 1.5);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(cx + (x - cx) * (1 + stretch), cy + (y - cy) * (1 + stretch)); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  if (card > 0.99) return;
  const fadeCard = 1 - card;

  // --- the Moon's orbit (centred on Earth) ----------------------------------------------------------
  {
    const r = 384400 * k, a = vis(r, 14, 2600) * fadeCard;
    if (a > 0.01) {
      const ex = sx(EARTH.x), ey = sy(EARTH.y), ang = 0.55 + t * 0.05;
      ctx.globalAlpha = a * 0.55; ctx.strokeStyle = CYAN; ctx.lineWidth = 1.6 * u; ctx.setLineDash([10 * u, 12 * u]);
      ctx.beginPath(); ctx.arc(ex, ey, r, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      const mx = ex + Math.cos(ang) * r, my = ey + Math.sin(ang) * r, mr = Math.max(1.6 * u, 1737 * k);
      ctx.globalAlpha = a; ctx.fillStyle = "#d9d9d9"; ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU); ctx.fill();
      tag(ctx, "THE MOON", mx + 16 * u, my - 2 * u, u, a * vis(r, 120, 1400));
      tag(ctx, "EARTH", ex, ey + 12742 * k * 0.5 + 28 * u, u, a * vis(r, 120, 1400), INK, "center");
    }
  }

  // --- the Sun, the planets' orbits, Voyager ---------------------------------------------------------
  {
    const sunA = smooth(lw, 6.6, 7.6) * (1 - smooth(lw, 12.2, 13.2)) * fadeCard;
    for (const p of PLANETS) {
      const r = p.au * AU * k, a = vis(r, 9, 3200) * sunA;
      if (a <= 0.01) continue;
      ctx.globalAlpha = a * 0.5; ctx.strokeStyle = "#8fb6ff"; ctx.lineWidth = 1.5 * u;
      ctx.beginPath(); ctx.arc(sx(0), sy(0), r, 0, TAU); ctx.stroke();
      const px = sx(Math.cos(p.a) * p.au * AU), py = sy(Math.sin(p.a) * p.au * AU);
      glowDot(ctx, px, py, 5 * u, p.c, a);
      if (p.name !== "EARTH") tag(ctx, p.name, px + 14 * u, py - 14 * u, u, a * vis(r, 70, 620));
    }
    glowDot(ctx, sx(0), sy(0), lerp(14, 7, smooth(lw, 9, 11)) * u, "#ffd27a", sunA);
    tag(ctx, "THE SUN", sx(0) + 20 * u, sy(0) + 22 * u, u, sunA * (1 - smooth(lw, 8.95, 9.2)) * smooth(lw, 8.2, 8.7));
    const vr = VOYAGER.r * k, va = vis(vr, 90, 1000) * fadeCard;
    if (va > 0.01) {
      const vx = sx(Math.cos(VOYAGER.a) * VOYAGER.r), vy = sy(Math.sin(VOYAGER.a) * VOYAGER.r);
      ctx.globalAlpha = va * 0.6; ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5 * u; ctx.setLineDash([6 * u, 10 * u]);
      ctx.beginPath(); ctx.moveTo(sx(0), sy(0)); ctx.lineTo(vx, vy); ctx.stroke(); ctx.setLineDash([]);
      glowDot(ctx, vx, vy, 5 * u, GOLD, va);
      tag(ctx, "VOYAGER 1", vx + 16 * u, vy - 16 * u, u, va, GOLD);
    }
  }

  // --- the Oort cloud: a shell of icy bodies out to roughly 100,000 AU (predicted, never observed) ------
  {
    const r = 1e5 * AU * k, a = vis(r, 26, 2600) * fadeCard;
    if (a > 0.01) {
      const g = ctx.createRadialGradient(sx(0), sy(0), r * 0.1, sx(0), sy(0), r * 1.08);
      g.addColorStop(0, "rgba(120,170,255,0)"); g.addColorStop(0.7, "rgba(120,170,255,0.13)"); g.addColorStop(1, "rgba(120,170,255,0)");
      ctx.globalAlpha = a; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx(0), sy(0), r * 1.08, 0, TAU); ctx.fill();
      ctx.fillStyle = "#cfe1ff";
      for (const p of OORT) { ctx.globalAlpha = a * p.o; ctx.fillRect(sx(0) + p.x * r, sy(0) + p.y * r, p.s * u, p.s * u); }
    }
  }

  // --- the nearest stars --------------------------------------------------------------------------------
  for (const s of STARS) {
    const d = s.ly * LY, r = d * k, a = vis(r, 22, 2400) * fadeCard;
    if (a <= 0.01) continue;
    const x = sx(Math.cos(s.a) * d), y = sy(Math.sin(s.a) * d);
    glowDot(ctx, x, y, (3 + s.s * 3) * u, s.c, a);
    if (s.name) tag(ctx, s.name, x + 16 * u, y - 16 * u, u, a * vis(r, 55, 900));
  }

  // --- the Local Group -------------------------------------------------------------------------------------
  {
    const r = 2.5e6 * LY * k, a = vis(r, 30, 2600) * fadeCard;
    if (a > 0.01) {
      for (const d of DWARFS) glowDot(ctx, sx(d.x), sy(d.y), d.s * 2.2 * u, "#b9c8ff", a * 0.7);
      glowDot(ctx, sx(TRIANGULUM.x), sy(TRIANGULUM.y), 7 * u, "#c9d6ff", a);
      // the photographs are only a few pixels wide from here: a glow keeps both big galaxies findable
      glowDot(ctx, sx(ANDROMEDA.x), sy(ANDROMEDA.y), 9 * u, "#cfdcff", a * (1 - smooth(260000 * LY * k, 40, 120)));
      const la = a * vis(r, 150, 1400);
      tag(ctx, "ANDROMEDA", sx(ANDROMEDA.x) + 30 * u, sy(ANDROMEDA.y) - 26 * u, u, la);
      tag(ctx, "TRIANGULUM", sx(TRIANGULUM.x) + 20 * u, sy(TRIANGULUM.y) + 24 * u, u, la);
    }
  }

  // --- the observable universe: a web of galaxies inside a 46.5-billion-light-year horizon ---------------
  {
    const r = UNIVERSE_R * k, a = vis(r, 60, 9000) * fadeCard;
    if (a > 0.01) {
      const ox = sx(GALAXY.x), oy = sy(GALAXY.y);
      for (const p of WEB) {
        const x = ox + p.x * r, y = oy + p.y * r;
        if (x < -4 || x > width + 4 || y < -4 || y > height + 4) continue;
        ctx.globalAlpha = a * p.o; ctx.fillStyle = p.warm ? "#ffd9b0" : "#bcd0ff";
        ctx.beginPath(); ctx.arc(x, y, p.s * u * (r > 1500 ? 1.6 : 1), 0, TAU); ctx.fill();
      }
      const edge = a * smooth(r, 2600, 900);
      if (edge > 0.01) {
        ctx.globalAlpha = edge * 0.9; ctx.strokeStyle = CYAN; ctx.lineWidth = 2.5 * u; ctx.shadowColor = CYAN; ctx.shadowBlur = 26 * u;
        ctx.beginPath(); ctx.arc(ox, oy, r, 0, TAU); ctx.stroke(); ctx.shadowBlur = 0;
      }
    }
  }

  // --- the reticle: where we are, at every scale ---------------------------------------------------------
  {
    const a = smooth(lw, 6.9, 7.4) * fadeCard;
    if (a > 0.01) {
      // Earth, then the Sun, are the same pixel from here on
      const x = sx(lw < 9 ? EARTH.x : 0), y = sy(lw < 9 ? EARTH.y : 0), r = 26 * u, spin = t * 0.6;
      ctx.globalAlpha = a; ctx.strokeStyle = GOLD; ctx.lineWidth = 2.5 * u;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(x, y, r, spin + i * (TAU / 4) + 0.25, spin + (i + 1) * (TAU / 4) - 0.25); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(x, y, r * 1.5 + 6 * u * Math.sin(t * 3), 0, TAU); ctx.globalAlpha = a * 0.25; ctx.stroke();
      tag(ctx, "YOU ARE HERE", x, y + r + 30 * u, u, a, GOLD, "center");
    }
  }
  ctx.globalAlpha = 1;
}

/** The words: a fixed question, the station, the running scale. Drawn above the picture and never zoomed. */
function drawHud({ ctx, t, width, height, u }: DrawContext) {
  const lw = logWidth(t), W = Math.pow(10, lw), cx = width / 2;
  const h = hit(t), card = cardIn(t), speed = Math.abs(zoomSpeed(t));
  const ls = (px: number) => { (ctx as unknown as { letterSpacing: string }).letterSpacing = `${px}px`; };
  /** Text with a red/cyan split that opens on every hit. */
  const split = (text: string, x: number, y: number, colour: string, amount: number) => {
    ctx.lineJoin = "round"; ctx.strokeStyle = "rgba(2,4,12,0.9)"; ctx.strokeText(text, x, y);
    if (amount > 0.3) {
      ctx.globalCompositeOperation = "lighter"; const a = ctx.globalAlpha;
      ctx.globalAlpha = a * 0.75; ctx.fillStyle = "#ff2a5f"; ctx.fillText(text, x - amount, y); ctx.fillStyle = "#19e3ff"; ctx.fillText(text, x + amount, y);
      ctx.globalAlpha = a; ctx.globalCompositeOperation = "source-over";
    }
    ctx.fillStyle = colour; ctx.fillText(text, x, y);
  };
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";

  // top scrim so the words always read
  const top = ctx.createLinearGradient(0, 0, 0, height * 0.3);
  top.addColorStop(0, "rgba(1,3,10,0.9)"); top.addColorStop(1, "rgba(1,3,10,0)");
  ctx.fillStyle = top; ctx.fillRect(0, 0, width, height * 0.3);

  // --- the question (always on screen) ---
  ctx.font = `500 ${30 * u}px ${FONT_BODY}`; ls(13 * u); ctx.lineWidth = 6 * u; ctx.globalAlpha = 0.92;
  split("HOW SMALL ARE WE,", cx + 6 * u, height * 0.098, "#cfe0ff", 0);
  ctx.font = `${104 * u}px ${FONT_DISPLAY}`; ls(8 * u); ctx.lineWidth = 12 * u; ctx.globalAlpha = 1;
  split("REALLY?", cx + 4 * u, height * 0.158, INK, h * 9 * u);

  // --- progress: ten ticks, one per station ---
  const cap = caption(t), n = STATIONS.length, tw = 38 * u, gap = 10 * u, x0 = cx - (n * tw + (n - 1) * gap) / 2, ty = height * 0.176;
  for (let i = 0; i < n; i++) {
    ctx.globalAlpha = (i <= cap.index ? 1 : 0.28) * (1 - card); ctx.fillStyle = i === cap.index ? GOLD : i < cap.index ? CYAN : "#7f8db0";
    ctx.fillRect(x0 + i * (tw + gap), ty, tw, (i === cap.index ? 6 : 3) * u);
  }

  // --- the station: slams in on the hit, tracking closes as it settles ---
  if (cap.alpha > 0.01 && card < 0.99) {
    const s = STATIONS[cap.index], settle = 1 - hit(t, 0.5);
    ctx.globalAlpha = cap.alpha * (1 - card);
    ctx.font = `${78 * u}px ${FONT_DISPLAY}`; ls(lerp(26, 4, settle) * u); ctx.lineWidth = 12 * u;
    split(s.title.toUpperCase(), cx + lerp(13, 2, settle) * u, height * 0.238, GOLD, h * 12 * u);
    ctx.font = `800 ${32 * u}px ${FONT_BODY}`; ls(1 * u); ctx.lineWidth = 7 * u;
    ctx.globalAlpha = cap.alpha * smooth(sinceHit(t), 0.12, 0.4) * (1 - card);
    split(s.sub, cx, height * 0.272, INK, 0);
  }

  // --- the running scale ---
  if (card < 0.99) {
    const y = height * 0.728;
    ctx.globalAlpha = 0.85 * (1 - card);
    // brackets either side of the read-out
    ctx.strokeStyle = CYAN; ctx.lineWidth = 2.5 * u; const bw = 410 * u, bh = 46 * u;
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + d * (bw - 26 * u), y - bh); ctx.lineTo(cx + d * bw, y - bh); ctx.lineTo(cx + d * bw, y + bh * 0.62); ctx.lineTo(cx + d * (bw - 26 * u), y + bh * 0.62); ctx.stroke(); }
    ctx.font = `500 ${22 * u}px ${FONT_BODY}`; ls(9 * u); ctx.lineWidth = 5 * u;
    split("THIS FRAME IS", cx + 4 * u, y - 16 * u, CYAN, 0);
    ctx.font = `${54 * u}px ${FONT_DISPLAY}`; ls(2 * u); ctx.lineWidth = 10 * u; ctx.globalAlpha = 1 - card;
    split(`${formatWidth(W).toUpperCase()} WIDE`, cx, y + 40 * u, INK, Math.min(7, speed * 2.2) * u);
  }

  // --- the closing card: a real photograph ---
  if (card > 0.01) {
    const a1 = smooth(t, CARD_START + 0.35, CARD_START + 0.8), a2 = smooth(t, CARD_START + 1.5, CARD_START + 1.95);
    const scrim = ctx.createLinearGradient(0, height * 0.36, 0, height * 0.66);
    scrim.addColorStop(0, "rgba(1,3,10,0)"); scrim.addColorStop(0.5, "rgba(1,3,10,0.72)"); scrim.addColorStop(1, "rgba(1,3,10,0)");
    ctx.globalAlpha = card; ctx.fillStyle = scrim; ctx.fillRect(0, height * 0.36, width, height * 0.3);
    ctx.globalAlpha = a1; ctx.font = `500 ${24 * u}px ${FONT_BODY}`; ls(10 * u); ctx.lineWidth = 5 * u;
    split("REAL PHOTO · HUBBLE", cx + 5 * u, height * 0.445, CYAN, 0);
    ctx.font = `${84 * u}px ${FONT_DISPLAY}`; ls(3 * u); ctx.lineWidth = 12 * u;
    split("EVERY SPECK IS A GALAXY", cx, height * 0.503, INK, (1 - a1) * 14 * u);
    ctx.globalAlpha = a2; ctx.font = `${66 * u}px ${FONT_DISPLAY}`;
    split("YOU LIVE IN ONE OF THEM", cx, height * 0.556, GOLD, (1 - a2) * 14 * u);
  }
  ls(0); ctx.globalAlpha = 1;
}

/** A photograph pinned to the world: it shrinks to a point as the frame widens. */
const Pinned: React.FC<{ src: string; x: number; y: number; km: number; lw: number; from: number; to: number; rotate?: number; ax?: number; ay?: number; mask?: string }> = (p) => {
  const { width, height } = useVideoConfig();
  const W = Math.pow(10, p.lw), C = centre(p.lw), size = (p.km / W) * width;
  const a = vis(size, p.from, p.to);
  if (a <= 0.01) return null;
  const left = width / 2 + ((p.x - C.x) / W) * width - size * (p.ax ?? 0.5), top = height * CY + ((p.y - C.y) / W) * width - size * (p.ay ?? 0.5);
  return (
    <Img src={staticFile(p.src)} style={{
      position: "absolute", left, top, width: size, height: size, opacity: a, mixBlendMode: "screen",
      transform: p.rotate ? `rotate(${p.rotate}deg)` : undefined,
      WebkitMaskImage: p.mask, maskImage: p.mask,
    }} />
  );
};

export const ZoomOut: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const t = frame / fps, lw = logWidth(t), h = hit(t), card = cardIn(t), speed = zoomSpeed(t);
  const world = useCallback((d: DrawContext) => drawWorld(d), []);
  const hud = useCallback((d: DrawContext) => drawHud(d), []);
  // the edit: punch in on every hit, lean into every zoom, and a hair of shake while the camera moves
  const punch = 1 + 0.085 * h + 0.03 * Math.min(1, Math.abs(speed) / 3);
  const shake = (2.5 * Math.min(1, Math.abs(speed) / 3) + 9 * h) * (width / 1080);
  const dx = (hash(frame * 1.3) - 0.5) * shake, dy = (hash(frame * 2.7 + 5) - 0.5) * shake;
  return (
    <AbsoluteFill style={{ background: "#01030a", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `translate(${dx}px, ${dy}px) scale(${punch})`, transformOrigin: `50% ${CY * 100}%` }}>
        <AbsoluteFill style={{ background: `radial-gradient(ellipse 85% 60% at 50% ${CY * 100}%, #0b1b3d 0%, #050b1e 45%, #01030a 100%)` }} />
        <Pinned src="photos/zoom/milky-way.jpg" x={GALAXY.x} y={GALAXY.y} km={(100000 * KM_PER_LY) / 0.85} lw={lw} from={7} to={5200}
          mask="radial-gradient(circle, #000 52%, transparent 70%)" />
        <Pinned src="photos/zoom/andromeda.jpg" x={ANDROMEDA.x} y={ANDROMEDA.y} km={260000 * KM_PER_LY} lw={lw} from={6} to={2400}
          mask="radial-gradient(circle, #000 50%, transparent 70%)" />
        <Pinned src="photos/zoom/earth.jpg" x={EARTH.x} y={EARTH.y} km={12742 / 0.665} lw={lw} from={2.5} to={9000} ay={0.5075} />
        <CanvasLayer draw={world} />
        {card > 0.01 ? (
          <Img src={staticFile("photos/zoom/deep-field.jpg")} style={{
            position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: card,
            transform: `scale(${1.16 - 0.1 * clamp((t - CARD_START) / (DURATION - CARD_START))})`,
          }} />
        ) : null}
      </AbsoluteFill>
      {/* anamorphic streak + flash on the hit */}
      <AbsoluteFill style={{
        opacity: h * 0.9, mixBlendMode: "screen",
        background: `radial-gradient(ellipse 75% 1.6% at 50% ${CY * 100}%, rgba(170,225,255,0.95) 0%, rgba(90,160,255,0.35) 45%, transparent 100%)`,
      }} />
      <AbsoluteFill style={{ opacity: (frame === 0 ? 0 : h * h * 0.34), background: "#dff1ff", mixBlendMode: "screen" }} />
      <FilmFinish grain={0.06} vignette={0.62} />
      <CanvasLayer draw={hud} />
      <Audio src={staticFile("audio/zoom-out.wav")} />
    </AbsoluteFill>
  );
};
