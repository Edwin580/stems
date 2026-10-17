/**
 * Iterative complex FFT: bit-reversal permutation, a fused radix-4 first
 * pass (stages 1+2, no multiplies), then radix-2 butterflies with twiddles
 * laid out contiguously per stage for cache-friendly access. One instance
 * per transform size; reuse it across frames.
 *
 * A WebAssembly SIMD implementation (see wasm-fft.ts) is used for STFTs when
 * available; this class is the portable reference and fallback.
 */
export class FFT {
  readonly size: number;
  /** Twiddles for stage with half-size h live at [h-1 .. 2h-2] (h = 4, 8, ...), cos and sin interleaved. */
  private readonly tw: Float64Array;
  private readonly rev: Uint32Array;

  constructor(size: number) {
    if (size < 4 || (size & (size - 1)) !== 0) throw new Error(`FFT size must be a power of two >= 4, got ${size}`);
    this.size = size;
    this.tw = new Float64Array(2 * size);
    for (let h = 4; h < size; h <<= 1) {
      for (let k = 0; k < h; k++) {
        const a = (-Math.PI * k) / h;
        this.tw[2 * (h + k)] = Math.cos(a);
        this.tw[2 * (h + k) + 1] = Math.sin(a);
      }
    }
    this.rev = new Uint32Array(size);
    const bits = Math.log2(size);
    for (let i = 0; i < size; i++) {
      let r = 0;
      for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b);
      this.rev[i] = r;
    }
  }

  /** In-place forward transform of (re, im). */
  transform(re: Float64Array, im: Float64Array): void {
    const n = this.size;
    const rev = this.rev;
    for (let i = 0; i < n; i++) {
      const j = rev[i];
      if (j > i) {
        let t = re[i]; re[i] = re[j]; re[j] = t;
        t = im[i]; im[i] = im[j]; im[j] = t;
      }
    }
    // Stages 1 and 2 fused (radix-4 with trivial twiddles 1, -i).
    for (let i = 0; i < n; i += 4) {
      const ar = re[i], ai = im[i], br = re[i + 1], bi = im[i + 1];
      const cr = re[i + 2], ci = im[i + 2], dr = re[i + 3], di = im[i + 3];
      const s0r = ar + br, s0i = ai + bi, s1r = ar - br, s1i = ai - bi;
      const s2r = cr + dr, s2i = ci + di, s3r = cr - dr, s3i = ci - di;
      re[i] = s0r + s2r; im[i] = s0i + s2i;
      re[i + 2] = s0r - s2r; im[i + 2] = s0i - s2i;
      // s3 * (-i) = (s3i, -s3r)
      re[i + 1] = s1r + s3i; im[i + 1] = s1i - s3r;
      re[i + 3] = s1r - s3i; im[i + 3] = s1i + s3r;
    }
    const tw = this.tw;
    for (let half = 4; half < n; half <<= 1) {
      const len = half << 1;
      const base = 2 * half;
      for (let i = 0; i < n; i += len) {
        for (let k = 0; k < half; k++) {
          const wr = tw[base + 2 * k];
          const wi = tw[base + 2 * k + 1];
          const a = i + k;
          const b = a + half;
          const xr = re[b] * wr - im[b] * wi;
          const xi = re[b] * wi + im[b] * wr;
          re[b] = re[a] - xr;
          im[b] = im[a] - xi;
          re[a] += xr;
          im[a] += xi;
        }
      }
    }
  }
}
