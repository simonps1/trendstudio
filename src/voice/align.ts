import type { WordTiming } from "./types";

const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, "");

/** Script words with punctuation kept for display. */
export const splitWords = (text: string) => text.split(/\s+/).filter(Boolean);

/** Rough syllable count — used to estimate how long a word takes to say. */
export function syllables(word: string) {
  const w = norm(word).replace(/'/g, "");
  if (!w) return 1;
  if (/^\d+$/.test(w)) return w.length * 1.5;
  const groups = w.replace(/e$/, "").match(/[aeiouy]+/g);
  return Math.max(1, groups?.length ?? 1);
}

/**
 * Estimate word timings inside a spoken line of known duration.
 * Weighted by syllables with extra time after punctuation.
 */
export function estimateWordTimings(text: string, duration: number, lead = 0.04, tail = 0.08): WordTiming[] {
  const words = splitWords(text);
  const pause = (w: string): number => (/[.!?…]$/.test(w) ? 1.6 : /[,;:—-]$/.test(w) ? 0.9 : 0);
  const weights = words.map((w) => syllables(w) + 0.35);
  const pauses = words.map(pause);
  const total = weights.reduce((a, b) => a + b, 0) + pauses.slice(0, -1).reduce((a, b) => a + b, 0);
  const span = Math.max(0.05, duration - lead - tail);
  let t = lead;
  return words.map((word, i) => {
    const start = t;
    const end = t + (weights[i] / total) * span;
    t = end + (i < words.length - 1 ? (pauses[i] / total) * span : 0);
    return { word, start, end };
  });
}

/**
 * Map recognised words (with timestamps) onto the script's words using
 * edit-distance alignment. Unmatched script words are interpolated.
 */
export function alignToScript(text: string, recognised: WordTiming[], duration: number): WordTiming[] {
  const script = splitWords(text);
  const a = script.map(norm), b = recognised.map((r) => norm(r.word));
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  const match: (number | null)[] = Array(n).fill(null);
  let i = n, j = m;
  while (i > 0 && j > 0) {
    if (dp[i][j] === dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) { match[i - 1] = j - 1; i--; j--; }
    else if (dp[i][j] === dp[i - 1][j] + 1) i--;
    else j--;
  }
  const est = estimateWordTimings(text, duration);
  const out: WordTiming[] = script.map((word, k) => {
    const r = match[k] !== null ? recognised[match[k]!] : null;
    return r ? { word, start: r.start, end: r.end } : { word, start: NaN, end: NaN };
  });
  // fill gaps by interpolating between known neighbours (or fall back to estimate)
  for (let k = 0; k < out.length; k++) {
    if (!Number.isNaN(out[k].start)) continue;
    const prev = out.slice(0, k).reverse().find((w) => !Number.isNaN(w.end));
    const nextIdx = out.findIndex((w, q) => q > k && !Number.isNaN(w.start));
    const s = prev ? prev.end : est[k].start;
    const e = nextIdx >= 0 ? out[nextIdx].start : Math.max(s + 0.1, est[k].end);
    const run = (nextIdx >= 0 ? nextIdx : out.length) - k;
    const step = (e - s) / Math.max(1, run);
    out[k] = { word: script[k], start: s, end: s + step };
  }
  // enforce monotonic, non-overlapping timings
  for (let k = 1; k < out.length; k++) if (out[k].start < out[k - 1].end) out[k].start = out[k - 1].end;
  for (const w of out) w.end = Math.max(w.end, w.start + 0.05);
  return out;
}

/** Group words into short caption chunks (Shorts style): ≤ maxWords, break on punctuation. */
export function chunkWords(words: WordTiming[], maxWords = 3, maxChars = 18): WordTiming[][] {
  const chunks: WordTiming[][] = [];
  let cur: WordTiming[] = [];
  for (const w of words) {
    const chars = cur.reduce((n, x) => n + x.word.length + 1, 0) + w.word.length;
    if (cur.length && (cur.length >= maxWords || chars > maxChars)) { chunks.push(cur); cur = []; }
    cur.push(w);
    if (/[.!?…,;:—]$/.test(w.word)) { chunks.push(cur); cur = []; }
  }
  if (cur.length) chunks.push(cur);
  // never end a chunk on a weak word ("brighter than a / whole galaxy") — carry it forward
  const WEAK = new Set(["a", "an", "the", "of", "to", "in", "and", "its", "is", "for", "so", "than"]);
  for (let i = 0; i < chunks.length - 1; i++) {
    const c = chunks[i], last = c[c.length - 1];
    if (c.length > 1 && WEAK.has(norm(last.word)) && !/[.!?…,;:—]$/.test(last.word) && chunks[i + 1].length < maxWords) {
      chunks[i + 1].unshift(c.pop()!);
    }
  }
  return chunks;
}

/** Word error rate of `hyp` against `ref` (0 = perfect). Number words are normalised. */
export function wordErrorRate(ref: string, hyp: string) {
  const NUM: Record<string, string> = { "10": "ten", "20": "twenty", "1": "one" };
  const toks = (s: string) => s.toLowerCase().replace(/[-—…]/g, " ").split(/\s+/).map(norm).filter(Boolean).map((w) => NUM[w] ?? w);
  const a = toks(ref), b = toks(hyp);
  const dp = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return a.length ? dp[a.length][b.length] / a.length : 0;
}
