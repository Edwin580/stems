import { defineConfig } from 'vite';

// Cross-origin isolation (SharedArrayBuffer + threaded WASM) is opt-in because it
// blocks third-party embeds (YouTube, Spotify). In production the service worker
// applies it when the user enables multi-threaded mode; locally, STEMS_ISOLATE=1.
const isolation = process.env.STEMS_ISOLATE === '1'
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
