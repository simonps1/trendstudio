import type { WordTiming } from "../voice/types";

/**
 * Names and years are written for the narrator as he should say them ("Ton six one eight").
 * On screen they should read as they are written ("TON 618"), and stay together as one caption word.
 */
const WRITTEN: [spoken: string, shown: string][] = [
  ["ton six one eight", "TON 618"],
  ["stephenson two eighteen", "Stephenson 2-18"],
  ["m eighty-seven", "M87"],
  ["twenty twenty-two", "2022"],
  ["n g c six oh four", "NGC 604"],
  ["ten fifty-four", "1054"],
];

const clean = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, "");
const RULES = WRITTEN.map(([spoken, shown]) => ({ keys: spoken.split(" ").map(clean), shown }));

export function writtenCaptions(words: WordTiming[]): WordTiming[] {
  const out: WordTiming[] = [];
  for (let i = 0; i < words.length; ) {
    const rule = RULES.find((r) => r.keys.every((k, j) => i + j < words.length && clean(words[i + j].word) === k));
    if (!rule) { out.push(words[i++]); continue; }
    const last = words[i + rule.keys.length - 1];
    const tail = /[.,!?;:…]+$/.exec(last.word)?.[0] ?? "";
    out.push({ word: rule.shown + tail, start: words[i].start, end: last.end });
    i += rule.keys.length;
  }
  return out;
}
