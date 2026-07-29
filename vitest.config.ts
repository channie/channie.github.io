import { defineConfig } from 'vitest/config';

// Unit tests run in a plain Node environment (the tested code is pure logic;
// no DOM is touched at import time). Astro/Vite component compilation is not
// involved here.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.{ts,mjs}'],
  },
});
