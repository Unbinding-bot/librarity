/**
 * Dictionary easter eggs.
 *
 * A few names return a crafted dictionary entry instead of the usual
 * dictionaryapi.dev lookup. Shaped exactly like the API's response so the
 * normal render pipeline (definitions, synonyms-as-chips, phonetics) works
 * unchanged — which also means the synonym chips cross-link the entries.
 *
 * Each egg can have an optional `color` field (e.g. 'pink', 'green') to tint
 * the entry card in the Dictionary UI, and a `special` field for a one-off
 * elaborate design ('owner' → Unbinding's striped green, 'claire' → Claire's
 * cute polka-dot pink). Every crafted egg shows the 🥚 egg badge regardless
 * of color. Add new eggs by adding an entry here (+ a line in HIDDEN_SYNONYMS
 * for real-word injections).
 */

const EGG_COLORS = {
  pink: '#FF6B6B',
  green: '#88D498',
  sky: '#74B9FF',
  yellow: '#FFD23F',
  orange: '#FFA552',
  lavender: '#B8A9FA',
  red: '#E53935',
  purple: '#AB47BC',
  blue: '#42A5F5',
}

/** One-off elaborate card designs — each gets its own CSS class in tools.css. */
const SPECIAL_EGGS = {
  owner: 'egg-special-owner',   // Unbinding: striped green, ⚡ owner badge
  claire: 'egg-special-claire', // Claire: polka-dot pink, ♡ badge
}

const EGG_ENTRIES = {
  unbinding: {
    word: 'unbinding',
    phonetic: '/ʌnˈbaɪndɪŋ/',
    phonetics: [{ text: '/ʌnˈbaɪndɪŋ/', audio: '' }],
    origin: 'un- (reverse) + bind — to undo what was tied.',
    special: 'owner',
    meanings: [
      {
        partOfSpeech: 'noun',
        definitions: [
          {
            definition:
              'The creator of this website. Likes green, tidy code(idk about that), and a certain someone who makes every day brighter.',
            example: 'Unbinding built this whole library site — you are using it right now.',
          },
        ],
        synonyms: ['Bernard', 'Salvador'],
        antonyms: [],
      },
      {
        partOfSpeech: 'verb',
        definitions: [
          {
            definition:
              'Present participle of unbind: to release from bonds or ties; to set free.',
            example: 'The unbinding of the knot took patience.',
          },
        ],
        synonyms: ['freeing', 'releasing', 'loosening'],
        antonyms: ['binding', 'tying'],
      },
    ],
  },

  bernard: {
    word: 'bernard',
    phonetic: '/ˈbɜːrnərd/',
    phonetics: [{ text: '/ˈbɜːrnərd/', audio: '' }],
    origin: 'Germanic bern "bear" + hard "brave, hardy" — "brave bear".',
    meanings: [
      {
        partOfSpeech: 'noun',
        definitions: [
          {
            definition:
              'An alias of the creator of this website. Shows up when something needs building(not for free tho), likes green.',
            example: 'Ask Bernard, the site will tell you it was Unbinding.',
          },
        ],
        synonyms: ['Unbinding', 'Salvador'],
        antonyms: [],
      },
      {
        partOfSpeech: 'noun',
        definitions: [
          {
            definition:
              'A male given name borne by saints, scientists, and at least one very reliable(at times) software developer.',
          },
        ],
        synonyms: [],
        antonyms: [],
      },
    ],
  },

  salvador: {
    word: 'salvador',
    phonetic: '/ˈsælvədɔːr/',
    phonetics: [{ text: '/ˈsælvədɔːr/', audio: '' }],
    origin: 'From Latin salvator — "savior, rescuer".',
    meanings: [
      {
        partOfSpeech: 'noun',
        definitions: [
          {
            definition:
              'Another alias of the creator of this website. The one who rescues group projects at midnight. Likes green.',
            example: 'Deadline saved again — call it a Salvador move.',
          },
        ],
        synonyms: ['Unbinding', 'Bernard'],
        antonyms: [],
      },
      {
        partOfSpeech: 'noun',
        definitions: [
          {
            definition:
              'A male given name, as of the painter Salvador Dalí; also San Salvador, capital of El Salvador.',
          },
        ],
        synonyms: [],
        antonyms: [],
      },
    ],
  },

  claire: {
    word: 'claire',
    phonetic: '/klɛər/',
    phonetics: [{ text: '/klɛər/', audio: '' }],
    origin: 'French claire, feminine of clair "clear, bright", from Latin clarus.',
    special: 'claire',
    meanings: [
      {
        partOfSpeech: 'noun',
        definitions: [
          {
            definition:
              'A French given name meaning "bright, clear, renowned".',
            example: 'Clair de lune — "moonlight", literally "light of the moon".',
          },
        ],
        synonyms: ['Cute', 'Ash', 'Ashley'],
        antonyms: [],
      },
    ],
  },

  gaea: {
    word: 'gaea',
    phonetic: '/ˈɡeɪ.ə/',
    phonetics: [{ text: '/ˈɡeɪ.ə/', audio: '' }],
    origin: 'Greek Gaîa — the earth goddess. Re-coined in 2026 as an acronym; see definition.',
    color: 'green',
    meanings: [
      {
        partOfSpeech: 'noun',
        definitions: [
          {
            definition: 'PHAT — Pretty, Hot And Tempting.',
            example: '"PHAT, Pretty, hot and tempting." — Gaea Alexis G. Osugay, 2026',
          },
        ],
        synonyms: ['Pretty', 'Hot', 'Tempting'],
        antonyms: [],
      },
      {
        partOfSpeech: 'noun',
        definitions: [
          {
            definition:
              'In Greek mythology, the personification of the Earth and ancestral mother of all life.',
            example: 'The oracle at Delphi spoke for Gaea before Apollo took the shrine.',
          },
        ],
        synonyms: [],
        antonyms: [],
      },
    ],
  },

  daniela: {
    word: 'daniela',
    phonetic: '/dɑːˈnjɛl.ə/',
    phonetics: [{ text: '/dɑːˈnjɛl.ə/', audio: '' }],
    origin: 'Feminine of Daniel, from Hebrew dāniyyēl — "God is my judge".',
    meanings: [
      {
        partOfSpeech: 'noun',
        definitions: [
          {
            definition: 'Coached TenZ in Valorant. That\'s it. That\'s the definition.',
            example: 'Riot ID: Uno#ceska',
          },
        ],
        synonyms: ['GOAT'],
        antonyms: [],
      },
      {
        partOfSpeech: 'noun',
        definitions: [
          {
            definition:
              'A female given name, the feminine form of Daniel, common across Europe and Latin America.',
          },
        ],
        synonyms: ['Dani'],
        antonyms: [],
      },
    ],
  },

  elixa: {
    word: 'elixa',
    phonetic: '/ɪˈlaɪk.sə/',
    phonetics: [{ text: '/ɪˈlaɪk.sə/', audio: '' }],
    origin: 'Uncertain — perhaps Greek έλιξ "twist" + suffix, or a modern invention.',
    color: 'green',
    meanings: [
      {
        partOfSpeech: 'noun',
        definitions: [
          {
            definition:
              'Someone who likes buldak (spicy Korean noodles) but refuses the sauce.',
            example: '"Isn\'t that just noodles??"',
          },
        ],
        synonyms: ['Picky'],
        antonyms: [],
      },
    ],
  },

  rheanne: {
    word: 'rheanne',
    phonetic: '/ˈriː.ən/',
    phonetics: [{ text: '/ˈriː.ən/', audio: '' }],
    origin: 'Variant of Rhiannon; not to be mistaken for riane.',
    color: 'blue',
    meanings: [
      {
        partOfSpeech: 'noun',
        definitions: [
          {
            definition: 'An avid reader — not to be mistaken with riane.',
            example: 'AO3 isn\'t just a website, it\'s a lifestyle.',
          },
        ],
        synonyms: ['Bookworm'],
        antonyms: [],
      },
    ],
  },

  leanna: {
    word: 'leanna',
    phonetic: '/liˈæn.ə/',
    phonetics: [{ text: '/liˈæn.ə/', audio: '' }],
    origin: 'Variant of Liana — from the climbing vine; also a blend of Lee + Anna.',
    color: 'pink',
    meanings: [
      {
        partOfSpeech: 'noun',
        definitions: [
          {
            definition:
              'A person who is addicted to Miraculous and also the top #1 gachakid with a flex. "Flex when that was 3 yrs ago."',
            example: 'Its miraculous that she calls that a flex - Unbinding',
          },
        ],
        synonyms: ['Aurtistic', 'Peoplepleaser(?)', 'Cute'],
        antonyms: [],
      },
    ],
  },

  lakshmi: {
    word: 'lakshmi',
    phonetic: '/ˈlʌk.ʃmi/',
    phonetics: [{ text: '/ˈlʌk.ʃmi/', audio: '' }],
    origin: 'Sanskrit लक्ष्मी — "fortune, prosperity"; one of the most worshipped deities in Hinduism, consort of Vishnu.',
    color: 'pink',
    meanings: [
      {
        partOfSpeech: 'noun',
        definitions: [
          {
            definition: 'ur sweet n smart.',
            example: '"ur sweet n smart." — Rheanne Alferez, 2026',
          },
        ],
        synonyms: ['Sweet', 'Smary'],
        antonyms: [],
      },
      {
        partOfSpeech: 'noun',
        definitions: [
          {
            definition:
              'In Hinduism, the goddess of wealth, fortune, power, beauty, fertility and prosperity.',
            example:
              'Diwali — the festival of lights — celebrates Lakshmi\'s descent to earth.',
          },
        ],
        synonyms: [],
        antonyms: [],
      },
    ],
  },
}

/** Real-word names that get one hidden synonym appended to their genuine results. */
const HIDDEN_SYNONYMS = {
  ash: 'Claire',
  goat: 'Daniela',
  pretty: 'Gaea',
  hot: 'Gaea',
  tempting: 'Gaea',
  bookworm: 'Rheanne',
  sweet: 'Lakshmi',
  smart: 'Lakshmi',
}

/**
 * Append the hidden synonym to the first meaning of a real API result that
 * already has a synonyms array (so the egg blends into genuine data). If the
 * entry has no synonyms anywhere, give the first meaning an empty-to-filled
 * list — one chip among real definitions reads as a normal related-words row.
 */
function injectHiddenSynonym(data, name) {
  const word = HIDDEN_SYNONYMS[name]
  if (!word || !Array.isArray(data) || data.length === 0) return data
  const entry = data[0]
  const withSyn = (entry.meanings || []).find((m) => Array.isArray(m.synonyms))
  if (withSyn) {
    if (!withSyn.synonyms.includes(word)) withSyn.synonyms.push(word)
  } else if (entry.meanings?.length > 0) {
    entry.meanings[0].synonyms = [word]
  }
  return data
}

/** Look up an egg entry, or null if `clean` is not one. */
export function getEasterEgg(clean) {
  return EGG_ENTRIES[clean] || null
}

/** Apply hidden-synonym injection for real words (returns data unchanged otherwise). */
export function applyEasterEggs(clean, data) {
  if (clean in HIDDEN_SYNONYMS) return injectHiddenSynonym(data, clean)
  return data
}

/**
 * Resolve the color token from an egg entry into a hex value.
 * Returns null if the entry has no color or the token isn't recognized.
 */
export function resolveEggColor(colorToken) {
  if (!colorToken) return null
  return EGG_COLORS[colorToken.toLowerCase()] ?? null
}

/**
 * Resolve the one-off special design for an egg entry (Unbinding → 'owner',
 * Claire → 'claire'). Returns the CSS class name or null.
 */
export function resolveEggSpecial(entry) {
  if (!entry?.special) return null
  return SPECIAL_EGGS[entry.special] ?? null
}
