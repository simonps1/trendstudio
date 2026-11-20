/**
 * Minimal offline synthesizer + mixer. Pure TypeScript, no dependencies.
 * All sound in TRENDSTUDIO's default pipeline is generated here, so it is
 * 100% original and free of licensing constraints.
 *
 * Times are in seconds; signals are Float32Array mono or StereoBuffer.
 */
import { rng } from "../core/anim";

export const SAMPLE_RATE = 48000;

export interface StereoBuffer {
  sampleRate: number;
  left: Float32Array;
  right: Float32Array;
}

export type Curve = number | ((t: number) => number);
const at = (c: Curve, t: number) => (typeof c === "number" ? c : c(t));
const n = (sec: number) => Math.max(1, Math.round(sec * SAMPLE_RATE));

// ---------------------------------------------------------------- sources

/** Sine oscillator with time-varying frequency (Hz) — phase-continuous. */
export function sine(dur: number, freq: Curve, phase = 0): Float32Array {
  const out = new Float32Array(n(dur));
  let p = phase;
  for (let i = 0; i < out.length; i++) {
    out[i] = Math.sin(p);
    p += (2 * Math.PI * at(freq, i / SAMPLE_RATE)) / SAMPLE_RATE;
  }
  return out;
}

/** Band-limited-ish saw via additive harmonics (warm pad source). */
export function softSaw(dur: number, freq: Curve, harmonics = 10, seed = 1): Float32Array {
  const out = new Float32Array(n(dur));
  const r = rng(seed);
  const phases = Array.from({ length: harmonics }, () => r() * Math.PI * 2);
  let base = 0;
  for (let i = 0; i < out.length; i++) {
    const f = at(freq, i / SAMPLE_RATE);
    let s = 0;
    for (let h = 1; h <= harmonics; h++) {
      if (f * h > 16000) break;
      s += Math.sin(base * h + phases[h - 1]) / h;
    }
    out[i] = s * 0.55;
    base += (2 * Math.PI * f) / SAMPLE_RATE;
  }
  return out;
}

export function noise(dur: number, seed = 7): Float32Array {
  const r = rng(seed);
  const out = new Float32Array(n(dur));
  for (let i = 0; i < out.length; i++) out[i] = r() * 2 - 1;
  return out;
}

/** Brown-ish noise: smoother, rumbly. */
export function brown(dur: number, seed = 9): Float32Array {
  const w = noise(dur, seed);
  let last = 0;
  for (let i = 0; i < w.length; i++) {
    last = (last + 0.02 * w[i]) / 1.02;
    w[i] = last * 3.5;
  }
  return w;
}

// ---------------------------------------------------------------- filters

type BiquadType = "lowpass" | "highpass" | "bandpass";

/** RBJ biquad with time-varying cutoff (coefficients updated every 32 samples). */
export function biquad(sig: Float32Array, type: BiquadType, cutoff: Curve, q: Curve = 0.707): Float32Array {
  const out = new Float32Array(sig.length);
  let b0 = 0, b1 = 0, b2 = 0, a1 = 0, a2 = 0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < sig.length; i++) {
    if ((i & 31) === 0) {
      const t = i / SAMPLE_RATE;
      const f = Math.min(Math.max(at(cutoff, t), 10), SAMPLE_RATE * 0.45);
      const w0 = (2 * Math.PI * f) / SAMPLE_RATE;
      const cos = Math.cos(w0), alpha = Math.sin(w0) / (2 * at(q, t));
      const a0 = 1 + alpha;
      if (type === "lowpass") { b0 = (1 - cos) / 2; b1 = 1 - cos; b2 = (1 - cos) / 2; }
      else if (type === "highpass") { b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = (1 + cos) / 2; }
      else { b0 = alpha; b1 = 0; b2 = -alpha; }
      b0 /= a0; b1 /= a0; b2 /= a0; a1 = (-2 * cos) / a0; a2 = (1 - alpha) / a0;
    }
    const x = sig[i];
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    out[i] = y;
  }
  return out;
}

// ---------------------------------------------------------------- envelopes / utils

/** Multiply by a gain curve over time (in place, returns sig). */
export function shape(sig: Float32Array, gain: (t: number) => number): Float32Array {
  for (let i = 0; i < sig.length; i++) sig[i] *= gain(i / SAMPLE_RATE);
  return sig;
}

/** Attack / exponential-decay envelope. */
export const adEnv = (attack: number, decay: number) => (t: number) =>
  t < attack ? t / attack : Math.exp(-(t - attack) / decay);

/** Linear fade in/out envelope for a signal of length `dur`. */
export const fades = (dur: number, fin: number, fout: number) => (t: number) =>
  Math.min(1, t / Math.max(fin, 1e-4), (dur - t) / Math.max(fout, 1e-4));

export function mix(...sigs: [Float32Array, number][]): Float32Array {
  const len = Math.max(...sigs.map(([s]) => s.length));
  const out = new Float32Array(len);
  for (const [s, g] of sigs) for (let i = 0; i < s.length; i++) out[i] += s[i] * g;
  return out;
}

// ---------------------------------------------------------------- mixer

export type Bus = "music" | "fx" | "voice";

export interface MasterOptions {
  peakDb?: number;
  /** Max gain reduction (dB) applied to music while the voice speaks. */
  duckMusicDb?: number;
  /** Max gain reduction (dB) applied to sound effects while the voice speaks. */
  duckFxDb?: number;
}

export class Mixer {
  readonly buses: Record<Bus, StereoBuffer>;
  readonly send: StereoBuffer; // reverb bus
  constructor(public readonly durationSec: number) {
    const len = n(durationSec);
    const mk = (): StereoBuffer => ({ sampleRate: SAMPLE_RATE, left: new Float32Array(len), right: new Float32Array(len) });
    this.buses = { music: mk(), fx: mk(), voice: mk() };
    this.send = mk();
  }

  /**
   * Place a mono signal at `time` seconds. `pan` is -1..1 (or a curve over the
   * signal's own local time). `reverb` is the send amount 0..1.
   */
  add(sig: Float32Array, time: number, gain = 1, pan: Curve = 0, reverb = 0, bus: Bus = "fx") {
    const start = Math.round(time * SAMPLE_RATE);
    const { left, right } = this.buses[bus];
    for (let i = 0; i < sig.length; i++) {
      const j = start + i;
      if (j < 0) continue;
      if (j >= left.length) break;
      const p = (Math.max(-1, Math.min(1, at(pan, i / SAMPLE_RATE))) + 1) * 0.25 * Math.PI;
      const v = sig[i] * gain;
      const l = v * Math.cos(p), r = v * Math.sin(p);
      left[j] += l; right[j] += r;
      if (reverb > 0) { this.send.left[j] += l * reverb; this.send.right[j] += r * reverb; }
    }
  }

  /** Voice envelope (0..1) with fast attack / slow release, used for ducking. */
  voiceEnvelope(): Float32Array {
    const v = this.buses.voice;
    const env = new Float32Array(v.left.length);
    const att = Math.exp(-1 / (0.015 * SAMPLE_RATE)), rel = Math.exp(-1 / (0.35 * SAMPLE_RATE));
    let e = 0;
    for (let i = 0; i < env.length; i++) {
      const x = Math.min(1, (Math.abs(v.left[i]) + Math.abs(v.right[i])) * 4);
      e = x > e ? att * e + (1 - att) * x : rel * e + (1 - rel) * x;
      env[i] = e;
    }
    // hold: look-ahead so music dips just *before* the first syllable
    const ahead = Math.round(0.08 * SAMPLE_RATE);
    for (let i = 0; i < env.length - ahead; i++) env[i] = Math.max(env[i], env[i + ahead]);
    return env;
  }

  /** Reverb, duck music/fx under the voice, sum, soft-limit and normalise. */
  master(opts: MasterOptions | number = {}): StereoBuffer {
    const o: MasterOptions = typeof opts === "number" ? { peakDb: opts } : opts;
    const peakDb = o.peakDb ?? -1;
    const duckM = 1 - Math.pow(10, -(o.duckMusicDb ?? 9) / 20);
    const duckF = 1 - Math.pow(10, -(o.duckFxDb ?? 4) / 20);
    const env = this.voiceEnvelope();
    const wetL = reverb(this.send.left, 0), wetR = reverb(this.send.right, 23);
    const { music, fx, voice } = this.buses;
    const len = music.left.length;
    const out: StereoBuffer = { sampleRate: SAMPLE_RATE, left: new Float32Array(len), right: new Float32Array(len) };
    let peak = 1e-9;
    for (let i = 0; i < len; i++) {
      const d = Math.min(1, env[i] * 3);
      const gm = 1 - duckM * d, gf = 1 - duckF * d;
      const l = music.left[i] * gm + (fx.left[i] + wetL[i]) * gf + voice.left[i];
      const r = music.right[i] * gm + (fx.right[i] + wetR[i]) * gf + voice.right[i];
      out.left[i] = Math.tanh(l * 0.9);
      out.right[i] = Math.tanh(r * 0.9);
      peak = Math.max(peak, Math.abs(out.left[i]), Math.abs(out.right[i]));
    }
    const g = Math.pow(10, peakDb / 20) / peak;
    for (let i = 0; i < len; i++) { out.left[i] *= g; out.right[i] *= g; }
    return out;
  }
}

/** Gentle voice chain: high-pass rumble, light compression, presence lift. */
export function voiceChain(sig: Float32Array): Float32Array {
  const hp = biquad(sig, "highpass", 85, 0.7);
  const presence = biquad(hp, "bandpass", 3500, 0.8);
  const out = new Float32Array(hp.length);
  let env = 0;
  const att = Math.exp(-1 / (0.005 * SAMPLE_RATE)), rel = Math.exp(-1 / (0.12 * SAMPLE_RATE));
  for (let i = 0; i < hp.length; i++) {
    const x = hp[i] + presence[i] * 0.35;
    const a = Math.abs(x);
    env = a > env ? att * env + (1 - att) * a : rel * env + (1 - rel) * a;
    const over = Math.max(0, env - 0.25);
    const gain = env > 0.25 ? (0.25 + over / 3) / env : 1; // 3:1 above threshold
    out[i] = x * gain;
  }
  return out;
}

/** Schroeder/Freeverb-style mono reverb; `spread` detunes delay lines per channel. */
export function reverb(input: Float32Array, spread: number, room = 0.86, damp = 0.35): Float32Array {
  const combs = [1557, 1617, 1491, 1422, 1277, 1356, 1188, 1116].map((d) => Math.round(((d + spread) * SAMPLE_RATE) / 44100));
  const allpasses = [556, 441, 341, 225].map((d) => Math.round(((d + spread) * SAMPLE_RATE) / 44100));
  const out = new Float32Array(input.length);
  for (const d of combs) {
    const buf = new Float32Array(d);
    let idx = 0, store = 0;
    for (let i = 0; i < input.length; i++) {
      const y = buf[idx];
      store = y * (1 - damp) + store * damp;
      buf[idx] = input[i] * 0.015 + store * room;
      out[i] += y;
      idx = (idx + 1) % d;
    }
  }
  for (const d of allpasses) {
    const buf = new Float32Array(d);
    let idx = 0;
    for (let i = 0; i < out.length; i++) {
      const b = buf[idx];
      const y = -out[i] + b;
      buf[idx] = out[i] + b * 0.5;
      out[i] = y;
      idx = (idx + 1) % d;
    }
  }
  return out;
}

// ---------------------------------------------------------------- sound design kit

/** Filtered-noise swoosh, bright in the middle. */
export function whoosh(dur = 0.7, seed = 3, bright = 1): Float32Array {
  const s = biquad(noise(dur, seed), "bandpass", (t) => 300 + 3200 * bright * Math.sin((Math.PI * t) / dur), 1.2);
  return shape(s, (t) => Math.pow(Math.sin((Math.PI * Math.min(t, dur)) / dur), 2) * 1.6);
}

/** Tension riser: rising noise + rising tone with accelerating tremolo. */
export function riser(dur = 2.5, seed = 5): Float32Array {
  const nz = biquad(noise(dur, seed), "bandpass", (t) => 400 * Math.pow(20, t / dur), 2);
  const tone = softSaw(dur, (t) => 110 * Math.pow(4, t / dur), 6, seed);
  const sig = mix([nz, 0.9], [biquad(tone, "lowpass", (t) => 500 + 4000 * (t / dur)), 0.35]);
  return shape(sig, (t) => {
    const p = t / dur;
    const trem = 0.75 + 0.25 * Math.sin(2 * Math.PI * (4 + 20 * p) * t);
    return Math.pow(p, 2.2) * trem;
  });
}

/** Cinematic impact: sub drop + noise body + click transient. */
export function impact(size = 1, seed = 11): Float32Array {
  const dur = 1.2 + 2.6 * size;
  const sub = shape(sine(dur, (t) => 30 + 70 * Math.exp(-t * 5)), adEnv(0.004, 0.5 + 0.9 * size));
  const body = shape(biquad(noise(dur, seed), "lowpass", (t) => 200 + 5000 * Math.exp(-t * 3)), adEnv(0.002, 0.25 + 0.6 * size));
  const rumble = shape(brown(dur, seed + 1), adEnv(0.05, 0.8 * size + 0.3));
  const click = shape(biquad(noise(0.02, seed + 2), "highpass", 2000), adEnv(0.0005, 0.004));
  return mix([sub, 1.0], [body, 0.55], [rumble, 0.6 * size], [click, 0.4]);
}

/** Bright sparkle cloud for magical/ignition moments. */
export function shimmer(dur = 2.5, seed = 13): Float32Array {
  const r = rng(seed);
  let out = new Float32Array(n(dur));
  for (let k = 0; k < 28; k++) {
    const t0 = r() * dur * 0.6;
    const f = 1200 * Math.pow(2, Math.floor(r() * 24) / 12);
    const ping = shape(sine(dur - t0, f), adEnv(0.003, 0.15 + r() * 0.5));
    const off = Math.round(t0 * SAMPLE_RATE);
    for (let i = 0; i < ping.length && off + i < out.length; i++) out[off + i] += ping[i] * 0.12;
  }
  return out;
}

/** Short tonal pop (UI / reveal accent). */
export function pop(freq = 520, seed = 17): Float32Array {
  const tone = shape(sine(0.35, (t) => freq * (1 + 0.6 * Math.exp(-t * 30))), adEnv(0.002, 0.08));
  const click = shape(biquad(noise(0.03, seed), "bandpass", 3000, 2), adEnv(0.0005, 0.006));
  return mix([tone, 0.8], [click, 0.3]);
}

/** Crackling burn: bandpassed noise with random crackle impulses. */
export function sizzle(dur = 0.9, seed = 19): Float32Array {
  const r = rng(seed);
  const hiss = biquad(noise(dur, seed), "bandpass", (t) => 5000 - 2500 * (t / dur), 1.5);
  for (let i = 0; i < hiss.length; i++) if (r() < 0.002) hiss[i] += (r() * 2 - 1) * 4;
  return shape(hiss, adEnv(0.01, dur / 3));
}

/** FM bell / chime. */
export function chime(freq = 660, dur = 3.5): Float32Array {
  const out = new Float32Array(n(dur));
  let pc = 0, pm = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SAMPLE_RATE;
    const idx = 2.5 * Math.exp(-t * 2.5);
    out[i] = Math.sin(pc + idx * Math.sin(pm)) * Math.exp(-t * 1.4) * Math.min(1, t / 0.002);
    pc += (2 * Math.PI * freq) / SAMPLE_RATE;
    pm += (2 * Math.PI * freq * 3.5) / SAMPLE_RATE;
  }
  return out;
}

/** Soft low "heartbeat" thump. */
export function thump(freq = 55): Float32Array {
  return shape(sine(0.6, (t) => freq * (1 + 1.5 * Math.exp(-t * 25))), adEnv(0.004, 0.12));
}

/** Evolving pad chord (Hz list) with slow filter motion. */
export function pad(dur: number, freqs: number[], seed = 23, brightness = 1): Float32Array {
  const voices: [Float32Array, number][] = [];
  freqs.forEach((f, k) => {
    for (const det of [-0.12, 0.12]) {
      const hz = f * Math.pow(2, det / 12);
      voices.push([softSaw(dur, hz, 8, seed + k * 7 + (det > 0 ? 1 : 0)), 1 / (freqs.length * 2)]);
    }
  });
  const sig = biquad(mix(...voices), "lowpass", (t) => (500 + 400 * Math.sin(t * 0.7)) * brightness, 0.9);
  return shape(sig, fades(dur, 1.5, 1.5));
}
