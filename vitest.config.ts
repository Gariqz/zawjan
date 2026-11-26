import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./resources/js/tests/setup.ts'],
      include: ['resources/js/tests/**/*.test.{ts,tsx}'],
      css: false,
    },
  }),
);
