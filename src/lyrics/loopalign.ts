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
