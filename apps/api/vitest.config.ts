import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/__tests__/**', 'src/index.ts'],
    },
  },
  resolve: {
    alias: {
      '@arbitex/types': path.resolve(__dirname, '../../packages/types/src'),
      '@arbitex/config': path.resolve(__dirname, '../../packages/config/src'),
      '@arbitex/utils': path.resolve(__dirname, '../../packages/utils/src'),
    },
  },
})
