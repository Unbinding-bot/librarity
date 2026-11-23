import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Subpath the site is mounted under: GitHub Pages serves it at /librarity/,
// Vercel (school site) at /library/. The deploy host sets BASE_PATH; unset
// keeps the GitHub Pages default so the Pages workflow needs no changes.
<<<<<<< HEAD
// Absolute base (never './') so asset URLs are correct at any route depth.
// outDir mirrors the subpath (dist/library, dist/librarity) so the served
// file tree IS the URL space — no host rewrites needed to map /library/*.
=======
// Absolute base (never './') so asset URLs are correct at any route depth —
// e.g. /library/events/<id>/ resolving ./assets/ would otherwise point to
// /library/events/assets/ which does not exist.
>>>>>>> cdc69fd (fix: absolute Vite base for /library; simplify vercel.json; remove restructure script)
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
