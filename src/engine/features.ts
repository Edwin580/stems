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
  /** Downbeat cues: onset strength at the beat, harmonic and bass-note change into the beat. */
  onset: Float32Array;
  harmonicChange: Float32Array;
  bassChange: Float32Array;
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
  onsetFrames: Float32Array,
  bassChromaFrames: Float32Array,
): BeatFeatures {
  const count = beatFrames.length;
  const chroma = new Float32Array(count * 12);
  const timbre = new Float32Array(count * TIMBRE_DIMS);
  const loudness = new Float32Array(count * 2);
  const onset = new Float32Array(count);
  const bass = new Float32Array(count * 12);
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
    for (let f = Math.max(0, a - 1); f <= Math.min(frames - 1, a + 1); f++) on = Math.max(on, onsetFrames[f]);
    onset[i] = on;
    meanRows(bassChromaFrames, 12, a, b, bass, i * 12);
  }
  const cosChange = (v: Float32Array, i: number) => {
    let dot = 0, na = 0, nb = 0;
    for (let k = 0; k < 12; k++) {
      dot += v[i * 12 + k] * v[(i - 1) * 12 + k];
      na += v[i * 12 + k] ** 2;
      nb += v[(i - 1) * 12 + k] ** 2;
    }
    return 1 - dot / (Math.sqrt(na * nb) || 1);
  };
  const harmonicChange = new Float32Array(count);
  const bassChange = new Float32Array(count);
  for (let i = 1; i < count; i++) {
    harmonicChange[i] = cosChange(chroma, i);
    bassChange[i] = cosChange(bass, i);
  }
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
  return { count, chroma, timbre, loudness, onset, harmonicChange, bassChange };
}

