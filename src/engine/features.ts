/**
 * Beat-synchronous features. Each beat is described by:
 *  - chroma (12, L2-normalised): harmony
 *  - MFCC 1..12 for the first and second half of the beat (24): timbre + rhythm shape
 *  - loudness in dB for each half (2)
 */
export interface BeatFeatures {
  count: number;
  chroma: Float32Array; // count * 12
  timbre: Float32Array; // count * TIMBRE_DIMS (z-scored)
  loudness: Float32Array; // count * 2 (dB)
  /** Per-beat novelty used for downbeat detection. */
  novelty: Float32Array;
}

export const TIMBRE_DIMS = 24;

function meanRows(src: Float32Array, cols: number, a: number, b: number, out: Float32Array, outOff: number, dims = cols, srcOff = 0) {
  const n = Math.max(1, b - a);
  for (let d = 0; d < dims; d++) out[outOff + d] = 0;
  for (let f = a; f < Math.max(b, a + 1); f++) {
    for (let d = 0; d < dims; d++) out[outOff + d] += src[f * cols + srcOff + d];
  }
  for (let d = 0; d < dims; d++) out[outOff + d] /= n;
}

export function beatFeatures(
  beatFrames: number[],
  frames: number,
  chromaFrames: Float32Array,
  mfccFrames: Float32Array, // frames * 13
  loudFrames: Float32Array,
  onset: Float32Array,
): BeatFeatures {
  const count = beatFrames.length;
  const chroma = new Float32Array(count * 12);
  const timbre = new Float32Array(count * TIMBRE_DIMS);
  const loudness = new Float32Array(count * 2);
  const novelty = new Float32Array(count);
  const tmp = new Float32Array(13);
  for (let i = 0; i < count; i++) {
    const a = Math.min(frames - 1, Math.round(beatFrames[i]));
    const nextB = i + 1 < count ? beatFrames[i + 1] : beatFrames[i] + (beatFrames[i] - (beatFrames[i - 1] ?? beatFrames[i] - 20));
    const b = Math.min(frames, Math.max(a + 2, Math.round(nextB)));
    const m = Math.floor((a + b) / 2);
    meanRows(chromaFrames, 12, a, b, chroma, i * 12);
    let norm = 0;
    for (let k = 0; k < 12; k++) norm += chroma[i * 12 + k] ** 2;
    norm = Math.sqrt(norm) || 1;
    for (let k = 0; k < 12; k++) chroma[i * 12 + k] /= norm;
    meanRows(mfccFrames, 13, a, m, tmp, 0);
    for (let k = 0; k < 12; k++) timbre[i * TIMBRE_DIMS + k] = tmp[k + 1];
    meanRows(mfccFrames, 13, m, b, tmp, 0);
    for (let k = 0; k < 12; k++) timbre[i * TIMBRE_DIMS + 12 + k] = tmp[k + 1];
    let la = 0, lb = 0;
    for (let f = a; f < m; f++) la += loudFrames[f];
    for (let f = m; f < b; f++) lb += loudFrames[f];
    loudness[i * 2] = la / Math.max(1, m - a);
    loudness[i * 2 + 1] = lb / Math.max(1, b - m);
    let on = 0;
    for (let f = Math.max(0, a - 1); f <= Math.min(frames - 1, a + 1); f++) on = Math.max(on, onset[f]);
    novelty[i] = on;
  }
  // Harmonic change is the strongest downbeat cue (chords change on bar
  // lines); onsets alone favour snares. z-score both so they weigh equally.
  const change = new Float32Array(count);
  for (let i = 1; i < count; i++) {
    let dot = 0;
    for (let k = 0; k < 12; k++) dot += chroma[i * 12 + k] * chroma[(i - 1) * 12 + k];
    change[i] = 1 - dot;
  }
  zscore(novelty);
  zscore(change);
  for (let i = 0; i < count; i++) novelty[i] = 0.5 * novelty[i] + change[i];
  // z-score timbre dims across the song so each dimension weighs equally.
  for (let d = 0; d < TIMBRE_DIMS; d++) {
    let mean = 0;
    for (let i = 0; i < count; i++) mean += timbre[i * TIMBRE_DIMS + d];
    mean /= count || 1;
    let v = 0;
    for (let i = 0; i < count; i++) v += (timbre[i * TIMBRE_DIMS + d] - mean) ** 2;
    const sd = Math.sqrt(v / (count || 1)) || 1;
    for (let i = 0; i < count; i++) timbre[i * TIMBRE_DIMS + d] = (timbre[i * TIMBRE_DIMS + d] - mean) / sd;
  }
  return { count, chroma, timbre, loudness, novelty };
}

function zscore(x: Float32Array) {
  let m = 0;
  for (const v of x) m += v;
  m /= x.length || 1;
  let v2 = 0;
  for (const v of x) v2 += (v - m) ** 2;
  const sd = Math.sqrt(v2 / (x.length || 1)) || 1;
  for (let i = 0; i < x.length; i++) x[i] = (x[i] - m) / sd;
}

export interface Meter {
  beatsPerBar: number;
  /** Index of the first downbeat (0..beatsPerBar-1). */
  phase: number;
  confidence: number;
}

/** Choose meter (3 or 4) and downbeat phase from per-beat novelty. */
export function estimateMeter(novelty: Float32Array): Meter {
  const n = novelty.length;
  let best: Meter = { beatsPerBar: 4, phase: 0, confidence: 0 };
  let bestScore = -Infinity;
  for (const m of [4, 3]) {
    for (let p = 0; p < m; p++) {
      let on = 0, onN = 0, off = 0, offN = 0;
      for (let i = 0; i < n; i++) {
        if ((i - p) % m === 0) { on += novelty[i]; onN++; } else { off += novelty[i]; offN++; }
      }
      const contrast = on / Math.max(1, onN) - off / Math.max(1, offN);
      // 4/4 is overwhelmingly common: require 3/4 to win clearly.
      const score = m === 3 ? contrast * 0.8 : contrast;
      if (score > bestScore) { bestScore = score; best = { beatsPerBar: m, phase: p, confidence: contrast }; }
    }
  }
  return best;
}
