/**
 * onnxruntime-web backend-init failures are sticky. The WebGPU and WASM
 * execution providers share one backend object, and once `initWasm()` fails
 * inside a worker, that worker is poisoned: every later session attempt in
 * the same worker reports "previous call to 'initWasm()' failed" instead of
 * the original error. That is exactly what happens when the WebGPU session
 * attempt fails first on a machine with a real GPU adapter and the code
 * then falls back to WASM in the same worker — the fallback can never work.
 *
 * The only recovery is a brand-new worker whose first (and only) session
 * attempt is WASM, so initWasm gets a clean first call. `Player.separate`
 * uses this matcher to decide when that retry is worthwhile.
 */
export function isBackendInitError(message: string): boolean {
  return /initWasm|initializeWebAssembly|no available backend/i.test(message);
}
