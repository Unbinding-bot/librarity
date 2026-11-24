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

const BASE_POINTS = { easy: 50, medium: 100, hard: 200 }
const STREAK_CAP = 20 // max multiplier rounds
const RESULT_DELAY = 2000
const INITIAL_HEARTS = 5
const HEARTS_PER_WAVE = 5 // correct answers to earn +1 heart

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

  // Hearts state for unlimited mode
  const [hearts, setHearts] = useState(INITIAL_HEARTS)
  const [unlimitedWaveCorrect, setUnlimitedWaveCorrect] = useState(0) // count correct this wave toward next heart

  const [showStats, setShowStats] = useState(false)
  const [result, setResult] = useState(null)
  const [stats, setStats] = useState(() => loadStats())

  const startedRef = useRef(false)
  const scoreRef = useRef(0)
  const correctRef = useRef(0)
  const heartsRef = useRef(INITIAL_HEARTS) // async truth for the reveal timeout
  // Guards against finishing an unlimited session twice (StrictMode updaters,
  // extra wrong answers after the last heart is gone, reveal-timeout races).
  const sessionOverRef = useRef(false)
  // True once finishGame has run for the current game — stats must record once.
  const finishedRef = useRef(false)
  // Real difficulty chosen on the settings screen; 'unlimited' overrides the
  // difficulty state during an unlimited session, so this keeps the filter.
  const difficultyFilterRef = useRef('all')
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
  useEffect(() => { heartsRef.current = hearts }, [hearts])

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
    setUnlimitedWaveCorrect(0)
    setHearts(INITIAL_HEARTS)
    heartsRef.current = INITIAL_HEARTS
    sessionOverRef.current = false
    finishedRef.current = false
    setResult(null)
    setScreen('playing')
  }, [category, difficulty, count, showToast])

  /** Restore the settings screen with no unlimited remnants leaking through:
   * difficulty back to the player's chosen filter, hearts and session refs cleared. */
  const exitToSettings = useCallback(() => {
    // Leaving an unlimited session restores the real difficulty filter;
    // a normal session keeps the player's chosen difficulty untouched.
    setDifficulty(difficulty === 'unlimited' ? difficultyFilterRef.current : difficulty)
    difficultyFilterRef.current = 'all'
    setHearts(INITIAL_HEARTS)
    heartsRef.current = INITIAL_HEARTS
    setUnlimitedWaveCorrect(0)
    sessionOverRef.current = false
    finishedRef.current = false
    setQuestions([])
    setQIndex(0)
    setSelected(null)
    setAnswered(false)
    setResult(null)
    setScreen('settings')
  }, [difficulty])

  // Start unlimited mode
  const startUnlimited = useCallback(() => {
    let pool = [...questionsData]
    if (category !== 'all') pool = pool.filter((q) => q.category === category)
    if (difficulty !== 'all') pool = pool.filter((q) => q.difficulty === difficulty)
    if (pool.length === 0) {
      showToast('No questions match that filter', 'error')
      return
    }
    // Remember the real difficulty filter for pool replenishment — the
    // difficulty state becomes 'unlimited' so the hearts logic activates,
    // and 'unlimited' matches no real question difficulties.
    difficultyFilterRef.current = difficulty
    // Create an infinite pool by shuffling and repeating (with shuffledAnswers baked in)
    const shuffled = shuffle([...pool]).map((q) => ({
      ...q,
      shuffledAnswers: shuffle(q.answers),
    }))
    setQuestions(shuffled)
    setQIndex(0)
    setSelected(null)
    setAnswered(false)
    setScore(0)
    setStreak(0)
    setCorrectCount(0)
    setHearts(INITIAL_HEARTS)
    heartsRef.current = INITIAL_HEARTS
    sessionOverRef.current = false
    finishedRef.current = false
    setUnlimitedWaveCorrect(0)
    setResult(null)
    setDifficulty('unlimited')
    setScreen('playing')
  }, [category, difficulty, showToast])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    setStats(loadStats())
  }, [])

  const current = questions[qIndex]

  const finishGame = useCallback(
    (finalScore, finalCorrect, totalQuestions) => {
      // Idempotent: the game-over reveal timeout, End Session, and pool
      // exhaustion can all race to finish the same game — record stats once.
      if (finishedRef.current) return
      finishedRef.current = true
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

  const giveUp = useCallback(() => {
    if (difficulty === 'unlimited') {
      sessionOverRef.current = true
      finishGame(scoreRef.current, correctRef.current, qIndex + 1)
    } else {
      finishGame(scoreRef.current, correctRef.current, questions.length)
    }
  }, [difficulty, finishGame])

  const handleAnswer = useCallback(
    (answer) => {
      if (answered || !current) return
      // Block all input once an unlimited session is over (hearts hit 0):
      // the reveal timeout will end the session, so nothing else may answer.
      if (difficulty === 'unlimited' && sessionOverRef.current) return
      setSelected(answer)
      setAnswered(true)
      setRevealedAt(Date.now())
      const isCorrect = answer === current.correct
      // Computed outside the updaters — StrictMode double-invokes updater
      // functions, so toasts/score-submit must never live inside them.
      const newWaveCorrect = difficulty === 'unlimited' && isCorrect
        ? unlimitedWaveCorrect + 1
        : 0
      const newHearts = difficulty === 'unlimited' && !isCorrect
        ? heartsRef.current - 1
        : heartsRef.current

      if (isCorrect) {
        const base = BASE_POINTS[current.difficulty] || 50
        const streakMult = Math.min(streak + 1, STREAK_CAP)
        const pts = base * streakMult
        setScore((s) => s + pts)
        setStreak((st) => st + 1)
        setCorrectCount((c) => c + 1)
        showToast(`+${pts}pts (${base} base × ${streakMult})`, 'success')

        // In unlimited mode, track the wave toward the next heart
        if (difficulty === 'unlimited') {
          if (newWaveCorrect >= HEARTS_PER_WAVE) {
            // Earn a heart, but cap at INITIAL_HEARTS
            setHearts(Math.min(INITIAL_HEARTS, newHearts + 1))
            showToast('+1 Heart!', 'success')
            setUnlimitedWaveCorrect(0)
          } else {
            setUnlimitedWaveCorrect(newWaveCorrect)
          }
        }
      } else {
        setStreak(0)
        showToast('Wrong answer', 'error')

        // In unlimited mode, lose a heart; at 0 the session ends after the reveal
        if (difficulty === 'unlimited') {
          setHearts(Math.max(0, newHearts))
          setUnlimitedWaveCorrect(0) // reset wave counter on wrong answer
          if (newHearts <= 0) {
            sessionOverRef.current = true
            showToast(`Session over! Final score: ${scoreRef.current}`, 'info')
          }
        }
      }
      setTimeout(() => {
        if (difficulty === 'unlimited') {
          if (sessionOverRef.current) {
            // Last heart lost — end the session after the reveal so the player
            // sees the correct answer. finishGame records stats and submits.
            finishGame(scoreRef.current, correctRef.current, qIndex + 1)
            return
          }
          // Continue to next question; replenish the pool when running out
          if (qIndex + 1 >= questions.length) {
            let pool = [...questionsData]
            const diffFilter = difficultyFilterRef.current
            if (category !== 'all') pool = pool.filter((q) => q.category === category)
            if (diffFilter !== 'all') pool = pool.filter((q) => q.difficulty === diffFilter)
            if (pool.length === 0) {
              finishGame(scoreRef.current, correctRef.current, questions.length)
              return
            }
            const reshuffled = shuffle(pool).map((q) => ({
              ...q,
              shuffledAnswers: shuffle(q.answers),
            }))
            setQuestions((prev) => [...prev, ...reshuffled])
          }
          setQIndex((i) => i + 1)
          setSelected(null)
          setAnswered(false)
        } else if (qIndex + 1 >= questions.length) {
          finishGame(scoreRef.current, correctRef.current, questions.length)
        } else {
          setQIndex((i) => i + 1)
          setSelected(null)
          setAnswered(false)
        }
      }, RESULT_DELAY)
    },
    [answered, current, streak, qIndex, questions.length, finishGame, showToast, difficulty, unlimitedWaveCorrect]
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

          <button className="btn btn-secondary trivia-unlimited-btn" onClick={startUnlimited}>
            ❤️ Unlimited Mode
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
    const isUnlimited = difficulty === 'unlimited'

    return (
      <GameShell
        title="Trivia"
        subtitle={isUnlimited ? 'Answer until you run out of hearts!' : `Question ${qIndex + 1} of ${questions.length}`}
        wide
      >
        {/* Hearts display for unlimited mode */}
        {isUnlimited && (
          <div className="trivia-hearts-bar" data-testid="trivia-hearts">
            {Array.from({ length: INITIAL_HEARTS }).map((_, i) => (
              <span
                key={i}
                className={`trivia-heart${i < hearts ? ' filled' : ''}`}
              >
                ❤️
              </span>
            ))}
            {unlimitedWaveCorrect > 0 && (
              <span className="trivia-wave-progress">
                {unlimitedWaveCorrect}/{HEARTS_PER_WAVE} to next heart
              </span>
            )}
          </div>
        )}

        {/* Progress bar for normal mode */}
        {!isUnlimited && (
          <div className="trivia-progress-row">
            <div className="trivia-progress-track">
              <div
                className="trivia-progress-fill"
                style={{ width: `${(qIndex / questions.length) * 100}%` }}
              />
            </div>
          </div>
        )}

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

        {/* End session button for unlimited */}
        {isUnlimited && (
          <div className="game-action-bar">
            <span className="game-action-bar-label">Press End Session when you're done</span>
            <div className="game-action-bar-btns">
              <button className="btn btn-sm btn-outline" onClick={giveUp}>
                End Session
              </button>
            </div>
          </div>
        )}
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
              <button className="btn btn-secondary" onClick={exitToSettings}>
                New Quiz
              </button>
              {difficulty === 'unlimited' && (
                <button className="btn btn-primary" onClick={() => {
                  setScreen('playing')
                  // Restart unlimited with fresh session
                  setHearts(INITIAL_HEARTS)
                  heartsRef.current = INITIAL_HEARTS
                  setUnlimitedWaveCorrect(0)
                  sessionOverRef.current = false
                  finishedRef.current = false
                  setQuestions([])
                  setScore(0)
                  setStreak(0)
                  setCorrectCount(0)
                  setAnswered(false)
                  setResult(null)
                  // Need to trigger new question load - this will be handled by startGame
                  startGame()
                }}>
                  Play Again
                </button>
              )}
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
