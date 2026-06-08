import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/__tests__/**', 'src/app/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@arbitex/types': path.resolve(__dirname, '../../packages/types/src'),
      '@arbitex/config': path.resolve(__dirname, '../../packages/config/src'),
      '@arbitex/utils': path.resolve(__dirname, '../../packages/utils/src'),
    },
  },
})
