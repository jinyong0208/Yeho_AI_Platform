import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
      '/v1': 'http://localhost:8080',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          mantine: ['@mantine/core', '@mantine/hooks', '@mantine/form', '@mantine/notifications'],
          charts: ['@mantine/charts', 'recharts'],
          query: ['@tanstack/react-query', 'axios', 'zustand'],
          i18n: ['i18next', 'i18next-browser-languagedetector', 'i18next-http-backend', 'react-i18next'],
          utilities: ['dayjs', 'xlsx'],
        },
      },
    },
  },
});
