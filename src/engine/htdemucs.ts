import { resample } from './dsp';
import { createFFT, type FFTLike } from './wasm-fft';
import type { Stems } from './separate';

/**
 * HTDemucs (Hybrid Transformer Demucs, Rouard et al. 2023) source separation
 * through an ONNX export whose graph takes the waveform and the
 * complex-as-channels spectrogram as two inputs and returns the spectral and
 * temporal branch outputs. The STFT/ISTFT around the network is reproduced
 * here exactly as in demucs/htdemucs.py (`_spec`, `_magnitude`, `_mask`,
 * `_ispec`) and demucs/spec.py (torch.stft with normalized=True).
 *
 * The runner is injected, so the same code runs on onnxruntime-web in the
 * browser (WebGPU or WASM) and onnxruntime-node in verification scripts.
 */

export const DEMUCS_SR = 44100;
export const SEGMENT = 343980; // training segment: 7.8 s at 44.1 kHz
const NFFT = 4096;
const HOP = 1024;
const FRAMES = Math.ceil(SEGMENT / HOP); // 336
const FBINS = NFFT / 2; // 2048 (Nyquist dropped)
const SOURCES = ['drums', 'bass', 'other', 'vocals'] as const;

export interface DemucsRunner {
  /** input: [1, 2, SEGMENT] waveform; spec: [1, 4, 2048, 336] cac spectrogram. */
  run(input: Float32Array, spec: Float32Array): Promise<{ spec: Float32Array; wave: Float32Array }>;
}

let fft: FFTLike | null = null;
let hann: Float64Array | null = null;
function tools() {
  fft ??= createFFT(NFFT);
  if (!hann) {
    hann = new Float64Array(NFFT);
    for (let i = 0; i < NFFT; i++) hann[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / NFFT); // periodic
  }
  return { fft, hann };
}

/** numpy/torch 'reflect' padding (edge sample not repeated). */
function reflectPad(x: Float32Array, left: number, right: number): Float32Array {
  const n = x.length;
  const out = new Float32Array(n + left + right);
  for (let i = 0; i < out.length; i++) {
    let k = i - left;
    while (k < 0 || k >= n) k = k < 0 ? -k : 2 * (n - 1) - k;
    out[i] = x[k];
  }
  return out;
}

/** `_spec` + `_magnitude` for one segment: returns [4, 2048, 336] (L.re, L.im, R.re, R.im). */
export function demucsSpec(chs: Float32Array[]): Float32Array {
  const { fft, hann } = tools();
  const out = new Float32Array(4 * FBINS * FRAMES);
  const pad = (HOP / 2) * 3;
  const re = new Float64Array(NFFT), im = new Float64Array(NFFT);
  const norm = 1 / Math.sqrt(NFFT);
  chs.forEach((x, c) => {
    const p1 = reflectPad(x, pad, pad + FRAMES * HOP - x.length);
    const p2 = reflectPad(p1, NFFT / 2, NFFT / 2); // torch.stft center=True
    for (let f = 0; f < FRAMES; f++) {
      const start = (f + 2) * HOP; // keep frames 2 .. 2+le
      for (let i = 0; i < NFFT; i++) { re[i] = p2[start + i] * hann[i]; im[i] = 0; }
      fft.transform(re, im);
      for (let k = 0; k < FBINS; k++) {
        out[((c * 2) * FBINS + k) * FRAMES + f] = re[k] * norm;
        out[((c * 2 + 1) * FBINS + k) * FRAMES + f] = im[k] * norm;
      }
    }
  });
  return out;
}

/** `_mask` + `_ispec` for one source/channel: cac spectrum [2, 2048, 336] at `off` → waveform of SEGMENT samples. */
export function demucsIspec(spec: Float32Array, off: number): Float32Array {
  const { fft, hann } = tools();
  const T = FRAMES + 4; // zero frames padded 2 each side
  const total = NFFT + HOP * (T - 1);
  const y = new Float64Array(total);
  const env = new Float64Array(total);
  const re = new Float64Array(NFFT), im = new Float64Array(NFFT);
  const scale = Math.sqrt(NFFT); // undo normalized=True
  for (let t = 0; t < T; t++) {
    const f = t - 2;
    re.fill(0); im.fill(0);
    if (f >= 0 && f < FRAMES) {
      for (let k = 0; k < FBINS; k++) {
        const r = spec[off + k * FRAMES + f];
        const i = spec[off + (FBINS + k) * FRAMES + f];
        re[k] = r; im[k] = i;
        if (k > 0) { re[NFFT - k] = r; im[NFFT - k] = -i; }
      }
    }
    // Inverse FFT via conjugation; the result is real.
    for (let i = 0; i < NFFT; i++) im[i] = -im[i];
    fft.transform(re, im);
    const s = t * HOP;
    for (let i = 0; i < NFFT; i++) {
      y[s + i] += (re[i] / NFFT) * scale * hann[i];
      env[s + i] += hann[i] * hann[i];
    }
  }
  const pad = (HOP / 2) * 3;
  const out = new Float32Array(SEGMENT);
  const base = NFFT / 2 + pad; // center trim, then `_ispec` crop
  for (let i = 0; i < SEGMENT; i++) {
    const k = base + i;
    out[i] = env[k] > 1e-11 ? y[k] / env[k] : 0;
  }
  return out;
}

/** Run the network on one SEGMENT-long stereo chunk; returns sources[4][2]. */
async function runSegment(runner: DemucsRunner, chunk: Float32Array[]): Promise<Float32Array[][]> {
  const input = new Float32Array(2 * SEGMENT);
  input.set(chunk[0], 0);
  input.set(chunk[1], SEGMENT);
  const { spec, wave } = await runner.run(input, demucsSpec(chunk));
  const per = 4 * FBINS * FRAMES; // per source: 4 cac channels
  return SOURCES.map((_, s) => [0, 1].map((c) => {
    const x = demucsIspec(spec, s * per + c * 2 * FBINS * FRAMES);
    const w = wave.subarray((s * 2 + c) * SEGMENT, (s * 2 + c + 1) * SEGMENT);
    for (let i = 0; i < SEGMENT; i++) x[i] += w[i];
    return x;
  }));
}

/**
 * Full-track separation, following demucs.apply_model: global
 * normalisation, 25% overlapping segments blended with triangular weights.
 */
export async function separateHtdemucs(
  channels: Float32Array[],
  sampleRate: number,
  runner: DemucsRunner,
  onProgress: (f: number) => void = () => {},
): Promise<Stems> {
  const stereo = [channels[0], channels[1] ?? channels[0]].map((c) => resample(c, sampleRate, DEMUCS_SR));
  const len = stereo[0].length;
  // Normalise by the mono reference (demucs/separate.py).
  let mean = 0;
  for (let i = 0; i < len; i++) mean += (stereo[0][i] + stereo[1][i]) / 2;
  mean /= len;
  let v = 0;
  for (let i = 0; i < len; i++) v += ((stereo[0][i] + stereo[1][i]) / 2 - mean) ** 2;
  const std = Math.sqrt(v / len) || 1;
  const norm = stereo.map((c) => c.map((x) => (x - mean) / std));

  const stride = Math.round(SEGMENT * 0.75);
  const weight = new Float32Array(SEGMENT);
  const halfSeg = Math.floor(SEGMENT / 2);
  for (let i = 0; i < SEGMENT; i++) weight[i] = i < halfSeg ? i + 1 : SEGMENT - i;
  const acc = SOURCES.map(() => [new Float32Array(len), new Float32Array(len)]);
  const wsum = new Float32Array(len);
  const offsets: number[] = [];
  for (let o = 0; o < len; o += stride) { offsets.push(o); if (o + SEGMENT >= len) break; }
  for (let n = 0; n < offsets.length; n++) {
    const o = offsets[n];
    const chunk = norm.map((c) => { const x = new Float32Array(SEGMENT); x.set(c.subarray(o, Math.min(len, o + SEGMENT))); return x; });
    const out = await runSegment(runner, chunk);
    const valid = Math.min(SEGMENT, len - o);
    for (let i = 0; i < valid; i++) wsum[o + i] += weight[i];
    out.forEach((src, s) => src.forEach((x, c) => { const a = acc[s][c]; for (let i = 0; i < valid; i++) a[o + i] += weight[i] * x[i]; }));
    onProgress((n + 1) / offsets.length);
  }
  const back = acc.map((src) => src.map((a) => {
    for (let i = 0; i < len; i++) a[i] = (a[i] / (wsum[i] || 1)) * std + mean / 4;
    return resample(a, DEMUCS_SR, sampleRate);
  }));
  // Reorder to our stem order and trim/pad to the source length.
  const target = channels[0].length;
  const fit = (x: Float32Array) => { if (x.length === target) return x; const y = new Float32Array(target); y.set(x.subarray(0, target)); return y; };
  const pick = (name: string) => back[SOURCES.indexOf(name as (typeof SOURCES)[number])].map(fit);
  return { names: ['drums', 'bass', 'vocals', 'other'], channels: [pick('drums'), pick('bass'), pick('vocals'), pick('other')], method: 'htdemucs', hasVocals: true };
}
