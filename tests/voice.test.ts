import { describe, expect, it } from "vitest";
import { Mixer, SAMPLE_RATE } from "../src/audio/synth";
import { alignToScript, chunkWords, estimateWordTimings, syllables, wordErrorRate } from "../src/voice/align";
import { fitSpeed, scheduleLines } from "../src/voice/schedule";
import { NARRATION } from "../src/videos/star-life/narration";
import { engulfTimes, giantRadiusAU, PLANETS } from "../src/videos/star-life/timeline";

/** Conservative speaking-time estimate: ~4.2 syllables/s + pauses at punctuation. */
const estimate = (text: string, speed = 1) =>
  (text.split(/\s+/).reduce((n, w) => n + syllables(w), 0) / 4.2 + (text.match(/[.,?!…]/g)?.length ?? 0) * 0.18) / speed;

describe("word timing", () => {
  it("estimates monotonic timings that fill the line", () => {
    const w = estimateWordTimings("It begins as a cold, dark cloud of gas.", 2.5);
    expect(w).toHaveLength(9);
    for (let i = 1; i < w.length; i++) expect(w[i].start).toBeGreaterThanOrEqual(w[i - 1].end - 1e-9);
    expect(w.at(-1)!.end).toBeLessThanOrEqual(2.5);
  });
  it("aligns recognised words onto script words, filling misses", () => {
    const rec = [
      { word: "this", start: 0.1, end: 0.3 }, { word: "star", start: 0.3, end: 0.6 },
      { word: "live", start: 0.8, end: 1.0 }, { word: "10", start: 1.1, end: 1.3 },
    ];
    const out = alignToScript("This star will live ten", rec, 1.5);
    expect(out.map((w) => w.word)).toEqual(["This", "star", "will", "live", "ten"]);
    expect(out[0].start).toBe(0.1);
    expect(out[2].start).toBeGreaterThanOrEqual(0.6);
    expect(out[2].end).toBeLessThanOrEqual(0.8 + 1e-9);
  });
  it("chunks captions into ≤3 words and breaks on punctuation", () => {
    const w = estimateWordTimings("See that tiny dot? That's the Sun.", 2);
    const c = chunkWords(w, 3);
    expect(c.map((x) => x.map((y) => y.word).join(" "))).toEqual(["See that tiny", "dot?", "That's the Sun."]);
  });
  it("does not strand weak words at the end of a chunk", () => {
    const c = chunkWords(estimateWordTimings("Brighter than a whole galaxy.", 2), 4, 20);
    expect(c.map((x) => x.map((y) => y.word).join(" "))).toEqual(["Brighter than", "a whole galaxy."]);
  });
  it("word error rate", () => {
    expect(wordErrorRate("This star will live for ten million years.", "this star will live for 10 million years")).toBe(0);
    expect(wordErrorRate("a b c d", "a x c d")).toBe(0.25);
  });
});

describe("scheduling", () => {
  it("detects overlaps and deadline misses", () => {
    const lines = [
      { id: "a", text: "x", at: 0, until: 1 },
      { id: "b", text: "y", at: 0.5, until: 2 },
    ];
    const { problems } = scheduleLines(lines, { a: 1.2, b: 0.5 });
    expect(problems.map((p) => p.id)).toEqual(["a", "b"]);
  });
  it("speeds lines up to fit, capped at 1.25x", () => {
    expect(fitSpeed(2, 1, 2.5)).toBe(1);
    expect(fitSpeed(3, 1, 2.5)).toBeCloseTo(1.236, 2);
    expect(fitSpeed(5, 1, 2)).toBe(1.25);
  });
  it("the star-life script is realistic: every line fits its slot at ≤1.25x", () => {
    const durations: Record<string, number> = {};
    for (const l of NARRATION) {
      let speed = l.speed ?? 1;
      const { scheduled } = scheduleLines(NARRATION.slice(0, NARRATION.indexOf(l)), durations);
      void scheduled;
      durations[l.id] = estimate(l.text, speed);
      const win = (() => { const s = scheduleLines(NARRATION.slice(0, NARRATION.indexOf(l) + 1), durations).scheduled.at(-1)!; return l.until - s.start; })();
      speed = fitSpeed(durations[l.id], speed, win);
      durations[l.id] = estimate(l.text, speed);
    }
    const { problems } = scheduleLines(NARRATION, durations);
    expect(problems).toEqual([]);
  });
});

describe("timeline sync for voice", () => {
  it("star surface reaches each orbit exactly at its engulf time, growing monotonically", () => {
    for (const p of PLANETS) expect(giantRadiusAU(p.engulf)).toBeCloseTo(p.au, 6);
    let last = 0;
    for (let t = 19; t < 27; t += 0.01) { const r = giantRadiusAU(t); expect(r).toBeGreaterThanOrEqual(last - 1e-9); last = r; }
    expect(engulfTimes().map((e) => e.t)).toEqual(PLANETS.map((p) => p.engulf));
  });
});

describe("ducking", () => {
  it("music dips under the voice and recovers after", () => {
    const m = new Mixer(4);
    const tone = new Float32Array(4 * SAMPLE_RATE).map((_, i) => 0.3 * Math.sin(i * 0.05));
    m.add(tone, 0, 1, 0, 0, "music");
    m.add(new Float32Array(SAMPLE_RATE).map((_, i) => 0.3 * Math.sin(i * 0.11)), 1.5, 1, 0, 0, "voice");
    const env = m.voiceEnvelope();
    expect(env[Math.round(0.5 * SAMPLE_RATE)]).toBe(0);
    expect(env[Math.round(2.0 * SAMPLE_RATE)]).toBeGreaterThan(0.3);
    expect(env[Math.round(3.9 * SAMPLE_RATE)]).toBeLessThan(0.1);
  });
});
