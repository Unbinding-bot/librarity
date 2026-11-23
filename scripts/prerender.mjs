/**
 * Pre-render script — runs after `vite build`.
 *
 * Why: GitHub Pages is a static host, so deep links like /events/<id>
 * would return a 404 (Facebook refuses to scrape 4xx URLs) and — even
 * with the 404.html SPA fallback — Facebook's crawler
 * (facebookexternalhit) does NOT execute JavaScript, so it can only
 * ever see the static <meta> tags baked into index.html.
 *
 * This script writes a real directory with a real index.html per route
 * (and per live event), each with its own <title> and Open Graph tags.
 * GitHub Pages then serves /librarity/events/<id>/ with HTTP 200 and
 * the event's own preview — no JS required on the crawler side.
 *
 * Event data comes straight from Supabase's public REST endpoint
 * (same anon key that ships in the frontend bundle). If the fetch
 * fails, event pages are simply skipped — the SPA still handles those
 * routes client-side.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const DIST = new URL('../dist', import.meta.url).pathname.replace(/^\/([A-Za-z]):/, '$1:')
const SUPABASE_URL = 'https://wiqwrrhlriyaqxrmitzo.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpcXdycmhscml5YXF4cm1pdHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4ODA3OTYsImV4cCI6MjEwMjQ1Njc5Nn0.pw9XCB806F0dNatpqaylbjVX4guT4pImE6KiOF8Pxak'

// Public site origin (NO path), used for og:url / og:image absolute URLs.
// Defaults to the GitHub Pages origin; on Vercel the build sets SITE_URL to
// the production origin (e.g. https://mansci.vercel.app).
const SITE = (process.env.SITE_URL || 'https://unbinding-bot.github.io').replace(/\/$/, '')

const SHELL = readFileSync(join(DIST, 'index.html'), 'utf8')

const ROUTES = [
  {
    path: '/',
    title: 'Librarity — Mandaue City Science National High School Library',
    description:
      "Mandaue City Science National High School's digital library hub: games, research tools (dictionary, thesaurus, rhyme finder), events, and a live leaderboard.",
    image: `og-image.jpg`,
  },
  {
    path: '/games',
    title: 'Games — Librarity',
    description:
      'Wordle, Spelling Bee, Word Ladder, Trivia, Flashcards, and Wikipedia Race. Play directly in your browser.',
    image: `og-games.jpg`,
  },
  {
    path: '/wordle',
    title: 'Wordle — Librarity',
    description: 'Daily five-letter word puzzle. One shot per day.',
    image: `og-games.jpg`,
  },
  {
    path: '/spelling-bee',
    title: 'Spelling Bee — Librarity',
    description:
      'Spell words inside a seven-letter hexagon. Words must contain the center letter.',
    image: `og-games.jpg`,
  },
  {
    path: '/word-ladder',
    title: 'Word Ladder — Librarity',
    description:
      'Transform one four-letter word into another by changing one letter at a time.',
    image: `og-games.jpg`,
  },
  {
    path: '/trivia',
    title: 'Trivia — Librarity',
    description:
      'History, science, math, English, geography, and general-knowledge questions across three difficulties.',
    image: `og-games.jpg`,
  },
  {
    path: '/flashcards',
    title: 'Flashcards — Librarity',
    description:
      'Vocabulary, biology, presidents, algebra, Spanish, and world capitals decks. Flip and quiz yourself.',
    image: `og-games.jpg`,
  },
  {
    path: '/wikipedia-race',
    title: 'Wikipedia Race — Librarity',
    description:
      'Race through Wikipedia links from a starting article to a target article. Fastest wins.',
    image: `og-games.jpg`,
  },
  {
    path: '/tools',
    title: 'Tools — Librarity',
    description:
      'Dictionary, Thesaurus, and Rhyme Finder for research work. All run locally or call open APIs.',
    image: `og-tools.jpg`,
  },
  {
    path: '/dictionary',
    title: 'Dictionary — Librarity',
    description:
      'Look up definitions, pronunciations, origins, and synonyms via dictionaryapi.dev.',
    image: `og-tools.jpg`,
  },
  {
    path: '/thesaurus',
    title: 'Thesaurus — Librarity',
    description: 'Find synonyms and related words using the Datamuse API.',
    image: `og-tools.jpg`,
  },
  {
    path: '/rhyme-finder',
    title: 'Rhyme Finder — Librarity',
    description: 'Search for rhyming words and words with similar sounds via Datamuse.',
    image: `og-tools.jpg`,
  },
  {
    path: '/events',
    title: 'Events — Librarity',
    description:
      "Happening-now, coming-soon, and past-library events at Mandaue City Science National High School.",
    image: `og-events.jpg`,
  },
  {
    path: '/leaderboard',
    title: 'Leaderboard — Librarity',
    description:
      'Top scores across all Librarity games — all-time, weekly, and daily rankings.',
    image: `og-image.jpg`,
  },
  {
    path: '/logbook',
    title: 'Visitor Logbook — Librarity',
    description: "Sign the library logbook and see who else visited today.",
    image: `og-image.jpg`,
  },
]

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function renderPage({ title, description, image, url }) {
  // Replace the shell's head meta with page-specific values.
  return SHELL.replace(/<title>.*?<\/title>/s, `<title>${escapeHtml(title)}</title>`)
    .replace(
      /<meta name="description" content=".*?" \/>/s,
      `<meta name="description" content="${escapeHtml(description)}" />`
    )
    .replace(
      /<meta property="og:title" content=".*?" \/>/s,
      `<meta property="og:title" content="${escapeHtml(title)}" />`
    )
    .replace(
      /<meta property="og:description" content=".*?" \/>/s,
      `<meta property="og:description" content="${escapeHtml(description)}" />`
    )
    .replace(
      /<meta property="og:image" content=".*?" \/>/s,
      `<meta property="og:image" content="${escapeHtml(image)}" />`
    )
    .replace(
      /<meta property="og:url" content=".*?" \/>/s,
      `<meta property="og:url" content="${escapeHtml(url)}" />`
    )
}

let written = 0

// Where the app is mounted under SITE: GitHub Pages serves it at
// /librarity/..., Vercel at /library/... (the Vite base + router basename).
// The prerendered og:url values include this prefix; the file layout does
// not (Vite already emits assets under the base path, and the host maps
// the subpath onto dist/).
// Defense against Git-Bash-on-Windows path mangling: MSYS rewrites env values
// that look like POSIX paths ("/library") into Windows paths
// ("C:/Program Files/Git/library") before the process sees them. Collapse any
// such drive-path back to its final segment so a mangled local env can never
// corrupt the og: URLs. (Vercel's Linux build env passes the value through
// untouched — this only guards local Windows testing.)
function normalizeBasePath(raw) {
  let v = String(raw || '').trim() || '/librarity'
  if (/^[A-Za-z]:[/\\]/.test(v)) v = v.replace(/^.*[/\\]/, '')
  if (!v.startsWith('/')) v = '/' + v
  return v.replace(/\/$/, '') || '/'
}
const BASE_PATH = normalizeBasePath(process.env.BASE_PATH || '/library')

// Routes carry images as bare filenames (og-image.jpg) — absolutize against
// the full public URL (origin + base path).
const OG = (file) => (file.startsWith('http') ? file : `${SITE}${BASE_PATH}/${file}`)

// The built dist/index.html (the "/" route) keeps the shell's Vite-substituted
// OG tags, whose og:image / og:url may be base-relative. Rewrite them in place
// with absolute URLs so Facebook's JS-less crawler sees the same absolute
// values on "/" as on every prerendered route.
{
  const root = renderPage({
    title: 'Librarity — Mandaue City Science National High School Library',
    description:
      "Mandaue City Science National High School's digital library hub: games, research tools (dictionary, thesaurus, rhyme finder), events, and a live leaderboard.",
    image: OG('og-image.jpg'),
    url: SITE + BASE_PATH + '/',
  })
  writeFileSync(join(DIST, 'index.html'), root)
  written++
}

// Static routes → dist/<path>/index.html  (root path already IS dist/index.html)
for (const route of ROUTES) {
  if (route.path === '/') continue
  const html = renderPage({
    title: route.title,
    description: route.description,
    image: OG(route.image),
    url: SITE + BASE_PATH + route.path,
  })
  const dir = join(DIST, route.path.replace(/^\//, ''))
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), html)
  written++
  console.log(`  prerendered ${route.path}`)
}

// Event detail pages → dist/events/<id>/index.html
try {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/events?select=id,title,description,image_url,start_date,end_date&order=start_date.asc&limit=200`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
  )
  if (!res.ok) throw new Error(`Supabase ${res.status}`)
  const events = await res.json()
  for (const ev of events) {
    const hasImg = Boolean(ev.image_url)
    const html = renderPage({
      title: `${ev.title} — Librarity Events`,
      description:
        (ev.description
          ? String(ev.description).slice(0, 200)
          : `Library event at Mandaue City Science National High School — ${ev.start_date}`) +
        ' See the full details on the Librarity events page.',
      image: hasImg ? ev.image_url : OG('og-events.jpg'),
      url: `${SITE}${BASE_PATH}/events/${ev.id}`,
    })
    const dir = join(DIST, 'events', ev.id)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'index.html'), html)
    written++
    console.log(`  prerendered /events/${ev.id} (${ev.title.slice(0, 40)})`)
  }
} catch (err) {
  console.warn(`  event prerender skipped: ${err.message}`)
}

console.log(`prerender: wrote ${written} pages`)
