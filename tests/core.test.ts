import { describe, expect, it } from "vitest";
import { clamp, ease, progress, rng } from "../src/core/anim";
import { compositionId, FORMATS } from "../src/core/formats";
import { MANIFEST } from "../src/core/manifest";
import { counter, engulfTimes, giantRadiusAU, PLANETS, T } from "../src/videos/star-life/timeline";

describe("formats", () => {
  it("meets the minimum delivery specs at native 60 fps", () => {
    expect(FORMATS.vertical).toMatchObject({ width: 1080, height: 1920, fps: 60 });
    expect(FORMATS.horizontal).toMatchObject({ width: 1920, height: 1080, fps: 60 });
    for (const f of Object.values(FORMATS)) expect(f.fps).toBeGreaterThanOrEqual(60);
  });
  it("builds valid Remotion composition ids", () => {
    expect(compositionId("star-life", "vertical")).toMatch(/^[a-zA-Z0-9-]+$/);
  });
});

describe("anim helpers", () => {
  it("rng is deterministic", () => {
    const a = rng(5), b = rng(5);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it("easings hit endpoints", () => {
    for (const e of Object.values(ease)) {
      expect(e(0)).toBeCloseTo(0, 5);
      expect(e(1)).toBeCloseTo(1, 5);
    }
    expect(clamp(2)).toBe(1);
    expect(progress(5, 0, 10)).toBe(0.5);
  });
});

describe("manifest", () => {
  it("has unique ids and 30–60 s Shorts-length timelines", () => {
    const ids = MANIFEST.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const m of MANIFEST) expect(m.durationSec).toBeGreaterThanOrEqual(30);
  });
});

describe("star-life timeline", () => {
  it("scene markers are in order", () => {
    const order = [T.nebula, T.ignition, T.main, T.giant, T.collapse, T.supernova, T.blackHole, T.dust, T.end];
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
  it("engulfs every planet, inner first, before the collapse", () => {
    const times = engulfTimes().map((e) => e.t);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(times.every((t) => t > T.giant && t < T.collapse)).toBe(true);
    expect(giantRadiusAU(T.collapse)).toBeGreaterThan(PLANETS.at(-1)!.au);
  });
  it("counter switches to seconds for the collapse", () => {
    expect(counter(T.collapse - 0.01).label).toBe("YEARS");
    expect(counter(T.supernova).value).toBe("0.250");
  });
});
