import type { AudioSource } from './align';
import { buildSeam } from './seam';
import type { Analysis } from './analyze';
import { costToQuality } from './similarity';

export interface LoopCandidate {
  /** First beat of the loop. */
  startBeat: number;
  /** Beat at which playback jumps back to startBeat (exclusive end). */
  endBeat: number;
  /** Sample where the seam lands (refined start). */
  startSample: number;
  /** Sample where playback leaves (end of loop). */
  endSample: number;
  cost: number;
  rho: number;
  fade: number;
  drift: number;
  spectralDb: number;
  quality: number;
  bars: number;
  seconds: number;
}

export interface LoopSearchOptions {
  minBeats: number;
  maxCandidates: number;
  /** Bias toward longer loops; 0 = pure seam quality. */
  lengthBias: number;
  fade: number;
  autoFade?: boolean;
}

/**
 * Verify and refine the loop [startBeat, endBeat): aligns the seam at sample
 * level and picks its crossfade. Used for found loops and for sections the
 * person picks by hand.
 */
export function loopAt(
  a: Analysis, src: AudioSource, coarse: Float32Array, startBeat: number, endBeat: number,
  fade: number, autoFade = true, cost = a.transitions[(endBeat - 1) * a.beats.length + startBeat],
): LoopCandidate {
  const at = a.beats[endBeat];
  // Loops repeat verbatim, so no loudness ramp: the seam must stand on its own.
  const seam = buildSeam(src, coarse, at, a.beats[startBeat], {
    fade,
    autoFade,
    loudnessMatch: false,
    periodOut: a.beatPeriods[endBeat - 1],
    periodIn: a.beatPeriods[Math.max(0, startBeat - 1)],
  });
  const total = (Number.isFinite(cost) ? cost : 1) + seam.penalty;
  return {
    startBeat,
    endBeat,
    startSample: seam.to,
    endSample: at,
    cost: total,
    rho: seam.rho,
    fade: seam.fade,
    drift: seam.drift,
    spectralDb: seam.spectralDb,
    quality: costToQuality(total),
    bars: (endBeat - startBeat) / a.meter.beatsPerBar,
    seconds: (at - seam.to) / src.sampleRate,
  };
}

/**
 * Find single-seam loops [startBeat, endBeat) that can repeat forever.
 * Ranks by transition cost with a mild preference for longer loops, applies
 * non-maximum suppression, then verifies each seam at sample level.
 */
export function findLoops(a: Analysis, src: AudioSource, coarse: Float32Array, opts: LoopSearchOptions): LoopCandidate[] {
  const n = a.beats.length;
  const T = a.transitions;
  const m = a.meter.beatsPerBar;
  const raw: { s: number; e: number; cost: number; key: number }[] = [];
  for (let e = opts.minBeats; e < n; e++) {
    const i = e - 1; // jump after beat i
    for (let s = 0; s + opts.minBeats <= e; s++) {
      const c = T[i * n + s];
      if (!Number.isFinite(c) || c > 0.6) continue;
      const len = e - s;
      raw.push({ s, e, cost: c, key: c - opts.lengthBias * Math.log2(len / opts.minBeats) });
    }
  }
  raw.sort((x, y) => x.key - y.key);
  const picked: typeof raw = [];
  for (const r of raw) {
    if (picked.some((p) => Math.abs(p.s - r.s) <= m && Math.abs(p.e - r.e) <= m)) continue;
    // Keep the list varied: at most two loops of any given length.
    if (picked.filter((p) => Math.abs(p.e - p.s - (r.e - r.s)) < m).length >= 2) continue;
    picked.push(r);
    if (picked.length >= opts.maxCandidates * 2) break;
  }
  const out = picked.map((p) => loopAt(a, src, coarse, p.s, p.e, opts.fade, opts.autoFade ?? true, p.cost));
  out.sort((x, y) => (x.cost - opts.lengthBias * Math.log2(x.seconds)) - (y.cost - opts.lengthBias * Math.log2(y.seconds)));
  return out.slice(0, opts.maxCandidates);
}
