import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    css: true,
    testTimeout: 10000, // Increase default timeout to 10 seconds
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})