import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    port: 5173,
    open: false,
    host: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        speakers: resolve(__dirname, 'speakers.html'),
        agenda: resolve(__dirname, 'agenda.html')
      }
    }
  }
});
