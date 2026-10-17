import { defineConfig } from 'vite';

// Cross-origin isolation (SharedArrayBuffer + threaded WASM). In production the
// service worker applies it unless the user turns shared memory off; locally it is
// on unless STEMS_ISOLATE=0.
const isolation = process.env.STEMS_ISOLATE !== '0'
  ? { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' }
  : {};

export default defineConfig({
  base: './',
  worker: { format: 'es' },
  server: { headers: isolation },
  preview: { headers: isolation },
  optimizeDeps: { exclude: ['onnxruntime-web'] },
  test: { environment: 'node', testTimeout: 60000 },
} as any);
