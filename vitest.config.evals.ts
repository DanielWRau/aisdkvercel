import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    include: ['src/evals/**/*.eval.ts'],
    testTimeout: 120_000,
    env: loadEnv('test', process.cwd(), ''),
  },
});
