import { alignSeam, type AudioSource } from './align';
import { FFT } from './fft';

/**
 * Everything the engine decides about one splice, beyond "from here to there".
 */
export interface Seam {
  /** Refined landing sample. */
  to: number;
  /** Waveform correlation across the seam (drives the crossfade law). */
  rho: number;
  /** Crossfade length in samples. */
  fade: number;
  /**
   * Varispeed over the fade: the incoming side is read at rate
   * (fade + drift) / fade so its beat grid tracks the outgoing grid when the
   * two sections' local tempos differ. Lands exactly on `to`.
   */
  drift: number;
  /** Gain (dB) applied to the incoming audio at the seam, ramped back to 0 dB. */
  gainDb: number;
  /** Mean absolute band-energy difference (dB) between what would have played and what will play. */
  spectralDb: number;
  /** Extra cost from sample-level checks (added to the musical transition cost). */
  penalty: number;
}

export interface SeamOptions {
  /** Requested crossfade (samples). */
  fade: number;
  /** Shorten fades that would split a transient; lengthen them on smooth material. */
  autoFade: boolean;
  /** Compensate level differences at the seam. */
  loudnessMatch: boolean;
  /** Local beat periods (samples) on the outgoing and incoming side, for varispeed. */
  periodOut?: number;
  periodIn?: number;
}

function mono(src: AudioSource, start: number, len: number): Float32Array {
  const out = new Float32Array(len);
  const g = 1 / src.channels.length;
  for (const ch of src.channels) {
    for (let i = 0; i < len; i++) {
      const k = start + i;
      if (k >= 0 && k < src.length) out[i] += ch[k] * g;
    }
  }
  return out;
}

/** Positions (relative to window start) of sharp energy rises (> riseDb within ~4 ms). */
export function transients(x: Float32Array, sampleRate: number, riseDb = 6): number[] {
  const hop = Math.max(1, Math.round(0.002 * sampleRate));
  const win = Math.max(hop, Math.round(0.005 * sampleRate));
  const e: number[] = [];
  for (let s = 0; s + win <= x.length; s += hop) {
    let acc = 0;
    for (let i = 0; i < win; i++) acc += x[s + i] * x[s + i];
    e.push(10 * Math.log10(acc / win + 1e-10));
  }
  const out: number[] = [];
  const back = 2;
  for (let k = back; k < e.length; k++) {
    // Ignore rises out of near-silence too quiet to matter.
    if (e[k] - e[k - back] > riseDb && e[k] > -50) {
      out.push(k * hop);
      k += back;
    }
  }
  return out;
}

const BANDS = 16;
let bandFft: FFT | null = null;

/** Log band energies (dB) of a 2048-sample Hann window, 60 Hz – 12 kHz. */
function bandEnergies(x: Float32Array, sampleRate: number): Float64Array {
  const N = 2048;
  bandFft ??= new FFT(N);
  const re = new Float64Array(N), im = new Float64Array(N);
  for (let i = 0; i < N; i++) re[i] = (x[i] ?? 0) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
  bandFft.transform(re, im);
  const out = new Float64Array(BANDS);
  const fLo = 60, fHi = Math.min(12000, sampleRate / 2 - 1);
  for (let b = 0; b < BANDS; b++) {
    const f0 = fLo * (fHi / fLo) ** (b / BANDS), f1 = fLo * (fHi / fLo) ** ((b + 1) / BANDS);
    const k0 = Math.max(1, Math.floor((f0 * N) / sampleRate)), k1 = Math.max(k0 + 1, Math.ceil((f1 * N) / sampleRate));
    let acc = 0;
    for (let k = k0; k < k1; k++) acc += re[k] * re[k] + im[k] * im[k];
    out[b] = 10 * Math.log10(acc / (k1 - k0) + 1e-9);
  }
  return out;
}

function spectralDistance(a: Float64Array, b: Float64Array): number {
  const floor = Math.max(...a, ...b) - 60;
  let d = 0;
  for (let k = 0; k < BANDS; k++) d += Math.abs(Math.max(a[k], floor) - Math.max(b[k], floor));
  return d / BANDS;
}

function rmsDb(x: Float32Array): number {
  let acc = 0;
  for (const v of x) acc += v * v;
  return 10 * Math.log10(acc / Math.max(1, x.length) + 1e-10);
}

/**
 * Pick the longest fade ≤ maxFade whose window [at - f, at - guard) holds no
 * transient on either side, so no drum hit is ever half-faded.
 */
export function chooseFade(src: AudioSource, at: number, to: number, base: number, auto: boolean): number {
  if (!auto) return base;
  const sr = src.sampleRate;
  const maxFade = Math.min(Math.round(base * 2), Math.round(0.25 * sr));
  const minFade = Math.round(0.005 * sr);
  const guard = Math.round(0.006 * sr);
  const look = maxFade + guard;
  const tOut = transients(mono(src, at - look, look), sr).map((p) => look - p); // distance before `at`
  const tIn = transients(mono(src, to - look, look), sr).map((p) => look - p);
  let fade = maxFade;
  for (const d of [...tOut, ...tIn]) {
    // A transient d samples before the seam point (and not right at it) caps the fade.
    if (d > guard) fade = Math.min(fade, d - guard);
  }
  return Math.max(minFade, fade);
}

export function buildSeam(src: AudioSource, coarse: Float32Array, at: number, to: number, opts: SeamOptions): Seam {
  const sr = src.sampleRate;
  const al = alignSeam(src, coarse, at, to, opts.fade);
  const fade = chooseFade(src, at, al.to, opts.fade, opts.autoFade);
  let drift = 0;
  if (opts.periodIn && opts.periodOut) {
    const r = Math.max(0.98, Math.min(1.02, opts.periodIn / opts.periodOut));
    drift = Math.round(fade * (r - 1));
  }
  const N = 2048;
  const spectralDb = spectralDistance(bandEnergies(mono(src, at, N), sr), bandEnergies(mono(src, al.to, N), sr));
  let gainDb = 0;
  if (opts.loudnessMatch) {
    const L = Math.round(0.4 * sr);
    const delta = rmsDb(mono(src, al.to, L)) - rmsDb(mono(src, at, L));
    if (Math.abs(delta) > 1) gainDb = Math.max(-6, Math.min(6, -delta));
  }
  const penalty = 0.3 * (1 - Math.max(0, al.rho)) + 0.03 * Math.max(0, spectralDb - 3);
  return { to: al.to, rho: al.rho, fade, drift, gainDb, spectralDb, penalty };
}
