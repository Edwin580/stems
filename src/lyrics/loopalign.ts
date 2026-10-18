import type { LoopCandidate } from '../engine/loops';
import type { LyricLine } from './lrc';

/**
 * Re-rank loop candidates so their start lands near a lyric line start.
 * Loops that begin mid-line get a penalty proportional to how far (in
 * seconds) their start is from the nearest lyric line, scaled by `weight`.
 * Loops with no lyric information keep their original order.
 */
export function alignLoopsToLyrics(
  loops: LoopCandidate[],
  lines: LyricLine[],
  sampleRate: number,
  weight = 0.15,
): LoopCandidate[] {
  if (!lines.length || !loops.length) return loops;
  const starts = lines.map((l) => l.time);
  const penalty = (loop: LoopCandidate): number => {
    const t = loop.startSample / sampleRate;
    let best = Infinity;
    for (const s of starts) best = Math.min(best, Math.abs(s - t));
    // A full bar of slack is free; beyond that it costs.
    return Math.max(0, best - 2) * weight;
  };
  return [...loops]
    .map((loop, i) => ({ loop, score: loop.cost + penalty(loop), i }))
    .sort((a, b) => a.score - b.score || a.i - b.i)
    .map((x) => x.loop);
}

/** Lyric lines that fall inside a loop's time range (for the loop list UI). */
export function linesInLoop(loop: LoopCandidate, lines: LyricLine[], sampleRate: number): LyricLine[] {
  const s = loop.startSample / sampleRate;
  const e = loop.endSample / sampleRate;
  return lines.filter((l) => l.time >= s && l.time < e);
}

/**
 * Per-beat seam penalty from synced lyrics: leaving or landing in the middle
 * of a sung line cuts the words off, which is the jump listeners notice
 * first. Beats at (or just before) a line start are free; beats inside a
 * line cost `weight`; long gaps after a line (likely instrumental) cost a
 * little. LRC gives only start times, so a line is taken to run until the
 * next one starts (at most 8 s).
 */
export function lyricBoundaryPenalty(lines: LyricLine[], beats: number[], sampleRate: number, weight = 0.3): Float32Array {
  const out = new Float32Array(beats.length);
  if (!lines.length) return out;
  const slack = 0.3; // seconds around a line start that count as "between lines"
  let k = 0;
  beats.forEach((b, i) => {
    const t = b / sampleRate;
    while (k + 1 < lines.length && lines[k + 1].time <= t + slack) k++;
    const line = lines[k];
    if (t + slack < line.time) return; // before the first line
    if (Math.abs(t - line.time) <= slack) return; // at a line start
    const next = lines[k + 1]?.time ?? line.time + 8;
    const end = Math.min(next, line.time + 8);
    out[i] = t < end ? weight : weight * 0.2;
  });
  return out;
}
