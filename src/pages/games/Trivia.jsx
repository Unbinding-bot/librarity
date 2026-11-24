import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import GameShell, { Modal } from '../../components/ui/GameShell'
import { useToast } from '../../contexts/ToastContext'
import { useGameState } from '../../contexts/GameStateContext'
import NamePrompt from '../../components/ui/NamePrompt'
import { getDisplayName } from '../../lib/logbook'

import questionsData from '../../assets/trivia-questions.json'

const CATEGORIES = [
  { id: 'all', name: 'All Categories', icon: 'All' },
  { id: 'history', name: 'History', icon: 'History' },
  { id: 'geography', name: 'Geography', icon: 'Geography' },
  { id: 'science', name: 'Science', icon: 'Science' },
  { id: 'literature', name: 'Literature', icon: 'Literature' },
  { id: 'arts', name: 'Arts & Entertainment', icon: 'Arts' },
  { id: 'general', name: 'General Knowledge', icon: 'General' },
]

const DIFFICULTIES = [
  { id: 'all', name: 'Mixed' },
  { id: 'easy', name: 'Easy' },
  { id: 'medium', name: 'Medium' },
  { id: 'hard', name: 'Hard' },
]

const COUNTS = [10, 20, 30]

const BASE_POINTS = { easy: 10, medium: 20, hard: 30 }
const RESULT_DELAY = 2000

const GRADES = [
  { min: 100, grade: 'A+' },
  { min: 93, grade: 'A' },
  { min: 90, grade: 'A-' },
  { min: 87, grade: 'B+' },
  { min: 83, grade: 'B' },
  { min: 80, grade: 'B-' },
  { min: 77, grade: 'C+' },
  { min: 73, grade: 'C' },
  { min: 70, grade: 'C-' },
  { min: 67, grade: 'D+' },
  { min: 63, grade: 'D' },
  { min: 60, grade: 'D-' },
  { min: 0, grade: 'F' },
]

const DEFAULT_STATS = {
  gamesPlayed: 0,
  questionsAnswered: 0,
  correctAnswers: 0,
  totalScore: 0,
  bestScore: 0,
  bestStreak: 0,
  categoryStats: {},
}

function loadStats() {
  try {
    const saved = localStorage.getItem('triviaStats')
    return saved ? { ...DEFAULT_STATS, ...JSON.parse(saved) } : { ...DEFAULT_STATS }
  } catch {
    return { ...DEFAULT_STATS }
  }
}

function saveStats(stats) {
  try {
    localStorage.setItem('triviaStats', JSON.stringify(stats))
  } catch {}
}

function gradeFor(pct) {
  for (const g of GRADES) {
    if (pct >= g.min) return g.grade
  }
  return 'F'
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function Trivia() {
  const { showToast } = useToast()

  const [screen, setScreen] = useState('settings') // settings | playing | results
  const [category, setCategory] = useState('all')
  const [difficulty, setDifficulty] = useState('all')
  const [count, setCount] = useState(10)

  const [questions, setQuestions] = useState([])
  const [qIndex, setQIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [answered, setAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [revealedAt, setRevealedAt] = useState(0)

  const [showStats, setShowStats] = useState(false)
  const [result, setResult] = useState(null)
  const [stats, setStats] = useState(() => loadStats())

  const startedRef = useRef(false)
  const scoreRef = useRef(0)
  const correctRef = useRef(0)
  const { recordScore } = useGameState()
  const [namePrompt, setNamePrompt] = useState(null)

  const doSubmitScore = useCallback(
    async (score) => {
      try {
        const username = await new Promise((resolve) => setNamePrompt({ resolve }))
        if (!username) return
        await recordScore({
          gameType: 'trivia',
          gameMode: difficulty,
          playerName: username || getDisplayName(),
          score,
          timeTaken: null,
        })
        showToast(`Score submitted as "${username}"!`, 'success')
      } catch (err) {
        console.error('Error submitting score:', err)
        showToast('Could not submit score', 'error')
      }
    },
    [recordScore, showToast, difficulty],
  )

  useEffect(() => { scoreRef.current = score }, [score])
  useEffect(() => { correctRef.current = correctCount }, [correctCount])

  const startGame = useCallback(() => {
    let pool = [...questionsData]
    if (category !== 'all') pool = pool.filter((q) => q.category === category)
    if (difficulty !== 'all') pool = pool.filter((q) => q.difficulty === difficulty)
    if (pool.length < count) {
      showToast(`Only ${pool.length} questions available, using all of them`, 'info')
    }
    const chosen = shuffle(pool).slice(0, Math.min(count, pool.length)).map((q) => ({
      ...q,
      shuffledAnswers: shuffle(q.answers),
    }))
    if (chosen.length === 0) {
      showToast('No questions match that filter', 'error')
      return
    }
    setQuestions(chosen)
    setQIndex(0)
    setSelected(null)
    setAnswered(false)
    setScore(0)
    setStreak(0)
    setCorrectCount(0)
    setResult(null)
    setScreen('playing')
  }, [category, difficulty, count, showToast])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    setStats(loadStats())
  }, [])

  const current = questions[qIndex]

  const finishGame = useCallback(
    (finalScore, finalCorrect, totalQuestions) => {
      const s = loadStats()
      s.gamesPlayed += 1
      s.questionsAnswered += totalQuestions
      s.correctAnswers += finalCorrect
      s.totalScore += finalScore
      if (finalScore > s.bestScore) s.bestScore = finalScore
      if (!s.categoryStats[category]) {
        s.categoryStats[category] = { played: 0, correct: 0 }
      }
      s.categoryStats[category].played += totalQuestions
      s.categoryStats[category].correct += finalCorrect
      saveStats(s)
      setStats(s)

      const pct = totalQuestions > 0 ? Math.round((finalCorrect / totalQuestions) * 100) : 0
      const grade = gradeFor(pct)
      setResult({ score: finalScore, correct: finalCorrect, total: totalQuestions, pct, grade })
      setScreen('results')
      // auto-submit to leaderboard
      doSubmitScore(finalScore)
    },
    [category],
  )

  const handleAnswer = useCallback(
    (answer) => {
      if (answered || !current) return
      setSelected(answer)
      setAnswered(true)
      setRevealedAt(Date.now())
      const isCorrect = answer === current.correct
      if (isCorrect) {
        const base = BASE_POINTS[current.difficulty] || 10
        const bonus = streak * 5
        const pts = base + bonus
        setScore((s) => s + pts)
        setStreak((st) => st + 1)
        setCorrectCount((c) => c + 1)
        showToast(`+${pts}${bonus > 0 ? ` (streak +${bonus})` : ''}`, 'success')
      } else {
        setStreak(0)
        showToast('Wrong answer', 'error')
      }
      setTimeout(() => {
        if (qIndex + 1 >= questions.length) {
          finishGame(
            scoreRef.current + (isCorrect ? (BASE_POINTS[current.difficulty] || 10) + streak * 5 : 0),
            correctRef.current + (isCorrect ? 1 : 0),
            questions.length,
          )
        } else {
          setQIndex((i) => i + 1)
          setSelected(null)
          setAnswered(false)
        }
      }, RESULT_DELAY)
    },
    [answered, current, streak, qIndex, questions.length, finishGame, showToast],
  )

  if (screen === 'settings') {
    return (
      <GameShell
        title="Trivia"
        subtitle="Test your knowledge across six categories"
        accent="var(--nb-pink)"
        controls={
          <>
            <button className="icon-btn" title="Stats" onClick={() => setShowStats(true)}>Stats</button>
          </>
        }
      >
        <div className="trivia-settings" data-testid="trivia-settings">
          <div className="trivia-setting-group">
            <h3 className="trivia-setting-label">Category</h3>
            <div className="trivia-options">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  className={`mode-btn${category === c.id ? ' active' : ''}`}
                  onClick={() => setCategory(c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className="trivia-setting-group">
            <h3 className="trivia-setting-label">Difficulty</h3>
            <div className="trivia-options">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.id}
                  className={`mode-btn${difficulty === d.id ? ' active' : ''}`}
                  onClick={() => setDifficulty(d.id)}
                >
                  {d.name}
                </button>
              ))}
            </div>
          </div>

          <div className="trivia-setting-group">
            <h3 className="trivia-setting-label">Questions</h3>
            <div className="trivia-options">
              {COUNTS.map((n) => (
                <button
                  key={n}
                  className={`mode-btn${count === n ? ' active' : ''}`}
                  onClick={() => setCount(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <button className="btn btn-primary trivia-start-btn" onClick={startGame} data-testid="trivia-start">
            ▶ Start Quiz
          </button>
        </div>

      {showStats && (
        <Modal title="Your Statistics" onClose={() => setShowStats(false)}>
          <div className="stats-summary">
            <div className="stat-item">
              <span className="stat-value">{stats.gamesPlayed}</span>
              <span className="stat-label">Games</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.bestScore}</span>
              <span className="stat-label">Best Score</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">
                {stats.questionsAnswered > 0
                  ? Math.round((stats.correctAnswers / stats.questionsAnswered) * 100)
                  : 0}%
              </span>
              <span className="stat-label">Accuracy</span>
            </div>
          </div>
          {Object.keys(stats.categoryStats).length > 0 && (
            <div className="trivia-cat-stats">
              <h4>By Category</h4>
              {Object.entries(stats.categoryStats).map(([cat, s]) => (
                <div key={cat} className="trivia-cat-row">
                  <span>{cat}</span>
                  <span>
                    {s.correct}/{s.played} ({s.played > 0 ? Math.round((s.correct / s.played) * 100) : 0}%)
                  </span>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
      </GameShell>
    )
  }

  if (screen === 'playing' && current) {
    const catInfo = CATEGORIES.find((c) => c.id === current.category)
    return (
      <GameShell
        title="Trivia"
        subtitle={`Question ${qIndex + 1} of ${questions.length}`}
        wide
      >
        <div className="trivia-progress-row">
          <div className="trivia-progress-track">
            <div
              className="trivia-progress-fill"
              style={{ width: `${(qIndex / questions.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="game-info">
          <div className="info-item">
            <span className="info-label">Score</span>
            <span className="info-value" data-testid="trivia-score">{score}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Streak</span>
            <span className="info-value">{streak > 0 ? `${streak}` : '-'}</span>
          </div>
        </div>

        <div className="trivia-question-card" data-testid="trivia-question">
          <div className="trivia-question-meta">
            <span className="trivia-cat-chip">{catInfo?.icon} {catInfo?.name || current.category}</span>
            <span className={`trivia-diff-chip trivia-diff-${current.difficulty}`}>
              {current.difficulty}
            </span>
          </div>
          <h2 className="trivia-question-text">{current.question}</h2>
          <div className="trivia-answers">
            {current.shuffledAnswers.map((a) => {
              let cls = 'trivia-answer'
              if (answered) {
                if (a === current.correct) cls += ' trivia-answer-correct'
                else if (a === selected) cls += ' trivia-answer-wrong'
                else cls += ' trivia-answer-dim'
              }
              return (
                <button
                  key={a}
                  className={cls}
                  disabled={answered}
                  data-testid={`trivia-answer-${a.replace(/\s+/g, '-').toLowerCase()}`}
                  onClick={() => handleAnswer(a)}
                >
                  {a}
                </button>
              )
            })}
          </div>
        </div>
      </GameShell>
    )
  }

  if (screen === 'results' && result) {
    return (
      <GameShell title="Trivia" subtitle="Quiz complete">
        <div className="game-result trivia-results-inline" data-testid="trivia-results">
          <div className="result-content">
            <div className="result-title">{result.grade}</div>
            <div className="result-message">
              You got {result.correct} of {result.total} right ({result.pct}%)
            </div>
            <div className="result-stats">
              <div className="result-stat">
                <span className="result-stat-value">{result.score}</span>
                <span className="result-stat-label">Score</span>
              </div>
              <div className="result-stat">
                <span className="result-stat-value">{result.correct}/{result.total}</span>
                <span className="result-stat-label">Correct</span>
              </div>
              <div className="result-stat">
                <span className="result-stat-value">{result.pct}%</span>
                <span className="result-stat-label">Accuracy</span>
              </div>
            </div>
            <div className="result-actions">
              <button className="btn btn-secondary" onClick={() => setScreen('settings')}>
                New Quiz
              </button>
            </div>
          </div>
        </div>

        {/* Name prompt for score submission */}
        {namePrompt && (
          <NamePrompt
            onDone={(name) => {
              namePrompt.resolve(name)
              setNamePrompt(null)
            }}
          />
        )}
      </GameShell>
    )
  }

  return (
    <GameShell title="Trivia" subtitle="Loading…">
      <p style={{ textAlign: 'center' }}>Loading questions…</p>
    </GameShell>
  )
}
