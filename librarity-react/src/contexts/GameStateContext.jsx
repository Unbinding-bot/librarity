import React, { createContext, useCallback, useContext, useState } from 'react'
import { getDisplayName } from '../lib/logbook'

const GameStateContext = createContext()

/**
 * Game state context — global user identity + score recording helpers.
 * Game-specific stats live in each game's own localStorage keys
 * (same keys as the original vanilla app so progress carries over).
 */
export function GameStateProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return { name: localStorage.getItem('library_username') || null }
    } catch {
      return { name: null }
    }
  })

  const refreshUser = useCallback(() => {
    try {
      setUser({ name: localStorage.getItem('library_username') || null })
    } catch { /* ignore */ }
  }, [])

  /**
   * Record a score for a game — submits to the Supabase leaderboard.
   * Returns the submitted row, or null when skipped/not better.
   */
  const recordScore = useCallback(async ({ gameType, gameMode, score, timeTaken = null, playerName = null }) => {
    const { submitScore } = await import('../lib/supabase')
    return submitScore({
      gameType,
      gameMode,
      playerName: playerName || getDisplayName(),
      score,
      timeTaken,
    })
  }, [])

  return (
    <GameStateContext.Provider value={{ user, refreshUser, recordScore }}>
      {children}
    </GameStateContext.Provider>
  )
}

export function useGameState() {
  const ctx = useContext(GameStateContext)
  if (!ctx) throw new Error('useGameState must be used within a GameStateProvider')
  return ctx
}
