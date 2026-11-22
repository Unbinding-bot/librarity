/**
 * Name Tag System — easter-egg tags for names in the Leaderboard and
 * Visitor Logbook.
 *
 * Syntax: append #/tag to a name. Multiple tags combine.
 *   "Claire#/claire"          → rose name (her special pink)
 *   "Unbinding#/bernz"        → green name
 *   "Unbinding#/bernz#/ownz"  → green name with 👾 prefix
 *   "Unbinding#/owner"        → owner-green name with ⚡ prefix
 *   "Sam#/sky"                → sky-blue name (any color tag works)
 *
 * ── How to add a new tag ──────────────────────────────────────────
 * 1. Pick or add a color name in TAG_COLORS (CSS var + fallback hex).
 * 2. Add one line to NAME_TAGS below, e.g.:
 *        rian: { color: 'sky' },
 *    or  boss: { symbol: '👑', color: 'yellow' },
 * That's it — parsing, display, and styling are automatic.
 */

// ── Tag definitions (the only place you edit to add tags) ─────────
export const NAME_TAGS = {
  claire: { color: 'rose' },          // Claire gets her own special pink
  bernz: { color: 'green' },
  ownz: { symbol: '👾', color: 'green' },
  owner: { symbol: '⚡', color: 'owner' }, // owner tag: special striped green
  // plain color tags — anyone can use these
  pink: { color: 'pink' },
  green: { color: 'green' },
  sky: { color: 'sky' },
  yellow: { color: 'yellow' },
  orange: { color: 'orange' },
  lavender: { color: 'lavender' },
  rose: { color: 'rose' },            // the special pink
}

// ── Color names → CSS custom property (with light-mode fallback hex) ──
export const TAG_COLORS = {
  pink: 'var(--nb-pink, #FF6B6B)',
  green: 'var(--nb-green, #88D498)',
  sky: 'var(--nb-sky, #74B9FF)',
  yellow: 'var(--nb-yellow, #FFD23F)',
  orange: 'var(--nb-orange, #FFA552)',
  lavender: 'var(--nb-lavender, #B8A9FA)',
  rose: 'var(--nb-rose, #FF4FA0)', // special pink — brighter, more magenta
  owner: 'var(--nb-green, #88D498)',
}

// CSS classes defined in src/styles/index.css (one per color name)
const TAG_CLASSES = {
  pink: 'name-tag-pink',
  green: 'name-tag-green',
  sky: 'name-tag-sky',
  yellow: 'name-tag-yellow',
  orange: 'name-tag-orange',
  lavender: 'name-tag-lavender',
  rose: 'name-tag-rose',
  owner: 'name-tag-owner',
}

const tagPattern = /#\/([a-zA-Z0-9_-]+)/g

/**
 * Parse a name string for #/tags.
 * @param {string} name - the raw name input
 * @returns {{ baseName: string, tags: string[] }}
 */
export function parseNameTags(name) {
  if (!name || typeof name !== 'string') return { baseName: '', tags: [] }
  const tags = [...name.matchAll(tagPattern)].map((m) => m[1].toLowerCase())
  const baseName = name.replace(tagPattern, '').trim()
  return { baseName, tags }
}

/**
 * Resolve tags → { colorName, symbol }. Last color-bearing tag wins for
 * color; any tag with a symbol adds it (ownz/owner → 💎). Unknown tags
 * are ignored, so a typo never breaks a name.
 * @param {string[]} tags
 * @returns {{ colorName: string|null, symbol: string|null }}
 */
export function getTagEffect(tags) {
  let colorName = null
  let symbol = null
  for (const tag of tags) {
    let def = NAME_TAGS[tag]
    if (def?.aliasOf) def = NAME_TAGS[def.aliasOf]
    if (!def) continue // unknown tag → no effect
    if (def.color) colorName = def.color
    if (def.symbol) symbol = def.symbol
  }
  return { colorName, symbol }
}

/**
 * Apply name tag styling to a name string.
 * @param {string} name - the raw name with potential #/tags
 * @returns {{ displayName: string, className: string, colorName: string|null, hasSymbol: boolean }}
 */
export function applyNameTag(name) {
  const { baseName, tags } = parseNameTags(name)
  const { colorName, symbol } = getTagEffect(tags)

  // Symbol goes before the name (💎 Unbinding), not inside it.
  const displayName = (symbol ? symbol + ' ' : '') + baseName
  const className = colorName
    ? `name-tagged ${TAG_CLASSES[colorName] || ''}`
    : 'name-tagged'

  return { displayName, className, colorName, hasSymbol: !!symbol }
}

/**
 * Check if a name contains any #/tags.
 * @param {string} name
 * @returns {boolean}
 */
export function hasNameTag(name) {
  return /#\/[a-zA-Z0-9_-]+/.test(name || '')
}

/**
 * Add a tag to a name, replacing any tags it already had.
 * @param {string} baseName - the name without tags
 * @param {string|null} tag - the tag to add (null strips tags)
 * @returns {string}
 */
export function addTagToName(baseName, tag) {
  const cleanBase = (baseName || '').replace(tagPattern, '').trim()
  return tag ? `${cleanBase}#/${tag}` : cleanBase
}
