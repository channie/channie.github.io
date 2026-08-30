import { defineConfig } from 'vitest/config';

// Unit tests run in a plain Node environment (the tested code is pure logic;
// no DOM is touched at import time). Astro/Vite component compilation is not
// involved here.
export default defineConfig({
  test: {
    environment: 'node',
    // scripts/**/*.test.ts covers private-only tests for the publisher machinery
    // (public-manifest / publish / check-public-snapshot), which is never
    // published — so those tests must not live under the published tests/ dir.
    // In the public repo this glob simply matches nothing.
    include: ['src/**/*.test.ts', 'tests/**/*.test.{ts,mjs}', 'scripts/**/*.test.ts'],
  },
});
