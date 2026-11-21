/* ================================================================
   Visitor Logbook — username + entry management (React)
   ================================================================ */
import { submitLogbookEntry as supabaseSubmit, getLogbookEntries as supabaseFetch } from './supabase'

const USERNAME_KEY = 'library_username'
const LOGBOOK_KEY = 'library_logbook' // local cache
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
  } catch { /* ignore */ }
}

export function getDisplayName() {
  return getUsername() || 'Anonymous'
}

function loadLocalEntries() {
  try { return JSON.parse(localStorage.getItem(LOGBOOK_KEY) || '[]') } catch { return [] }
}

function saveLocalEntries(entries) {
  try { localStorage.setItem(LOGBOOK_KEY, JSON.stringify(entries)) } catch { /* ignore */ }
}

/** Add a new logbook entry. Saves to Supabase, falls back to localStorage. */
export async function addLogbookEntry(message, nameOverride = null) {
  if (nameOverride) setUsername(nameOverride)
  const name = getDisplayName()
  const now = new Date()

  const entry = {
    id: `${Date.now()}-${Math.random()}`,
    name,
    message: message.trim().slice(0, 280),
    date: now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
    time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    ts: now.toISOString(),
  }

  // Always write to localStorage immediately (optimistic)
  const local = loadLocalEntries()
  local.unshift(entry)
  if (local.length > MAX_LOCAL) local.splice(MAX_LOCAL)
  saveLocalEntries(local)

  // Also try Supabase — silently swallow errors so the UI never breaks
  try {
    await supabaseSubmit({ name: entry.name, message: entry.message })
  } catch (err) {
    console.warn('Logbook: could not save to Supabase, kept locally.', err?.message)
  }

  return local
}

/** Get logbook entries. Tries Supabase first, falls back to localStorage cache. */
export async function fetchLogbookEntries() {
  try {
    const rows = await supabaseFetch({ limit: 200 })
    if (rows && rows.length > 0) {
      const normalised = rows.map(r => {
        const d = new Date(r.created_at)
        return {
          id: r.id,
          name: r.name,
          message: r.message,
          date: d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
          time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          ts: r.created_at,
        }
      })
      saveLocalEntries(normalised)
      return normalised
    }
  } catch (err) {
    console.warn('Logbook: could not fetch from Supabase, using local cache.', err?.message)
  }
  return loadLocalEntries()
}
