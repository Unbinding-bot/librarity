/**
 * Icon utility
 *
 * Renders an icon from assets/images/icons/.
 * Priority: .svg → .png → emoji fallback (read from .txt placeholder)
 *
 * Usage:
 *   import { icon, iconImg } from './utils/icons.js';
 *
 *   // Returns an <img> element (or a <span> with the emoji if no image exists)
 *   element.appendChild(icon('home', 20));
 *
 *   // Returns an HTML string for use in innerHTML
 *   btn.innerHTML = iconImg('stats-chart', 24) + ' Stats';
 */

const ICON_BASE = 'assets/images/icons/ui-icons/';

/**
 * Emoji fallbacks — loaded from the .txt placeholder content.
 * Keyed by the icon name (without "icon-" prefix).
 * This map is populated lazily.
 */
const _cache = {};

/**
 * Known emoji fallbacks (matches the .txt files exactly).
 * Keeps the fallback instant without needing an async fetch.
 */
const EMOJI_FALLBACKS = {
    'library-brand':     '📚',
    'home':              '🏠',
    'leaderboard':       '🏆',
    'logbook':           '📖',
    'tools':             '🔧',
    'admin':             '⚙️',
    'daily-calendar':    '📅',
    'random-dice':       '🎲',
    'target':            '🎯',
    'edit-pencil':       '✏️',
    'stats-chart':       '📊',
    'help-question':     '❓',
    'hint-bulb':         '💡',
    'refresh':           '🔄',
    'shuffle':           '🔀',
    'share-clipboard':   '📋',
    'backspace':         '⌫',
    'moon':              '🌙',
    'sun':               '☀️',
    'spelling-bee':      '🐝',
    'word-ladder':       '🪜',
    'trivia':            '🎯',
    'flashcards':        '📇',
    'wiki-race':         '🏁',
    'wordle':            '🎮',
    'rating-hard':       '😓',
    'rating-good':       '😊',
    'rating-easy':       '😎',
    'medal-gold':        '🥇',
    'medal-silver':      '🥈',
    'medal-bronze':      '🥉',
    'celebration':       '🎉',
    'events':            '🎉',
    'announcement':      '📢',
    'rocket':            '🚀',
    'lock':              '🔐',
    'eye-preview':       '👁️',
    'trash-delete':      '🗑️',
    'plus-add':          '➕',
    'sign-logbook':      '✍️',
    'scroll':            '📜',
    'dictionary':        '📖',
    'music-note':        '🎵',
    'loading-hourglass': '⏳',
};

/**
 * Check if an image file exists (lightweight HEAD request, cached).
 * @param {string} url
 * @returns {Promise<boolean>}
 */
async function _exists(url) {
    if (_cache[url] !== undefined) return _cache[url];
    try {
        const r = await fetch(url, { method: 'HEAD' });
        _cache[url] = r.ok;
        return r.ok;
    } catch {
        _cache[url] = false;
        return false;
    }
}

/**
 * Resolve the best source for an icon.
 * Returns { type: 'img', src } or { type: 'emoji', char }.
 * @param {string} name  e.g. 'home' or 'icon-home' (prefix stripped automatically)
 */
export async function resolveIcon(name) {
    // Normalise: strip leading "icon-" if present
    const key = name.replace(/^icon-/, '');
    const base = `${ICON_BASE}icon-${key}`;

    if (await _exists(`${base}.svg`)) return { type: 'img', src: `${base}.svg` };
    if (await _exists(`${base}.png`)) return { type: 'img', src: `${base}.png` };

    return { type: 'emoji', char: EMOJI_FALLBACKS[key] ?? '🔲' };
}

/**
 * Create an icon DOM element asynchronously.
 * Returns a <span> immediately with the emoji, then upgrades to <img> if found.
 *
 * @param {string} name     Icon name, e.g. 'home'
 * @param {number} size     Size in px (applied as width + height)
 * @param {string} alt      Alt text for img (default = name)
 * @returns {HTMLElement}   A <span> container
 */
export function icon(name, size = 20, alt = '') {
    const key  = name.replace(/^icon-/, '');
    const span = document.createElement('span');
    span.className   = `ui-icon ui-icon-${key}`;
    span.style.cssText = `
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: ${size}px;
        height: ${size}px;
        flex-shrink: 0;
    `;

    // Show emoji immediately
    span.textContent = EMOJI_FALLBACKS[key] ?? '🔲';

    // Try to upgrade to image
    resolveIcon(key).then(resolved => {
        if (resolved.type === 'img') {
            const img = document.createElement('img');
            img.src    = resolved.src;
            img.alt    = alt || key;
            img.width  = size;
            img.height = size;
            img.style.cssText = 'display:block;object-fit:contain;';
            span.textContent = '';
            span.appendChild(img);
        }
    });

    return span;
}

/**
 * Return an HTML string for use in innerHTML.
 * Synchronous — always uses emoji. Call icon() for async image upgrade.
 *
 * @param {string} name
 * @param {number} size
 * @returns {string}  HTML string
 */
export function iconImg(name, size = 20) {
    const key   = name.replace(/^icon-/, '');
    const emoji = EMOJI_FALLBACKS[key] ?? '🔲';
    const base  = `${ICON_BASE}icon-${key}`;

    // Return an <img> with onerror fallback to emoji span
    return `<img
        src="${base}.svg"
        width="${size}"
        height="${size}"
        alt="${key}"
        class="ui-icon ui-icon-${key}"
        style="display:inline-block;vertical-align:middle;object-fit:contain;"
        onerror="this.onerror=null;this.src='${base}.png';this.onerror=function(){this.replaceWith(Object.assign(document.createElement('span'),{textContent:'${emoji}',className:'ui-icon ui-icon-${key}',title:'${key}'}))}"
    >`.replace(/\s+/g, ' ');
}

/**
 * Get just the emoji for a given icon name (synchronous, always works).
 * @param {string} name
 * @returns {string}
 */
export function iconEmoji(name) {
    const key = name.replace(/^icon-/, '');
    return EMOJI_FALLBACKS[key] ?? '🔲';
}
