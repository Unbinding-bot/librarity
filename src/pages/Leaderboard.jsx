import React, { useState, useEffect, useRef, useCallback } from 'react'
import GameShell from '../components/ui/GameShell'
import SkeletonLoader from '../components/ui/SkeletonLoader'
import { useToast } from '../contexts/ToastContext'
import { getAnonClient as getClient } from '../lib/supabase'
import { GAMES, gameTypeLabel } from '../lib/gamesRegistry'
import { applyNameTag } from '../lib/nameTags'

const PAGE_SIZE = 15

const GAME_TYPES = [
  { id: 'all', name: 'All Games' },
  ...GAMES.map((g) => ({ id: g.scoreType, name: g.name })),
]

const PERIODS = [
  { id: 'all', name: 'All Time' },
  { id: 'weekly', name: 'This Week' },
  { id: 'daily', name: 'Today' },
]

function formatTime(seconds) {
  if (seconds == null) return '-'
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function medalFor(rank) {
  return `${rank}`
}

/** Render a player name with easter-egg tags (e.g. "Claude#/bernz") applied. */
function renderPlayerName(name) {
  const tagged = applyNameTag(name)
  return (
    <span className={tagged.className}>
      {tagged.displayName}
    </span>
  )
}

export default function Leaderboard() {
  const { showToast } = useToast()

  const [period, setPeriod] = useState('all')
  const [gameType, setGameType] = useState('all')
  const [gameMode, setGameMode] = useState('all')

  const [entries, setEntries] = useState([])
  const [stats, setStats] = useState({ totalEntries: 0, todayEntries: 0, topScore: null, topPlayer: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)

  const [showSubmit, setShowSubmit] = useState(false)
  const [submitName, setSubmitName] = useState('')
  const [submitScore, setSubmitScore] = useState('')
  const [submitTime, setSubmitTime] = useState('')
  const [submitGame, setSubmitGame] = useState('wordle')
  const [submitMode, setSubmitMode] = useState('daily')
  const [submitting, setSubmitting] = useState(false)

  const loadLeaderboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    const sb = getClient()
    if (!sb) {
      setError('Could not connect to the leaderboard service.')
      setLoading(false)
      return
    }
    try {
      const today = new Date().toISOString().split('T')[0]
      let query = sb.from('leaderboards_best').select('*', { count: 'exact' })
      if (period === 'daily') query = query.eq('date_played', today)
      if (period === 'weekly') {
        const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
        query = query.gte('date_played', weekAgo)
      }
      if (gameType !== 'all') query = query.eq('game_type', gameType)
      if (gameMode !== 'all') query = query.eq('game_mode', gameMode)

      const { data, count, error: err } = await query
        .order('score', { ascending: false })
        .order('player_name', { ascending: true })
        .order('time_taken', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      if (err) throw err
      setEntries(data || [])
      setTotalCount(count || 0)
    } catch (err) {
      setError(`Failed to load leaderboard: ${err.message || err}`)
    } finally {
      setLoading(false)
    }
  }, [period, gameType, gameMode, page])

  const loadStats = useCallback(async () => {
    const sb = getClient()
    if (!sb) return
    try {
      const today = new Date().toISOString().split('T')[0]

      const [{ count: total }, { count: todayCount }, { data: top }] = await Promise.all([
        sb.from('leaderboards_best').select('*', { count: 'exact', head: true }),
        sb.from('leaderboards_best').select('*', { count: 'exact', head: true }).eq('date_played', today),
        sb.from('leaderboards_best').select('player_name, score').order('score', { ascending: false }).order('player_name', { ascending: true }).limit(1).maybeSingle(),
      ])

      setStats({
        totalEntries: total || 0,
        todayEntries: todayCount || 0,
        topScore: top?.score ?? null,
        topPlayer: top?.player_name ?? null,
      })
    } catch {
      // stats are non-critical
    }
  }, [])

  useEffect(() => {
    loadLeaderboard()
  }, [loadLeaderboard])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const handleScoreSubmit = useCallback(async () => {
    const scoreVal = parseInt(submitScore)
    if (!submitName.trim() || Number.isNaN(scoreVal)) {
      showToast('Enter a name and a numeric score', 'error')
      return
    }
    setSubmitting(true)
    const sb = getClient()
    try {
      const today = new Date().toISOString().split('T')[0]
      const { error: err } = await sb.from('leaderboards').insert([
        {
          game_type: submitGame,
          game_mode: submitMode,
          player_name: submitName.trim().slice(0, 40),
          score: scoreVal,
          time_taken: submitTime ? parseInt(submitTime) : null,
          date_played: today,
        },
      ])
      if (err) throw err
      showToast('Score submitted!', 'success')
      setShowSubmit(false)
      setSubmitScore('')
      setSubmitTime('')
      loadLeaderboard()
      loadStats()
    } catch (err) {
      showToast(`Submit failed: ${err.message || err}`, 'error')
    } finally {
      setSubmitting(false)
    }
  }, [submitName, submitScore, submitTime, submitGame, submitMode, showToast, loadLeaderboard, loadStats])

  const availableModes = gameType === 'all'
    ? [{ id: 'all', name: 'All Modes' }]
    : [{ id: 'all', name: 'All Modes' }, { id: 'daily', name: 'Daily' }, { id: 'random', name: 'Random' }, { id: 'unlimited', name: 'Unlimited' }]

  return (
    <GameShell
      title="Leaderboard"
      subtitle="Top scores across all Librarity games"
      wide
      controls={
        <>
          {PERIODS.map((p) => (
            <button
              key={p.id}
              className={`mode-btn${period === p.id ? ' active' : ''}`}
              onClick={() => { setPeriod(p.id); setPage(0) }}
            >
              {p.name}
            </button>
          ))}
        </>
      }
    >
      {/* Filters */}
      <div className="lb-filters" data-testid="lb-filters">
        <select
          className="form-select lb-filter"
          value={gameType}
          onChange={(e) => { setGameType(e.target.value); setGameMode('all'); setPage(0) }}
          data-testid="lb-game-filter"
        >
          {GAME_TYPES.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
        <select
          className="form-select lb-filter"
          value={gameMode}
          onChange={(e) => { setGameMode(e.target.value); setPage(0) }}
        >
          {availableModes.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      {/* Stat cards */}
      <div className="lb-stats" data-testid="lb-stats">
        <div className="stat-box">
          <span className="stat-value">{stats.totalEntries}</span>
          <span className="stat-label">Total Entries</span>
        </div>
        <div className="stat-box">
          <span className="stat-value">{stats.todayEntries}</span>
          <span className="stat-label">Today</span>
        </div>
        <div className="stat-box">
          <span className="stat-value">{stats.topScore ?? '-'}</span>
          <span className="stat-label">Top Score</span>
        </div>
        <div className="stat-box">
          <span className="stat-value lb-top-player">{stats.topPlayer ? renderPlayerName(stats.topPlayer) : '-'}</span>
          <span className="stat-label">Top Player</span>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <SkeletonLoader count={8} variant="table" />
      ) : error ? (
        <div className="tool-error" data-testid="lb-error">
          <p>{error}</p>
          <button className="btn btn-secondary" onClick={loadLeaderboard}>Retry</button>
        </div>
      ) : entries.length === 0 ? (
        <div className="tool-empty" data-testid="lb-empty">
          <p>No scores yet for this filter. Be the first, play a game and submit!</p>
        </div>
      ) : (
        <div className="lb-table-wrap" data-testid="lb-table">
          <table className="lb-table">
            <thead>
              <tr>
                <th className="lb-col-rank">#</th>
                <th className="lb-col-player">Player</th>
                <th className="lb-col-game">Game</th>
                <th className="lb-col-mode">Mode</th>
                <th className="lb-col-score">Score</th>
                <th className="lb-col-time">Time</th>
                <th className="lb-col-date">Date</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => {
                // Ties share a rank: the rank shown is the position of the
                // first row with this score, so two players on the same score
                // both show "1" (or "2") instead of 1 and 2.
                const rank = entries.findIndex((r) => r.score === e.score) + 1
                const isTop = rank <= 3
                return (
                  <tr key={e.id || i} className={isTop ? `lb-row-top lb-row-${rank}` : ''}>
                    <td className="lb-col-rank">{medalFor(rank)}</td>
                    <td className="lb-col-player">{renderPlayerName(e.player_name)}</td>
                    <td className="lb-col-game">{gameTypeLabel(e.game_type) || e.game_type}</td>
                    <td className="lb-col-mode">{e.game_mode}</td>
                    <td className="lb-col-score">{e.score}</td>
                    <td className="lb-col-time">
                      {e.game_type === 'word_ladder' && e.game_mode === 'unlimited'
                        ? `${e.time_taken} round${e.time_taken === 1 ? '' : 's'}`
                        : e.game_type === 'wordle' && e.game_mode === 'unlimited'
                          ? `${e.time_taken} round${e.time_taken === 1 ? '' : 's'}`
                          : e.game_type === 'wikipedia_race' && e.game_mode === 'unlimited'
                            ? `${e.time_taken} race${e.time_taken === 1 ? '' : 's'}`
                            : e.game_type === 'trivia'
                              ? `${e.time_taken ?? 0} question${e.time_taken === 1 ? '' : 's'}`
                              : e.game_type === 'spelling_bee'
                                ? `${e.time_taken ?? 0} word${e.time_taken === 1 ? '' : 's'}`
                                : formatTime(e.time_taken)}
                    </td>
                    <td className="lb-col-date">{e.date_played}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div className="lb-pagination">
          <button className="btn btn-sm btn-outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            ← Prev
          </button>
          <span className="lb-page-info">Page {page + 1} of {totalPages}</span>
          <button className="btn btn-sm btn-outline" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
            Next →
          </button>
        </div>
      )}

      {/* Submit modal — removed per user request: no score submission UI */}
      {showSubmit && (
        <div className="modal" onClick={(e) => { if (e.target === e.currentTarget) setShowSubmit(false) }}>
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Submit a Score</h2>
              <button className="modal-close" onClick={() => setShowSubmit(false)} aria-label="Close">×</button>
            </div>
            <div className="modal-body">
              <p>Score submission has been disabled.</p>
            </div>
          </div>
        </div>
      )}
    </GameShell>
  )
}
