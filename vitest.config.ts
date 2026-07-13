import { defineConfig } from 'vitest/config';

// Deliberately separate from vite.config.ts (which carries the market-data
// dev-middleware) so this config is purely additive — see PR0.1 in the
// modernization plan. No jsdom/happy-dom: the tests covered here are pure
// functions that never touch the DOM.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
