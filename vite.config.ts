import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  worker: { format: 'es' },
  test: { environment: 'node', testTimeout: 60000 },
} as any);
