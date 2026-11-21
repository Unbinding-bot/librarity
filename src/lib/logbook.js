const USERNAME_KEY = 'library_username'
const LOGBOOK_KEY = 'library_logbook' // local cache of entries
const MAX_LOCAL = 200

export function getUsername() {
  try { return localStorage.getItem(USERNAME_KEY) || null } catch { return null }
}

export function setUsername(name) {
  try {
    if (name && name.trim()) {
      localStorage.setItem(USERNAME_KEY, name.trim().slice(0, 40))
    } else {
      localStorage.removeItem(USERNAME_KEY)
    }
  } catch {}
}

export function getDisplayName() {
  return getUsername() || 'Anonymous'
}

function loadLocalEntries() {
  try { return JSON.parse(localStorage.getItem(LOGBOOK_KEY) || '[]') } catch { return [] }
}

function saveLocalEntries(entries) {
  try { localStorage.setItem(LOGBOOK_KEY, JSON.stringify(entries.slice(0, MAX_LOCAL))) } catch {}
}

function formatWhen(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { date: '', time: '' }
  return {
    date: d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
  }
}

/**
 * Add a logbook entry. Writes to localStorage immediately (optimistic),
 * then tries Supabase — errors are swallowed so the UI never breaks.
 * @returns {Promise<Array>} updated local entries
 */
export async function addLogbookEntry(message, nameOverride = null, supabase = null) {
  if (nameOverride) setUsername(nameOverride)
  const name = getDisplayName()
  const now = new Date()

  const entry = {
    id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    name,
    message: String(message).trim().slice(0, 280),
    ...formatWhen(now.toISOString()),
    ts: now.toISOString(),
  }

  const local = loadLocalEntries()
  local.unshift(entry)
  saveLocalEntries(local)

  if (supabase) {
    try {
      const { error } = await supabase
        .from('visitor_logbook')
        .insert([{ name: entry.name, message: entry.message }])
      if (error) throw error
    } catch (err) {
      console.warn('Logbook: could not save to Supabase, kept locally.', err?.message || err)
    }
  }

  return local
}

/**
 * Get logbook entries. Tries Supabase first (most recent first),
 * falls back to the localStorage cache.
 * @returns {Promise<Array>}
 */
export async function getLogbookEntries(supabase = null) {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('visitor_logbook')
        .select('id, name, message, created_at')
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) throw error
      if (data && data.length > 0) {
        const normalised = data.map((r) => ({
          id: r.id,
          name: r.name,
          message: r.message,
          ...formatWhen(r.created_at),
          ts: r.created_at,
        }))
        saveLocalEntries(normalised)
        return normalised
      }
    } catch (err) {
      console.warn('Logbook: could not fetch from Supabase, using local cache.', err?.message || err)
    }
  }
  return loadLocalEntries()
}
