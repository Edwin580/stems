import { describe, expect, it } from 'vitest';
import { isBackendInitError } from '../src/audio/ort-fallback';

describe('isBackendInitError', () => {
  it('matches the poisoned-WASM error reported from a failed WebGPU attempt', () => {
    expect(isBackendInitError("no available backend found. ERR: [wasm] Error: previous call to 'initWasm()' failed.")).toBe(true);
  });

  it('matches the underlying initWasm failures', () => {
    expect(isBackendInitError("Error: previous call to 'initWasm()' failed.")).toBe(true);
    expect(isBackendInitError("previous call to 'initializeWebAssembly()' failed.")).toBe(true);
    expect(isBackendInitError('multiple calls to \'initWasm()\' detected.')).toBe(true);
    expect(isBackendInitError('no available backend found. ERR: [webgpu] something else')).toBe(true);
  });

  it('does not match unrelated separation failures', () => {
    expect(isBackendInitError('Model download failed (404)')).toBe(false);
    expect(isBackendInitError('No model URL configured')).toBe(false);
    expect(isBackendInitError('Separation worker failed')).toBe(false);
    expect(isBackendInitError('WebGPU init timed out')).toBe(false);
  });
});
