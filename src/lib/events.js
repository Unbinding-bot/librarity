/**
 * Events data layer — resilient fetch helpers.
 *
 * Every function swallows Supabase errors and returns a safe fallback so the
 * UI renders cleanly even when the `events` table / `event-images` bucket
 * has not been set up yet (no console crashes, no broken routes).
 *
 * Event shape:
 *   { id, title, description, image_url, start_date, end_date, created_at }
 */

import { createClient } from '@supabase/supabase-js'
import { gameTypeLabel } from './gamesRegistry'

const SUPABASE_URL = 'https://wiqwrrhlriyaqxrmitzo.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpcXdycmhscml5YXF4cm1pdHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4ODA3OTYsImV4cCI6MjEwMjQ1Njc5Nn0.pw9XCB806F0dNatpqaylbjVX4guT4pImE6KiOF8Pxak'

let _client = null
function getClient() {
  if (!_client) {
    try {
      _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    } catch {
      return null
    }
  }
  return _client
}

/** YYYY-MM-DD for today (no time component). */
function todayStr() {
  return new Date().toISOString().split('T')[0]
}

/**
 * Fetch all events, most recent first.
 * @param {{ currentOnly?: boolean }} opts
 */
export async function fetchEvents({ currentOnly = false } = {}) {
  const sb = getClient()
  if (!sb) return []
  try {
    let q = sb
      .from('events')
      .select('*')
      .order('start_date', { ascending: true })

    if (currentOnly) {
      q = q.gte('end_date', todayStr())
    }

    const { data, error } = await q
    if (error) throw error
    return data || []
  } catch (err) {
    console.warn('events: fetch failed, rendering empty:', err?.message || err)
    return []
  }
}

/**
 * Fetch a single event by id. Returns null on any failure.
 */
export async function fetchEvent(id) {
  const sb = getClient()
  if (!sb) return null
  try {
    const { data, error } = await sb
      .from('events')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data || null
  } catch (err) {
    console.warn('events: single fetch failed:', err?.message || err)
    return null
  }
}

/**
 * Top 10 scores of all time from the existing leaderboard table.
 * Returns [] on failure so the sidebar renders an empty state, never a crash.
 */
export async function fetchTopLeaderboard(limit = 10) {
  const sb = getClient()
  if (!sb) return []
  try {
    const { data, error } = await sb
      .from('leaderboards_best')
      .select('player_name, game_type, game_mode, score, date_played')
      .order('score', { ascending: false })
      .order('player_name', { ascending: true })
      .limit(limit)
    if (error) throw error
    return data || []
  } catch (err) {
    console.warn('events: leaderboard fetch failed:', err?.message || err)
    return []
  }
}

/** Human-readable game label for the raw snake_case stored in the DB. */
export function gameLabel(gameType) {
  return gameTypeLabel(gameType) || gameType
}

/** Format a date range for cards: "Nov 24 – Dec 1" (year only when it differs). */
export function formatEventDateRange(start, end) {
  if (!start) return ''
  const opts = { month: 'short', day: 'numeric' }
  const yearOpts = { year: 'numeric', month: 'long', day: 'numeric' }
  const s = new Date(start + 'T00:00:00')
  const e = end ? new Date(end + 'T00:00:00') : null
  const thisYear = s.getFullYear() === new Date().getFullYear()
  const fmt = (d, withYear) =>
    d.toLocaleDateString('en-US', withYear ? yearOpts : opts)
  if (!e) return fmt(s, !thisYear)
  if (s.getTime() === e.getTime()) return fmt(s, !thisYear)
  return `${fmt(s, !thisYear)} – ${fmt(e, !thisYear)}`
}

/** Status for a card badge. */
export function eventStatus(start, end) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const s = start ? new Date(start + 'T00:00:00') : null
  const e = end ? new Date(end + 'T00:00:00') : null
  // Check "not started" BEFORE "still running": an event whose end date is
  // in the future but whose start date hasn't arrived yet is "Coming soon",
  // not "Happening now" (the original order mislabeled every future event).
  if (s && s > today) return { label: 'Coming soon', tone: 'yellow' }
  if (e && e >= today) return { label: 'Happening now', tone: 'green' }
  return { label: 'Past', tone: 'muted' }
}