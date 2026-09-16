/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Dev only (never affects `vite build`). Extra preview hosts come from
    // VITE_DEV_HOSTS (comma-separated) — no host is hardcoded here.
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      ...(process.env.VITE_DEV_HOSTS ?? '').split(',').map((h) => h.trim()).filter(Boolean),
    ],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    exclude: ['node_modules/**'],
  },
})
