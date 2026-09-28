import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 2000 },
  server: { host: true, port: 5173 },
  test: { include: ['tests/**/*.test.ts'], testTimeout: 120000 },
} as never);
