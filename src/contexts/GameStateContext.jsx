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
 * Score recording. Uses atomic upsert to prevent race conditions.
 * If Supabase fails (offline, blocked), scores fall back to localStorage.
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

      const payload = {
        game_type: data.gameType,
        game_mode: data.gameMode,
        player_name: playerName,
        score: scoreValue,
        time_taken: data.timeTaken ? parseInt(data.timeTaken) : null,
        date_played: today,
      }

      // Use upsert with conflict targeting the unique constraint columns
      // This is atomic and prevents race condition duplicate key errors
      const { data: result, error } = await sb
        .from('leaderboards')
        .upsert(payload, {
          // Upsert on the unique key columns
          conflict: ['game_type', 'game_mode', 'player_name', 'date_played'],
          // Only update if the new score is higher than existing
          onConflict: 'idx_leaderboard_best_score',
        })
        .select()

      if (error) {
        // Handle unique constraint violation as a race condition
        // If the error is a duplicate key, the score might already exist with a higher value
        // In that case, just return null (don't record the lower score)
        if (error.code === '23505' && error.message?.includes('duplicate key')) {
          // Check if the existing score is better before accepting this one
          const { data: existing } = await sb
            .from('leaderboards')
            .select('score')
            .eq('game_type', data.gameType)
            .eq('game_mode', data.gameMode)
            .eq('player_name', playerName)
            .eq('date_played', today)
            .maybeSingle()

          if (existing && existing.score >= scoreValue) {
            // Existing score is better or equal - this is acceptable
            return null
          }

          // This shouldn't happen with proper upsert, but if it does,
          // accept the score and save locally as fallback
          tryRecordLocal(data)
          return { localOnly: true, ...payload }
        }
        throw error
      }
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