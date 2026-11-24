import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import GameShell, { Modal } from '../../components/ui/GameShell'
import { useToast } from '../../contexts/ToastContext'
import { useGameState } from '../../contexts/GameStateContext'
import NamePrompt from '../../components/ui/NamePrompt'
import { getDisplayName } from '../../lib/logbook'

import wordList from '../../assets/word-ladder-words.json'

const WORDS = new Set(wordList.map((w) => String(w).toUpperCase()))
const WORD_LEN = 4

/**
 * Generate a fresh Word Ladder puzzle: two random 4-letter words that are
 * connected by a short path through the dictionary. The start and target
 * come from the word list itself, not from a fixed list, so every puzzle is
 * different. Daily mode is deterministic (seeded by the day); Random mode
 * is seeded by Math.random.
 */
function generatePuzzle(seed = 0) {
  const words = []
  for (const w of WORDS) {
    if (w.length === WORD_LEN) words.push(w)
  }

  const rand = seed ? makeSeededRng(seed) : Math.random
  const pick = (arr, i) => arr[Math.floor(i * arr.length)]

  // Pick a start word, then walk a short random path to a target so the two
  // are guaranteed reachable (and the ladder isn't absurdly long).
  let start = pick(words, rand())
  let target = start
  for (let step = 0; step < 5; step++) {
    const neighbors = getNeighbors(target)
    if (!neighbors.length) break
    target = pick(neighbors, rand())
  }
  if (start === target) target = pick(words.filter((w) => w !== start), rand())

  return { start, target }
}

/** Deterministic PRNG (mulberry32) so daily puzzles are stable across
 * reloads while still varying day to day. */
function makeSeededRng(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const DEFAULT_STATS = {
  puzzlesSolved: 0,
  perfectSolves: 0,
  totalSteps: 0,
  totalTime: 0,
  bestTime: null,
  efficiency: 0,
  lastPlayedDaily: null,
}

function loadStats() {
  try {
    const saved = localStorage.getItem('word_ladder_stats')
    return saved ? { ...DEFAULT_STATS, ...JSON.parse(saved) } : { ...DEFAULT_STATS }
  } catch {
    return { ...DEFAULT_STATS }
  }
}

function saveStats(stats) {
  try {
    localStorage.setItem('word_ladder_stats', JSON.stringify(stats))
  } catch {}
}

/** All single-letter neighbors of a word present in the dictionary. */
function getNeighbors(word) {
  const result = []
  for (let i = 0; i < word.length; i++) {
    for (let c = 65; c <= 90; c++) {
      const ch = String.fromCharCode(c)
      if (ch === word[i]) continue
      const next = word.slice(0, i) + ch + word.slice(i + 1)
      if (WORDS.has(next)) result.push(next)
    }
  }
  return result
}

/** BFS shortest-path distance between two words (null = unreachable). */
function bfsDistance(start, target) {
  if (start === target) return 0
  const queue = [[start, 0]]
  const seen = new Set([start])
  while (queue.length) {
    const [w, d] = queue.shift()
    for (const n of getNeighbors(w)) {
      if (n === target) return d + 1
      if (!seen.has(n)) {
        seen.add(n)
        queue.push([n, d + 1])
      }
    }
  }
  return null
}

/** Full BFS shortest ladder (array of words from start to target inclusive). */
function bfsLadder(start, target) {
  if (start === target) return [start]
  const queue = [[start]]
  const seen = new Set([start])
  while (queue.length) {
    const path = queue.shift()
    const last = path[path.length - 1]
    for (const n of getNeighbors(last)) {
      if (n === target) return [...path, n]
      if (!seen.has(n)) {
        seen.add(n)
        queue.push([...path, n])
      }
    }
  }
  return null
}

/** Calculate session-wide cumulative score for infinite play. */
function ladderSessionScore(steps, seconds, wasOptimal, streak) {
  const stepCost = Math.min(steps * 80, 6000)           // fewer steps → higher remaining budget
  const timeBonus = Math.max(0, Math.round(500 - seconds * 2))
  const optimalBonus = wasOptimal ? 2000 : 0
  const streakMult = 1 + streak * 0.5                    // streak doubles every two consecutive solves
  return Math.round((stepCost + timeBonus + optimalBonus) * streakMult)
}

function ratingStars(steps) {
  const optimal = null // computed per puzzle via BFS
  return steps
}

export default function WordLadder() {
  const { showToast } = useToast()
  const { recordScore } = useGameState()

  const [mode, setMode] = useState('daily')
  const modeRef = useRef(mode)
  const [puzzle, setPuzzle] = useState(() => generatePuzzle(Math.abs(Math.floor((new Date() - new Date('2024-01-01')) / 86400000))))
  const [ladder, setLadder] = useState([]) // array of words, starts with [start]
  const [input, setInput] = useState('')
  const [startTime, setStartTime] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [solved, setSolved] = useState(false)
  const [optimal, setOptimal] = useState(null)

  const [showHelp, setShowHelp] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [hintText, setHintText] = useState('')
  const [result, setResult] = useState(null)
  const [stats, setStats] = useState(() => loadStats())
  const [namePrompt, setNamePrompt] = useState(null)

  // Cumulative session tracking — score can grow without bound
  const [sessionScore, setSessionScore] = useState(0)
  const sessionStreakRef = useRef(0)

  // Unlimited-specific state
  const [unlimitedTimeLimit, setUnlimitedTimeLimit] = useState(180) // 3:00 in seconds
  const unlimitedPausedRef = useRef(false)
  const unlimitedGameOverRef = useRef(false)
  const unlimitedRoundRef = useRef(0)

  const startedRef = useRef(false)
  const ladderRef = useRef([])
  const solvedRef = useRef(false)
  const resultRef = useRef(null)
  const timerRef = useRef(null)
  const ladderScrollRef = useRef(null)

  /** Day-index puzzle selection (deterministic, rotates daily). */
  function getPuzzleForToday() {
    const start = new Date('2024-01-01')
    const days = Math.abs(Math.floor((new Date() - start) / 86400000))
    return generatePuzzle(days)
  }

  useEffect(() => { ladderRef.current = ladder }, [ladder])
  useEffect(() => { solvedRef.current = solved }, [solved])

  const startPuzzle = useCallback((p) => {
    setPuzzle(p)
    setLadder([p.start])
    setInput('')
    setSolved(false)
    setResult(null)
    setHintText('')
    setShowHint(false)
    setOptimal(bfsDistance(p.start, p.target))
    const now = Date.now()
    setStartTime(now)
    setElapsed(0)
  }, [])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    const s = loadStats()
    setStats(s)
    const todayStr = new Date().toISOString().split('T')[0]
    if (s.lastPlayedDaily === todayStr) {
      modeRef.current = 'random'
      setMode('random')
      showToast('Daily puzzle already done, switching to Random mode', 'info')
      startPuzzle(generatePuzzle())
    } else {
      const days = Math.abs(Math.floor((new Date() - new Date('2024-01-01')) / 86400000))
      startPuzzle(generatePuzzle(days))
    }
  }, [startPuzzle, showToast])

  // Timer tick — handles paused and unlimited-game-over states
  useEffect(() => {
    if (!startTime || solvedRef.current) return
    if (unlimitedPausedRef.current) return
    if (unlimitedGameOverRef.current) return
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [startTime])

  const steps = Math.max(0, ladder.length - 1)
  const timeSeconds = elapsed

  // In unlimited mode, calculate remaining time
  const unlimitedRemaining = mode === 'unlimited' && !solved
    ? Math.max(0, unlimitedTimeLimit - timeSeconds)
    : null

  const updateStats = useCallback(
    (usedSteps, usedTime, wasOptimal) => {
      const s = loadStats()
      s.puzzlesSolved += 1
      if (wasOptimal) s.perfectSolves += 1
      s.totalSteps += usedSteps
      s.totalTime += usedTime
      if (s.bestTime === null || usedTime < s.bestTime) s.bestTime = usedTime
      const avgSteps = s.totalSteps / s.puzzlesSolved
      const avgOptimal = optimal || avgSteps
      s.efficiency = Math.round((avgOptimal / avgSteps) * 100)
      if (modeRef.current === 'daily') s.lastPlayedDaily = new Date().toISOString().split('T')[0]
      saveStats(s)
      setStats(s)
      return s
    },
    [optimal, modeRef],
  )

  const doSubmitScore = useCallback(
    async (score) => {
      try {
        const username = await new Promise((resolve) => setNamePrompt({ resolve }))
        if (!username) return
        await recordScore({
          gameType: 'word_ladder',
          gameMode: modeRef.current,
          playerName: username || getDisplayName(),
          score,
          timeTaken: resultRef.current?.time ?? null,
        })
        showToast(`Score submitted as "${username}"!`, 'success')
      } catch (err) {
        console.error('Error submitting score:', err)
        showToast('Could not submit score', 'error')
      }
    },
    [recordScore, showToast],
  )

  const askForName = useCallback(
    () => new Promise((resolve) => setNamePrompt({ resolve })),
    [],
  )

  /** Format seconds as M:SS or MM:SS */
  const formatTime = (s) => {
    const mins = Math.floor(s / 60)
    const secs = s % 60
    return `${mins}:${String(secs).padStart(2, '0')}`
  }

  const handleWin = useCallback(
    (usedSteps, usedTime) => {
      setSolved(true)
      solvedRef.current = true
      clearInterval(timerRef.current)
      const optimalSteps = optimal ?? usedSteps
      const wasOptimal = usedSteps === optimalSteps
      // Cumulative session score — can grow indefinitely
      const currentStreak = sessionStreakRef.current
      const earned = ladderSessionScore(usedSteps, usedTime, wasOptimal, currentStreak)
      sessionStreakRef.current += 1
      setSessionScore(s => s + earned)
      const s = updateStats(usedSteps, usedTime, wasOptimal)

      const stars = usedSteps <= optimalSteps ? '★★★★★'
        : usedSteps <= optimalSteps + 2 ? '★★★★'
        : usedSteps <= optimalSteps + 4 ? '★★★'
        : '★★'

      if (mode === 'unlimited') {
        // Reduce time limit by 10s, floor at 20s
        const newTimeLimit = Math.max(20, unlimitedTimeLimit - 10)
        setUnlimitedTimeLimit(newTimeLimit)
        unlimitedRoundRef.current += 1

        const res = {
          title: wasOptimal ? 'Perfect Ladder!' : 'Ladder Complete!',
          message: `${puzzle.start} → ${puzzle.target} in ${usedSteps} step${usedSteps === 1 ? '' : 's'}`,
          steps: usedSteps,
          optimal: optimalSteps,
          time: usedTime,
          score: earned,
          streakBonus: currentStreak > 0 ? ` (+${currentStreak * 500} streak bonus)` : '',
          stars,
          totalScore: sessionScore + earned,
          stats: s,
          round: unlimitedRoundRef.current,
          timeLeft: newTimeLimit,
        }
        resultRef.current = res
        setResult(res)
        // Auto-start next puzzle after brief delay
        setTimeout(() => {
          if (unlimitedGameOverRef.current) return
          setResult(null)
          startPuzzle(generatePuzzle())
        }, 1500)
        return
      }

      const res = {
        title: wasOptimal ? 'Perfect Ladder!' : 'Ladder Complete!',
        message: `${puzzle.start} → ${puzzle.target} in ${usedSteps} step${usedSteps === 1 ? '' : 's'}`,
        steps: usedSteps,
        optimal: optimalSteps,
        time: usedTime,
        score: earned,
        streakBonus: currentStreak > 0 ? ` (+${currentStreak * 500} streak bonus)` : '',
        stars,
        totalScore: sessionScore + earned,
        stats: s,
      }
      resultRef.current = res
      setResult(res)
      // auto-submit to leaderboard
      doSubmitScore(sessionScore + earned)
    },
    [optimal, puzzle, updateStats, doSubmitScore, sessionScore, mode, startPuzzle, unlimitedTimeLimit],
  )

  const submitWord = useCallback(() => {
    if (solvedRef.current) return
    const word = input.toUpperCase().trim()
    if (!word) return
    const current = ladderRef.current[ladderRef.current.length - 1]
    if (word === current) {
      showToast("That's the current word", 'warning')
      return
    }
    if (word === puzzle.target) {
      // allow reaching the target
      if (!WORDS.has(word)) {
        showToast('Not in word list', 'error')
        return
      }
      // check it's a valid neighbor
      let diff = 0
      for (let i = 0; i < WORD_LEN; i++) if (word[i] !== current[i]) diff++
      if (diff !== 1) {
        showToast('Change exactly one letter', 'error')
        return
      }
      setLadder((l) => [...l, word])
      setInput('')
      const usedTime = Math.floor((Date.now() - startTime) / 1000)
      setTimeout(() => handleWin(ladderRef.current.length - 1 + 1, usedTime), 150)
      return
    }
    if (!WORDS.has(word)) {
      showToast('Not in word list', 'error')
      return
    }
    if (word.length !== WORD_LEN) {
      showToast('Words must be 4 letters', 'error')
      return
    }
    if (ladderRef.current.includes(word)) {
      showToast('Already in your ladder', 'warning')
      return
    }
    let diff = 0
    for (let i = 0; i < WORD_LEN; i++) if (word[i] !== current[i]) diff++
    if (diff !== 1) {
      showToast('Change exactly one letter', 'error')
      return
    }
    // Invalid word in unlimited mode: penalize time
    if (mode === 'unlimited' && !unlimitedPausedRef.current) {
      setUnlimitedTimeLimit(prev => Math.max(0, prev - 2))
      showToast('-2s for invalid word', 'warning')
    }
    setLadder((l) => [...l, word])
    setInput('')
    // keep the newest rung in view inside the scrollable ladder
    requestAnimationFrame(() => {
      if (ladderScrollRef.current) {
        ladderScrollRef.current.scrollTop = ladderScrollRef.current.scrollHeight
      }
    })
  }, [input, puzzle, startTime, handleWin, showToast, mode])

  const undoStep = useCallback(() => {
    if (solvedRef.current) return
    if (ladderRef.current.length <= 1) return
    setLadder((l) => l.slice(0, -1))
  }, [])

  const showHintFn = useCallback(() => {
    const current = ladderRef.current[ladderRef.current.length - 1]
    const remaining = bfsLadder(current, puzzle.target)
    if (!remaining || remaining.length < 2) {
      setHintText('No hint available from here.')
    } else {
      setHintText(`Try changing ${current} → ${remaining[1]}`)
    }
    setShowHint(true)
  }, [puzzle])

  /** Toggle pause state for unlimited mode */
  const togglePause = useCallback(() => {
    unlimitedPausedRef.current = !unlimitedPausedRef.current
    if (!unlimitedPausedRef.current) {
      // Resume timer
      const now = Date.now()
      setStartTime(now - elapsed * 1000)
    }
  }, [elapsed])

  /** End unlimited session early */
  const endUnlimitedSession = useCallback(() => {
    unlimitedGameOverRef.current = true
    clearInterval(timerRef.current)
    solvedRef.current = true
    setSolved(true)
    const finalScore = sessionScore
    const s = updateStats(0, 0, false)
    const elapsedMins = Math.floor(elapsed / 60)
    const elapsedSecs = elapsed % 60
    setResult({
      title: 'Session Over!',
      message: `You completed ${unlimitedRoundRef.current} ladder${unlimitedRoundRef.current === 1 ? '' : 's'} in ${elapsedMins}m ${elapsedSecs}s`,
      totalScore: finalScore,
      rounds: unlimitedRoundRef.current,
      time: elapsed,
      stats: s,
    })
    doSubmitScore(finalScore)
  }, [sessionScore, elapsed, updateStats, doSubmitScore])

  const giveUp = useCallback(() => {
    if (mode === 'unlimited') {
      endUnlimitedSession()
    } else {
      setSolved(true)
      solvedRef.current = true
      clearInterval(timerRef.current)
      const s = updateStats(0, 0, false)
      setResult({
        title: 'Game Over',
        message: `The target was: ${puzzle.target}`,
        stats: s,
      })
      doSubmitScore(0)
    }
  }, [mode, endUnlimitedSession, puzzle, updateStats, doSubmitScore])

  const changeMode = useCallback(
    (newMode, { resume } = {}) => {
      // Reset unlimited state when leaving unlimited mode
      if (mode === 'unlimited' && newMode !== 'unlimited') {
        unlimitedGameOverRef.current = false
        unlimitedPausedRef.current = false
        unlimitedRoundRef.current = 0
        setUnlimitedTimeLimit(180)
        setSessionScore(0)
        sessionStreakRef.current = 0
      }

      // Resume: reload the same mode with a fresh puzzle (used by Play Again)
      if (resume && newMode === modeRef.current) {
        setMode(newMode)
        modeRef.current = newMode
        if (newMode === 'daily') {
          startPuzzle(getPuzzleForToday())
        } else if (newMode === 'unlimited') {
          startPuzzle(generatePuzzle())
        } else {
          startPuzzle(generatePuzzle())
        }
        return
      }
      // Re-playing the same mode: in daily mode, fall back to random when
      // today's puzzle is already finished (same rule as Wordle).
      if (newMode === modeRef.current) {
        if (newMode === 'daily' && loadStats().lastPlayedDaily === new Date().toISOString().split('T')[0]) {
          modeRef.current = 'random'
          setMode('random')
          showToast('Daily puzzle already done, switching to Random mode', 'info')
          startPuzzle(generatePuzzle())
        } else if (newMode === 'unlimited') {
          // Restart unlimited with full reset
          unlimitedGameOverRef.current = false
          unlimitedPausedRef.current = false
          unlimitedRoundRef.current = 0
          setUnlimitedTimeLimit(180)
          setSessionScore(0)
          sessionStreakRef.current = 0
          setSolved(false)
          solvedRef.current = false
          setResult(null)
          startPuzzle(generatePuzzle())
        }
        return
      }
      setMode(newMode)
      modeRef.current = newMode
      if (newMode === 'daily') {
        startPuzzle(getPuzzleForToday())
      } else if (newMode === 'unlimited') {
        // Reset all unlimited state
        unlimitedGameOverRef.current = false
        unlimitedPausedRef.current = false
        unlimitedRoundRef.current = 0
        setUnlimitedTimeLimit(180)
        setSessionScore(0)
        sessionStreakRef.current = 0
        setSolved(false)
        solvedRef.current = false
        setResult(null)
        startPuzzle(generatePuzzle())
      } else {
        startPuzzle(generatePuzzle())
      }
    },
    [startPuzzle, showToast, mode],
  )

  // Check if time ran out in unlimited mode
  useEffect(() => {
    if (mode !== 'unlimited' || unlimitedPausedRef.current || unlimitedGameOverRef.current) return
    if (solvedRef.current) return
    if (timeSeconds >= unlimitedTimeLimit) {
      unlimitedGameOverRef.current = true
      clearInterval(timerRef.current)
      solvedRef.current = true
      setSolved(true)
      const finalScore = sessionScore
      const s = updateStats(0, timeSeconds, false)
      const elapsedMins = Math.floor(timeSeconds / 60)
      const elapsedSecs = timeSeconds % 60
      const res = {
        title: 'Out of Time!',
        message: `You completed ${unlimitedRoundRef.current} ladder${unlimitedRoundRef.current === 1 ? '' : 's'} in ${elapsedMins}m ${elapsedSecs}s`,
        totalScore: finalScore,
        rounds: unlimitedRoundRef.current,
        time: timeSeconds,
        stats: s,
      }
      resultRef.current = res
      setResult(res)
      doSubmitScore(finalScore)
    }
  }, [timeSeconds, unlimitedTimeLimit, mode, sessionScore, updateStats, doSubmitScore])

  return (
    <GameShell
      title="Word Ladder"
      accent="var(--nb-sky)"
      subtitle={mode === 'unlimited' ? 'Chain ladders until time runs out!' : `Transform ${puzzle.start} into ${puzzle.target}, one letter at a time`}
      controls={
        <>
          <button className={`mode-btn${mode === 'daily' ? ' active' : ''}`} onClick={() => changeMode('daily')}>
            Daily
          </button>
          <button className={`mode-btn${mode === 'random' ? ' active' : ''}`} onClick={() => changeMode('random')}>
            Random
          </button>
          <button className={`mode-btn${mode === 'unlimited' ? ' active' : ''}`} onClick={() => changeMode('unlimited')}>
            Unlimited
          </button>
          {mode === 'unlimited' && !solved && (
            <button className="btn btn-sm btn-outline" onClick={togglePause}>
              {unlimitedPausedRef.current ? '▶ Resume' : '⏸ Pause'}
            </button>
          )}
          <button className="icon-btn" title="How to play" onClick={() => setShowHelp(true)}>Help</button>
          <button className="icon-btn" title="Stats" onClick={() => setShowStats(true)}>Stats</button>
        </>
      }
    >
      {/* HUD */}
      <div className="game-info">
        <div className="info-item">
          <span className="info-label">From</span>
          <span className="info-value">{puzzle.start}</span>
        </div>
        <div className="info-item">
          <span className="info-label">To</span>
          <span className="info-value">{puzzle.target}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Steps</span>
          <span className="info-value" data-testid="wl-steps">{steps}</span>
        </div>
        {mode === 'unlimited' ? (
          <div className="info-item">
            <span className="info-label">Time Left</span>
            <span className="info-value" data-testid="wl-time" style={{ color: unlimitedRemaining <= 30 ? 'var(--nb-red)' : undefined }}>
              {formatTime(unlimitedRemaining ?? 0)}
            </span>
          </div>
        ) : (
          <div className="info-item">
            <span className="info-label">Time</span>
            <span className="info-value" data-testid="wl-time">{timeSeconds}s</span>
          </div>
        )}
        {mode === 'unlimited' && (
          <div className="info-item">
            <span className="info-label">Session</span>
            <span className="info-value" style={{ color: 'var(--accent)' }}>{sessionScore}</span>
          </div>
        )}
      </div>

      {/* Puzzle info for unlimited */}
      {mode === 'unlimited' && !solved && (
        <div className="game-action-bar">
          <span className="game-action-bar-label">
            Round {unlimitedRoundRef.current + 1} · Each win costs 10s (min 20s)
          </span>
          <div className="game-action-bar-btns">
            <button className="btn btn-sm btn-outline" onClick={giveUp}>
              Give Up
            </button>
            <button className="btn btn-sm btn-outline" onClick={endUnlimitedSession}>
              End Session
            </button>
          </div>
        </div>
      )}

      {/* Ladder display */}
      <div className="wl-ladder" data-testid="wl-ladder" ref={ladderScrollRef}>
        {ladder.map((word, i) => (
          <React.Fragment key={i}>
            {i > 0 && <div className="wl-rung-arrow">↓</div>}
            <div className={`wl-rung${i === 0 ? ' wl-start' : ''}${word === puzzle.target ? ' wl-target' : ''}`}>
              {word.split('').map((c, j) => {
                const prev = i > 0 ? ladder[i - 1] : null
                const changed = prev && prev[j] !== c
                return (
                  <span key={j} className={changed ? 'wl-changed-letter' : ''}>{c}</span>
                )
              })}
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* Input */}
      {!solved && (
        <div className="wl-input-row">
          <input
            className="form-input"
            type="text"
            value={input}
            maxLength={WORD_LEN}
            placeholder="Next word…"
            autoFocus
            data-testid="wl-input"
            onChange={(e) => setInput(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
            onKeyDown={(e) => { if (e.key === 'Enter') submitWord() }}
          />
          <button className="btn btn-primary" onClick={submitWord} data-testid="wl-submit">Add</button>
          <button className="btn btn-outline" onClick={undoStep} disabled={ladder.length <= 1}>Undo</button>
        </div>
      )}

      {solved && mode !== 'unlimited' && (
        <div className="game-action-bar">
          <span className="game-action-bar-label">Solved in {steps} steps!</span>
          <div className="game-action-bar-btns">
            <button className="btn btn-sm btn-secondary" onClick={() => changeMode(mode, { resume: true })}>Play Again</button>
          </div>
        </div>
      )}

      {/* Hint bar */}
      {!solved && mode !== 'unlimited' && (
        <div className="game-action-bar">
          <span className="game-action-bar-label">Need a nudge?</span>
          <div className="game-action-bar-btns">
            <button className="btn btn-sm btn-outline" onClick={showHintFn}>Hint</button>
          </div>
        </div>
      )}

      {/* Help modal */}
      {showHelp && (
        <Modal title="How to Play" onClose={() => setShowHelp(false)}>
          <ul className="help-list">
            <li>Change <strong>one letter at a time</strong> to transform the start word into the target word.</li>
            <li>Every intermediate word must be a real 4-letter word.</li>
            <li>Fewer steps and less time = a higher score (score = 10000 − steps×100 − seconds).</li>
            <li>Match the optimal (shortest) ladder for a Perfect Ladder bonus.</li>
            <li><strong>Unlimited Mode:</strong> Chain ladders until time runs out. Start with 3:00, lose 10s per win (min 20s), gain 2s for invalid words.</li>
          </ul>
        </Modal>
      )}

      {/* Hint modal */}
      {showHint && (
        <Modal title="Hint" onClose={() => setShowHint(false)}>
          <p>{hintText}</p>
        </Modal>
      )}

      {/* Stats modal */}
      {showStats && (
        <Modal title="Your Statistics" onClose={() => setShowStats(false)}>
          <div className="stats-summary">
            <div className="stat-item">
              <span className="stat-value">{stats.puzzlesSolved}</span>
              <span className="stat-label">Solved</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.perfectSolves}</span>
              <span className="stat-label">Perfect</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.bestTime ?? '-'}</span>
              <span className="stat-label">Best Time</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.efficiency}%</span>
              <span className="stat-label">Efficiency</span>
            </div>
          </div>
        </Modal>
      )}

      {/* Result overlay */}
      {result && (
        <div className="game-result" data-testid="wl-result">
          <div className="result-content">
            <button className="result-close" onClick={() => setResult(null)}>×</button>
            <div className="result-title">{result.title}</div>
            <div className="result-message">{result.message}</div>
            {result.stars && <div className="wl-stars">{result.stars}</div>}
            <div className="result-stats">
              {result.steps !== undefined && (
                <>
                  <div className="result-stat">
                    <span className="result-stat-value">{result.steps}</span>
                    <span className="result-stat-label">Steps (best {result.optimal})</span>
                  </div>
                  <div className="result-stat">
                    <span className="result-stat-value">{result.time}s</span>
                    <span className="result-stat-label">Time</span>
                  </div>
                  <div className="result-stat">
                    <span className="result-stat-value">{result.score}</span>
                    <span className="result-stat-label">Round Score{result.streakBonus || ''}</span>
                  </div>
                </>
              )}
              <div className="result-stat" style={{ borderTop: '2px dashed var(--muted)', paddingTop: 8 }}>
                <span className="result-stat-value" style={{ color: 'var(--accent)' }}>{result.totalScore}</span>
                <span className="result-stat-label">Session Total</span>
              </div>
              {result.rounds !== undefined && (
                <div className="result-stat">
                  <span className="result-stat-value">{result.rounds}</span>
                  <span className="result-stat-label">Rounds Completed</span>
                </div>
              )}
            </div>
            <div className="result-actions">
              {result.rounds !== undefined ? (
                <button className="btn btn-secondary" onClick={() => changeMode(mode, { resume: true })}>
                  Play Again
                </button>
              ) : (
                <button className="btn btn-secondary" onClick={() => changeMode(mode, { resume: true })}>
                  Play Again
                </button>
              )}
            </div>
          </div>
        </div>
      )}

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
