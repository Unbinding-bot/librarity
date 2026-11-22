/**
 * Dictionary easter eggs.
 *
 * A few names return a crafted dictionary entry instead of the usual
 * dictionaryapi.dev lookup. Shaped exactly like the API's response so the
 * normal render pipeline (definitions, synonyms-as-chips, phonetics) works
 * unchanged — which also means the synonym chips cross-link the entries.
 *
 * `injectHiddenSynonym` is the quiet one: for real words, a chosen name is
 * appended to the existing synonyms list so it hides among genuine results.
 */

const EGG_ENTRIES = {
  unbinding: {
    word: 'unbinding',
    phonetic: '/ʌnˈbaɪndɪŋ/',
    phonetics: [{ text: '/ʌnˈbaɪndɪŋ/', audio: '' }],
    origin: 'un- (reverse) + bind — to undo what was tied.',
    meanings: [
      {
        partOfSpeech: 'noun',
        definitions: [
          {
            definition:
              'The creator of this website. Likes green, tidy code(idk about that), and a certain someone who makes every day brighter.',
            example: 'Unbinding built this whole library site, you are using it right now.',
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
    origin: 'Germanic bern “bear” + hard “brave, hardy” — “brave bear”.',
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
    origin: 'From Latin salvator — “savior, rescuer”.',
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
    origin: 'French claire, feminine of clair “clear, bright”, from Latin clarus.',
    meanings: [
      {
        partOfSpeech: 'noun',
        definitions: [
          {
            definition:
              'A French given name meaning “bright, clear, renowned”.',
            example: 'Clair de lune — “moonlight”, literally “light of the moon”.',
          },
        ],
        synonyms: ['Cute', 'Clara', 'Clarissa', 'Clare'],
        antonyms: [],
      },
    ],
  },

  gaea: {
    word: 'gaea',
    phonetic: '/ˈɡeɪ.ə/',
    phonetics: [{ text: '/ˈɡeɪ.ə/', audio: '' }],
    origin: 'Greek Gaîa — the earth goddess. Re-coined in 2026 as an acronym; see definition.',
    meanings: [
      {
        partOfSpeech: 'noun',
        definitions: [
          {
            definition: 'PHAT — Pretty, Hot And Tempting.',
            example: '“PHAT, Pretty, hot and tempting.” — Gaea Alexis G. Osugay, 2026',
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
    origin: 'Feminine of Daniel, from Hebrew dāniyyēl — “God is my judge”.',
    meanings: [
      {
        partOfSpeech: 'noun',
        definitions: [
          {
            definition: 'Coached TenZ in Valorant. That’s it. That’s the definition.',
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
    origin: 'Uncertain — perhaps Greek ἔλιξ “twist” + suffix, or a modern invention.',
    meanings: [
      {
        partOfSpeech: 'noun',
        definitions: [
          {
            definition:
              'Someone who likes buldak but without the sauce, Bakugo Lover no. 1.',
            example: '“Isn’t that just noodles??”',
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
    meanings: [
      {
        partOfSpeech: 'noun',
        definitions: [
          {
            definition: 'An avid reader, not to be mistaken with riane.',
            example: 'AO3 isn’t just a website, it’s a lifestyle.',
          },
        ],
        synonyms: ['Bookworm'],
        antonyms: [],
      },
    ],
  },

  lakshmi: {
    word: 'lakshmi',
    phonetic: '/ˈlʌk.ʃmi/',
    phonetics: [{ text: '/ˈlʌk.ʃmi/', audio: '' }],
    origin: 'Sanskrit लक्ष्मी — “fortune, prosperity”; one of the most worshipped deities in Hinduism, consort of Vishnu.',
    meanings: [
      {
        partOfSpeech: 'noun',
        definitions: [
          {
            definition: 'Sweet n smart daw, pink lover.',
            example: '“ur sweet n smart.” — Rheanne Alferez, 2026',
          },
        ],
        synonyms: ['Sweet', 'Smart'],
        antonyms: [],
      },
      {
        partOfSpeech: 'noun',
        definitions: [
          {
            definition:
              'In Hinduism, the goddess of wealth, fortune, power, beauty, fertility and prosperity.',
            example:
              'Diwali — the festival of lights — celebrates Lakshmi’s descent to earth.',
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
