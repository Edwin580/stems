import { describe, expect, it } from 'vitest';
import { FFT } from '../src/engine/fft';
import { createFFT, WasmFFT, wasmFFTAvailable } from '../src/engine/wasm-fft';

describe('WASM SIMD FFT', () => {
  it('is available in this runtime', () => expect(wasmFFTAvailable()).toBe(true));

  it('matches the JS FFT', () => {
    for (const n of [64, 2048, 4096]) {
      const a = createFFT(n), b = new FFT(n);
      expect(a).toBeInstanceOf(WasmFFT);
      const re1 = new Float64Array(n).map((_, i) => Math.sin(i * 0.37) + Math.cos(i * 1.7) * 0.5), im1 = new Float64Array(n);
      const re2 = re1.slice(), im2 = im1.slice();
      a.transform(re1, im1); b.transform(re2, im2);
      let err = 0, mag = 0;
      for (let k = 0; k < n; k++) { err = Math.max(err, Math.abs(re1[k] - re2[k]), Math.abs(im1[k] - im2[k])); mag = Math.max(mag, Math.abs(re2[k])); }
      expect(err / mag).toBeLessThan(2e-5);
    }
  });

  it('is faster than the JS FFT', () => {
    const n = 2048;
    const time = (f: { transform(r: Float64Array, i: Float64Array): void }) => {
      const re = new Float64Array(n).map(Math.random), im = new Float64Array(n);
      for (let k = 0; k < 300; k++) f.transform(re, im);
      const t = performance.now();
      for (let k = 0; k < 3000; k++) f.transform(re, im);
      return performance.now() - t;
    };
    const js = time(new FFT(n)), wasm = time(createFFT(n));
    console.log(`FFT 2048: js ${(js / 3).toFixed(1)} µs, wasm ${(wasm / 3).toFixed(1)} µs, ×${(js / wasm).toFixed(2)}`);
    expect(wasm).toBeLessThan(js);
  });
});
