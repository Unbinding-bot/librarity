import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')
const DOMAIN = 'https://unbinding-bot.github.io'

// One entry per route — image path is relative to BASE so it works both locally and on Pages.
const PAGE_META = {
  '/': {
    title: 'Librarity',
    description:
      'The school library website for Mandaue City Science National High School — games, research tools, events, and a live leaderboard.',
    image: `${DOMAIN}${BASE}/og-image.jpg`,
  },
  '/games': {
    title: 'Games — Librarity',
    description:
      'Wordle, Spelling Bee, Word Ladder, Trivia, Flashcards, and Wikipedia Race. Play directly in your browser.',
    image: `${DOMAIN}${BASE}/og-games.jpg`,
  },
  '/wordle': {
    title: 'Wordle — Librarity',
    description: 'Daily five-letter word puzzle. One shot per day.',
    image: `${DOMAIN}${BASE}/og-games.jpg`,
  },
  '/spelling-bee': {
    title: 'Spelling Bee — Librarity',
    description: 'Spell words inside a seven-letter hexagon. Words must contain the center letter.',
    image: `${DOMAIN}${BASE}/og-games.jpg`,
  },
  '/word-ladder': {
    title: 'Word Ladder — Librarity',
    description: 'Transform one four-letter word into another by changing one letter at a time.',
    image: `${DOMAIN}${BASE}/og-games.jpg`,
  },
  '/trivia': {
    title: 'Trivia — Librarity',
    description: 'History, science, math, English, geography, and general-knowledge questions across three difficulties.',
    image: `${DOMAIN}${BASE}/og-games.jpg`,
  },
  '/flashcards': {
    title: 'Flashcards — Librarity',
    description: 'Vocabulary, biology, presidents, algebra, Spanish, and world capitals decks. Flip and quiz yourself.',
    image: `${DOMAIN}${BASE}/og-games.jpg`,
  },
  '/wikipedia-race': {
    title: 'Wikipedia Race — Librarity',
    description: 'Race through Wikipedia links from a starting article to a target article. Fastest wins.',
    image: `${DOMAIN}${BASE}/og-games.jpg`,
  },
  '/tools': {
    title: 'Tools — Librarity',
    description:
      'Dictionary, Thesaurus, and Rhyme Finder for research work. All run locally or call open APIs.',
    image: `${DOMAIN}${BASE}/og-tools.jpg`,
  },
  '/dictionary': {
    title: 'Dictionary — Librarity',
    description:
      'Look up definitions, pronunciations, origins, and synonyms via dictionaryapi.dev.',
    image: `${DOMAIN}${BASE}/og-tools.jpg`,
  },
  '/thesaurus': {
    title: 'Thesaurus — Librarity',
    description: 'Find synonyms and related words using the Datamuse API.',
    image: `${DOMAIN}${BASE}/og-tools.jpg`,
  },
  '/rhyme-finder': {
    title: 'Rhyme Finder — Librarity',
    description: 'Search for rhyming words and words with similar sounds via Datamuse.',
    image: `${DOMAIN}${BASE}/og-tools.jpg`,
  },
  '/events': {
    title: 'Events — Librarity',
    description:
      'Happening-now, coming-soon, and past-library events at Mandaue City Science National High School.',
    image: `${DOMAIN}${BASE}/og-events.jpg`,
  },
  '/leaderboard': {
    title: 'Leaderboard — Librarity',
    description:
      'Top scores across all Librarity games — all-time, weekly, and daily rankings.',
    image: `${DOMAIN}${BASE}/og-image.jpg`,
  },
  '/logbook': {
    title: 'Visitor Logbook — Librarity',
    description: 'Sign the library logbook and see who else visited today.',
    image: `${DOMAIN}${BASE}/og-image.jpg`,
  },
}

/**
 * Derives matching meta for any pathname, falling back to the homepage config.
 */
function resolveMeta(pathname) {
  if (pathname in PAGE_META) return PAGE_META[pathname]
  // prefix-match: /wordle -> /games rule, etc.
  const keys = Object.keys(PAGE_META).sort((a, b) => b.length - a.length)
  const match = keys.find((k) => pathname.startsWith(k + '/') || pathname === k)
  return match ? PAGE_META[match] : PAGE_META['/']
}

export default function usePageMeta() {
  const location = useLocation()

  useEffect(() => {
    const { title, description, image } = resolveMeta(location.pathname)

    // html title
    document.title = title

    // helpers to keep/create tag nodes
    function setMeta(name, content, attr = 'name') {
      let el = document.querySelector(`meta[${attr}="${name}"]`)
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute(attr, name)
        document.head.appendChild(el)
      }
      el.setAttribute('content', content)
    }

    setMeta('description', description)
    setMeta('og:title', title, 'property')
    setMeta('og:description', description, 'property')
    setMeta('og:image', image, 'property')
    setMeta('og:url', DOMAIN + BASE + location.pathname, 'property')
    setMeta('og:type', 'website', 'property')
    setMeta('twitter:card', 'summary_large_image')

    // link rel="canonical"
    let canon = document.querySelector('link[rel="canonical"]')
    if (!canon) {
      canon = document.createElement('link')
      canon.rel = 'canonical'
      document.head.appendChild(canon)
    }
    canon.href = DOMAIN + BASE + location.pathname
  }, [location.pathname])
}
