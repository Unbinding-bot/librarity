import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useToast } from '../contexts/ToastContext'
import GameShell from '../components/ui/GameShell'
import { getLeaderboard, getLeaderboardStats } from '../lib/supabase'

const GAMES = [
  { id: 'wordle', label: 'Wordle', icon: '🔤' },
  { id: 'spelling-bee', label: 'Spelling Bee', icon: '🐝' },
  { id: 'word-ladder', label: 'Word Ladder', icon: '🪜' },
  { id: 'trivia', label: 'Trivia', icon: '🎯' },
  { id: 'flashcards', label: 'Flashcards', icon: '📇' },
  { id: 'wikipedia-race', label: 'Wikipedia Race', icon: '🏁' }
]

const MODES = [
  { id: 'all', label: 'All Scores' },
  { id: 'daily', label: 'Daily Challenge' },
  { id: 'random', label: 'Random Mode' }
]

export default function Leaderboard() {
  const [scores, setScores] = useState({})
  const [stats, setStats] = useState({})
  const [selectedGame, setSelectedGame] = useState('wordle')
  const [selectedMode, setSelectedMode] = useState('daily')
  const [period, setPeriod] = useState('all')
  const [loading, setLoading] = useState(true)

  const { showToast } = useToast()

  const fetchData = async () => {
    setLoading(true)
    try {
      const [scoresData, statsData] = await Promise.all([
        getLeaderboard({
          gameType: selectedGame,
          gameMode: selectedMode === 'all' ? null : selectedMode,
          period
        }),
        getLeaderboardStats({
          gameType: selectedGame,
          gameMode: selectedMode === 'all' ? null : selectedMode
        })
      ])

      setScores(scoresData)
      setStats(statsData)
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
      showToast(`Error loading ${GAMES.find(g => g.id === selectedGame)?.label || 'leaderboard'}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGame, selectedMode, period])

  const gameScores = scores[selectedGame] || []

  return (
    <GameShell
      title="🏆 Leaderboard"
      subtitle="Top scores for each game"
      controls={
        <motion.div className="game-controls" style={{ gap: '0.5rem' }}>
          <select
            className="mode-btn"
            value={selectedGame}
            onChange={(e) => setSelectedGame(e.target.value)}
            style={{ padding: '0.5rem 1rem' }}
          >
            {GAMES.map(game => (
              <option key={game.id} value={game.id}>
                {game.icon} {game.label}
              </option>
            ))}
          </select>

          <select
            className="mode-btn"
            value={selectedMode}
            onChange={(e) => setSelectedMode(e.target.value)}
            style={{ padding: '0.5rem 1rem' }}
          >
            {MODES.map(mode => (
              <option key={mode.id} value={mode.id}>
                {mode.label}
              </option>
            ))}
          </select>

          <select
            className="mode-btn"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{ padding: '0.5rem 1rem' }}
          >
            <option value="all">All Time</option>
            <option value="daily">Today</option>
            <option value="weekly">This Week</option>
          </select>
        </motion.div>
      }
    >
      {/* Stats Summary */}
      <div className="stats-summary" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
        padding: '1rem',
        backgroundColor: 'var(--surface, #f5f5f5)',
        borderRadius: '8px'
      }}>
        <div className="stat-item" style={{ textAlign: 'center' }}>
          <div className="stat-value" style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.totalEntries || 0}</div>
          <div className="stat-label">Total Entries</div>
        </div>
        <div className="stat-item" style={{ textAlign: 'center' }}>
          <div className="stat-value" style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.todayEntries || 0}</div>
          <div className="stat-label">Today's Entries</div>
        </div>
        <div className="stat-item" style={{ textAlign: 'center' }}>
          <div className="stat-value" style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.topScore || 0}</div>
          <div className="stat-label">Top Score</div>
        </div>
        <div className="stat-item" style={{ textAlign: 'center' }}>
          <div className="stat-value" style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.topPlayer || 'N/A'}</div>
          <div className="stat-label">Top Player</div>
        </div>
      </div>

      {/* Leaderboard Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Loading scores...</p>
        </div>
      ) : gameScores.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>No scores yet. Be the first to play!</p>
        </div>
      ) : (
        <div className="leaderboard-table">
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: 'var(--shadow, rgba(0,0,0,0.1) 0 2px 8px)'
          }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--primary, #5C6B3A)', color: '#fff' }}>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Rank</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Player</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Score</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Time</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {gameScores.map((entry, index) => (
                <motion.tr
                  key={entry.id || index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  style={{
                    borderBottom: '1px solid var(--border, #e5e5e5)',
                    backgroundColor: index % 2 === 0 ? 'var(--surface, #fff)' : 'var(--bg, #f9f9f9)'
                  }}
                >
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      fontWeight: 700,
                      color: entry.rank === 1 ? '#FFD700' : entry.rank === 2 ? '#C0C0C0' : entry.rank === 3 ? '#CD7F32' : 'var(--text, #333)'
                    }}>
                      {entry.rank}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>{entry.player_name || 'Anonymous'}</td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>{entry.score}</td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    {entry.time_taken ? `${Math.floor(entry.time_taken / 60)}:${String(entry.time_taken % 60).padStart(2, '0')}` : '-'}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>{entry.date_played}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </GameShell>
  )
}