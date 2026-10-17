import { TIMBRE_DIMS, type BeatFeatures } from './features';

/**
 * Beat-to-beat distance matrix (N x N). Combines harmony, timbre/rhythm and
 * loudness, then normalises so the median off-diagonal distance is 1.
 */
export function beatDistanceMatrix(f: BeatFeatures): Float32Array {
  const n = f.count;
  const D = new Float32Array(n * n);
  const tScale = 1 / Math.sqrt(2 * TIMBRE_DIMS);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      let dot = 0;
      for (let k = 0; k < 12; k++) dot += f.chroma[i * 12 + k] * f.chroma[j * 12 + k];
      const dc = Math.max(0, 1 - dot);
      let tt = 0;
      for (let k = 0; k < TIMBRE_DIMS; k++) {
        const d = f.timbre[i * TIMBRE_DIMS + k] - f.timbre[j * TIMBRE_DIMS + k];
        tt += d * d;
      }
      const dt = Math.sqrt(tt) * tScale;
      const dl = (Math.abs(f.loudness[i * 2] - f.loudness[j * 2]) + Math.abs(f.loudness[i * 2 + 1] - f.loudness[j * 2 + 1])) / 12;
      const d = 2 * dc + dt + dl;
      D[i * n + j] = d;
      D[j * n + i] = d;
    }
  }
  const sample: number[] = [];
  const step = Math.max(1, Math.floor((n * n) / 20000));
  for (let idx = 0; idx < n * n; idx += step) {
    const i = Math.floor(idx / n), j = idx % n;
    if (i !== j) sample.push(D[idx]);
  }
  sample.sort((a, b) => a - b);
  const med = sample[Math.floor(sample.length / 2)] || 1;
  for (let k = 0; k < D.length; k++) D[k] /= med;
  return D;
}

export interface TransitionOptions {
  /** Context half-width in beats compared on each side of the seam. */
  context: number;
  /** Minimum |target - natural next| in beats; shorter jumps sound like stutters. */
  minJump: number;
  beatsPerBar: number;
  /** Cost added when a jump would shift the position within the bar. */
  barPenalty: number;
}

export const DEFAULT_TRANSITION_OPTIONS: TransitionOptions = {
  context: 4,
  minJump: 8,
  beatsPerBar: 4,
  barPenalty: 0.6,
};

export interface TransitionExtras {
  /**
   * Per-beat phrase-start score in [0, 1]. Jumping from a phrase boundary
   * into the middle of a phrase (or vice versa) is penalised.
   */
  phrase?: Float32Array;
  phraseWeight?: number;
  /**
   * Per-beat cost of putting a seam at the START of that beat (e.g. a vocal
   * note is sounding). Applied to both sides: the outgoing boundary i+1 and
   * the landing beat j.
   */
  boundaryPenalty?: Float32Array;
}

/**
 * Transition cost T[i * n + j] for "after beat i, play beat j instead of i+1".
 * The seam is good if the music leading up to beat i resembles what normally
 * leads up to beat j, AND what follows j resembles what would follow i.
 * We compare aligned pairs (i+1+d, j+d) for d in [-K, K-1] with weights that
 * decay away from the seam. Invalid transitions are +Infinity.
 */
export function transitionMatrix(D: Float32Array, n: number, opts: TransitionOptions = DEFAULT_TRANSITION_OPTIONS, extras: TransitionExtras = {}): Float32Array {
  const ph = extras.phrase, phW = extras.phraseWeight ?? 0.25, bp = extras.boundaryPenalty;
  const K = opts.context;
  const T = new Float32Array(n * n).fill(Infinity);
  const weights: number[] = [];
  let wTotal = 0;
  for (let d = -K; d < K; d++) {
    const w = Math.exp(-Math.abs(d + 0.5) / K);
    weights.push(w);
    wTotal += w;
  }
  for (let i = 0; i < n - 1; i++) {
    const nat = i + 1;
    for (let j = 1; j < n; j++) {
      if (Math.abs(j - nat) < opts.minJump) continue;
      let acc = 0, wSum = 0;
      for (let d = -K; d < K; d++) {
        const a = nat + d, b = j + d;
        if (a < 0 || b < 0 || a >= n || b >= n) continue;
        const w = weights[d + K];
        acc += w * D[a * n + b];
        wSum += w;
      }
      // Need the immediate neighbourhood of the seam on both sides.
      if (wSum < 0.6 * wTotal) continue;
      let cost = acc / wSum;
      if ((nat - j) % opts.beatsPerBar !== 0) cost += opts.barPenalty;
      if (ph) cost += phW * Math.abs(ph[nat] - ph[j]);
      if (bp) cost += 0.5 * (bp[nat] + bp[j]);
      T[i * n + j] = cost;
    }
  }
  return T;
}

export interface Edge {
  /** Source beat: the jump happens at the END of this beat. */
  from: number;
  /** Target beat: playback continues at the START of this beat. */
  to: number;
  /** Lower is better; ~0 means near-identical context. */
  cost: number;
}

/** Best `maxPerBeat` outgoing jumps per beat with cost <= threshold. */
export function candidateEdges(T: Float32Array, n: number, threshold: number, maxPerBeat = 6): Edge[][] {
  const out: Edge[][] = [];
  for (let i = 0; i < n; i++) {
    const list: Edge[] = [];
    if (i < n - 1) {
      for (let j = 0; j < n; j++) {
        const c = T[i * n + j];
        if (c <= threshold) list.push({ from: i, to: j, cost: c });
      }
      list.sort((a, b) => a.cost - b.cost);
      // Suppress near-duplicate targets (adjacent beats of the same seam).
      const kept: Edge[] = [];
      for (const e of list) {
        if (kept.some((k) => Math.abs(k.to - e.to) < 2)) continue;
        kept.push(e);
        if (kept.length >= maxPerBeat) break;
      }
      out.push(kept);
    } else out.push([]);
  }
  return out;
}

/** Quantiles of the finite entries in T (sampled). */
export function costQuantile(T: Float32Array, qs: number[]): number[] {
  const step = Math.max(1, Math.floor(T.length / 100000));
  const vals: number[] = [];
  for (let k = 0; k < T.length; k += step) if (Number.isFinite(T[k])) vals.push(T[k]);
  if (!vals.length) return qs.map(() => Infinity);
  const sorted = Float32Array.from(vals).sort();
  return qs.map((q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]);
}

/** Map a transition cost to a 0..100 "seam quality" score for display. */
export function costToQuality(cost: number): number {
  return Math.round(100 * Math.max(0, Math.min(1, 1 - cost / 0.8)));
}
