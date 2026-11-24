/**
 * Games & Tools registry — the single source of truth.
 *
 * Home grids, the Games page, the Tools page, marquee strips, and game-name
 * labels all read from here. Adding a game or tool in ONE place updates
 * every surface: grids, marquees, navbar counts, and leaderboard labels.
 *
 * Entry shape:
 *   {
 *     id:          URL slug (used for the route path),
 *     name:        display name,
 *     description: one-liner for cards,
 *     accent:      card accent class (card-accent-*),
 *     path:        route the card links to,
 *     scoreType:   game_type value stored in the leaderboard DB
 *                  (games only; omit for tools),
 *   }
 *
 * `scoreType` (snake_case) is what the `leaderboards_best` table stores;
 * `name` is what players see. Labels for DB values come from
 * `gameTypeLabel()` which reads the registry — so a new game with a
 * `scoreType` automatically gets a correct label everywhere.
 */

export const GAMES = [
  {
    id: 'wordle',
    name: 'Wordle',
    description: 'Guess the 5-letter word in 6 tries',
    accent: 'card-accent-yellow',
    path: '/wordle',
    scoreType: 'wordle',
  },
  {
    id: 'spelling-bee',
    name: 'Spelling Bee',
    description: 'Spell words to save the honeycomb',
    accent: 'card-accent-orange',
    path: '/spelling-bee',
    scoreType: 'spelling_bee',
  },
  {
    id: 'word-ladder',
    name: 'Word Ladder',
    description: 'Transform words letter by letter',
    accent: 'card-accent-sky',
    path: '/word-ladder',
    scoreType: 'word_ladder',
  },
  {
    id: 'trivia',
    name: 'Trivia',
    description: 'Test your general knowledge',
    accent: 'card-accent-pink',
    path: '/trivia',
    scoreType: 'trivia',
  },
  {
    id: 'wikipedia-race',
    name: 'Wikipedia Race',
    description: 'Race to Wikipedia articles',
    accent: 'card-accent-green',
    path: '/wikipedia-race',
    scoreType: 'wikipedia_race',
  },
]

export const TOOLS = [
  {
    id: 'dictionary',
    name: 'Dictionary',
    description: 'Define words with audio pronunciation',
    accent: 'card-accent-sky',
    path: '/dictionary',
  },
  {
    id: 'thesaurus',
    name: 'Thesaurus',
    description: 'Find synonyms, antonyms, and related words',
    accent: 'card-accent-lavender',
    path: '/thesaurus',
  },
  {
    id: 'rhyme-finder',
    name: 'Rhyme Finder',
    description: 'Find rhymes, near rhymes, and homophones',
    accent: 'card-accent-pink',
    path: '/rhyme-finder',
  },
]

/** All games + tools in one list (marquee strips, "browse everything" UIs). */
export const ALL_ITEMS = [...GAMES, ...TOOLS]

/**
 * Display label for a game_type value stored in the leaderboard DB.
 * Accepts both snake_case ('word_ladder') and legacy hyphenated
 * ('word-ladder') forms. Falls back to a title-cased version of the raw
 * value so an unknown future game_type still reads like a name.
 */
export function gameTypeLabel(gameType) {
  if (!gameType) return ''
  const normalized = String(gameType).replace(/-/g, '_')
  const match = GAMES.find((g) => g.scoreType === normalized)
  if (match) return match.name
  // Fallback: word_ladder -> Word Ladder
  return String(gameType)
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
