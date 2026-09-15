import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Deploys under a reverse-proxied /kiosk/ path (nginx serves the built
  // kiosk/dist, proxies /api to the backend). Same-origin keeps CORS moot.
  base: '/kiosk/',
  plugins: [react()],
  server: {
    port: 5176,
    host: true,
    proxy: {
      // Dev: forward API calls of the kiosk origin to the local backend.
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
});