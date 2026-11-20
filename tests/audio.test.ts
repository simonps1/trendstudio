import { describe, expect, it } from "vitest";
import { impact, Mixer, SAMPLE_RATE, sine, whoosh } from "../src/audio/synth";
import { encodeWav } from "../src/audio/wav";
import { buildSoundtrack } from "../src/videos/star-life/soundtrack";
import { DURATION, T } from "../src/videos/star-life/timeline";

describe("synth", () => {
  it("sine has the right frequency", () => {
    const s = sine(1, 100);
    let crossings = 0;
    for (let i = 1; i < s.length; i++) if (s[i - 1] < 0 && s[i] >= 0) crossings++;
    expect(crossings).toBeGreaterThanOrEqual(99);
    expect(crossings).toBeLessThanOrEqual(100);
  });
  it("sources are finite", () => {
    for (const s of [whoosh(), impact(1)]) expect(s.every(Number.isFinite)).toBe(true);
  });
  it("mixer places sounds at the right time and normalises", () => {
    const m = new Mixer(2);
    m.add(new Float32Array(100).fill(1), 1.0);
    const out = m.master(-1);
    expect(Math.abs(out.left[SAMPLE_RATE - 10])).toBe(0);
    expect(Math.abs(out.left[SAMPLE_RATE + 10])).toBeGreaterThan(0.5);
    let peak = 0;
    for (let i = 0; i < out.left.length; i++) peak = Math.max(peak, Math.abs(out.left[i]), Math.abs(out.right[i]));
    expect(peak).toBeCloseTo(Math.pow(10, -1 / 20), 3);
  });
  it("encodes a valid WAV header", () => {
    const w = encodeWav({ sampleRate: 48000, left: new Float32Array(10), right: new Float32Array(10) });
    expect(new TextDecoder().decode(w.slice(0, 4))).toBe("RIFF");
    expect(w.length).toBe(44 + 40);
  });
});

describe("star-life soundtrack", () => {
  const st = buildSoundtrack();
  const rmsAt = (t: number, win = 0.15) => {
    const a = Math.round(t * SAMPLE_RATE), b = a + Math.round(win * SAMPLE_RATE);
    let s = 0;
    for (let i = a; i < b; i++) s += st.left[i] ** 2;
    return Math.sqrt(s / (b - a));
  };
  it("matches the video duration", () => expect(st.left.length).toBe(DURATION * SAMPLE_RATE));
  it("the supernova hit is synchronised with the flash frame", () => {
    expect(rmsAt(T.supernova)).toBeGreaterThan(rmsAt(T.supernova - 0.3) * 1.5);
    expect(rmsAt(T.ignition)).toBeGreaterThan(rmsAt(T.ignition - 0.6));
  });
}, 60000);
