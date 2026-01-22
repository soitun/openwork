import { defineConfig } from 'vitest/config';

export default defineConfig({
  css: {
    postcss: {},  // Empty config to prevent inheriting parent's postcss.config.js
  },
  test: {
    globals: true,
    root: __dirname,
    include: ['src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    environment: 'node',
    testTimeout: 10000,
  },
});
