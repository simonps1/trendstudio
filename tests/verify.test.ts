import { describe, expect, it } from "vitest";
import { analyseMotion, countExactDuplicates } from "../scripts/verify";

describe("QC heuristics", () => {
  it("detects exact duplicate frames", () => {
    expect(countExactDuplicates(["a", "b", "c"]).dups).toBe(0);
    expect(countExactDuplicates(["a", "a", "b", "b", "b"])).toEqual({ dups: 3, longest: 2 });
  });
  it("flags 30fps content doubled to 60fps by parity bias", () => {
    const doubled = Array.from({ length: 200 }, (_, i) => (i % 2 ? 0.0 : 1.5));
    const m = analyseMotion(doubled, 0.02);
    expect(m.staticRatio).toBeGreaterThan(0.4);
    expect(m.parityBias).toBeGreaterThan(0.9);
    const native = Array.from({ length: 200 }, () => 0.8);
    expect(analyseMotion(native, 0.02).staticFrames).toBe(0);
  });
});
