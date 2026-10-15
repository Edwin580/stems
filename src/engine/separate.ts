import { FFT } from './fft';

export const STEM_NAMES = ['drums', 'bass', 'vocals', 'other'] as const;
export type StemName = (typeof STEM_NAMES)[number];

export interface Stems {
  names: StemName[];
  /** stems[s][channel] at the source sample rate; the stems sum to the mix. */
  channels: Float32Array[][];
  /** How the stems were produced. */
  method: 'dsp' | 'htdemucs';
  /** False when the input is (near) mono and no vocal/centre estimate was possible. */
  hasVocals: boolean;
}

/** Median of 9 values: Paeth/Devillard compare-swap network, branchless (min/max). */
function median9(p: Float32Array): number {
  let p0 = p[0], p1 = p[1], p2 = p[2], p3 = p[3], p4 = p[4], p5 = p[5], p6 = p[6], p7 = p[7], p8 = p[8], t = 0;
  t = p1; p1 = Math.min(t, p2); p2 = Math.max(t, p2);
  t = p4; p4 = Math.min(t, p5); p5 = Math.max(t, p5);
  t = p7; p7 = Math.min(t, p8); p8 = Math.max(t, p8);
  t = p0; p0 = Math.min(t, p1); p1 = Math.max(t, p1);
  t = p3; p3 = Math.min(t, p4); p4 = Math.max(t, p4);
  t = p6; p6 = Math.min(t, p7); p7 = Math.max(t, p7);
  t = p1; p1 = Math.min(t, p2); p2 = Math.max(t, p2);
  t = p4; p4 = Math.min(t, p5); p5 = Math.max(t, p5);
  t = p7; p7 = Math.min(t, p8); p8 = Math.max(t, p8);
  t = p0; p0 = Math.min(t, p3); p3 = Math.max(t, p3);
  t = p5; p5 = Math.min(t, p8); p8 = Math.max(t, p8);
  t = p4; p4 = Math.min(t, p7); p7 = Math.max(t, p7);
  t = p3; p3 = Math.min(t, p6); p6 = Math.max(t, p6);
  t = p1; p1 = Math.min(t, p4); p4 = Math.max(t, p4);
  t = p2; p2 = Math.min(t, p5); p5 = Math.max(t, p5);
  t = p4; p4 = Math.min(t, p7); p7 = Math.max(t, p7);
  t = p4; p4 = Math.min(t, p2); p2 = Math.max(t, p2);
  t = p6; p6 = Math.min(t, p4); p4 = Math.max(t, p4);
  t = p4; p4 = Math.min(t, p2); p2 = Math.max(t, p2);
  void p0; void p1; void p3; void p5; void p7; void p8;
  return p4;
}

/**
 * Built-in DSP source separation, entirely in the browser, roughly 25× faster than real time.
 *
 * Streaming STFT (2048 / hop 1024, sqrt-Hann) with soft masks that sum to one
 * in every bin, so the four stems add back to the original exactly:
 *  - drums:  percussive part of median-filter HPSS (Fitzgerald 2010)
 *  - bass:   harmonic part below ~150–250 Hz
 *  - vocals: harmonic, centre-panned (inter-channel coherence), 150 Hz–8 kHz
 *  - other:  everything else (residual in the time domain)
 *
 * This is an estimate: anything centre-panned and sustained (e.g. a mono
 * lead synth) lands in "vocals". The optional HTDemucs backend is far better.
 */
export function separateDsp(channels: Float32Array[], sampleRate: number, onProgress: (f: number) => void = () => {}): Stems {
  const N = 2048, H = 1024, bins = N / 2 + 1, K = 9, half = 4;
  const L = channels[0], R = channels[1] ?? channels[0];
  const len = L.length;
  const fft = new FFT(N);
  const win = new Float64Array(N);
  for (let i = 0; i < N; i++) win[i] = Math.sqrt(0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));

  // Mono detection: if the channels are (nearly) identical, a centre estimate is meaningless.
  let diff = 0, sum = 0;
  for (let i = 0; i < len; i += 7) { diff += (L[i] - R[i]) ** 2; sum += L[i] ** 2 + R[i] ** 2; }
  const hasVocals = sum > 0 && diff / sum > 1e-4;

  const frames = Math.ceil((len + N) / H);
  // Ring buffers of spectra (L and R, complex) and magnitudes.
  const ring = Array.from({ length: K }, () => ({
    lr: new Float64Array(bins), li: new Float64Array(bins), rr: new Float64Array(bins), ri: new Float64Array(bins),
    mag: new Float32Array(bins),
  }));
  const re = new Float64Array(N), im = new Float64Array(N);
  const outs = [0, 1, 2].map(() => [new Float32Array(len), new Float32Array(len)]); // drums, bass, vocals
  const norm = new Float32Array(len);
  const binHz = sampleRate / N;
  const lowMask = new Float32Array(bins), bandMask = new Float32Array(bins);
  for (let k = 0; k < bins; k++) {
    const f = k * binHz;
    lowMask[k] = f < 150 ? 1 : f > 250 ? 0 : 0.5 + 0.5 * Math.cos((Math.PI * (f - 150)) / 100);
    bandMask[k] = f < 150 || f > 9000 ? 0 : f < 250 ? (f - 150) / 100 : f > 7000 ? (9000 - f) / 2000 : 1;
  }
  const tmp = new Float32Array(9);

  const analyse = (t: number, slot: (typeof ring)[number]) => {
    const start = t * H - N;
    for (let i = 0; i < N; i++) {
      const k = start + i;
      const ok = k >= 0 && k < len;
      re[i] = ok ? L[k] * win[i] : 0;
      im[i] = ok ? R[k] * win[i] : 0;
    }
    fft.transform(re, im);
    // Unpack two real spectra from one complex FFT.
    for (let k = 0; k < bins; k++) {
      const nk = (N - k) % N;
      const zr = re[k], zi = im[k], cr = re[nk], ci = -im[nk];
      slot.lr[k] = 0.5 * (zr + cr); slot.li[k] = 0.5 * (zi + ci);
      slot.rr[k] = 0.5 * (zi - ci); slot.ri[k] = -0.5 * (zr - cr);
      slot.mag[k] = 0.5 * (Math.sqrt(slot.lr[k] * slot.lr[k] + slot.li[k] * slot.li[k]) + Math.sqrt(slot.rr[k] * slot.rr[k] + slot.ri[k] * slot.ri[k]));
    }
  };

  const masks = [new Float32Array(bins), new Float32Array(bins), new Float32Array(bins)];
  for (let t = 0; t < frames + half; t++) {
    if (t < frames) analyse(t, ring[t % K]);
    else { const s = ring[t % K]; s.lr.fill(0); s.li.fill(0); s.rr.fill(0); s.ri.fill(0); s.mag.fill(0); }
    const c = t - half; // frame being synthesised
    if (c < 0) continue;
    const cur = ring[c % K];
    const cm = cur.mag;
    const m0 = ring[(c + 5) % K].mag, m1 = ring[(c + 6) % K].mag, m2 = ring[(c + 7) % K].mag, m3 = ring[(c + 8) % K].mag;
    const m5 = ring[(c + 1) % K].mag, m6 = ring[(c + 2) % K].mag, m7 = ring[(c + 3) % K].mag, m8 = ring[(c + 4) % K].mag;
    const early = c - half < 0;
    for (let k = 0; k < bins; k++) {
      let hT = cm[k];
      if (!early) {
        tmp[0] = m0[k]; tmp[1] = m1[k]; tmp[2] = m2[k]; tmp[3] = m3[k]; tmp[4] = cm[k];
        tmp[5] = m5[k]; tmp[6] = m6[k]; tmp[7] = m7[k]; tmp[8] = m8[k];
        hT = median9(tmp);
      }
      if (k >= half && k < bins - half) {
        for (let d = 0; d < K; d++) tmp[d] = cm[k - half + d];
      } else {
        for (let d = 0; d < K; d++) tmp[d] = cm[Math.min(bins - 1, Math.max(0, k - half + d))];
      }
      const pF = median9(tmp);
      const h2 = hT * hT, p2 = pF * pF;
      const mh = h2 + p2 > 1e-20 ? h2 / (h2 + p2) : 0.5;
      const mp = 1 - mh;
      let centre = 0;
      if (hasVocals) {
        const cr = cur.lr[k] * cur.rr[k] + cur.li[k] * cur.ri[k];
        const ci = cur.li[k] * cur.rr[k] - cur.lr[k] * cur.ri[k];
        const e = cur.lr[k] ** 2 + cur.li[k] ** 2 + cur.rr[k] ** 2 + cur.ri[k] ** 2;
        const coh = e > 1e-20 ? (2 * Math.sqrt(cr * cr + ci * ci)) / e : 0;
        const c2 = coh * coh, c4 = c2 * c2;
        centre = c4 * c4;
      }
      const bass = mh * lowMask[k];
      const voc = mh * (1 - lowMask[k]) * bandMask[k] * centre;
      masks[0][k] = mp; masks[1][k] = bass; masks[2][k] = voc;
    }
    // Inverse: pack L and R of each stem into one complex IFFT.
    const start = c * H - N;
    for (let s = 0; s < 3; s++) {
      const m = masks[s];
      for (let k = 0; k < bins; k++) {
        const ar = cur.lr[k] * m[k], ai = cur.li[k] * m[k], br = cur.rr[k] * m[k], bi = cur.ri[k] * m[k];
        // Z = A + iB
        re[k] = ar - bi; im[k] = ai + br;
        if (k > 0 && k < N / 2) {
          // conj symmetric parts: Z[N-k] = conj(A) + i conj(B)
          re[N - k] = ar + bi; im[N - k] = -ai + br;
        }
      }
      // Inverse via conjugation trick.
      for (let i = 0; i < N; i++) im[i] = -im[i];
      fft.transform(re, im);
      const o = outs[s];
      for (let i = 0; i < N; i++) {
        const k = start + i;
        if (k < 0 || k >= len) continue;
        o[0][k] += (re[i] / N) * win[i];
        o[1][k] += (-im[i] / N) * win[i];
      }
    }
    for (let i = 0; i < N; i++) {
      const k = start + i;
      if (k >= 0 && k < len) norm[k] += win[i] * win[i];
    }
    if (c % 256 === 0) onProgress(c / frames);
  }
  for (const o of outs) for (const ch of o) for (let i = 0; i < len; i++) ch[i] = norm[i] > 1e-6 ? ch[i] / norm[i] : 0;
  const other = [new Float32Array(len), new Float32Array(len)];
  for (let ch = 0; ch < 2; ch++) {
    const src = ch === 0 ? L : R;
    for (let i = 0; i < len; i++) other[ch][i] = src[i] - outs[0][ch][i] - outs[1][ch][i] - outs[2][ch][i];
  }
  onProgress(1);
  return { names: [...STEM_NAMES], channels: [outs[0], outs[1], outs[2], other], method: 'dsp', hasVocals };
}

/**
 * Per-beat seam penalty from the vocal stem: the share of vocal energy in a
 * ±120 ms window around each beat start. Seams where someone is singing are
 * the ones listeners notice first.
 */
export function vocalBoundaryPenalty(vocals: Float32Array[], mix: Float32Array[], beats: number[], sampleRate: number, weight = 0.35): Float32Array {
  const w = Math.round(0.12 * sampleRate);
  const out = new Float32Array(beats.length);
  beats.forEach((b, i) => {
    let ev = 0, em = 0;
    for (let k = Math.max(0, b - w); k < Math.min(mix[0].length, b + w); k++) {
      for (let c = 0; c < mix.length; c++) { ev += vocals[c][k] ** 2; em += mix[c][k] ** 2; }
    }
    const ratioDb = 10 * Math.log10((ev + 1e-12) / (em + 1e-12));
    out[i] = weight * Math.max(0, Math.min(1, (ratioDb + 20) / 14));
  });
  return out;
}
