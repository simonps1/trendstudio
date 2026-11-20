import type { NarrationLine } from "./types";

export interface Scheduled { id: string; start: number; end: number; window: number }
export interface ScheduleProblem { id: string; message: string; overBy: number }

/** Resolve start times for every line given measured durations, and report lines that don't fit. */
export function scheduleLines(lines: NarrationLine[], durations: Record<string, number>) {
  const out: Scheduled[] = [];
  const problems: ScheduleProblem[] = [];
  const byId = new Map<string, Scheduled>();
  for (const l of lines) {
    const d = durations[l.id];
    if (d === undefined) throw new Error(`No duration for line "${l.id}"`);
    let start: number;
    if (l.endAt !== undefined) start = l.endAt - d;
    else if (l.after !== undefined) {
      const prev = byId.get(l.after);
      if (!prev) throw new Error(`Line "${l.id}" is after unknown/later line "${l.after}"`);
      start = prev.end + (l.gap ?? 0.15);
    } else if (l.at !== undefined) start = l.at;
    else throw new Error(`Line "${l.id}" needs at, after or endAt`);
    const s: Scheduled = { id: l.id, start, end: start + d, window: l.until - start };
    if (s.end > l.until + 1e-6) problems.push({ id: l.id, message: `ends at ${s.end.toFixed(2)}s, must end by ${l.until.toFixed(2)}s`, overBy: s.end - l.until });
    const last = out[out.length - 1];
    if (last && s.start < last.end - 1e-6) problems.push({ id: l.id, message: `starts at ${s.start.toFixed(2)}s, overlapping "${last.id}" (ends ${last.end.toFixed(2)}s)`, overBy: last.end - s.start });
    out.push(s);
    byId.set(l.id, s);
  }
  return { scheduled: out, problems };
}

/** Speed needed so a line of duration `d` (at `speed`) fits `window` seconds, capped. */
export function fitSpeed(d: number, speed: number, window: number, max = 1.25) {
  if (d <= window) return speed;
  return Math.min(max, speed * (d / Math.max(window, 0.05)) * 1.03);
}
