/**
 * Post-build restructure for Vercel subpath deployment.
 *
 * When BASE_PATH=/library is set, Vite outputs assets at /library/assets/...
 * and prerender writes pages under dist/events/, dist/games/, etc.
 * But Vercel flattens everything to the repository root in its output artifact,
 * stripping any directory prefix from file paths.
 *
 * This script repairs that by:
 * 1. Creating a <base>/ directory tree inside dist/
 * 2. Copying assets into dist/<base>/assets/
 * 3. Moving prerendered route pages under dist/<base>/
 * 4. Rewriting dist/<base>/index.html so its asset/href references drop
 *    the now-unnecessary base prefix (they're relative to that index.html).
 */
import { readFileSync, writeFileSync, cpSync, mkdirSync } from 'node:fs'
import { join, basename } from 'node:path'

const DIST = new URL('../dist', import.meta.url).pathname.replace(/^\/([A-Za-z]):/, '$1:')
const BASE_PATH = (process.env.BASE_PATH || '/librarity').replace(/\/$/, '')

// Nothing to do for the default GitHub Pages base
if (!BASE_PATH || BASE_PATH === '/') process.exit(0)

// Normalize leading slash
const base = BASE_PATH.startsWith('/') ? BASE_PATH : '/' + BASE_PATH

console.log(`[restructure] base="${base}", dist=${DIST}`)

// --- 1. Move/copy static assets into <base>/assets/ ---
mkdirSync(join(DIST, base, 'assets'), { recursive: true })
cpSync(join(DIST, 'assets'), join(DIST, base, 'assets'), { recursive: true, overwrite: true })

// --- 2. Move prerendered route pages under <base>/ ---
// Prerender creates dirs like dist/games/, dist/events/, etc.
// We need them under dist/library/games/, dist/library/events/, etc.
for (const entry of [
  'events',
  'games',
  'tools',
  'wordle',
  'spelling-bee',
  'word-ladder',
  'trivia',
  'flashcards',
  'wikipedia-race',
  'dictionary',
  'thesaurus',
  'rhyme-finder',
  'leaderboard',
  'logbook',
]) {
  const src = join(DIST, entry)
  if (entry === 'events') {
    // events has subdirs per ID; move the whole tree
    cpSync(src, join(DIST, base, entry), { recursive: true, overwrite: true })
  } else {
    // Single-index routes
    const dest = join(DIST, base, entry)
    mkdirSync(dest, { recursive: true })
    cpSync(join(src, 'index.html'), join(dest, 'index.html'), { overwrite: true })
  }
}

// --- 3. Rewrite dist/<base>/index.html: strip the base prefix from
// absolute-looking href/src values (those beginning with ${base}/)
// so they resolve as relative to that index.html. ---
const indexPath = join(DIST, base, 'index.html')
let html = readFileSync(indexPath, 'utf8')

// Replace /library/ with relative ./ paths where appropriate
// e.g. /library/assets/foo.js -> ./assets/foo.js
//     /library/favicon.svg -> ./favicon.svg
html = html.replaceAll(new RegExp(`${base.replace('/', '\\/')}/`, 'g'), './')

writeFileSync(indexPath, html)

console.log('[restructure] done')
