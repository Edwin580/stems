import { FFT } from './fft';

/** Average all channels into one mono signal. */
export function mixdown(channels: Float32Array[]): Float32Array {
  const n = channels[0].length;
  if (channels.length === 1) return channels[0].slice();
  const out = new Float32Array(n);
  const g = 1 / channels.length;
  for (const ch of channels) for (let i = 0; i < n; i++) out[i] += ch[i] * g;
  return out;
}

/**
 * Integer-factor decimation with a windowed-sinc low-pass. Used to bring
 * 44.1/48 kHz audio down to ~22 kHz for analysis (playback stays full-rate).
 */
export function decimate(x: Float32Array, factor: number): Float32Array {
  if (factor <= 1) return x;
  const taps = 8 * factor + 1;
  const h = new Float32Array(taps);
  const mid = (taps - 1) / 2;
  const fc = 0.45 / factor;
  let sum = 0;
  for (let i = 0; i < taps; i++) {
    const t = i - mid;
    const sinc = t === 0 ? 2 * fc : Math.sin(2 * Math.PI * fc * t) / (Math.PI * t);
    const w = 0.42 - 0.5 * Math.cos((2 * Math.PI * i) / (taps - 1)) + 0.08 * Math.cos((4 * Math.PI * i) / (taps - 1));
    h[i] = sinc * w;
    sum += h[i];
  }
  for (let i = 0; i < taps; i++) h[i] /= sum;
  const outLen = Math.floor(x.length / factor);
  const out = new Float32Array(outLen);
  for (let o = 0; o < outLen; o++) {
    const start = o * factor - mid;
    let acc = 0;
    if (start >= 0 && start + taps <= x.length) {
      for (let k = 0; k < taps; k++) acc += x[start + k] * h[k];
    } else {
      for (let k = 0; k < taps; k++) {
        const idx = start + k;
        if (idx >= 0 && idx < x.length) acc += x[idx] * h[k];
      }
    }
    out[o] = acc;
  }
  return out;
}

export interface Spectrogram {
  /** Magnitudes, frame-major: mag[frame * bins + bin]. */
  mag: Float32Array;
  frames: number;
  bins: number;
  hop: number;
  fftSize: number;
  sampleRate: number;
}

/**
 * Magnitude STFT. The signal is centre-padded so frame f is centred on
 * sample f * hop, which keeps beat times unbiased.
 */
export function stft(x: Float32Array, sampleRate: number, fftSize = 2048, hop = 512): Spectrogram {
  const fft = new FFT(fftSize);
  const bins = fftSize / 2 + 1;
  const frames = Math.max(1, Math.floor(x.length / hop) + 1);
  const mag = new Float32Array(frames * bins);
  const win = new Float64Array(fftSize);
  for (let i = 0; i < fftSize; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / fftSize);
  const re = new Float64Array(fftSize);
  const im = new Float64Array(fftSize);
  const half = fftSize / 2;
  const fill = (buf: Float64Array, f: number) => {
    const start = f * hop - half;
    if (f >= frames) { buf.fill(0); return; }
    if (start >= 0 && start + fftSize <= x.length) {
      for (let i = 0; i < fftSize; i++) buf[i] = x[start + i] * win[i];
    } else {
      for (let i = 0; i < fftSize; i++) {
        const idx = start + i;
        buf[i] = idx >= 0 && idx < x.length ? x[idx] * win[i] : 0;
      }
    }
  };
  // Two real frames per complex FFT: z = a + i·b, then
  // A[k] = (Z[k] + conj Z[N-k]) / 2,  B[k] = (Z[k] - conj Z[N-k]) / 2i.
  for (let f = 0; f < frames; f += 2) {
    fill(re, f);
    fill(im, f + 1);
    fft.transform(re, im);
    const baseA = f * bins, baseB = (f + 1) * bins;
    const hasB = f + 1 < frames;
    for (let k = 0; k < bins; k++) {
      const nk = (fftSize - k) % fftSize;
      const zr = re[k], zi = im[k], cr = re[nk], ci = -im[nk];
      const ar = 0.5 * (zr + cr), ai = 0.5 * (zi + ci);
      mag[baseA + k] = Math.sqrt(ar * ar + ai * ai);
      if (hasB) {
        const br = 0.5 * (zi - ci), bi = -0.5 * (zr - cr);
        mag[baseB + k] = Math.sqrt(br * br + bi * bi);
      }
    }
  }
  return { mag, frames, bins, hop, fftSize, sampleRate };
}

const hzToMel = (f: number) => 2595 * Math.log10(1 + f / 700);
const melToHz = (m: number) => 700 * (10 ** (m / 2595) - 1);

/** Triangular mel filterbank, returned as sparse rows for speed. */
export function melFilterbank(nMels: number, fftSize: number, sampleRate: number, fMin = 30, fMax = sampleRate / 2) {
  const bins = fftSize / 2 + 1;
  const mMin = hzToMel(fMin);
  const mMax = hzToMel(fMax);
  const pts: number[] = [];
  for (let i = 0; i < nMels + 2; i++) pts.push(melToHz(mMin + ((mMax - mMin) * i) / (nMels + 1)));
  const binHz = sampleRate / fftSize;
  const rows: { start: number; weights: Float32Array }[] = [];
  for (let m = 0; m < nMels; m++) {
    const lo = pts[m], c = pts[m + 1], hi = pts[m + 2];
    const start = Math.max(0, Math.floor(lo / binHz));
    const end = Math.min(bins - 1, Math.ceil(hi / binHz));
    const w = new Float32Array(end - start + 1);
    for (let b = start; b <= end; b++) {
      const f = b * binHz;
      let v = 0;
      if (f >= lo && f <= c) v = (f - lo) / Math.max(1e-9, c - lo);
      else if (f > c && f <= hi) v = (hi - f) / Math.max(1e-9, hi - c);
      w[b - start] = v;
    }
    // Guarantee every filter touches at least one bin (narrow low filters).
    if (w.every((v) => v === 0)) w[Math.min(w.length - 1, Math.round(c / binHz) - start)] = 1;
    rows.push({ start, weights: w });
  }
  return rows;
}

/** Log-mel spectrogram (natural log of 1 + gain * energy), frame-major. */
export function logMel(spec: Spectrogram, nMels = 40): Float32Array {
  const fb = melFilterbank(nMels, spec.fftSize, spec.sampleRate);
  const out = new Float32Array(spec.frames * nMels);
  for (let f = 0; f < spec.frames; f++) {
    const base = f * spec.bins;
    for (let m = 0; m < nMels; m++) {
      const { start, weights } = fb[m];
      let acc = 0;
      for (let k = 0; k < weights.length; k++) {
        const v = spec.mag[base + start + k];
        acc += weights[k] * v * v;
      }
      out[f * nMels + m] = Math.log(1 + 1000 * acc);
    }
  }
  return out;
}

/** DCT-II of each row (used for MFCCs). */
export function dctRows(x: Float32Array, rows: number, cols: number, nOut: number): Float32Array {
  const basis = new Float32Array(nOut * cols);
  for (let k = 0; k < nOut; k++) {
    const s = k === 0 ? Math.sqrt(1 / cols) : Math.sqrt(2 / cols);
    for (let n = 0; n < cols; n++) basis[k * cols + n] = s * Math.cos((Math.PI * k * (2 * n + 1)) / (2 * cols));
  }
  const out = new Float32Array(rows * nOut);
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < nOut; k++) {
      let acc = 0;
      for (let n = 0; n < cols; n++) acc += basis[k * cols + n] * x[r * cols + n];
      out[r * nOut + k] = acc;
    }
  }
  return out;
}

/**
 * 12-bin chroma per frame from the energy spectrum (55 Hz – 2.5 kHz).
 * Linear energy keeps tonal peaks dominant over broadband drum noise.
 */
export function chroma(spec: Spectrogram, fMin = 55, fMax = 2500): Float32Array {
  const out = new Float32Array(spec.frames * 12);
  const binHz = spec.sampleRate / spec.fftSize;
  const pcs: { bin: number; pc: number; w: number }[] = [];
  for (let b = 1; b < spec.bins; b++) {
    const f = b * binHz;
    if (f < fMin || f > fMax) continue;
    const midi = 12 * Math.log2(f / 440) + 69;
    const nearest = Math.round(midi);
    const dist = Math.abs(midi - nearest); // 0..0.5
    const w = Math.cos(dist * Math.PI) ** 2; // 1 on pitch, 0 between semitones
    pcs.push({ bin: b, pc: ((nearest % 12) + 12) % 12, w });
  }
  for (let f = 0; f < spec.frames; f++) {
    const base = f * spec.bins;
    for (const { bin, pc, w } of pcs) out[f * 12 + pc] += w * spec.mag[base + bin] ** 2;
  }
  return out;
}

/** Root-mean-square energy per frame from the spectrum, in dB. */
export function frameLoudnessDb(spec: Spectrogram): Float32Array {
  const out = new Float32Array(spec.frames);
  for (let f = 0; f < spec.frames; f++) {
    let acc = 0;
    const base = f * spec.bins;
    for (let b = 0; b < spec.bins; b++) acc += spec.mag[base + b] ** 2;
    out[f] = 10 * Math.log10(acc / spec.bins + 1e-10);
  }
  return out;
}
