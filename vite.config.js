import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Subpath the site is mounted under: GitHub Pages serves it at /librarity/,
// Vercel (school site) at /library/. The deploy host sets BASE_PATH; unset
// keeps the GitHub Pages default so the Pages workflow needs no changes.
// Absolute base (never './') so asset URLs are correct at any route depth —
// e.g. /library/events/<id>/ resolving ./assets/ would otherwise point to
// /library/events/assets/ which does not exist.
const BASE_PATH = (process.env.BASE_PATH || '/librarity').replace(/\/$/, '')

export default defineConfig({
  plugins: [react()],
  base: BASE_PATH + '/',
  server: {
    port: 5173,
    strictPort: true
  },
  build: {
    outDir: 'dist' + BASE_PATH,
    assetsDir: 'assets',
    sourcemap: false
  }
})
