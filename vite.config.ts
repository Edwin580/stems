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
  // YouTube->MP3 converter (server/youtube-mp3-server.mjs, `npm run yt-server`).
  // The client calls the same-origin /api/youtube-mp3; in dev that proxies to
  // the local converter on :8787. In production, route that path to a deployed
  // converter or set VITE_YT_MP3_API_URL.
  server: { headers: isolation, proxy: { '/api': 'http://127.0.0.1:8787' } },
  preview: { headers: isolation, proxy: { '/api': 'http://127.0.0.1:8787' } },
  optimizeDeps: { exclude: ['onnxruntime-web'] },
  test: { environment: 'node', testTimeout: 60000 },
} as any);
