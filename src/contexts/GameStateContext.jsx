import React, { createContext, useContext, useState, useCallback, useRef } from 'react'

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
 * Score recording with race condition handling.
 * Uses check-delete-insert pattern with fallback retry logic.
 * If Supabase fails (offline, blocked), scores fall back to localStorage.
 */
export function GameStateProvider({ children }) {
  const [recording, setRecording] = useState(false)
  // Track in-flight submissions to prevent concurrent ops for same player/game/date
  const inFlightRef = useRef(new Set())

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

      // Create a unique key for this submission
      const submissionKey = `${data.gameType}-${data.gameMode}-${playerName}-${today}`

      // Check if we already have an in-flight submission for this key
      if (inFlightRef.current.has(submissionKey)) {
        // Wait for the other submission to complete
        return null
      }

      inFlightRef.current.add(submissionKey)

      try {
        const payload = {
          game_type: data.gameType,
          game_mode: data.gameMode,
          player_name: playerName,
          score: scoreValue,
          time_taken: data.timeTaken ? parseInt(data.timeTaken) : null,
          date_played: today,
        }

        // Check-then-delete-insert pattern with race condition handling
        const { data: existing, error: selectError } = await sb
          .from('leaderboards')
          .select('id, score')
          .eq('game_type', data.gameType)
          .eq('game_mode', data.gameMode)
          .eq('player_name', playerName)
          .eq('date_played', today)
          .maybeSingle()

        if (selectError) throw selectError

        // If existing score is better or equal, don't submit
        if (existing && existing.score >= scoreValue) return null

        // Delete existing record if we have one
        if (existing?.id) {
          const { error: deleteError } = await sb
            .from('leaderboards')
            .delete()
            .eq('id', existing.id)
          if (deleteError) throw deleteError
        }

        // Insert the new score
        const { data: result, error } = await sb
          .from('leaderboards')
          .insert([payload])
          .select()
        if (error) {
          // Handle race condition: duplicate key violation
          // This happens when two submissions race between check and insert
          if (error.code === '23505' && error.message?.includes('duplicate key')) {
            // One of the submissions won - accept that the score was recorded
            return { localOnly: true, ...payload }
          }
          throw error
        }
        return result?.[0] || null
      } finally {
        inFlightRef.current.delete(submissionKey)
      }
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