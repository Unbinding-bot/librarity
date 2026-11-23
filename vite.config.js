import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Subpath the site is mounted under: GitHub Pages serves it at /librarity/,
// Vercel (school site) at /library/. The deploy host sets BASE_PATH; unset
// keeps the GitHub Pages default so the Pages workflow needs no changes.
// One source of truth — App.jsx derives its router basename from BASE_URL.
const BASE_PATH = (process.env.BASE_PATH || '/librarity').replace(/\/$/, '')

export default defineConfig({
  plugins: [react()],
  base: BASE_PATH + '/',
  server: {
    port: 3000,
    strictPort: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  }
})