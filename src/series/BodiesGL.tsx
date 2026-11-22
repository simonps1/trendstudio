import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { Body } from "./types";

/** A body placed on screen (pixels). Drawn in array order: later = on top. */
export interface PlacedBody { body: Body; x: number; y: number; r: number }

const MAX = 10;

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

/** Surface detail is computed at this fraction of the frame size, then sampled at full size. */
const SURFACE_SCALE = 0.5;

const COMMON = `
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform float uU;
uniform vec4 uA[${MAX}]; // x, y, radius, kind (0 star, 1 earth, 2 bands, 3 plain, 4 rocky, 5 mars, 6 black hole, <0 none)
uniform vec4 uD[${MAX}]; // x: 1 = ring system
uniform vec4 uC[${MAX}]; // star: temp, seed, 0, 0   planet: r, g, b, seed
float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x){
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++){ s += a * noise(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; } return s; }
vec3 rotY(vec3 v, float a){ float c = cos(a), s = sin(a); return vec3(c * v.x + s * v.z, v.y, -s * v.x + c * v.z); }
vec3 starBase(float temp){
  vec3 cold = vec3(1.0, 0.30, 0.07), mid = vec3(1.0, 0.80, 0.42), hot = vec3(0.60, 0.76, 1.0);
  return temp < 0.5 ? mix(cold, mid, temp * 2.0) : mix(mid, hot, (temp - 0.5) * 2.0);
}
const vec3 L = vec3(-0.52, 0.56, 0.64); // light from the upper left, towards the viewer
`;

/**
 * Pass 1 (half size): the fully shaded surface of whichever body is on top at
 * each pixel. Surfaces are smooth, so half resolution loses nothing visible.
 * Every body is an analytic sphere, exact at any radius.
 */
const FRAG_SURFACE = COMMON + `
uniform float uScale;
void main(){
  vec2 frag = vec2(gl_FragCoord.x / uScale, uRes.y - gl_FragCoord.y / uScale);
  vec3 col = vec3(0.0);
  for (int i = 0; i < ${MAX}; i++){
    float kind = uA[i].w; if (kind < -0.5) continue;
    vec2 d2 = frag - uA[i].xy; float r = uA[i].z;
    if (length(d2) > r + 4.0) continue; // slightly past the edge so edge pixels sample valid colour
    vec2 p = d2 / r; float pl = length(p); if (pl > 1.0) p /= pl;
    float z = sqrt(max(0.0, 1.0 - dot(p, p)));
    vec3 n = vec3(p.x, -p.y, z);
    if (kind < 0.5) {
      float temp = uC[i].x, seed = uC[i].y;
      vec3 base = starBase(temp);
      float big = fbm(n * 3.0 + vec3(seed, uTime * 0.07, uTime * 0.05));
      float cells = fbm(n * 11.0 + vec3(uTime * 0.16, seed * 3.0, -uTime * 0.11));
      float heat = 0.45 + 0.75 * big + 0.35 * cells;
      float limb = mix(0.30, 1.0, pow(z, 0.55));
      vec3 s = base * heat * 1.35 * limb + vec3(1.0, 0.95, 0.85) * pow(max(heat - 0.55, 0.0), 2.0) * 1.6 * limb;
      float spots = smoothstep(0.66, 0.73, fbm(n * 7.0 + vec3(seed * 2.0, 3.0, uTime * 0.02))); // small sunspot groups
      s *= 1.0 - 0.4 * spots;
      col = mix(s, s * vec3(1.0, 0.72, 0.55), (1.0 - z) * 0.6); // redder towards the edge
    } else {
      vec3 pc = uC[i].rgb; float seed = uC[i].a;
      vec3 nr = rotY(n, uTime * 0.12 + seed);
      float diff = clamp(dot(n, L), 0.0, 1.0);
      vec3 s;
      if (kind < 1.5) {
        float land = fbm(nr * 2.3 + seed);
        float isLand = smoothstep(0.50, 0.535, land);
        vec3 ocean = mix(vec3(0.02, 0.10, 0.32), vec3(0.05, 0.30, 0.58), smoothstep(0.30, 0.50, land));
        vec3 ground = mix(vec3(0.12, 0.36, 0.13), vec3(0.52, 0.42, 0.24), smoothstep(0.35, 0.65, fbm(nr * 7.0 + 3.0)));
        s = mix(ocean, ground, isLand);
        s = mix(s, vec3(0.95), smoothstep(0.80, 0.90, abs(nr.y) + 0.08 * land));
        float cloud = smoothstep(0.52, 0.72, fbm(rotY(n, uTime * 0.17 + seed) * 3.6 + 11.0));
        s = mix(s, vec3(1.0), cloud * 0.85);
        vec3 h = normalize(L + vec3(0.0, 0.0, 1.0));
        s = s * (0.03 + 1.15 * diff) + vec3(1.0) * pow(max(dot(n, h), 0.0), 60.0) * (1.0 - isLand) * (1.0 - cloud) * 0.6;
        s += vec3(0.30, 0.55, 1.0) * pow(1.0 - z, 3.0) * (0.25 + diff);
        float city = smoothstep(0.66, 0.74, noise(nr * 46.0 + seed)) * smoothstep(0.55, 0.75, noise(nr * 9.0 + 5.0));
        s += vec3(1.0, 0.72, 0.38) * city * isLand * (1.0 - cloud) * smoothstep(0.12, 0.0, dot(n, L)) * 0.9;
      } else if (kind < 2.5) {
        float turb = fbm(vec3(nr.x * 3.0, nr.y * 9.0, nr.z * 3.0) + seed);
        float band = 0.5 + 0.5 * sin((nr.y * 8.5 + turb * 0.75) * 3.14159);
        s = mix(pc * vec3(0.55, 0.42, 0.34), pc * 1.18, smoothstep(0.2, 0.8, band));
        s = mix(s, pc * vec3(1.15, 1.1, 1.0), 0.25 * fbm(nr * vec3(6.0, 30.0, 6.0)));
        float lon = atan(nr.x, nr.z);
        float spot = length(vec2((lon - 0.4) * 1.0, (nr.y + 0.36) * 2.6));
        s = mix(vec3(0.72, 0.26, 0.14), s, smoothstep(0.10, 0.19, spot));
        s *= 0.04 + 1.12 * diff;
      } else if (kind < 3.5) {
        // cloud-covered world: soft streaks along the lines of latitude
        float streak = fbm(vec3(nr.x * 2.0, nr.y * 11.0, nr.z * 2.0) + seed);
        s = pc * (0.78 + 0.34 * streak + 0.12 * fbm(nr * 5.0 + seed)) * (0.04 + 1.12 * diff);
        s += pc * pow(1.0 - z, 3.0) * 0.35 * diff;
      } else if (kind < 4.5) {
        // airless rock: dark plains, craters with bright rims, hard shadows
        float plains = smoothstep(0.50, 0.62, fbm(nr * 1.9 + seed));
        float cr = noise(nr * 13.0 + seed * 3.0), cr2 = noise(nr * 31.0 + seed);
        float pit = smoothstep(0.70, 0.76, cr), rim = smoothstep(0.63, 0.70, cr) - pit;
        float pit2 = smoothstep(0.72, 0.78, cr2), rim2 = smoothstep(0.66, 0.72, cr2) - pit2;
        s = pc * (0.82 + 0.36 * fbm(nr * 6.0 + seed)) * (1.0 - 0.32 * plains);
        s *= 1.0 - 0.30 * pit - 0.16 * pit2;
        s += pc * (0.30 * rim + 0.16 * rim2);
        s *= 0.02 + 1.25 * pow(diff, 0.85);
      } else if (kind < 5.5) {
        // Mars: rust plains, dark highlands, polar caps, a thin dusty haze
        float dark = smoothstep(0.48, 0.62, fbm(nr * 2.2 + seed));
        s = mix(pc, pc * vec3(0.42, 0.36, 0.34), dark * 0.75) * (0.85 + 0.3 * fbm(nr * 8.0 + 2.0));
        float pit = smoothstep(0.72, 0.78, noise(nr * 17.0 + seed));
        s *= 1.0 - 0.18 * pit;
        s = mix(s, vec3(0.96, 0.95, 0.93), smoothstep(0.86, 0.92, abs(nr.y) + 0.06 * fbm(nr * 6.0)));
        s *= 0.03 + 1.15 * diff;
        s += vec3(0.95, 0.55, 0.35) * pow(1.0 - z, 3.0) * 0.22 * (0.2 + diff);
      } else {
        s = vec3(0.0); // event horizon
      }
      col = s;
    }
  }
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

/** Pass 2 (full size): crisp anti-aliased edges, glow and atmosphere; surfaces come from pass 1. */
const FRAG_FINAL = COMMON + `
uniform sampler2D uSurface;
// Saturn-style rings: C ring (faint), B ring (bright), the Cassini gap, A ring. Radii in planet radii.
vec4 ringAt(vec2 d2, float r, vec3 pc, float seed){
  const float tilt = 0.30;
  vec2 q = vec2(d2.x, d2.y / tilt) / r; float rr = length(q);
  if (rr < 1.20 || rr > 2.32) return vec4(0.0);
  float w = 1.5 / (r * tilt);
  float dens = smoothstep(1.24, 1.24 + w + 0.03, rr) * (1.0 - smoothstep(2.27 - w - 0.01, 2.27, rr));
  float b = mix(0.28, 1.0, smoothstep(1.50, 1.56, rr));
  b *= 1.0 - 0.92 * smoothstep(1.93, 1.96, rr) * (1.0 - smoothstep(2.01, 2.04, rr));
  b *= mix(1.0, 0.72, smoothstep(2.02, 2.06, rr));
  float fine = 0.72 + 0.28 * noise(vec3(rr * 46.0, seed, 0.5));
  // the planet's shadow falls across the far side of the rings
  float shade = 1.0 - 0.75 * smoothstep(1.05, 0.9, abs(q.x * 0.8 - 0.55)) * step(d2.y, 0.0) * smoothstep(0.2, 0.6, q.x);
  return vec4(pc * vec3(1.08, 1.0, 0.88) * (0.5 + 0.55 * b) * fine * shade, dens * b * 0.94);
}
// Accretion disc of a black hole: hot gas circling the horizon, brighter on the side moving towards us.
vec4 discAt(vec2 d2, float r, float seed){
  const float tilt = 0.20;
  vec2 q = vec2(d2.x, d2.y / tilt) / r; float rr = length(q);
  if (rr < 1.12 || rr > 1.95) return vec4(0.0);
  float w = 1.5 / (r * tilt);
  float dens = smoothstep(1.16, 1.30 + w, rr) * (1.0 - smoothstep(1.55, 1.9, rr));
  float ang = uTime * 1.1 / (rr * sqrt(rr));
  vec2 qr = vec2(cos(ang) * q.x - sin(ang) * q.y, sin(ang) * q.x + cos(ang) * q.y);
  float n = noise(vec3(qr * 3.4, seed)) * 0.65 + noise(vec3(qr * 9.0, seed + 4.0)) * 0.35;
  float doppler = 0.62 + 0.38 * (-q.x / rr);
  vec3 c = mix(vec3(1.0, 0.50, 0.14), vec3(1.0, 0.94, 0.80), smoothstep(1.75, 1.2, rr)) * (0.75 + 0.7 * n);
  return vec4(c * doppler * 1.25, clamp(dens * (0.5 + 0.7 * n) * (0.55 + doppler * 0.6), 0.0, 1.0));
}
void main(){
  vec2 frag = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec3 surface = texture2D(uSurface, gl_FragCoord.xy / uRes).rgb;
  vec3 col = vec3(0.0); float alpha = 0.0;
  for (int i = 0; i < ${MAX}; i++){
    float kind = uA[i].w; if (kind < -0.5) continue;
    vec2 d2 = frag - uA[i].xy; float r = uA[i].z; float dist = length(d2);
    float edge = clamp(r - dist + 0.5, 0.0, 1.0);
    float dpx = max(dist - r, 0.0);
    if (kind < 0.5) {
      vec3 base = starBase(uC[i].x);
      float Lg = min(r * 0.45, 520.0 * uU) + 6.0 * uU; // glow length in pixels, capped for giants
      if (dpx < Lg * 5.0 && edge < 1.0) {
        float streak = 0.55 + 0.45 * noise(vec3(atan(d2.y, d2.x) * 5.0, uTime * 0.25 + uC[i].y, dpx / Lg * 0.7));
        float glow = exp(-dpx / Lg * 2.6) * streak * 0.75 + exp(-dpx / Lg * 0.9) * 0.22;
        // prominences: tongues of fire that flicker along the edge
        float ang = atan(d2.y, d2.x);
        float Lf = min(r * 0.2, 240.0 * uU) + 3.0 * uU;
        float tongue = smoothstep(0.48, 0.86, noise(vec3(ang * 9.0 + uC[i].y, uTime * 0.4, uC[i].y * 1.7)));
        glow += tongue * exp(-dpx / Lf * (1.6 + 2.0 * noise(vec3(ang * 23.0, uTime * 0.9, 1.0)))) * 0.95;
        col += base * glow * (1.0 - edge); alpha = max(alpha, clamp(glow, 0.0, 1.0) * (1.0 - edge));
      }
      // anamorphic lens streak across bright stars (fades out for giants that fill the frame)
      float an = exp(-abs(d2.y) / (r * 0.045 + 2.0 * uU)) * exp(-abs(d2.x) / (r * 3.4 + 40.0 * uU)) * 0.3
        * smoothstep(10.0 * uU, 40.0 * uU, r) * (1.0 - smoothstep(700.0 * uU, 1400.0 * uU, r)) * (1.0 - edge);
      col += mix(base, vec3(0.75, 0.86, 1.0), 0.45) * an; alpha = max(alpha, an);
    } else if (kind < 1.5 && edge < 1.0) { // thin atmosphere outside the disc
      float atm = exp(-dpx / (r * 0.05 + 1.0)) * 0.55 * (1.0 - edge);
      float lit = clamp(dot(normalize(vec3(d2.x, -d2.y, 0.0)), L) * 0.9 + 0.55, 0.0, 1.0);
      col += vec3(0.35, 0.6, 1.0) * atm * lit; alpha = max(alpha, atm * lit);
    }
    bool ringed = uD[i].x > 0.5, hole = kind > 5.5;
    if (hole && edge < 1.0) {
      // light from behind the hole is bent around it into a thin bright ring
      float x = dist / r;
      if (x < 2.4) {
        float halo = exp(-pow((x - 1.10) / 0.075, 2.0)) * (0.78 + 0.22 * (-d2.y / max(dist, 0.001)));
        float g = (halo * 1.05 + exp(-max(x - 1.0, 0.0) * 3.2) * 0.3) * (1.0 - edge);
        col += vec3(1.0, 0.78, 0.48) * g; alpha = max(alpha, clamp(g, 0.0, 1.0));
      }
    }
    vec4 extra = ringed ? ringAt(d2, r, uC[i].rgb, uC[i].a) : hole ? discAt(d2, r, uC[i].y) : vec4(0.0);
    if (extra.a > 0.0 && d2.y < 0.0) { col = mix(col, extra.rgb, extra.a); alpha = max(alpha, extra.a); } // far side, behind the body
    if (edge > 0.0) { col = mix(col, surface, edge); alpha = max(alpha, edge); }
    if (extra.a > 0.0 && d2.y >= 0.0) { col = mix(col, extra.rgb, extra.a); alpha = max(alpha, extra.a); } // near side, in front
  }
  gl_FragColor = vec4(col, alpha);
}`;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
const KINDS = { earth: 1, bands: 2, plain: 3, rocky: 4, mars: 5 } as const;
const seedOf = (name: string) => [...name].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % 997, 7) / 37;

interface Program { prog: WebGLProgram; loc: Record<string, WebGLUniformLocation | null> }
interface GLState { gl: WebGLRenderingContext; surface: Program; final: Program; fbo: WebGLFramebuffer; tex: WebGLTexture; sw: number; sh: number }

function init(canvas: HTMLCanvasElement): GLState {
  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: false, alpha: true });
  if (!gl) throw new Error("WebGL is not available");
  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error("Shader error: " + gl.getShaderInfoLog(s));
    return s;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const program = (frag: string): Program => {
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs); gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, frag));
    gl.bindAttribLocation(prog, 0, "p");
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("Link error: " + gl.getProgramInfoLog(prog));
    const loc: Program["loc"] = {};
    for (const n of ["uRes", "uTime", "uU", "uA", "uC", "uD", "uScale", "uSurface"]) loc[n] = gl.getUniformLocation(prog, n);
    return { prog, loc };
  };
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const sw = Math.ceil(canvas.width * SURFACE_SCALE), sh = Math.ceil(canvas.height * SURFACE_SCALE);
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, sw, sh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fbo = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { gl, surface: program(FRAG_SURFACE), final: program(FRAG_FINAL), fbo, tex, sw, sh };
}

/** WebGL layer that draws the frame's bodies. `place` must be a pure function of time. */
export const BodiesGL: React.FC<{ place: (t: number, w: number, h: number, u: number) => PlacedBody[] }> = ({ place }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  const state = useRef<GLState | null>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    state.current ??= init(ref.current);
    const { gl, surface, final, fbo, tex, sw, sh } = state.current;
    const t = frame / fps, u = Math.min(width, height) / 1080;
    const bodies = place(t, width, height, u).slice(-MAX);
    const A = new Float32Array(MAX * 4).fill(-1), C = new Float32Array(MAX * 4), D = new Float32Array(MAX * 4);
    bodies.forEach((b, i) => {
      const kind = b.body.kind === "star" ? 0 : b.body.kind === "hole" ? 6 : KINDS[b.body.surface ?? "plain"];
      D.set([b.body.rings ? 1 : 0, 0, 0, 0], i * 4);
      A.set([b.x, b.y, Math.max(b.r, 1.6 * u), kind], i * 4); // never smaller than a visible dot
      if (kind === 0 || kind === 6) C.set([b.body.temp ?? 0.5, seedOf(b.body.name), 0, 0], i * 4);
      else C.set([...hexToRgb(b.body.color ?? "#8899aa"), seedOf(b.body.name)], i * 4);
    });
    const use = (p: Program) => {
      gl.useProgram(p.prog);
      gl.uniform2f(p.loc.uRes, width, height); gl.uniform1f(p.loc.uTime, t); gl.uniform1f(p.loc.uU, u);
      gl.uniform4fv(p.loc.uA, A); gl.uniform4fv(p.loc.uC, C); gl.uniform4fv(p.loc.uD, D);
    };
    // pass 1: shaded surfaces at half size
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, sw, sh);
    use(surface); gl.uniform1f(surface.loc.uScale, SURFACE_SCALE);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    // pass 2: edges, glow and compositing at full size
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    use(final);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(final.loc.uSurface, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.finish();
  }, [frame, fps, width, height, place]);
  return (
    <AbsoluteFill>
      <canvas ref={ref} width={width} height={height} style={{ width: "100%", height: "100%" }} />
    </AbsoluteFill>
  );
};
