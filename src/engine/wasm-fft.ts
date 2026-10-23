import { FFT } from './fft';
import { FFT_WASM_BASE64 } from './wasm-fft-bin';

/** Common interface of the JS and WASM transforms. */
export interface FFTLike {
  readonly size: number;
  transform(re: Float64Array, im: Float64Array): void;
}

let module: WebAssembly.Module | null | undefined;

function wasmModule(): WebAssembly.Module | null {
  if (module !== undefined) return module;
  try {
    const bin = typeof atob === 'function'
      ? Uint8Array.from(atob(FFT_WASM_BASE64), (c) => c.charCodeAt(0))
      : new Uint8Array((globalThis as unknown as { Buffer: { from(s: string, e: string): Uint8Array } }).Buffer.from(FFT_WASM_BASE64, 'base64'));
    // Validation fails on engines without SIMD, which sends us to the JS fallback.
    module = WebAssembly.validate(bin) ? new WebAssembly.Module(bin) : null;
  } catch {
    module = null;
  }
  return module;
}

/**
 * f32x4 SIMD FFT (AssemblyScript → WebAssembly). Same in/out contract as
 * FFT; data is copied into linear memory as f32 (ample precision for audio
 * analysis and separation masks: ~1e-6 relative error at n = 4096).
 */
export class WasmFFT implements FFTLike {
  readonly size: number;
  private readonly re: Float32Array;
  private readonly im: Float32Array;
  private readonly run: () => void;

  constructor(size: number, mod: WebAssembly.Module) {
    this.size = size;
    const inst = new WebAssembly.Instance(mod, { env: { abort() { throw new Error('wasm abort'); } } });
    const ex = inst.exports as unknown as { memory: WebAssembly.Memory; init(n: number): number; imOffset(): number; transform(): void };
    const reOff = ex.init(size);
    // Views are created after init(), which may grow (and detach) memory.
    this.re = new Float32Array(ex.memory.buffer, reOff, size);
    this.im = new Float32Array(ex.memory.buffer, ex.imOffset(), size);
    this.run = ex.transform;
  }

  transform(re: Float64Array, im: Float64Array): void {
    const r = this.re, i = this.im, n = this.size;
    for (let k = 0; k < n; k++) { r[k] = re[k]; i[k] = im[k]; }
    this.run();
    for (let k = 0; k < n; k++) { re[k] = r[k]; im[k] = i[k]; }
  }
}

/** Best available FFT for this size: WASM SIMD when supported, else JS. */
export function createFFT(size: number): FFTLike {
  const mod = wasmModule();
  if (mod) {
    try { return new WasmFFT(size, mod); } catch { /* fall through */ }
  }
  return new FFT(size);
}

export function wasmFFTAvailable(): boolean { return wasmModule() !== null; }
