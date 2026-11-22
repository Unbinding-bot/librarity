import React, { createContext, useContext, useState, useCallback } from 'react'

import { getAnonClient as getClient } from '../lib/supabase'

const GameStateContext = createContext(null)

function tryRecordLocal(data) {
  try {
    const key = 'librarity_local_scores'
    const arr = JSON.parse(localStorage.getItem(key) || '[]')
    arr.push({ ...data, date_played: new Date().toISOString().split('T')[0] })
    localStorage.setItem(key, JSON.stringify(arr))
  } catch {}
}

/**
 * Score recording. Supabase is attempted first; if it fails (offline, blocked),
 * scores fall back to localStorage so the UI still works.
 */
export function GameStateProvider({ children }) {
  const [recording, setRecording] = useState(false)

  const recordScore = useCallback(async (data) => {
    setRecording(true)
    try {
      const sb = getClient()
      if (!sb) {
        tryRecordLocal(data)
        return null
      }

      const today = new Date().toISOString().split('T')[0]
      const playerName = data.playerName || 'Anonymous'
      const scoreValue = parseInt(data.score) || 0

      // Check-then-insert: keep only the best score per player/game/day.
      const { data: existing } = await sb
        .from('leaderboards')
        .select('id, score')
        .eq('game_type', data.gameType)
        .eq('game_mode', data.gameMode)
        .eq('player_name', playerName)
        .eq('date_played', today)
        .order('score', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existing && existing.score >= scoreValue) return null
      if (existing) {
        await sb.from('leaderboards').delete().eq('id', existing.id)
      }

      const payload = {
        game_type: data.gameType,
        game_mode: data.gameMode,
        player_name: playerName,
        score: scoreValue,
        time_taken: data.timeTaken ? parseInt(data.timeTaken) : null,
        date_played: today,
      }
      const { data: result, error } = await sb.from('leaderboards').insert([payload]).select()
      if (error) throw error
      return result?.[0] || null
    } catch (err) {
      console.warn('Score saved locally (Supabase unavailable):', err?.message || err)
      tryRecordLocal(data)
      return null
    } finally {
      setRecording(false)
    }
  }, [])

  return (
    <GameStateContext.Provider value={{ recordScore, recording }}>
      {children}
    </GameStateContext.Provider>
  )
}

export function useGameState() {
  const ctx = useContext(GameStateContext)
  if (!ctx) throw new Error('useGameState must be used within GameStateProvider')
  return ctx
}

export default GameStateProvider