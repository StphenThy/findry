import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// In dev, /api is proxied to the Express server so no CORS config is needed.
// In prod, set VITE_API_URL to the deployed API (e.g. https://findry-api.onrender.com).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:4000', changeOrigin: true } },
  },
  build: { outDir: 'dist', sourcemap: false },
});
