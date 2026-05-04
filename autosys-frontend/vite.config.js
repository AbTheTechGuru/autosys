import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path  from 'path';

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },

  server: {
    port: 5173,
    open: true,
    proxy: {
      // FIX: proxy prefix must match VITE_API_URL (/api/v1) AND the backend
      // API_VERSION mount (/api/v1). Old value was '/v1' — every dev request 404'd.
      '/api/v1': {
        target:       'http://localhost:3001',
        changeOrigin: true,
        secure:       false,
      },
    },
  },

  build: {
    target:    'es2020',
    sourcemap:  true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          state:  ['zustand'],
          forms:  ['zod', 'dompurify'],
          http:   ['axios'],
        },
      },
    },
  },
});
