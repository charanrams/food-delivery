/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => {
  // frontend/.env — Vite only exposes VITE_* variables to the browser.
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: {
      port: 5173,
      // Only used when VITE_API_URL is empty (same-origin calls through the dev server).
      proxy: { '/api': env.VITE_API_URL || 'http://localhost:4000' },
    },
    test: { environment: 'jsdom', setupFiles: ['./src/test-setup.ts'], css: false },
  };
});
