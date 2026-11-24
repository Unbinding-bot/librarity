import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import GameShell, { Modal } from '../../components/ui/GameShell'
import { useToast } from '../../contexts/ToastContext'
import { useGameState } from '../../contexts/GameStateContext'
import NamePrompt from '../../components/ui/NamePrompt'
import { getDisplayName } from '../../lib/logbook'
import { getTodayUTC8, getDaysSinceAnchorUTC8 } from '../../lib/dateUtils'

import wordList from '../../assets/word-ladder-words.json'

const WORDS = new Set(wordList.map((w) => String(w).toUpperCase()))
const WORD_LEN = 4

// Penalty applied to the session clock on each invalid word in unlimited mode
const INVALID_WORD_PENALTY_SEC = 5

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
  const [shake, setShake] = useState(false) // brief red shake on invalid word
  const [result, setResult] = useState(null)
  const [stats, setStats] = useState(() => loadStats())
  const [namePrompt, setNamePrompt] = useState(null)

  // Cumulative session tracking — score can grow without bound
  const [sessionScore, setSessionScore] = useState(0)
  const sessionStreakRef = useRef(0)

  // Unlimited-specific state
  const [unlimitedTimeLimit, setUnlimitedTimeLimit] = useState(180) // 3:00 in seconds
  const [unlimitedElapsed, setUnlimitedElapsed] = useState(0)
  const [paused, setPaused] = useState(false) // mirrors ref so UI re-renders
  const pausedAtRef = useRef(null)
  const [unlimitedRound, setUnlimitedRound] = useState(0) // bump to re-arm interval
  const unlimitedPausedRef = useRef(false)
  const unlimitedGameOverRef = useRef(false)
  const unlimitedRoundRef = useRef(0)
  const unlimitedStartTimeRef = useRef(null) // wall clock when unlimited timer started

  const startedRef = useRef(false)
  const ladderRef = useRef([])
  const solvedRef = useRef(false)
  const resultRef = useRef(null)
  const timerRef = useRef(null)
  const ladderScrollRef = useRef(null)

  /** Day-index puzzle selection (deterministic, rotates daily at UTC+8 midnight). */
  function getPuzzleForToday() {
    return generatePuzzle(getDaysSinceAnchorUTC8())
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
    const todayStr = getTodayUTC8()
    if (s.lastPlayedDaily === todayStr) {
      modeRef.current = 'random'
      setMode('random')
      showToast('Daily puzzle already done, switching to Random mode', 'info')
      startPuzzle(generatePuzzle())
    } else {
      startPuzzle(getPuzzleForToday())
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
  }, [startTime, paused, solved])

  // Unlimited elapsed tracker — wall-clock based so pause (which shifts the
  // start time forward) freezes it too. unlimitedRound forces re-arm on reset.
  useEffect(() => {
    if (mode !== 'unlimited' || solvedRef.current) return
    if (unlimitedPausedRef.current) return
    if (unlimitedGameOverRef.current) return
    if (!unlimitedStartTimeRef.current) {
      unlimitedStartTimeRef.current = Date.now() - unlimitedElapsed * 1000
    }
    const timer = setInterval(() => {
      if (!unlimitedPausedRef.current && !unlimitedGameOverRef.current) {
        setUnlimitedElapsed(Math.floor((Date.now() - unlimitedStartTimeRef.current) / 1000))
      }
    }, 500)
    return () => clearInterval(timer)
  }, [mode, paused, solved, unlimitedRound])

  const steps = Math.max(0, ladder.length - 1)
  const timeSeconds = elapsed

  // In unlimited mode, calculate remaining time from the session clock
  const unlimitedRemaining = mode === 'unlimited' && !solved
    ? Math.max(0, unlimitedTimeLimit - unlimitedElapsed)
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
      if (modeRef.current === 'daily') s.lastPlayedDaily = getTodayUTC8()
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
        // Reduce time limit by 10s for the NEXT round, floor at 10s.
        // The current round's remaining time does NOT change — the new
        // limit applies when the next round starts and the timer restarts.
        const newTimeLimit = Math.max(10, unlimitedTimeLimit - 10)
        setUnlimitedTimeLimit(newTimeLimit)
        // Reset wall-clock start ref NOW so the timer effect sees it
        // when it re-arms on the unlimitedRound state change.
        unlimitedStartTimeRef.current = null
        // Bump unlimitedRound state to re-arm the timer effect with fresh state
        setUnlimitedRound((r) => r + 1)
        // Track actual rounds completed for session summary + leaderboard
        unlimitedRoundRef.current += 1
        // Track actual rounds completed for session summary + leaderboard
        unlimitedRoundRef.current += 1
        // Track actual rounds completed for session summary + leaderboard
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
          round: unlimitedRoundRef.current + 1,
          timeLeft: newTimeLimit,
        }
        resultRef.current = res
        // Don't render the result modal in unlimited — just update HUD via toast
        showToast(`+${earned} pts (${usedSteps} steps)`, 'success')
        // Auto-start next puzzle after brief delay — timer restarts at new limit
        setTimeout(() => {
          if (unlimitedGameOverRef.current) return
          resultRef.current = null
          // Restart the session timer at 0 for the fresh round with new limit
          unlimitedStartTimeRef.current = null
          setUnlimitedElapsed(0)
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

  const shakeInput = useCallback(() => {
    setShake(false)
    // re-trigger the CSS animation even if it's already showing
    requestAnimationFrame(() => setShake(true))
    setTimeout(() => setShake(false), 450)
  }, [])

  /** Returns true when an invalid submission was recorded; applies session-clock penalty. */
  const reportInvalid = useCallback(
    (msg, kind = 'error') => {
      if (mode === 'unlimited' && !unlimitedPausedRef.current && !unlimitedGameOverRef.current) {
        unlimitedStartTimeRef.current -= INVALID_WORD_PENALTY_SEC * 1000
        showToast(`${msg} (${INVALID_WORD_PENALTY_SEC}s penalty)`, kind)
        // timer-decrease toast follows shortly after
        setTimeout(() => {
          showToast('Time reduced', 'warning')
        }, 800)
      } else {
        showToast(msg, kind)
      }
      shakeInput()
    },
    [mode, shakeInput, showToast],
  )

  const submitWord = useCallback(() => {
    if (solvedRef.current) return
    // Paused or session over in unlimited — block all submissions
    if (mode === 'unlimited' && (unlimitedPausedRef.current || unlimitedGameOverRef.current)) return
    const word = input.toUpperCase().trim()
    if (!word) return
    const current = ladderRef.current[ladderRef.current.length - 1]
    if (word === current) {
      reportInvalid("That's the current word", 'warning')
      return
    }
    if (word === puzzle.target) {
      // allow reaching the target
      if (!WORDS.has(word)) {
        reportInvalid('Not in word list', 'error')
        return
      }
      // check it's a valid neighbor
      let diff = 0
      for (let i = 0; i < WORD_LEN; i++) if (word[i] !== current[i]) diff++
      if (diff !== 1) {
        reportInvalid('Change exactly one letter', 'error')
        return
      }
      setLadder((l) => [...l, word])
      setInput('')
      const usedTime = Math.floor((Date.now() - startTime) / 1000)
      setTimeout(() => handleWin(ladderRef.current.length - 1 + 1, usedTime), 150)
      return
    }
    if (!WORDS.has(word)) {
      reportInvalid('Not in word list', 'error')
      return
    }
    if (word.length !== WORD_LEN) {
      reportInvalid('Words must be 4 letters', 'error')
      return
    }
    if (ladderRef.current.includes(word)) {
      reportInvalid('Already in your ladder', 'warning')
      return
    }
    let diff = 0
    for (let i = 0; i < WORD_LEN; i++) if (word[i] !== current[i]) diff++
    if (diff !== 1) {
      reportInvalid('Change exactly one letter', 'error')
      return
    }
    setLadder((l) => [...l, word])
    setInput('')
    // keep the newest rung in view inside the scrollable ladder
    requestAnimationFrame(() => {
      if (ladderScrollRef.current) {
        ladderScrollRef.current.scrollTop = ladderScrollRef.current.scrollHeight
      }
    })
  }, [input, puzzle, startTime, handleWin, reportInvalid, mode, shakeInput])

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

  /** Toggle pause for unlimited mode. Pausing also freezes the wall clock:
   * the moment the pause starts is stored, and on resume the start time is
   * shifted forward by the paused duration so no time is lost. */
  const togglePause = useCallback(() => {
    if (unlimitedPausedRef.current) {
      // Resuming: push start time forward by however long we were paused
      if (pausedAtRef.current) {
        unlimitedStartTimeRef.current += Date.now() - pausedAtRef.current
        pausedAtRef.current = null
      }
      unlimitedPausedRef.current = false
      setPaused(false)
    } else {
      pausedAtRef.current = Date.now()
      unlimitedPausedRef.current = true
      setPaused(true)
    }
  }, [])

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

  /** Reset every piece of unlimited state — wall clock, refs and mirrors.
   * Bumping unlimitedRound forces the elapsed-timer effect to re-arm so the
   * wall clock is recomputed from a fresh start time. */
  const resetUnlimitedState = useCallback(() => {
    unlimitedGameOverRef.current = false
    unlimitedPausedRef.current = false
    pausedAtRef.current = null
    setPaused(false)
    unlimitedRoundRef.current = 0
    setUnlimitedRound((r) => r + 1)
    setUnlimitedTimeLimit(180)
    setUnlimitedElapsed(0)
    unlimitedStartTimeRef.current = null
    setSessionScore(0)
    sessionStreakRef.current = 0
  }, [])

  const changeMode = useCallback(
    (newMode, { resume } = {}) => {
      // Reset unlimited state when leaving unlimited mode
      if (mode === 'unlimited' && newMode !== 'unlimited') {
        resetUnlimitedState()
      }

      // Resume: reload the same mode with a fresh puzzle (used by Play Again)
      if (resume && newMode === modeRef.current) {
        setMode(newMode)
        modeRef.current = newMode
        if (newMode === 'daily') {
          startPuzzle(getPuzzleForToday())
        } else if (newMode === 'unlimited') {
          resetUnlimitedState()
          startPuzzle(generatePuzzle())
        } else {
          startPuzzle(generatePuzzle())
        }
        return
      }
      // Re-playing the same mode: in daily mode, fall back to random when
      // today's puzzle is already finished (same rule as Wordle).
      if (newMode === modeRef.current) {
        if (newMode === 'daily' && loadStats().lastPlayedDaily === getTodayUTC8()) {
          modeRef.current = 'random'
          setMode('random')
          showToast('Daily puzzle already done, switching to Random mode', 'info')
          startPuzzle(generatePuzzle())
        } else if (newMode === 'unlimited') {
          // Restart unlimited with full reset
          resetUnlimitedState()
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
        resetUnlimitedState()
        setSolved(false)
        solvedRef.current = false
        setResult(null)
        startPuzzle(generatePuzzle())
      } else {
        startPuzzle(generatePuzzle())
      }
    },
    [startPuzzle, showToast, mode, resetUnlimitedState],
  )

  // Check if time ran out in unlimited mode — uses the session wall clock,
  // not the per-puzzle elapsed time
  useEffect(() => {
    if (mode !== 'unlimited' || unlimitedPausedRef.current || unlimitedGameOverRef.current) return
    if (solvedRef.current) return
    if (unlimitedElapsed >= unlimitedTimeLimit) {
      unlimitedGameOverRef.current = true
      clearInterval(timerRef.current)
      solvedRef.current = true
      setSolved(true)
      const finalScore = sessionScore
      const s = updateStats(0, unlimitedElapsed, false)
      const elapsedMins = Math.floor(unlimitedElapsed / 60)
      const elapsedSecs = unlimitedElapsed % 60
      resultRef.current = {
        title: 'Out of Time!',
        message: `You completed ${unlimitedRoundRef.current} ladder${unlimitedRoundRef.current === 1 ? '' : 's'} in ${elapsedMins}m ${elapsedSecs}s`,
        totalScore: finalScore,
        rounds: unlimitedRoundRef.current,
        time: unlimitedElapsed,
        stats: s,
      }
      setResult(resultRef.current)
      showToast(`Session over! Completed ${unlimitedRoundRef.current} ladders for ${finalScore} points.`, 'info')
      doSubmitScore(finalScore)
    }
  }, [unlimitedElapsed, unlimitedTimeLimit, mode, sessionScore, updateStats, doSubmitScore])

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
              {paused ? '▶ Resume' : '⏸ Pause'}
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

      {/* Timer bar for unlimited mode — depletes as the session clock runs down */}
      {mode === 'unlimited' && !solved && (
        <div className="sb-unlimited-timer">
          <div className="sb-unlimited-timer-track">
            <div
              className="sb-unlimited-timer-fill"
              style={{
                width: `${Math.max(0, ((unlimitedTimeLimit - unlimitedElapsed) / unlimitedTimeLimit) * 100)}%`,
                backgroundColor: unlimitedTimeLimit - unlimitedElapsed < 30 ? 'var(--nb-red)' : undefined,
              }}
            />
          </div>
          <span className="sb-unlimited-timer-text">
            {paused ? '⏸ Paused' : formatTime(Math.max(0, unlimitedTimeLimit - unlimitedElapsed))}
          </span>
        </div>
      )}

      {/* Puzzle info for unlimited */}
      {mode === 'unlimited' && !solved && (
        <div className="game-action-bar">
          <span className="game-action-bar-label">
            Round {unlimitedRoundRef.current + 1} · Next round time: {unlimitedTimeLimit}s (min 20s)
          </span>
          <div className="game-action-bar-btns">
            <button className="btn btn-sm btn-outline" onClick={giveUp}>
              Give Up
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
            className={`form-input${shake ? ' shake wl-invalid' : ''}`}
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

      {/* Pause overlay — blocks the whole board while paused in unlimited mode */}
      {mode === 'unlimited' && paused && !unlimitedGameOverRef.current && (
        <div className="game-result sb-pause-overlay" data-testid="wl-pause-overlay">
          <div className="result-content">
            <div className="result-title">⏸ Paused</div>
            <div className="result-message">The clock is stopped. Your session score: {sessionScore} points.</div>
            <div className="result-actions">
              <button className="btn btn-primary" onClick={togglePause} data-testid="wl-resume">
                ▶ Resume
              </button>
              <button className="btn btn-secondary" onClick={giveUp}>
                Give Up
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-game replay button after unlimited session ends (modal closed) */}
      {mode === 'unlimited' && unlimitedGameOverRef.current && !result && !paused && (
        <div className="game-action-bar">
          <span className="game-action-bar-label">Session complete — {sessionScore} points in {unlimitedRoundRef.current} round{unlimitedRoundRef.current === 1 ? '' : 's'}</span>
          <div className="game-action-bar-btns">
            <button className="btn btn-sm btn-primary" onClick={() => changeMode('unlimited', { resume: true })}>
              Play Again
            </button>
          </div>
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
            <li><strong>Unlimited Mode:</strong> Chain ladders until time runs out. Start with 3:00, lose 10s per win (min 20s). Invalid words shake the input and cost 5s.</li>
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
              {mode === 'unlimited' ? (
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
