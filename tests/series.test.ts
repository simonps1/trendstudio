import { describe, expect, it } from "vitest";
import { MANIFEST } from "../src/core/manifest";
import { EPISODES, episodeVideoId } from "../src/episodes";
import { beatsFor, layoutEpisode, narrationLines } from "../src/series/layout";
import type { Variant } from "../src/series/types";

describe.each(EPISODES.map((e) => [e.spec.id, e] as const))("episode %s", (_id, e) => {
  const cuts: Variant[] = ["short", "long"];
  it("has unique beat ids and non-empty lines", () => {
    for (const v of cuts) {
      const ids = beatsFor(e.spec, v).map((b) => b.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const b of beatsFor(e.spec, v)) expect(b.say.trim().length).toBeGreaterThan(3);
    }
  });
  it("comparisons always zoom out to a bigger body", () => {
    for (const b of e.spec.beats) if (b.visual.type === "compare") expect(b.visual.to.radius).toBeGreaterThan(b.visual.from.radius);
  });
  it("lays beats out back to back with no gaps or overlaps", () => {
    for (const v of cuts) {
      const l = layoutEpisode(e.spec, v, e.tracks[v].lines.length ? e.tracks[v] : null);
      expect(l.beats[0].start).toBe(0);
      for (let i = 1; i < l.beats.length; i++) {
        expect(l.beats[i].start).toBeCloseTo(l.beats[i - 1].end, 6);
        expect(l.beats[i].voiceStart).toBeGreaterThan(l.beats[i - 1].voiceEnd);
      }
      expect(l.beats.at(-1)!.end).toBe(l.duration);
    }
  });
  it("short cut fits Shorts (<60 s); long cut qualifies as 1 min+ (>61 s)", () => {
    const d = (v: Variant) => layoutEpisode(e.spec, v, e.tracks[v].lines.length ? e.tracks[v] : null).duration;
    expect(d("short")).toBeLessThan(59);
    expect(d("short")).toBeGreaterThan(20);
    expect(d("long")).toBeGreaterThan(61);
  });
  it("falls back to estimates when the voice track is stale", () => {
    const stale = { ...e.tracks.short, lines: e.tracks.short.lines.map((l) => ({ ...l, text: l.text + " changed" })) };
    expect(layoutEpisode(e.spec, "short", stale).voiced).toBe(false);
  });
  it("is registered in the manifest with a chained narration script", () => {
    for (const v of cuts) {
      expect(MANIFEST.some((m) => m.id === episodeVideoId(e.spec.id, v))).toBe(true);
      const lines = narrationLines(e.spec, v);
      expect(lines[0].at).toBeDefined();
      for (let i = 1; i < lines.length; i++) expect(lines[i].after).toBe(lines[i - 1].id);
    }
  });
});

describe("episode numbers", () => {
  it("gives every posted video its own number", () => {
    const shown = EPISODES.flatMap((e) => [e.spec.episode, e.spec.episodeLong]);
    expect(new Set(shown).size).toBe(shown.length);
  });
});
