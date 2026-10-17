/**
 * Musical structure from the beat self-similarity matrix: bar-line and
 * phrase-boundary novelty, multi-cue meter/downbeat estimation, and a
 * per-beat "phrase start" score the planner uses to prefer phrase-level jumps.
 */

export function zscore(x: Float32Array): Float32Array {
  let m = 0;
  for (const v of x) m += v;
  m /= x.length || 1;
  let v2 = 0;
  for (const v of x) v2 += (v - m) ** 2;
  const sd = Math.sqrt(v2 / (x.length || 1)) || 1;
  const out = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = (x[i] - m) / sd;
  return out;
}

/**
 * Foote novelty: correlate a Gaussian-tapered checkerboard kernel along the
 * diagonal of the distance matrix. High where the past `half` beats are
 * similar to each other, the next `half` beats are similar to each other,
 * and the two blocks differ, i.e. at a section boundary just before beat i.
 */
export function footeNovelty(D: Float32Array, n: number, half: number): Float32Array {
  const out = new Float32Array(n);
  const sigma = half / 2;
  const w: number[] = [];
  for (let k = 0; k < half; k++) w.push(Math.exp(-0.5 * ((k + 0.5) / sigma) ** 2));
  for (let i = 0; i < n; i++) {
    let cross = 0, within = 0, wc = 0, ww = 0;
    for (let a = 0; a < half; a++) {
      const p = i - 1 - a;
      if (p < 0) break;
      for (let b = 0; b < half; b++) {
        const q = i + b;
        if (q >= n) break;
        const g = w[a] * w[b];
        cross += g * D[p * n + q];
        wc += g;
        // Within-block similarity on each side (same offsets mirrored).
        const p2 = i - 1 - b;
        const q2 = i + a;
        if (p2 >= 0 && q2 < n) {
          within += g * 0.5 * (D[p * n + p2] + D[q2 * n + q]);
          ww += g;
        }
      }
    }
    out[i] = wc > 0 && ww > 0 ? cross / wc - within / ww : 0;
  }
  return out;
}

export interface Meter {
  beatsPerBar: number;
  /** Index of the first downbeat (0..beatsPerBar-1). */
  phase: number;
  /** Contrast of downbeat cues vs other beats (z units). */
  confidence: number;
}

/**
 * Meter (3 or 4) and downbeat phase from several per-beat cues, each
 * z-scored and weighted: onset strength, harmonic change, bass-note change,
 * and bar-scale structural novelty. No single cue is reliable on its own
 * (snares beat kicks on onset strength; static harmony has no chord changes)
 * but they rarely all fail together.
 */
export function estimateMeter(cues: { values: Float32Array; weight: number }[]): Meter {
  const n = cues[0]?.values.length ?? 0;
  const combined = new Float32Array(n);
  for (const c of cues) {
    const z = zscore(c.values);
    for (let i = 0; i < n; i++) combined[i] += c.weight * z[i];
  }
  let best: Meter = { beatsPerBar: 4, phase: 0, confidence: 0 };
  let bestScore = -Infinity;
  for (const m of [4, 3]) {
    for (let p = 0; p < m; p++) {
      let on = 0, onN = 0, off = 0, offN = 0;
      for (let i = 0; i < n; i++) {
        if ((i - p) % m === 0) { on += combined[i]; onN++; } else { off += combined[i]; offN++; }
      }
      const contrast = on / Math.max(1, onN) - off / Math.max(1, offN);
      // 4/4 is overwhelmingly common: require 3/4 to win clearly.
      const score = m === 3 ? contrast * 0.8 : contrast;
      if (score > bestScore) { bestScore = score; best = { beatsPerBar: m, phase: p, confidence: contrast }; }
    }
  }
  return best;
}

/**
 * Per-beat phrase-start score in [0, 1]: large-scale (4-bar kernel) novelty,
 * kept only on downbeats and squashed through a logistic. Section and
 * phrase starts score near 1, ordinary bar lines near 0.
 */
export function phraseScores(D: Float32Array, n: number, meter: Meter): Float32Array {
  const m = meter.beatsPerBar;
  const nov = zscore(footeNovelty(D, n, 4 * m));
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    if ((((i - meter.phase) % m) + m) % m !== 0) continue;
    // Local max over ±1 bar so a boundary detected a beat off still counts.
    let v = -Infinity;
    for (let d = -1; d <= 1; d++) {
      const k = i + d;
      if (k >= 0 && k < n) v = Math.max(v, nov[k]);
    }
    out[i] = 1 / (1 + Math.exp(-2 * (v - 1)));
  }
  return out;
}
