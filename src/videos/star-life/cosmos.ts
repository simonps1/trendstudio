/**
 * 2D canvas renderer for "Born to Explode". Pure functions of time.
 * Back layer: starfield, nebula, star, planets.  Front layer: flashes, debris, dust.
 */
import { clamp, ease, hash, lerp, noise1, progress, rng } from "../../core/anim";
import type { DrawContext } from "../../core/components/CanvasLayer";
import { engulfTimes, giantRadiusAU, PLANETS, T } from "./timeline";

type Ctx = CanvasRenderingContext2D;
type RGB = [number, number, number];
const rgba = (c: RGB, a: number) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const mixRGB = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

// ------------------------------------------------------------ cached soft sprites

const spriteCache = new Map<string, HTMLCanvasElement>();
export function softSprite(c: RGB, hardness = 0.0) {
  const key = c.map((v) => Math.round(v / 8) * 8).join(",") + ":" + hardness;
  let s = spriteCache.get(key);
  if (s) return s;
  s = document.createElement("canvas");
  s.width = s.height = 128;
  const g = s.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, rgba(c, 1));
  grad.addColorStop(clamp(hardness, 0, 0.9), rgba(c, 0.55));
  grad.addColorStop(1, rgba(c, 0));
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  spriteCache.set(key, s);
  return s;
}
export const blob = (ctx: Ctx, img: HTMLCanvasElement, x: number, y: number, r: number) =>
  ctx.drawImage(img, x - r, y - r, r * 2, r * 2);

// ------------------------------------------------------------ static seeded data

const STARS = (() => {
  const r = rng(42);
  return Array.from({ length: 1100 }, () => ({
    x: r(), y: r(), z: 0.2 + r() * 0.8, // depth for parallax
    tw: 0.5 + r() * 3, ph: r() * 6.28, size: Math.pow(r(), 6) * 2.6 + 0.6,
    col: ([[255, 255, 255], [190, 210, 255], [255, 225, 190], [210, 225, 255]] as RGB[])[Math.floor(r() * 4)],
  }));
})();

const NEBULA_COLORS: RGB[] = [[255, 70, 160], [90, 120, 255], [60, 220, 230], [170, 90, 255], [255, 140, 90]];
const NEBULA = (() => {
  const r = rng(7);
  return Array.from({ length: 2400 }, (_, i) => {
    const rad = Math.pow(r(), 0.6);
    return {
      r0: rad, a0: r() * Math.PI * 2, size: 8 + Math.pow(r(), 3) * 70, alpha: 0.04 + r() * 0.1,
      col: NEBULA_COLORS[(i + Math.floor(rad * 3)) % NEBULA_COLORS.length], squash: 0.45 + r() * 0.5, wob: r() * 10,
    };
  });
})();

const DEBRIS = (() => {
  const r = rng(1234);
  return Array.from({ length: 1700 }, () => {
    const a = r() * Math.PI * 2;
    return { a, speed: 0.25 + Math.pow(r(), 0.7) * 1.1, lane: noise1(a * 3) * 0.4, size: 2 + r() * 7, hot: r() };
  });
})();

// ------------------------------------------------------------ camera

export function shake(t: number, u: number): [number, number] {
  const amt = 18 * u * clamp(progress(t, T.collapse + 0.8, T.supernova)) * (t < T.supernova ? 1 : 0) +
    34 * u * Math.exp(-(t - T.supernova) * 2.2) * (t >= T.supernova ? 1 : 0) +
    10 * u * Math.exp(-(t - T.ignition) * 4) * (t >= T.ignition ? 1 : 0);
  return [noise1(t * 31) * amt, noise1(t * 29 + 100) * amt];
}

const center = (w: number, h: number) => [w / 2, h > w ? h * 0.53 : h / 2] as const;

// ------------------------------------------------------------ starfield

export function drawStarfield(ctx: Ctx, t: number, w: number, h: number, u: number, alpha = 1, pull = 0) {
  const [cx, cy] = center(w, h);
  const span = Math.max(w, h) * 1.15;
  ctx.globalCompositeOperation = "lighter";
  for (const s of STARS) {
    let x = ((s.x + t * 0.004 * s.z) % 1) * span - (span - w) / 2;
    let y = ((s.y + t * 0.0015 * s.z) % 1) * span - (span - h) / 2;
    if (pull > 0) { // stars streak toward the collapsing core
      const k = 1 - pull * (0.4 + 0.6 * s.z);
      x = cx + (x - cx) * k; y = cy + (y - cy) * k;
    }
    const tw = 0.55 + 0.45 * Math.sin(t * s.tw + s.ph);
    const a = alpha * tw * (0.35 + 0.65 * s.z);
    const sz = s.size * u * (0.6 + s.z * 0.6);
    ctx.fillStyle = rgba(s.col, a);
    if (pull > 0.05) {
      ctx.strokeStyle = rgba(s.col, a * 0.8);
      ctx.lineWidth = sz;
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.lineTo(cx + (x - cx) * (1 + pull * 0.25), cy + (y - cy) * (1 + pull * 0.25));
      ctx.stroke();
    } else if (sz > 2.2 * u) {
      blob(ctx, softSprite(s.col, 0.25), x, y, sz * 2.2);
    } else {
      ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
    }
  }
  ctx.globalCompositeOperation = "source-over";
}

// ------------------------------------------------------------ star

/** temp: 0 = red supergiant, 1 = blue-white O/B star. */
function starPalette(temp: number) {
  type P = { core: RGB; mid: RGB; limb: RGB; glow: RGB };
  const red: P = { core: [255, 210, 150], mid: [255, 110, 40], limb: [150, 25, 10], glow: [255, 70, 30] };
  const yellow: P = { core: [255, 255, 235], mid: [255, 215, 110], limb: [235, 130, 30], glow: [255, 180, 70] };
  const blue: P = { core: [255, 255, 255], mid: [170, 205, 255], limb: [70, 110, 255], glow: [110, 160, 255] };
  // three stops (red → yellow-white → blue) so mid temperatures look like the Sun, not violet
  const [a, b, k] = temp < 0.5 ? [red, yellow, temp / 0.5] : [yellow, blue, (temp - 0.5) / 0.5];
  return { core: mixRGB(a.core, b.core, k), mid: mixRGB(a.mid, b.mid, k), limb: mixRGB(a.limb, b.limb, k), glow: mixRGB(a.glow, b.glow, k) };
}

export function drawStar(ctx: Ctx, x: number, y: number, r: number, t: number, temp: number, boil: number, bright = 1) {
  if (r <= 0.5) return;
  const pal = starPalette(temp);
  ctx.globalCompositeOperation = "lighter";
  // outer glow
  const g = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 4.2);
  g.addColorStop(0, rgba(pal.glow, 0.55 * bright));
  g.addColorStop(0.25, rgba(pal.glow, 0.16 * bright));
  g.addColorStop(1, rgba(pal.glow, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r * 4.2, y - r * 4.2, r * 8.4, r * 8.4);
  // corona streamers
  ctx.save(); ctx.translate(x, y);
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2 + t * 0.05 + hash(i) * 0.2;
    const len = r * (1.25 + 0.55 * (0.5 + 0.5 * noise1(t * 0.8 + i * 3.1)));
    const wdt = r * (0.05 + 0.06 * hash(i + 9));
    ctx.rotate(a);
    const lg = ctx.createLinearGradient(r * 0.9, 0, len, 0);
    lg.addColorStop(0, rgba(pal.mid, 0.22 * bright)); lg.addColorStop(1, rgba(pal.mid, 0));
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.moveTo(r * 0.9, -wdt); ctx.quadraticCurveTo(len * 0.8, 0, len, 0); ctx.quadraticCurveTo(len * 0.8, 0, r * 0.9, wdt); ctx.fill();
    ctx.rotate(-a);
  }
  ctx.restore();
  ctx.globalCompositeOperation = "source-over";
  // body with limb darkening
  const body = ctx.createRadialGradient(x - r * 0.15, y - r * 0.15, 0, x, y, r);
  body.addColorStop(0, rgba(pal.core, 1));
  body.addColorStop(0.55, rgba(pal.mid, 1));
  body.addColorStop(0.92, rgba(pal.limb, 1));
  body.addColorStop(1, rgba(pal.limb, 0.85));
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  // boiling granulation (clipped to disk)
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
  const cells = 150;
  const hot = softSprite(pal.core), cool = softSprite(pal.limb);
  for (let i = 0; i < cells; i++) {
    const rr = Math.sqrt(hash(i * 3.7)) * r;
    const a = hash(i * 1.3) * Math.PI * 2 + t * (0.05 + 0.04 * hash(i)) ;
    const life = (t * (0.25 + 0.3 * hash(i + 2)) + hash(i + 5)) % 1; // each cell is born and fades
    const sz = r * (0.08 + 0.22 * boil) * (0.6 + 0.8 * hash(i + 11)) * Math.sin(life * Math.PI);
    ctx.globalAlpha = (0.18 + 0.25 * boil) * Math.sin(life * Math.PI);
    blob(ctx, i % 3 === 0 ? cool : hot, x + Math.cos(a) * rr, y + Math.sin(a) * rr, sz);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  // hot core sheen
  ctx.globalCompositeOperation = "lighter";
  const sheen = ctx.createRadialGradient(x, y, 0, x, y, r * 0.7);
  sheen.addColorStop(0, rgba(pal.core, 0.35 * bright)); sheen.addColorStop(1, rgba(pal.core, 0));
  ctx.fillStyle = sheen;
  ctx.beginPath(); ctx.arc(x, y, r * 0.7, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = "source-over";
}

function flareSpikes(ctx: Ctx, x: number, y: number, len: number, a: number, col: RGB) {
  ctx.globalCompositeOperation = "lighter";
  for (const [ang, l] of [[0, 1], [Math.PI / 2, 1], [Math.PI / 4, 0.4], [-Math.PI / 4, 0.4]] as const) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    const g = ctx.createLinearGradient(-len * l, 0, len * l, 0);
    g.addColorStop(0, rgba(col, 0)); g.addColorStop(0.5, rgba(col, a)); g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g; ctx.fillRect(-len * l, -1.5 * (len / 300), len * 2 * l, 3 * (len / 300));
    ctx.restore();
  }
  ctx.globalCompositeOperation = "source-over";
}

// ------------------------------------------------------------ back layer

export function drawBack({ ctx, t, width: w, height: h, u }: DrawContext) {
  ctx.fillStyle = "#03040b";
  ctx.fillRect(0, 0, w, h);
  const [sx, sy] = shake(t, u);
  ctx.translate(sx, sy);
  const [cx, cy] = center(w, h);

  // --- starfield (fades for black hole section; seamless loop near the end)
  const pull = ease.inExpo(progress(t, T.collapse + 0.4, T.supernova));
  const starAlpha = t < T.supernova ? 1 : 0.35 + 0.65 * progress(t, T.supernova + 0.5, T.supernova + 3);
  if (t > DURATION_LOOP - 0.6) {
    const k = progress(t, DURATION_LOOP - 0.6, DURATION_LOOP);
    drawStarfield(ctx, t, w, h, u, starAlpha * (1 - k));
    drawStarfield(ctx, t - DURATION_LOOP, w, h, u, k);
  } else drawStarfield(ctx, t, w, h, u, starAlpha, pull);

  // --- hook: the star as a distant point, camera pushing in
  if (t < T.nebula + 0.6) {
    const a = 1 - progress(t, T.nebula - 0.2, T.nebula + 0.6);
    const pulse = 0.85 + 0.15 * Math.sin(t * 5);
    const r = (9 + 9 * ease.inOutCubic(progress(t, 0, T.nebula))) * u;
    drawStar(ctx, cx, cy, r * pulse, t, 1, 0.2, a);
    flareSpikes(ctx, cx, cy, 360 * u * pulse, 0.55 * a, [190, 215, 255]);
  }

  // --- nebula collapse (and blow-out at ignition)
  if (t > T.nebula - 0.5 && t < T.main + 1.2) {
    const p = progress(t, T.nebula, T.ignition);
    const appear = progress(t, T.nebula - 0.5, T.nebula + 1.5);
    const shrink = lerp(1, 0.05, ease.inCubic(p));
    const blow = t > T.ignition ? ease.outExpo(progress(t, T.ignition, T.main + 1.2)) : 0;
    const fade = 1 - progress(t, T.ignition + 0.2, T.main + 1.2);
    const R = Math.max(w, h) * 0.62;
    ctx.globalCompositeOperation = "lighter";
    for (const pt of NEBULA) {
      const rr = pt.r0 * shrink * (1 + blow * 9);
      const omega = 0.08 / Math.pow(Math.max(rr, 0.03), 1.5) * 0.12;
      const ang = pt.a0 + (t - T.nebula) * omega + Math.sin(t * 0.3 + pt.wob) * 0.05;
      const x = cx + Math.cos(ang) * rr * R;
      const y = cy + Math.sin(ang) * rr * R * pt.squash;
      const size = pt.size * u * (0.5 + rr * 1.2);
      ctx.globalAlpha = Math.min(1, pt.alpha * appear * fade * (1 + 3 * p * (1 - rr)));
      blob(ctx, softSprite(pt.col), x, y, size);
    }
    ctx.globalAlpha = 1;
    // protostar glow
    const gp = ease.inCubic(p) * (t < T.ignition ? 1 : 0);
    if (gp > 0.001) {
      const gr = (40 + 260 * gp) * u;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, gr);
      g.addColorStop(0, `rgba(255,240,230,${0.9 * gp})`); g.addColorStop(0.3, `rgba(255,120,170,${0.4 * gp})`); g.addColorStop(1, "rgba(255,80,150,0)");
      ctx.fillStyle = g; ctx.fillRect(cx - gr, cy - gr, gr * 2, gr * 2);
    }
    ctx.globalCompositeOperation = "source-over";
  }

  // --- main sequence star
  if (t >= T.ignition && t < T.giant + 0.1) {
    const born = ease.outElastic(progress(t, T.ignition, T.ignition + 1.1));
    const pulse = 1 + 0.025 * Math.pow(Math.max(0, Math.sin(Math.PI * (t - T.main))), 8); // 1 Hz "heartbeat"
    const r = 110 * u * born * pulse;
    // stellar wind particles
    ctx.globalCompositeOperation = "lighter";
    const windA = progress(t, T.main, T.main + 1) * (1 - progress(t, T.giant - 0.6, T.giant));
    for (let i = 0; i < 220; i++) {
      const life = (t * (0.18 + 0.1 * hash(i)) + hash(i + 3)) % 1;
      const a = hash(i * 7.1) * Math.PI * 2 + noise1(i + t * 0.2) * 0.1;
      const d = r * (1.05 + life * 4.5);
      ctx.globalAlpha = windA * (1 - life) * 0.5;
      blob(ctx, softSprite([150, 190, 255]), cx + Math.cos(a) * d, cy + Math.sin(a) * d, (2 + 3 * hash(i + 1)) * u);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    drawStar(ctx, cx, cy, r, t, 1, 0.35, 1);

    // the Sun for scale
    const sunA = progress(t, T.sunCompare, T.sunCompare + 0.25) * (1 - progress(t, 17.6, 18.3));
    if (sunA > 0) {
      const pop = ease.outBack(progress(t, T.sunCompare, T.sunCompare + 0.4));
      const sxp = cx + 230 * u, syp = cy + 150 * u;
      drawStar(ctx, sxp, syp, 13 * u * pop, t, 0.62, 0.3, sunA);
      ctx.globalAlpha = sunA;
      ctx.strokeStyle = "rgba(255,255,255,0.75)"; ctx.lineWidth = 2 * u;
      ctx.beginPath(); ctx.moveTo(sxp + 20 * u, syp + 20 * u); ctx.lineTo(sxp + 70 * u, syp + 70 * u); ctx.lineTo(sxp + 150 * u, syp + 70 * u); ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.font = `800 ${30 * u}px Inter`; ctx.textAlign = "left";
      ctx.fillText("OUR SUN", sxp + 80 * u, syp + 60 * u);
      ctx.globalAlpha = 1;
    }
  }

  // --- red supergiant swallowing the solar system
  if (t >= T.giant && t < T.supernova) {
    const p = progress(t, T.giant, T.collapse - 0.3);
    const starPx = lerp(110, 465, ease.inOutCubic(p)) * u;
    const pxPerAU = starPx / giantRadiusAU(t);
    const temp = 1 - ease.inOutCubic(progress(t, T.giant, T.giant + 2.2));
    const collapse = ease.inExpo(progress(t, T.collapse, T.supernova - 0.05));
    const orbitA = progress(t, T.giant + 0.1, T.giant + 0.8) * (1 - progress(t, T.collapse, T.collapse + 0.5));
    const tilt = 0.32;
    const planetPos = PLANETS.map((pl, i) => {
      const ang = (t - T.giant) * (0.9 / Math.pow(pl.au, 1.5)) * 0.6 + i * 1.7;
      return { pl, ang, x: cx + Math.cos(ang) * pl.au * pxPerAU, y: cy + Math.sin(ang) * pl.au * pxPerAU * tilt };
    });
    const swallowed = (au: number) => giantRadiusAU(t) >= au;
    // orbits
    ctx.lineWidth = 1.6 * u;
    for (const { pl } of planetPos) {
      const rx = pl.au * pxPerAU;
      ctx.strokeStyle = `rgba(255,255,255,${0.22 * orbitA * (swallowed(pl.au) ? 0.3 : 1)})`;
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, rx * tilt, 0, 0, Math.PI * 2); ctx.stroke();
    }
    const drawPlanet = (pp: (typeof planetPos)[number]) => {
      if (swallowed(pp.pl.au) || orbitA <= 0) return;
      const s = pp.pl.size * u;
      ctx.globalAlpha = orbitA;
      const g = ctx.createRadialGradient(pp.x - s * 0.4, pp.y - s * 0.4, 0, pp.x, pp.y, s);
      g.addColorStop(0, "#fff"); g.addColorStop(0.35, pp.pl.color); g.addColorStop(1, "#111");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(pp.x, pp.y, s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.font = `800 ${26 * u}px Inter`; ctx.textAlign = "center";
      ctx.fillText(pp.pl.name.toUpperCase(), pp.x, pp.y - s - 10 * u);
      ctx.globalAlpha = 1;
    };
    planetPos.filter((p) => Math.sin(p.ang) < 0).forEach(drawPlanet);
    const r = starPx * (1 - collapse * 0.97);
    drawStar(ctx, cx, cy, r, t, temp * (1 - collapse) + collapse, 0.35 + 0.6 * (1 - temp), 1 + collapse * 2);
    planetPos.filter((p) => Math.sin(p.ang) >= 0).forEach(drawPlanet);
    // vaporisation flashes
    ctx.globalCompositeOperation = "lighter";
    for (const pp of planetPos) {
      const te = engulfAt(pp.pl.name);
      const k = progress(t, te, te + 0.7);
      if (k > 0 && k < 1) {
        const fr = (30 + 140 * ease.outCubic(k)) * u;
        ctx.globalAlpha = 1 - k;
        blob(ctx, softSprite([255, 230, 180]), pp.x, pp.y, fr);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
}

const ENGULF = new Map(engulfTimes().map((e) => [e.name, e.t]));
const engulfAt = (name: string) => ENGULF.get(name) ?? Infinity;

const DURATION_LOOP = T.end;

// ------------------------------------------------------------ front layer

export function drawFront({ ctx, t, width: w, height: h, u }: DrawContext) {
  const [sx, sy] = shake(t, u);
  ctx.translate(sx, sy);
  const [cx, cy] = center(w, h);
  const diag = Math.hypot(w, h);

  // ignition flash + ring
  if (t >= T.ignition && t < T.ignition + 1.6) {
    const k = progress(t, T.ignition, T.ignition + 1.6);
    ctx.globalCompositeOperation = "lighter";
    ring(ctx, cx, cy, ease.outExpo(k) * diag * 0.55, 30 * u * (1 - k), [170, 200, 255], 0.8 * (1 - k));
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = `rgba(235,240,255,${0.95 * Math.pow(1 - progress(t, T.ignition, T.ignition + 0.7), 2)})`;
    ctx.fillRect(-100, -100, w + 200, h + 200);
  }

  // collapse: implosion glow
  if (t >= T.collapse && t < T.supernova) {
    const k = ease.inExpo(progress(t, T.collapse, T.supernova));
    ctx.fillStyle = `rgba(0,0,0,${0.5 * k})`;
    ctx.fillRect(-100, -100, w + 200, h + 200);
    ctx.globalCompositeOperation = "lighter";
    const gr = (40 + 120 * k) * u;
    blob(ctx, softSprite([200, 225, 255], 0.2), cx, cy, gr);
    ctx.globalCompositeOperation = "source-over";
  }

  // supernova
  if (t >= T.supernova && t < T.end) {
    const k = t - T.supernova;
    ctx.globalCompositeOperation = "lighter";
    const fadeAll = 1 - progress(t, T.blackHole + 0.5, T.dust + 1.5);
    // debris: radial streaks cooling from white -> blue -> orange -> red
    for (let i = 0; i < DEBRIS.length; i++) {
      const d = DEBRIS[i];
      const travel = ease.outExpo(clamp(k / 3.2)) * 0.62 + k * 0.012;
      const dist = travel * d.speed * diag * 0.5;
      const prev = (ease.outExpo(clamp((k - 0.05) / 3.2)) * 0.62 + (k - 0.05) * 0.012) * d.speed * diag * 0.5;
      const a = d.a + d.lane * travel;
      const cool = clamp(k / 2.8 + d.hot * 0.3);
      const col: RGB = cool < 0.3 ? mixRGB([255, 255, 255], [140, 190, 255], cool / 0.3)
        : cool < 0.65 ? mixRGB([140, 190, 255], [255, 150, 70], (cool - 0.3) / 0.35)
          : mixRGB([255, 150, 70], [220, 50, 90], (cool - 0.65) / 0.35);
      const alpha = (0.65 - 0.35 * cool) * fadeAll;
      ctx.strokeStyle = rgba(col, alpha);
      ctx.lineWidth = d.size * u * (1 - 0.5 * cool);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * prev, cy + Math.sin(a) * prev);
      ctx.lineTo(cx + Math.cos(a) * dist, cy + Math.sin(a) * dist);
      ctx.stroke();
      if (i % 4 === 0) {
        ctx.globalAlpha = alpha * 0.25;
        blob(ctx, softSprite(col), cx + Math.cos(a) * dist, cy + Math.sin(a) * dist, (30 + 60 * cool) * u);
        ctx.globalAlpha = 1;
      }
    }
    // shockwave rings
    for (const [delay, speed, col] of [[0, 1, [200, 225, 255]], [0.12, 0.7, [255, 170, 90]], [0.3, 0.45, [255, 80, 140]]] as const) {
      const kk = clamp((k - delay) / 2.5);
      if (kk > 0 && kk < 1) ring(ctx, cx, cy, ease.outCubic(kk) * diag * 0.6 * speed, 50 * u * (1 - kk), col as unknown as RGB, 0.9 * (1 - kk));
    }
    // anamorphic flare
    const fl = Math.exp(-k * 2.5);
    flareSpikes(ctx, cx, cy, w * 1.2 * (0.6 + 0.4 * fl), 0.9 * fl, [180, 210, 255]);
    ctx.globalCompositeOperation = "source-over";
    // white-out
    ctx.fillStyle = `rgba(255,255,255,${Math.pow(1 - clamp(k / 1.1), 2.2)})`;
    ctx.fillRect(-100, -100, w + 200, h + 200);
  }

  // closing: new stars ignite from the dust
  if (t >= T.dust) {
    ctx.globalCompositeOperation = "lighter";
    const r = rng(77);
    const fadeOut = 1 - progress(t, T.end - 0.6, T.end);
    for (let i = 0; i < 46; i++) {
      const x = r() * w, y = r() * h, t0 = T.dust + 0.3 + r() * 2.8, col = NEBULA_COLORS[i % 5];
      const k = progress(t, t0, t0 + 0.8);
      if (k <= 0) continue;
      const tw = 0.7 + 0.3 * Math.sin(t * 4 + i);
      ctx.globalAlpha = fadeOut * (0.35 * (1 - k) + 0.25) ;
      blob(ctx, softSprite(col), x, y, (70 + 60 * r()) * u * ease.outCubic(k));
      ctx.globalAlpha = fadeOut * tw;
      blob(ctx, softSprite([255, 255, 255], 0.3), x, y, 7 * u * ease.outBack(k));
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
}

function ring(ctx: Ctx, x: number, y: number, r: number, width: number, col: RGB, a: number) {
  if (r <= 1 || width <= 0.1) return;
  const g = ctx.createRadialGradient(x, y, Math.max(0, r - width), x, y, r + width);
  g.addColorStop(0, rgba(col, 0)); g.addColorStop(0.5, rgba(col, a)); g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r + width, 0, Math.PI * 2); ctx.arc(x, y, Math.max(0, r - width), 0, Math.PI * 2, true); ctx.fill();
}
