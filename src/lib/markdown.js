/**
 * Markdown rendering for event descriptions.
 *
 * `marked` parses the description; the output is sanitized by stripping
 * event handler attributes and javascript: URLs so an officer pasting
 * arbitrary text can't inject scripts into the events pages. Only the
 * inline/formatting subset of markdown is meant to be used (bold, italic,
 * links, lists, headings) — the CSS scopes `.md-body` to keep tables and
 * code blocks reasonably styled if someone uses them anyway.
 */
import { marked } from 'marked'

marked.setOptions({
  breaks: true, // single newlines become <br> — event posters read like chat text
  gfm: true,
})

const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'em', 'b', 'i', 'u', 's', 'del', 'ins',
  'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'blockquote', 'code', 'pre', 'hr', 'span', 'div',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
])

/** Strip <script>/<style>/iframes outright, then drop disallowed tags. */
function sanitize(html) {
  let out = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')

  out = out.replace(/<\/?([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^<>]*)?)>/g, (match, tagRaw, attrs) => {
    const tag = tagRaw.toLowerCase()
    if (!ALLOWED_TAGS.has(tag)) return ''
    // Keep only href/target/rel on <a>, and nothing else anywhere else.
    if (tag === 'a') {
      const href = /href\s*=\s*("([^"]*)"|'([^']*)')/i.exec(attrs)
      const url = (href?.[2] ?? href?.[3] ?? '').trim()
      const safe = /^(https?:|mailto:|#|\/)/i.test(url) ? url : ''
      return `<a href="${safe}" target="_blank" rel="noopener noreferrer">`
    }
    return `<${tag}>`
  })

  return out
}

/**
 * Render event-description markdown to sanitized HTML.
 * @param {string} text
 * @returns {string} HTML string (safe to inject via dangerouslySetInnerHTML)
 */
export function renderMarkdown(text) {
  if (!text) return ''
  try {
    return sanitize(marked.parse(String(text)))
  } catch {
    // Never let a bad description break the page — fall back to plain text
    // escaped for HTML.
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')
  }
}
