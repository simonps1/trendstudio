/**
 * Scene logic for series episodes. For any time t it answers three things:
 *   - which bodies are where (drawn by the WebGL layer, BodiesGL)
 *   - what the 2D overlay draws (labels, orbits, counters, flashes)
 *   - how the camera is moving (zoom speed, shake) for the starfield
 * Everything is a pure function of time.
 * Convention: a featured body sits at the frame centre with radius FIT, so
 * consecutive beats about the same body cut seamlessly.
 */
import { clamp, ease, hash, lerp, noise1, progress } from "../core/anim";
import type { DrawContext } from "../core/components/CanvasLayer";
import { blob, drawStarfield, softSprite } from "../videos/star-life/cosmos";
import type { PlacedBody } from "./BodiesGL";
import { zoomTime, type EpisodeLayout, type LaidOutBeat } from "./layout";
import { drawHost, hostAppear, hostSpot, talkLevel } from "./host";
import { extent, FIT, orbitStagger, type Body, type Visual } from "./types";

type Ctx = CanvasRenderingContext2D;

export const centre = (w: number, h: number) => [w / 2, h > w ? h * 0.545 : h * 0.56] as const;

const active = (layout: EpisodeLayout, t: number): LaidOutBeat =>
  layout.beats.find((b) => t >= b.start && t < b.end) ?? layout.beats[t < 0 ? 0 : layout.beats.length - 1];

/** Zoom progress 0..1 of a compare beat: slow start, fast middle, hard landing on the beat. */
const zoomEase = (lt: number, v: Visual) => {
  const x = progress(lt, 0, zoomTime(v));
  if (v.type === "compare" && v.open) {
    // cold open: start with the big body about 2.3 times its final size, whatever the ratio, so frame one
    // shows a recognisable globe filling the width rather than a wall of texture
    const ratio = (v.to.radius * extent(v.to)) / (v.from.radius * extent(v.from));
    const e0 = clamp(1 - Math.log(2.3) / Math.log(Math.max(ratio, 2.4)), 0.05, 0.92);
    return e0 + (1 - e0) * (1 - Math.pow(1 - x, 3));
  }
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
      // a cold open lands softly: a white flash in a video's first second reads as a glitch and hides the picture
      shake = (v.open ? 7 : v.big ? 26 : 9) * Math.exp(-since * 6);
      flash = v.open ? 0 : (v.big ? 0.75 : 0.28) * Math.exp(-since * (v.big ? 5 : 9));
    }
    const dt = 1 / 120;
    zoom = clamp(((zoomEase(lt + dt, v) - zoomEase(lt - dt, v)) / (2 * dt)) * Z * 0.5);
  }
  // a new fact about the same body: the sky streaks for a moment as the camera moves to its next framing
  if (v.type === "body" && holdIndex(layout, b) > 0) zoom = 0.34 * Math.sin(Math.PI * progress(lt, 0, 0.5));
  if (v.type === "shrink") zoom = 0.5 * Math.sin(Math.PI * progress(lt, 0.1, (b.end - b.start) * 0.8));
  return { shake: [noise1(t * 37) * shake * u, noise1(t * 41 + 50) * shake * u] as [number, number], flash, zoom };
}

// ------------------------------------------------------------ bodies

function compareGeometry(v: Extract<Visual, { type: "compare" }>, lt: number, cy: number, fit: number) {
  const e = zoomEase(lt, v);
  // world: `from` at the origin, `to` directly above it
  // gap between them: a tenth of the big body, but never so far that the big one is off-screen at the start
  // rings and discs count towards a body's size, so they stay inside the frame
  const rf = v.from.radius * extent(v.from), rt = v.to.radius * extent(v.to);
  const toY = -(rf + rt + Math.min(rt * 0.1, rf * 2.5));
  const s = Math.exp(lerp(Math.log(fit / rf), Math.log(fit / rt), e));
  // the small body slides steadily from the centre to just below the big one
  const camY = (e * toY * (fit / rt)) / s;
  const sy = (wy: number) => cy + (wy - camY) * s;
  return { e, s, toScreenY: sy(toY), fromScreenY: sy(0) };
}

/** Two similar bodies side by side: shared scale, full extents (rings included) inside 900 px. */
function pairGeometry(v: Extract<Visual, { type: "pair" }>, cx: number, u: number) {
  const ea = v.a.radius * extent(v.a, true), eb = v.b.radius * extent(v.b, true);
  const gap = 0.14 * (ea + eb), W = 900 * u;
  const s = Math.min(W / (2 * (ea + eb) + gap), (FIT * 0.82 * u) / Math.max(v.a.radius, v.b.radius));
  const total = (2 * (ea + eb) + gap) * s, x0 = cx - total / 2;
  return { s, ax: x0 + ea * s, bx: x0 + (2 * ea + gap + eb) * s };
}

/** `a` at the bottom, `b` at the top, the true distance between them, everything on one scale. */
function gapGeometry(v: Extract<Visual, { type: "gap" }>, cx: number, cy: number, u: number, openT = 9) {
  const top = cy - 420 * u, bottom = cy + 450 * u; // clear of the captions above and the app's own text below
  // a video's first beat starts close on the near body and pulls back until the whole distance is in frame
  const k = v.fill ? lerp(2.5, 1, 1 - Math.pow(1 - progress(openT, 0, 1.7), 3)) : 1;
  const s = ((bottom - top) / (v.distance + v.a.radius + v.b.radius)) * k;
  const ay = bottom - v.a.radius * s, by = ay - v.distance * s;
  let cursor = ay - v.a.radius * s;
  const fill = (v.fill ?? []).map((body) => { const y = cursor - body.radius * s; cursor -= 2 * body.radius * s; return { body, y }; });
  return { s, x: cx + 40 * u, ay, by, aTop: ay - v.a.radius * s, bBottom: by + v.b.radius * s, fill, stagger: (dur: number) => Math.min(0.3, Math.max(0.12, (dur - 1.6) / Math.max(1, fill.length))) };
}

/** Bodies on screen at time t (pixels). */
/** How many beats in a row, before this one, held the same body on screen. */
function holdIndex(layout: EpisodeLayout, b: LaidOutBeat) {
  const i = layout.beats.indexOf(b), v = b.beat.visual;
  let k = 0;
  if (v.type !== "body") return 0;
  for (let j = i - 1; j >= 0; j--) {
    const p = layout.beats[j].beat.visual;
    if (p.type === "body" && p.body === v.body) k++; else break;
  }
  return k;
}
/** Framing for the k-th hold: scale, offset (fractions of the frame), growth and sideways drift over the beat. */
function holdPose(k: number) {
  const poses = [
    { s: 1, x: 0, y: 0, grow: 0.07, slide: 0 },          // centred, slow push-in
    { s: 1.34, x: 0.17, y: 0.05, grow: 0.05, slide: -0.03 }, // close pass on the right, drifting across
    { s: 0.66, x: -0.07, y: -0.01, grow: 0.12, slide: 0.04 }, // pulled well back, more sky
    { s: 1.46, x: -0.13, y: -0.07, grow: 0.04, slide: 0.03 }, // tight, high on the left
    { s: 0.86, x: 0.09, y: 0.03, grow: 0.08, slide: -0.06 },  // off-centre, drifting back
    { s: 1.18, x: 0, y: 0.1, grow: 0.06, slide: 0 },          // low and close
  ];
  return poses[k % poses.length];
}

/** Last moments of a video that ends on empty sky: the opening picture rushes back in, so a replay starts seamlessly. */
const loopIn = (layout: EpisodeLayout, t: number) => {
  const first = layout.beats[0].beat.visual, last = layout.beats[layout.beats.length - 1].beat.visual;
  const ok = first.type === "compare" && !!first.open && (last.type === "shrink" || last.type === "stars");
  return ok ? Math.pow(progress(t, layout.duration - 0.4, layout.duration), 2) : 0;
};

export function placeBodies(layout: EpisodeLayout, t: number, w: number, h: number, u: number): PlacedBody[] {
  const loop = loopIn(layout, t);
  if (loop > 0) {
    const [lx, ly] = centre(w, h), k = lerp(0.04, 1, loop);
    return placeBodies(layout, 0, w, h, u).map((p) => ({ ...p, x: lx + (p.x - lx) * k, y: ly + (p.y - ly) * k, r: p.r * k }));
  }
  const b = active(layout, t);
  const v = b.beat.visual, lt = t - b.start, dur = b.end - b.start;
  const [cx0, cy0] = centre(w, h);
  const { shake } = cameraFx(layout, t, u);
  const cx = cx0 + shake[0], cy = cy0 + shake[1];
  const fit = FIT * u;
  switch (v.type) {
    case "body": {
      // several facts in a row about one body: each one gets its own framing, and the camera moves between them
      const k = holdIndex(layout, b);
      const to = holdPose(k), from = k > 0 ? holdPose(k - 1) : to;
      const m = ease.inOutCubic(progress(lt, 0, 0.55));
      const drift = progress(lt, 0, dur);
      const pop = k === 0 ? 0.9 + 0.1 * ease.outBack(progress(lt, 0, 0.35)) : 1; // punch in on the first cut only
      const scale = lerp(from.s * (1 + from.grow), to.s * (1 + to.grow * drift), m);
      const dx = lerp(from.x + from.slide, to.x + to.slide * drift, m), dy = lerp(from.y, to.y, m);
      return [{ body: v.body, x: cx + dx * w, y: cy + dy * h, r: (fit / extent(v.body)) * pop * scale }];
    }
    case "compare": {
      const g = compareGeometry(v, lt, cy, fit);
      return [
        { body: v.to, x: cx, y: g.toScreenY, r: v.to.radius * g.s },
        { body: v.from, x: cx, y: g.fromScreenY, r: v.from.radius * g.s },
      ];
    }
    case "orbits":
      return [{ body: v.body, x: cx, y: cy, r: fit }]; // the radius itself is the measure here
    case "lap":
      return [{ body: v.body, x: cx, y: cy, r: fit / extent(v.body) }];
    case "shrink": {
      const e = ease.inOutCubic(progress(lt, 0.1, dur * 0.8));
      return [{ body: v.body, x: cx, y: cy, r: Math.exp(lerp(Math.log(fit / extent(v.body)), Math.log(0.5 * u), e)) }];
    }
    case "pair": {
      const g = pairGeometry(v, cx, u);
      const pa = ease.outBack(progress(lt, 0, 0.4)), pb = ease.outBack(progress(lt, 0.25, 0.65));
      return [
        { body: v.a, x: g.ax, y: cy, r: v.a.radius * g.s * pa },
        { body: v.b, x: g.bx, y: cy, r: v.b.radius * g.s * pb },
      ].filter((b) => b.r > 0);
    }
    case "gap": {
      const g = gapGeometry(v, cx, cy, u, b.start === 0 ? lt : 9);
      const out: PlacedBody[] = [
        { body: v.a, x: g.x, y: g.ay, r: v.a.radius * g.s },
        { body: v.b, x: g.x, y: g.by, r: v.b.radius * g.s },
      ];
      g.fill.forEach((f, i) => {
        const f0 = b.start === 0 ? 0.04 : 0.5, st = b.start === 0 ? 0.09 : g.stagger(dur); // a video's first beat fills at once
        const pop = b.start === 0 ? 1 + 0.16 * Math.exp(-Math.pow((lt - 0.1 - i * 0.15) / 0.11, 2)) + 0.1 * Math.exp(-Math.pow((lt - 2.0 - i * 0.1) / 0.1, 2)) : ease.outBack(progress(lt, f0 + i * st, f0 + 0.3 + i * st)); // first beat: all there from frame one
        if (pop > 0) out.push({ body: f.body, x: g.x, y: f.y, r: f.body.radius * g.s * pop });
      });
      return out;
    }
    case "photo": {
      // the body lands on the photo as the first words name it
      if (!v.body || !v.at || !v.r) return []; // a photograph on its own
      const pop = ease.outBack(progress(lt, 0.45, 0.85)), k = photoZoom(lt);
      return pop > 0 ? [{ body: v.body, x: v.at[0] * w, y: v.at[1] * h, r: v.r * w * k * pop }] : [];
    }
    case "stars":
      return [];
  }
}

/** Slow pull-back on a photo beat, shared by the photo layer and the body drawn on it. */
export const photoZoom = (lt: number) => lerp(1.14, 1, 1 - Math.pow(1 - progress(lt, 0, 2.2), 3)) + 0.016 * lt; // pulls back, then keeps pushing in (a still photo must never sit still)
/** The photo beat on screen at time t, if any, with its local time and fade. */
export function activePhoto(layout: EpisodeLayout, t: number) {
  const b = active(layout, t), v = b.beat.visual;
  if (v.type !== "photo") return null;
  const lt = t - b.start;
  return { v, lt, zoom: photoZoom(lt), alpha: 1 - progress(lt, b.end - b.start - 0.3, b.end - b.start) };
}

// ------------------------------------------------------------ overlay (2D)

function label(ctx: Ctx, text: string, x: number, y: number, px: number, alpha: number, font = "Anton", color = "#fff", align: CanvasTextAlign = "center") {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = clamp(alpha);
  const face = (size: number) => `${font === "Inter" ? "800 " : ""}${size}px ${font}`;
  ctx.font = face(px);
  // never let a label run off the frame: shrink it to the room it has
  const W = ctx.canvas.width, pad = 36 * (W / 1080), tw = ctx.measureText(text).width;
  const room = align === "left" ? W - pad - x : align === "right" ? x - pad : 2 * (Math.min(x, W - x) - pad);
  if (tw > room && room > 0) { px *= room / tw; ctx.font = face(px); }
  ctx.textAlign = align; ctx.textBaseline = "middle";
  ctx.lineWidth = px * 0.18; ctx.strokeStyle = "rgba(0,0,0,0.9)"; ctx.lineJoin = "round";
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color; ctx.fillText(text, x, y);
  ctx.restore();
}

/** Name + fact above a featured body. `punch` 0..1 scales it in. */
function nameplate(d: DrawContext, b: Body, cx: number, cy: number, alpha: number, punch = 1, note = b.note, headline = false) {
  const { ctx, u } = d;
  const y = cy - FIT * u - 158 * u;
  const k = 0.7 + 0.3 * ease.outBack(clamp(punch));
  label(ctx, b.name.toUpperCase(), cx, y, 76 * u * k, alpha);
  if (note) label(ctx, note.toUpperCase(), cx, y + (headline ? 80 : 72) * u, (headline ? 58 : 42) * u * k, alpha, "Anton", "#ffd23f");
}

export function drawOverlay(d: DrawContext, layout: EpisodeLayout) {
  const { ctx, t, width: w, height: h, u } = d;
  const b = active(layout, t);
  const v = b.beat.visual, lt = t - b.start, dur = b.end - b.start;
  const fx = cameraFx(layout, t, u);
  const [cx0, cy0] = centre(w, h);
  const cx = cx0 + fx.shake[0], cy = cy0 + fx.shake[1];
  const fit = FIT * u;

  // a closing body hands its nameplate's place to the end question
  const closing = b.end >= layout.duration - 1e-6 ? 1 - progress(t, layout.duration - 3.1, layout.duration - 2.8) : 1;
  // while a body sweeps through the top of the frame during a zoom, darken a soft band behind the spoken words
  if (fx.zoom > 0.02) {
    // an ellipse hugging the caption, feathered to nothing in every direction, so it never reads as a bar
    const sa = 0.5 * clamp(fx.zoom * 2.2), rx = w * 0.56, ry = h * 0.085;
    ctx.save(); ctx.translate(w / 2, h * 0.215); ctx.scale(1, ry / rx);
    const band = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    band.addColorStop(0, `rgba(3,4,11,${sa})`); band.addColorStop(0.45, `rgba(3,4,11,${sa * 0.8})`);
    band.addColorStop(0.8, `rgba(3,4,11,${sa * 0.25})`); band.addColorStop(1, "rgba(3,4,11,0)");
    ctx.fillStyle = band; ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  if (v.type === "body") nameplate(d, v.body, cx, cy - (v.fact ? 14 * u : 0), progress(lt, 0.05, 0.25) * closing, progress(lt, 0.05, 0.4), v.fact ?? v.body.note, !!v.fact);

  if (v.type === "photo" && !v.body) {
    // a photograph on its own: one caption line under it, and optionally a ring around a detail
    const a = 1 - progress(lt, dur - 0.3, dur);
    if (v.at && v.r) {
      const k = photoZoom(lt), x = cx + (v.at[0] * w - cx) * k, y = h / 2 + (v.at[1] * h - h / 2) * k, r = v.r * w;
      ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = "rgba(255,210,63,0.95)"; ctx.lineWidth = 5 * u; ctx.setLineDash([22 * u, 14 * u]);
      ctx.lineDashOffset = -t * 40 * u; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    if (v.ring) label(ctx, v.ring.toUpperCase(), cx, h * 0.85, 46 * u, progress(lt, 0.3, 0.6) * a, "Anton", "#ffd23f");
  } else if (v.type === "photo" && v.body && v.at && v.r) {
    // the measuring ring is there from the first frame; the name and size ride just under it
    const k = photoZoom(lt), x = v.at[0] * w, y = v.at[1] * h, r = v.r * w * k, a = 1 - progress(lt, dur - 0.3, dur);
    ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = "rgba(255,210,63,0.95)"; ctx.lineWidth = 5 * u; ctx.setLineDash([22 * u, 14 * u]);
    ctx.lineDashOffset = -t * 40 * u; ctx.beginPath(); ctx.arc(x, y, r + 8 * u, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    // one line, between the spoken words above and the ring below
    const tag = [progress(lt, 0.5, 0.8) > 0.5 ? v.body.name : null, v.ring ?? v.body.note].filter(Boolean).join(" · ");
    label(ctx, tag.toUpperCase(), x, y - r - 58 * u, 46 * u, a, "Anton", "#ffd23f");
  }

  if (v.type === "compare") {
    const Z = zoomTime(v);
    const g = compareGeometry(v, lt, cy, fit);
    if (!v.open) nameplate(d, v.from, cx, cy, 1 - progress(lt, 0, 0.18));
    // on a cold open the big body's name waits until it has pulled back clear of the words
    nameplate(d, v.to, cx, cy, progress(lt, Z - (v.open ? 0.45 : 0.03), Z + (v.open ? -0.15 : 0.08)), progress(lt, Z - (v.open ? 0.45 : 0.03), Z + 0.3));
    // the outgoing body keeps a tag so the eye can follow it
    const fromR = v.from.radius * g.s;
    if (fromR < fit * 0.55) {
      const a = (v.open ? 1 : progress(g.e, 0.55, 0.9)) * (1 - progress(lt, dur - 0.2, dur));
      if (v.open) {
        // the first words point at this dot, so make it impossible to miss: target rings pulsing around it
        const hold = 1 - progress(lt, dur - 0.9, dur - 0.3);
        // a dark pad behind the dot and its tag, so they read even against a bright star's glow
        const px = cx + 86 * u, pad = ctx.createRadialGradient(px, g.fromScreenY, 0, px, g.fromScreenY, 230 * u);
        pad.addColorStop(0, `rgba(3,4,11,${0.62 * a})`); pad.addColorStop(0.55, `rgba(3,4,11,${0.4 * a})`); pad.addColorStop(1, "rgba(3,4,11,0)");
        ctx.fillStyle = pad; ctx.fillRect(px - 230 * u, g.fromScreenY - 230 * u, 460 * u, 460 * u);
        ctx.globalCompositeOperation = "lighter";
        for (let k = 0; k < 2; k++) {
          const ph = (((lt * 1.25 + k * 0.5) % 1) + 1) % 1;
          ctx.strokeStyle = `rgba(255,210,63,${(1 - ph) * 0.95 * hold * a})`; ctx.lineWidth = (5 - 3 * ph) * u;
          ctx.beginPath(); ctx.arc(cx, g.fromScreenY, Math.max(fromR, 4 * u) + (14 + 62 * ph) * u, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.globalCompositeOperation = "source-over";
      }
      const x0 = cx + Math.max(fromR, 4 * u) + (v.open ? 26 : 14) * u, big = v.open ? 1.5 : 1;
      ctx.globalAlpha = a; ctx.strokeStyle = v.open ? "rgba(255,210,63,0.95)" : "rgba(255,255,255,0.85)"; ctx.lineWidth = 2.5 * u * big;
      ctx.beginPath(); ctx.moveTo(x0, g.fromScreenY); ctx.lineTo(x0 + 34 * u, g.fromScreenY); ctx.stroke(); ctx.globalAlpha = 1;
      label(ctx, v.from.name.toUpperCase(), x0 + 46 * u, g.fromScreenY, 34 * u * big, a, v.open ? "Anton" : "Inter", v.open ? "#ffd23f" : "#fff", "left");
    }
    // shock ring on landing
    const since = lt - Z;
    if (since >= 0 && since < 0.7) {
      const k = since / 0.7;
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = `rgba(255,240,210,${(1 - k) * (v.open ? 0.35 : v.big ? 0.8 : 0.4)})`;
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
    const R = (fit / extent(v.body)) * 1.09;
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

  if (v.type === "pair") {
    const g = pairGeometry(v, cx, u);
    const top = cy - Math.max(v.a.radius, v.b.radius) * g.s - 150 * u;
    ([[v.a, g.ax, 0], [v.b, g.bx, 0.25]] as const).forEach(([b, x, t0]) => {
      const a = progress(lt, t0 + 0.05, t0 + 0.3), k = 0.7 + 0.3 * ease.outBack(progress(lt, t0 + 0.05, t0 + 0.45));
      label(ctx, b.name.toUpperCase(), x, top, 60 * u * k, a);
      if (b.note) label(ctx, b.note.toUpperCase(), x, top + 58 * u, 34 * u * k, a, "Anton", "#ffd23f");
    });
  }

  if (v.type === "gap") {
    const g = gapGeometry(v, cx, cy, u, b.start === 0 ? lt : 9);
    const a = b.start === 0 ? 1 : progress(lt, 0.05, 0.4);
    // the gap itself: a dashed line from surface to surface
    ctx.save();
    ctx.globalAlpha = 0.75 * a; ctx.strokeStyle = "#cfe0ff"; ctx.lineWidth = 2.2 * u;
    ctx.setLineDash([10 * u, 9 * u]);
    ctx.beginPath(); ctx.moveTo(g.x, g.aTop); ctx.lineTo(g.x, lerp(g.aTop, g.bBottom, ease.outCubic(progress(lt, 0.1, 0.9)))); ctx.stroke();
    ctx.restore();
    // while a first beat pulls back, the far body's tag waits until it has dropped clear of the spoken words
    const farA = b.start === 0 && v.fill ? progress(lt, 1.25, 1.6) : 1;
    const tag = (b: Body, y: number, k = 1) => {
      const a0 = a;
      { const a = a0 * k;
      ctx.globalAlpha = a; ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 2.5 * u;
      const x1 = g.x - Math.max(b.radius * g.s, 4 * u) - 14 * u;
      ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x1 - 34 * u, y); ctx.stroke(); ctx.globalAlpha = 1;
      label(ctx, b.name.toUpperCase(), x1 - 46 * u, y, 38 * u, a, "Inter", "#fff", "right"); }
    };
    tag(v.b, g.by, farA); tag(v.a, g.ay);
    const mid = (g.aTop + g.bBottom) / 2, tx = g.x + 44 * u;
    if (v.ruler) {
      const n = Math.floor((g.ay - g.by) / (v.ruler.step * g.s) + 1e-6); // counted centre to centre
      const shown = Math.floor(n * progress(lt, 0.4, Math.min(dur - 1.0, 1.9)) + 1e-6);
      ctx.strokeStyle = "rgba(255,210,63,0.9)"; ctx.lineWidth = 2.2 * u;
      for (let i = 1; i <= shown; i++) { const y = g.ay - i * v.ruler.step * g.s; ctx.beginPath(); ctx.moveTo(g.x - 12 * u, y); ctx.lineTo(g.x + 12 * u, y); ctx.stroke(); }
      label(ctx, String(shown), tx, mid - 30 * u, 150 * u, a, "Anton", "#fff", "left");
      label(ctx, v.ruler.label.toUpperCase(), tx, mid + 70 * u, 44 * u, a, "Anton", "#ffd23f", "left");
    }
    g.fill.forEach((f, i) => {
      const f0 = b.start === 0 ? 0.1 : 0.6, st = b.start === 0 ? 0.09 : g.stagger(dur);
      const fa = b.start === 0 ? 1 : progress(lt, f0 + i * st, f0 + 0.25 + i * st);
      const x0 = g.x + Math.max(f.body.radius * g.s * extent(f.body, true), 4 * u) + 12 * u;
      label(ctx, f.body.name.toUpperCase(), x0, f.y, 30 * u, fa, "Inter", "#fff", "left");
    });
    if (v.trip) {
      const T = v.trip.seconds;
      const p = T ? clamp((((lt - 0.5) % (T + 0.7)) + (T + 0.7)) % (T + 0.7) / T) * (lt >= 0.5 ? 1 : 0) : ease.inOutCubic(progress(lt, 0.5, dur - 0.5));
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 26; i++) { // the traveller and its fading trail
        const k = i / 26, yy = lerp(g.aTop, g.bBottom, Math.max(0, p - k * 0.1));
        ctx.globalAlpha = (1 - k) * 0.9 * a;
        blob(ctx, softSprite([190, 230, 255], 0.3), g.x, yy, (i === 0 ? 30 : 15 * (1 - k)) * u);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
      label(ctx, T ? `${(p * T).toFixed(2)} s` : v.trip.label.toUpperCase(), tx, T ? mid - 30 * u : mid, (T ? 120 : 96) * u, a, "Anton", "#fff", "left");
      if (T) label(ctx, v.trip.label.toUpperCase(), tx, mid + 62 * u, 42 * u, a, "Anton", "#ffd23f", "left");
    }
    // with planets stacked in the gap the middle is taken, so the note sits under the far body's tag
    if (v.note && !v.ruler && !v.trip) {
      if (g.fill.length) label(ctx, v.note.toUpperCase(), g.x - 64 * u, g.by + 46 * u, 34 * u, a * farA, "Anton", "#ffd23f", "right");
      else label(ctx, v.note.toUpperCase(), tx, mid, 58 * u, a, "Anton", "#ffd23f", "left");
    }
  }

  // journey rail: one dot per reveal, so the viewer can see how far the climb goes
  const steps = layout.beats.filter((x) => ["compare", "pair", "gap", "orbits", "lap"].includes(x.beat.visual.type));
  if (steps.length >= 4 && h > w) {
    const landed = (x: LaidOutBeat) => x.start + (x.beat.visual.type === "compare" ? zoomTime(x.beat.visual) : 0.15);
    const gapY = Math.min(46 * u, (330 * u) / (steps.length - 1)), x0 = 64 * u, y0 = cy0 - 250 * u;
    const ra = hostAppear(t) * (1 - progress(t, layout.duration - 0.5, layout.duration - 0.15)) * 0.9;
    steps.forEach((x, i) => {
      const since = t - landed(x), on = since >= 0, y = y0 + i * gapY;
      if (i > 0) { ctx.strokeStyle = `rgba(207,224,255,${(on ? 0.7 : 0.22) * ra})`; ctx.lineWidth = 2 * u; ctx.beginPath(); ctx.moveTo(x0, y - gapY + 7 * u); ctx.lineTo(x0, y - 7 * u); ctx.stroke(); }
      const pulse = on ? 1 + 0.9 * Math.exp(-since * 5) : 1;
      ctx.beginPath(); ctx.arc(x0, y, (on ? 6 : 4.5) * u * pulse, 0, Math.PI * 2);
      if (on) { ctx.fillStyle = `rgba(255,210,63,${ra})`; ctx.fill(); }
      else { ctx.strokeStyle = `rgba(207,224,255,${0.45 * ra})`; ctx.lineWidth = 2 * u; ctx.stroke(); }
    });
  }

  // the host: talks with the narration, throws an arm up when a reveal lands
  const spot = hostSpot(w, h, u, cy0);
  let excite = 0;
  if (v.type === "compare") { const since = lt - zoomTime(v); if (since >= 0) excite = Math.exp(-since * (v.big ? 1.6 : 3)); }
  const leaving = 1 - progress(t, layout.duration - 0.5, layout.duration - 0.15);
  // he steps aside while a photograph stands on its own, so he never covers it
  const bi = layout.beats.findIndex((x) => t >= x.start && t < x.end), solo = (k: number) => { const pv = layout.beats[k]?.beat.visual; return !!pv && pv.type === "photo" && !pv.body; };
  const aside = solo(bi) ? (solo(bi - 1) ? 1 : progress(lt, 0, 0.25)) : solo(bi - 1) ? 1 - progress(lt, 0, 0.25) : 0;
  drawHost(ctx, spot.x + fx.shake[0], spot.y + fx.shake[1], spot.size, t, { talk: talkLevel(layout.words, t), excite, appear: hostAppear(t) * leaving * (1 - aside) });

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
  // drifting nebula clouds give the sky colour and depth; they slide inward as the camera pulls out
  const [cx, cy] = centre(w, h);
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 16; i++) {
    const col = NEBULA[i % NEBULA.length];
    const k = 1 - fx.zoom * 0.25 * (0.4 + 0.6 * hash(i + 3));
    const x = cx + ((hash(i * 3.1) - 0.5) * 1.5 * w + Math.sin(t * 0.05 + i) * 60 * u) * k;
    const y = cy + ((hash(i * 7.7) - 0.5) * 1.3 * h + Math.cos(t * 0.04 + i * 2) * 60 * u) * k;
    ctx.globalAlpha = 0.07 + 0.06 * hash(i + 11);
    blob(ctx, softSprite(col), x, y, (260 + 420 * hash(i + 5)) * u);
  }
  // Milky Way: a soft diagonal band of light and fine star dust
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(-0.55); ctx.scale(1 - fx.zoom * 0.12, 1 - fx.zoom * 0.12);
  const L = Math.hypot(w, h), band = ctx.createLinearGradient(0, -260 * u, 0, 260 * u);
  band.addColorStop(0, "rgba(150,170,255,0)"); band.addColorStop(0.5, "rgba(170,185,255,0.085)"); band.addColorStop(1, "rgba(150,170,255,0)");
  ctx.globalAlpha = 1; ctx.fillStyle = band; ctx.fillRect(-L, -260 * u, L * 2, 520 * u);
  for (let i = 0; i < 420; i++) {
    const x = (hash(i * 1.7) - 0.5) * 2 * L, y = (hash(i * 4.3) + hash(i * 9.1) - 1) * 170 * u;
    ctx.globalAlpha = 0.25 + 0.5 * hash(i + 2) * (0.6 + 0.4 * Math.sin(t * (1 + 3 * hash(i)) + i));
    ctx.fillStyle = "#dfe6ff"; ctx.fillRect(x, y, 1.6 * u, 1.6 * u);
  }
  ctx.restore();
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  drawStarfield(ctx, t, w, h, u, 1, fx.zoom * 0.55);
  // glints on a few bright stars
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 9; i++) {
    const x = hash(i * 12.7 + 1) * w, y = hash(i * 5.3 + 2) * h, tw = 0.5 + 0.5 * Math.sin(t * (1.2 + hash(i) * 2) + i * 3);
    const len = (26 + 40 * hash(i + 7)) * u * (0.6 + 0.4 * tw);
    ctx.strokeStyle = `rgba(210,225,255,${0.55 * tw})`; ctx.lineWidth = 1.6 * u;
    ctx.beginPath(); ctx.moveTo(x - len, y); ctx.lineTo(x + len, y); ctx.moveTo(x, y - len); ctx.lineTo(x, y + len); ctx.stroke();
    ctx.globalAlpha = 0.9 * tw; blob(ctx, softSprite([230, 238, 255], 0.3), x, y, 7 * u); ctx.globalAlpha = 1;
  }
  ctx.globalCompositeOperation = "source-over";
}
const NEBULA: [number, number, number][] = [[70, 90, 255], [170, 70, 255], [40, 180, 220], [255, 80, 150], [60, 110, 220]];
