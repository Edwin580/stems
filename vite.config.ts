import { defineConfig } from 'vite';

// Cross-origin isolation → SharedArrayBuffer + threaded WASM (see public/_headers for production hosts).
const isolation = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

export default defineConfig({
  base: './',
  worker: { format: 'es' },
  server: { headers: isolation },
  preview: { headers: isolation },
  optimizeDeps: { exclude: ['onnxruntime-web'] },
  test: { environment: 'node', testTimeout: 60000 },
} as any);
