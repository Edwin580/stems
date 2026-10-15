/**
 * Sample-accurate seam alignment.
 *
 * Beat times from the tracker are only accurate to ~10 ms. At a jump we
 * search a small lag range for the offset at which the incoming audio best
 * matches the outgoing audio around the crossfade (normalised
 * cross-correlation), so bass waveforms and transients line up in phase.
 * The resulting correlation also drives the crossfade law (see splicer).
 */

export interface AudioSource {
  channels: Float32Array[];
  sampleRate: number;
  length: number;
}

/** Box-filtered mono at 1/COARSE rate, used for a fast first search pass. */
export const COARSE = 4;

export function coarseMono(src: AudioSource): Float32Array {
  const n = Math.floor(src.length / COARSE);
  const out = new Float32Array(n);
  const g = 1 / (COARSE * src.channels.length);
  for (const ch of src.channels) {
    for (let i = 0; i < n; i++) {
      let acc = 0;
      const b = i * COARSE;
      for (let k = 0; k < COARSE; k++) acc += ch[b + k];
      out[i] += acc * g;
    }
  }
  return out;
}

function monoWindow(src: AudioSource, start: number, len: number): Float32Array {
  const out = new Float32Array(len);
  const g = 1 / src.channels.length;
  for (const ch of src.channels) {
    for (let i = 0; i < len; i++) {
      const idx = start + i;
      if (idx >= 0 && idx < src.length) out[i] += ch[idx] * g;
    }
  }
  return out;
}

function ncc(a: Float32Array, aOff: number, b: Float32Array, bOff: number, len: number): number {
  let ab = 0, aa = 0, bb = 0;
  for (let i = 0; i < len; i++) {
    const ai = aOff + i, bi = bOff + i;
    const x = ai >= 0 && ai < a.length ? a[ai] : 0;
    const y = bi >= 0 && bi < b.length ? b[bi] : 0;
    ab += x * y; aa += x * x; bb += y * y;
  }
  const den = Math.sqrt(aa * bb);
  return den > 1e-12 ? ab / den : 0;
}

export interface Alignment {
  /** Refined landing sample (playback continues here after the seam). */
  to: number;
  /** Normalised correlation of the two sides of the seam, -1..1. */
  rho: number;
}

/**
 * Refine a jump that leaves the source at sample `at` and lands at `to`.
 * The crossfade occupies [at - fade, at) on the outgoing side.
 */
export function alignSeam(
  src: AudioSource,
  coarse: Float32Array,
  at: number,
  to: number,
  fade: number,
  maxLagSec = 0.025,
): Alignment {
  const sr = src.sampleRate;
  const R = Math.round(maxLagSec * sr);
  // Window: the crossfade plus context on both sides.
  const pre = Math.round(0.03 * sr) + fade;
  const post = Math.round(0.03 * sr);
  const len = pre + post;

  // Coarse pass on the decimated signal.
  const cLen = Math.floor(len / COARSE);
  const cA = Math.floor((at - pre) / COARSE);
  const cR = Math.ceil(R / COARSE);
  let bestLag = 0, best = -Infinity;
  for (let l = -cR; l <= cR; l++) {
    const r = ncc(coarse, cA, coarse, Math.floor((to - pre) / COARSE) + l, cLen);
    if (r > best) { best = r; bestLag = l * COARSE; }
  }
  // Fine pass at full rate around the coarse optimum.
  const a = monoWindow(src, at - pre, len);
  const span = COARSE * 2;
  const bStart = to + bestLag - span - pre;
  const b = monoWindow(src, bStart, len + 2 * span);
  let fineLag = bestLag, fineBest = -Infinity;
  for (let l = -span; l <= span; l++) {
    const r = ncc(a, 0, b, l + span, len);
    if (r > fineBest) { fineBest = r; fineLag = bestLag + l; }
  }
  const landed = Math.max(fade, Math.min(src.length - 1, to + fineLag));
  return { to: landed, rho: fineBest };
}
