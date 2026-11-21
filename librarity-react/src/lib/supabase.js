/* ================================================================
   Library Games — Supabase client (React)
   PostgreSQL database for leaderboards + visitor logbook
   ================================================================ */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_CONFIG = {
  url: 'https://wiqwrrhlriyaqxrmitzo.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpcXdycmhscml5YXF4cm1pdHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4ODA3OTYsImV4cCI6MjEwMjQ1Njc5Nn0.pw9XCB806F0dNatpqaylbjVX4guT4pImE6KiOF8Pxak',
}

let supabase = null

export function getSupabase() {
  if (!supabase) {
    supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey)
  }
  return supabase
}

/**
 * Submit a score to the leaderboard.
 * Only keeps the best score per player/game/mode/day.
 */
export async function submitScore({ gameType, gameMode, playerName = 'Anonymous', score, timeTaken = null }) {
  const client = getSupabase()

  if (!gameType || !gameMode || score === undefined) {
    throw new Error('Missing required fields: gameType, gameMode, score')
  }

  const scoreValue = parseInt(score)
  if (isNaN(scoreValue)) throw new Error('Score must be a number')

  const today = new Date().toISOString().split('T')[0]

  const data = {
    game_type: gameType,
    game_mode: gameMode,
    player_name: playerName || 'Anonymous',
    score: scoreValue,
    time_taken: timeTaken ? parseInt(timeTaken) : null,
    date_played: today,
  }

  // Check-then-insert: only insert if strictly better than today's best
  const { data: existing } = await client
    .from('leaderboards')
    .select('id, score')
    .eq('game_type', gameType)
    .eq('game_mode', gameMode)
    .eq('player_name', playerName || 'Anonymous')
    .eq('date_played', today)
    .order('score', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing && existing.score >= scoreValue) {
    return null
  }

  if (existing) {
    await client.from('leaderboards').delete().eq('id', existing.id)
  }

  const { data: result, error } = await client
    .from('leaderboards')
    .insert([data])
    .select()

  if (error) throw error
  return result[0]
}

/**
 * Get leaderboard entries from the best-score view.
 */
export async function getLeaderboard({
  gameType = null,
  gameMode = null,
  period = 'all',
  limit = 100,
  offset = 0,
} = {}) {
  const client = getSupabase()

  let query = client.from('leaderboards_best').select('*')

  if (gameType) query = query.eq('game_type', gameType)
  if (gameMode) query = query.eq('game_mode', gameMode)

  const today = new Date().toISOString().split('T')[0]

  if (period === 'daily') {
    query = query.eq('date_played', today)
  } else if (period === 'weekly') {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    query = query.gte('date_played', weekAgo.toISOString().split('T')[0])
  }

  query = query
    .order('score', { ascending: false })
    .order('time_taken', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  const { data, error } = await query
  if (error) throw error

  return (data || []).map((entry, index) => ({ ...entry, rank: offset + index + 1 }))
}

/**
 * Get leaderboard statistics.
 */
export async function getLeaderboardStats({ gameType, gameMode }) {
  const client = getSupabase()

  const { count: totalCount } = await client
    .from('leaderboards')
    .select('*', { count: 'exact', head: true })
    .eq('game_type', gameType)
    .eq('game_mode', gameMode)

  const today = new Date().toISOString().split('T')[0]
  const { count: todayCount } = await client
    .from('leaderboards')
    .select('*', { count: 'exact', head: true })
    .eq('game_type', gameType)
    .eq('game_mode', gameMode)
    .eq('date_played', today)

  const { data: topScores } = await client
    .from('leaderboards')
    .select('score, player_name')
    .eq('game_type', gameType)
    .eq('game_mode', gameMode)
    .order('score', { ascending: false })
    .limit(1)

  return {
    totalEntries: totalCount || 0,
    todayEntries: todayCount || 0,
    topScore: topScores?.[0]?.score || 0,
    topPlayer: topScores?.[0]?.player_name || 'N/A',
  }
}

/** Submit a visitor logbook entry */
export async function submitLogbookEntry({ name = 'Anonymous', message }) {
  const client = getSupabase()
  const { data, error } = await client
    .from('visitor_logbook')
    .insert([{ name: name.trim().slice(0, 40), message: message.trim().slice(0, 280) }])
    .select()
    .single()
  if (error) throw error
  return data
}

/** Fetch visitor logbook entries (most recent first) */
export async function getLogbookEntries({ limit = 100, offset = 0 } = {}) {
  const client = getSupabase()
  const { data, error } = await client
    .from('visitor_logbook')
    .select('id, name, message, created_at')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  if (error) throw error
  return data || []
}
