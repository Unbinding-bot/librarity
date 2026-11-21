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
              'The creator of this website. Likes green, tidy code, and a certain someone who makes every day brighter.',
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
    origin: 'Germanic bern “bear” + hard “brave, hardy” — “brave bear”.',
    meanings: [
      {
        partOfSpeech: 'noun',
        definitions: [
          {
            definition:
              'An alias of the creator of this website. Brave-bear energy: shows up when something needs building, likes green.',
            example: 'Ask Bernard — the site will tell you it was Unbinding.',
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
              'A male given name borne by saints, scientists, and at least one very reliable software developer.',
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
        synonyms: ['Clara', 'Clarissa', 'Clare'],
        antonyms: [],
      },
    ],
  },
}

/** Real-word names that get one hidden synonym appended to their genuine results. */
const HIDDEN_SYNONYMS = {
  ash: 'Claire',
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
