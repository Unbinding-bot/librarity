/**
 * Shared Supabase clients.
 *
 * - `getAnonClient()`  — public reads (events, leaderboards, logbook).
 * - `getAuthClient()`  — same URL/key but with session persistence, used by
 *   the admin page so `auth.signInWithPassword` / `getSession` survive
 *   reloads. Kept separate from the anon client so page components that
 *   only read public data never touch auth state.
 *
 * Both are singletons and both return null if the SDK fails to init,
 * so callers must handle a null client gracefully.
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wiqwrrhlriyaqxrmitzo.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpcXdycmhscml5YXF4cm1pdHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4ODA3OTYsImV4cCI6MjEwMjQ1Njc5Nn0.pw9XCB806F0dNatpqaylbjVX4guT4pImE6KiOF8Pxak'

let _anon = null
export function getAnonClient() {
  if (!_anon) {
    try {
      _anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    } catch {
      return null
    }
  }
  return _anon
}

let _auth = null
export function getAuthClient() {
  if (!_auth) {
    try {
      _auth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true },
      })
    } catch {
      return null
    }
  }
  return _auth
}

export { SUPABASE_URL, SUPABASE_ANON_KEY }
