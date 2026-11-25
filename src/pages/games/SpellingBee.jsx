import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import GameShell, { Modal } from '../../components/ui/GameShell'
import { useToast } from '../../contexts/ToastContext'
import { useGameState } from '../../contexts/GameStateContext'
import NamePrompt from '../../components/ui/NamePrompt'
import { getDisplayName } from '../../lib/logbook'
import { getTodayUTC8, getDaysSinceAnchorUTC8 } from '../../lib/dateUtils'

import wordList from '../../assets/spelling-bee-words.json'

const WORDS = new Set(wordList.map((w) => String(w).toUpperCase()))

/**
 * Build a puzzle from 7 distinct letters. Every puzzle is guaranteed to
 * contain at least one pangram (a 7-letter word using all 7 letters), so the
 * game is always solvable at Queen Bee rank.
 *
 * The letters come from the dictionary itself — not from a fixed list — so
 * every puzzle is different. Daily mode is deterministic (seeded by the
 * day), Random mode is seeded by Math.random.
 */
function buildPuzzleFromLetters(allSeven, center) {
  const outer = allSeven.filter((c) => c !== center)
  return { center, letters: outer }
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

/**
 * Generate a fresh Spelling Bee puzzle.
 * @param {number} seed - 0 for true randomness, otherwise a day-seed.
 * @returns {{center: string, letters: string[]}}
 */
function generatePuzzle(seed = 0) {
  // 7-letter words that use all 7 distinct letters = pangram candidates.
  const pangrams = []
  for (const w of WORDS) {
    if (w.length === 7 && new Set(w).size === 7) pangrams.push(w)
  }

  // Pick a pangram as the letter set for this puzzle.
  const pick = (arr, i) => arr[Math.floor(i * arr.length)]
  const rand = seed ? makeSeededRng(seed) : Math.random
  const pangram = pick(pangrams, rand())
  const allSeven = [...new Set([...pangram])]

  // Center letter: one of the 7, chosen by the same RNG so it varies too.
  const center = allSeven[Math.floor(rand() * allSeven.length)]
  return buildPuzzleFromLetters(allSeven, center)
}

/** Day-index puzzle selection (deterministic, rotates daily at UTC+8 midnight). */
function getPuzzleForToday() {
  return generatePuzzle(getDaysSinceAnchorUTC8())
}

const RANKS = [
  { name: 'Beginner', pct: 0 },
  { name: 'Good Start', pct: 2 },
  { name: 'Moving Up', pct: 5 },
  { name: 'Good', pct: 8 },
  { name: 'Solid', pct: 15 },
  { name: 'Nice', pct: 25 },
  { name: 'Great', pct: 40 },
  { name: 'Amazing', pct: 50 },
  { name: 'Genius', pct: 70 },
  { name: 'Queen Bee', pct: 100 },
]

const DEFAULT_STATS = {
  puzzlesPlayed: 0,
  bestScore: 0,
  bestRank: 'Beginner',
  totalScore: 0,
  pangramsFound: 0,
  totalWords: 0,
  lastPlayedDaily: null,
}

function loadStats() {
  try {
    const saved = localStorage.getItem('spelling_bee_stats')
    return saved ? { ...DEFAULT_STATS, ...JSON.parse(saved) } : { ...DEFAULT_STATS }
  } catch {
    return { ...DEFAULT_STATS }
  }
}

function saveStats(stats) {
  try {
    localStorage.setItem('spelling_bee_stats', JSON.stringify(stats))
  } catch {}
}

/** Max achievable score for a puzzle (pangram bonus counted once per pangram word). */
function maxScore(puzzle) {
  const letters = new Set([puzzle.center, ...puzzle.letters])
  let total = 0
  const foundPangrams = new Set()
  for (const w of WORDS) {
    if (w.length < 4) continue
    if (!letters.has(w[0]) && ![...w].some((c) => letters.has(c))) continue
    let ok = true
    for (const c of w) {
      if (!letters.has(c)) { ok = false; break }
    }
    if (!ok) continue
    if (!w.includes(puzzle.center)) continue
    // Match wordScore() scale: 4-letter = 100, longer = length * 100, pangram = +200
    total += w.length === 4 ? 100 : w.length * 100
    if (new Set(w).size === 7 && !foundPangrams.has(w)) {
      total += 200
      foundPangrams.add(w)
    }
  }
  return total
}

function isValidWord(word, puzzle) {
  if (word.length < 4) return 'too-short'
  if (!word.includes(puzzle.center)) return 'missing-center'
  for (const c of word) {
    if (c !== puzzle.center && !puzzle.letters.includes(c)) return 'bad-letters'
  }
  if (!WORDS.has(word)) return 'not-word'
  return 'ok'
}

function wordScore(word, puzzle) {
  // 4-letter words are worth 100 base; longer words scale by length (×100).
  // Pangrams earn a flat +200 bonus on top of their length score.
  // This makes Spelling Bee scoring competitive with Trivia and WordLadder
  // on the leaderboard in unlimited mode.
  let pts = word.length === 4 ? 100 : word.length * 100
  const allSeven = new Set([puzzle.center, ...puzzle.letters])
  if (new Set(word).size === 7 && word.length >= 7) pts += 200
  return pts
}

function isPangram(word, puzzle) {
  const allSeven = new Set([puzzle.center, ...puzzle.letters])
  return new Set(word).size === 7 && word.length >= 7
}

function rankFor(score, max) {
  if (max <= 0) return RANKS[0]
  const pct = (score / max) * 100
  let current = RANKS[0]
  for (const r of RANKS) {
    if (pct >= r.pct) current = r
  }
  return current
}

/** Format seconds as M:SS */
function formatTime(s) {
  const mins = Math.floor(s / 60)
  const secs = s % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

export default function SpellingBee() {
  const { showToast } = useToast()

  const [mode, setMode] = useState('daily')
  const modeRef = useRef(mode)
  const [puzzle, setPuzzle] = useState(() => getPuzzleForToday())
  const [found, setFound] = useState([]) // [{word, pts, pangram}]
  const [current, setCurrent] = useState('')
  const [maxScore_, setMaxScore_] = useState(() => maxScore(getPuzzleForToday()))
  const [shuffleSeed, setShuffleSeed] = useState(0)
  const [loading, setLoading] = useState(true)

  const [showHelp, setShowHelp] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showFound, setShowFound] = useState(false)
  const [result, setResult] = useState(null)
  const [stats, setStats] = useState(() => loadStats())
  const [shake, setShake] = useState(false)
  // Cumulative session score — players can keep playing and their total grows
  const [sessionScore, setSessionScore] = useState(0)
  const sessionScoreRef = useRef(0)
  // Cumulative session word count — for leaderboard "words" display and session-over message
  const [sessionWords, setSessionWords] = useState(0)
  const sessionWordsRef = useRef(0)

  // Unlimited-specific state
  const [unlimitedTimeLimit, setUnlimitedTimeLimit] = useState(300) // 5:00 in seconds
  const [unlimitedElapsed, setUnlimitedElapsed] = useState(0)
  const [paused, setPaused] = useState(false) // state mirror so UI re-renders on pause
  const [unlimitedRound, setUnlimitedRound] = useState(0) // bumped on every session reset so the timer effect re-arms
  const unlimitedPausedRef = useRef(false)
  const pausedAtRef = useRef(null) // wall-clock time the pause started
  const unlimitedGameOverRef = useRef(false)
  const unlimitedRoundRef = useRef(0)

  const startedRef = useRef(false)
  const puzzleRef = useRef(puzzle)
  const foundRef = useRef([])
  const { recordScore } = useGameState()
  const [namePrompt, setNamePrompt] = useState(null)

  const doSubmitScore = useCallback(
    async (score) => {
      try {
        const username = await new Promise((resolve) => setNamePrompt({ resolve }))
        if (!username) return
        await recordScore({
          gameType: 'spelling_bee',
          gameMode: modeRef.current,
          playerName: username || getDisplayName(),
          score,
          timeTaken: sessionWordsRef.current,
        })
        showToast(`Score submitted as "${username}"!`, 'success')
      } catch (err) {
        console.error('Error submitting score:', err)
        showToast('Could not submit score', 'error')
      }
    },
    [recordScore, showToast],
  )

  useEffect(() => { puzzleRef.current = puzzle }, [puzzle])
  useEffect(() => { foundRef.current = found }, [found])

  const todayStr = getTodayUTC8()

  const startPuzzle = useCallback(
    (p, reset) => {
      setLoading(true)
      const score = maxScore(p)
      setMaxScore_(score)
      puzzleRef.current = p
      setPuzzle(p)
      setFound([])
      foundRef.current = []
      setCurrent('')
      setResult(null)
      setShuffleSeed((s) => s + 1)
      setLoading(false)
      // Non-unlimited puzzles each start a fresh count — the session total
      // only accumulates across puzzles in unlimited mode. (Unlimited resets
      // happen in resetUnlimitedState.)
      if (modeRef.current !== 'unlimited') {
        setSessionScore(0)
        sessionScoreRef.current = 0
        setSessionWords(0)
        sessionWordsRef.current = 0
      }
    },
    [],
  )

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
      startPuzzle(generatePuzzle(), true)
    } else {
      startPuzzle(getPuzzleForToday(), true)
    }
  }, [startPuzzle, showToast])

  // Timer tick for unlimited mode — wall-clock based, but pauses are
  // subtracted on resume so paused time is never lost from the clock.
  // `unlimitedRound` is bumped on every session reset so the effect tears
  // down and re-arms with the fresh start time.
  const unlimitedStartTimeRef = useRef(null)
  const timerRef = useRef(null)
  useEffect(() => {
    if (mode !== 'unlimited' || paused || unlimitedGameOverRef.current) return
    if (!unlimitedStartTimeRef.current) {
      unlimitedStartTimeRef.current = Date.now() - unlimitedElapsed * 1000
    }
    timerRef.current = setInterval(() => {
      if (!unlimitedPausedRef.current && !unlimitedGameOverRef.current) {
        setUnlimitedElapsed(Math.floor((Date.now() - unlimitedStartTimeRef.current) / 1000))
      }
    }, 500)
    return () => clearInterval(timerRef.current)
  }, [mode, paused, unlimitedRound])

  // Check time up in unlimited mode
  useEffect(() => {
    if (mode !== 'unlimited' || unlimitedPausedRef.current || unlimitedGameOverRef.current) return
    if (unlimitedElapsed >= unlimitedTimeLimit) {
      unlimitedGameOverRef.current = true
      clearInterval(timerRef.current)
      const finalScore = sessionScoreRef.current
      const finalWords = sessionWordsRef.current
      setResult({
        title: 'Out of Time!',
        message: `You found ${finalWords} words and scored ${finalScore} points.`,
        totalScore: finalScore,
        words: finalWords,
        stats: loadStats(),
      })
      doSubmitScore(finalScore)
    }
  }, [unlimitedElapsed, unlimitedTimeLimit, mode, doSubmitScore])

  const score = useMemo(() => found.reduce((a, f) => a + f.pts, 0), [found])
  const rank = useMemo(() => rankFor(score, maxScore_), [score, maxScore_])
  const pangramsFound = useMemo(() => found.filter((f) => f.pangram).length, [found])

  const updateStats = useCallback(
    (puzzleScore, rankName, pangramCount, wordCount) => {
      const s = loadStats()
      s.puzzlesPlayed += 1
      s.totalScore += puzzleScore
      s.totalWords += wordCount
      s.pangramsFound += pangramCount
      if (puzzleScore > s.bestScore) {
        s.bestScore = puzzleScore
        s.bestRank = rankName
      }
      if (modeRef.current === 'daily') s.lastPlayedDaily = getTodayUTC8()
      saveStats(s)
      setStats(s)
      return s
    },
    [modeRef],
  )

  const finishPuzzle = useCallback(() => {
    const p = puzzleRef.current
    const f = foundRef.current
    const puzzleScore = f.reduce((a, x) => a + x.pts, 0)
    const r = rankFor(puzzleScore, maxScoreRef.current ?? maxScore_)
    const s = updateStats(puzzleScore, r.name, f.filter((x) => x.pangram).length, f.length)
    // submitWord() already added each word's points to the session total as it
    // went, so the score must NOT be added again here — that double-counted
    // every word but the last on the leaderboard.
    setResult({
      title: puzzleScore === maxScore_ ? 'Queen Bee!' : `${r.name}`,
      message: `You found ${f.length} word${f.length === 1 ? '' : 's'} for ${puzzleScore} points.`,
      score: puzzleScore,
      max: maxScore_,
      totalScore: sessionScoreRef.current,
      words: f.length,
      pangrams: f.filter((x) => x.pangram).length,
      stats: s,
    })
    // auto-submit to leaderboard (session cumulative)
    doSubmitScore(sessionScoreRef.current)
  }, [maxScore_, updateStats, doSubmitScore])

  // maxScoreRef for use inside finishPuzzle without dependency loop
  const maxScoreRef = useRef(maxScore_)
  useEffect(() => { maxScoreRef.current = maxScore_ }, [maxScore_])

  const submitWord = useCallback(() => {
    // Block all submissions while paused or after the session ended
    if (mode === 'unlimited' && (unlimitedPausedRef.current || unlimitedGameOverRef.current)) return
    const p = puzzleRef.current
    const word = current.toUpperCase()
    if (!word) return
    if (foundRef.current.some((f) => f.word === word)) {
      setShake(true)
      setTimeout(() => setShake(false), 500)
      showToast('Already found', 'warning')
      setCurrent('')
      return
    }
    const check = isValidWord(word, p)
    if (check === 'too-short') {
      setShake(true)
      setTimeout(() => setShake(false), 500)
      showToast('Too short, 4 letters minimum', 'error')
      return
    }
    if (check === 'missing-center') {
      setShake(true)
      setTimeout(() => setShake(false), 500)
      showToast(`Missing center letter ${p.center}`, 'error')
      return
    }
    if (check === 'bad-letters') {
      setShake(true)
      setTimeout(() => setShake(false), 500)
      showToast('Bad letters', 'error')
      return
    }
    if (check === 'not-word') {
      setShake(true)
      setTimeout(() => setShake(false), 500)
      showToast('Not in word list', 'error')
      return
    }
    const pts = wordScore(word, p)
    const pang = isPangram(word, p)
    const entry = { word, pts, pangram: pang }
    const next = [...foundRef.current, entry]
    foundRef.current = next
    setFound(next)
    setCurrent('')
    if (pang) showToast(`Pangram! +${pts}`, 'success')
    else showToast(`+${pts}`, 'success')

    // Update session score immediately so HUD reflects current total
    setSessionScore(prev => prev + pts)
    sessionScoreRef.current += pts
    // Update session word count for leaderboard display and session-over message
    setSessionWords(prev => prev + 1)
    sessionWordsRef.current += 1

    // Auto-finish on reaching Queen Bee rank
    const totalAfter = next.reduce((a, x) => a + x.pts, 0)
    if (rankFor(totalAfter, maxScoreRef.current).name === 'Queen Bee') {
      if (mode === 'unlimited') {
        showToast('Queen Bee! +pangram bonus', 'success')
      }
      setTimeout(() => finishPuzzle(), 600)
    }

    // In unlimited mode, add 10 seconds for each valid word
    if (mode === 'unlimited' && !unlimitedPausedRef.current && !unlimitedGameOverRef.current) {
      setUnlimitedTimeLimit(prev => prev + 10)
    }
  }, [current, showToast, finishPuzzle, mode])

  const handleKey = useCallback(
    (letter) => {
      if (mode === 'unlimited' && (unlimitedPausedRef.current || unlimitedGameOverRef.current)) return
      if (letter === 'Enter') submitWord()
      else if (letter === 'Backspace') setCurrent((c) => c.slice(0, -1))
      else if (/^[A-Z]$/.test(letter)) setCurrent((c) => (c.length < 20 ? c + letter : c))
    },
    [submitWord, mode],
  )

  // Physical keyboard — hard filter to puzzle letters only
  useEffect(() => {
    const puzzleLetters = new Set([puzzle.center, ...puzzle.letters])
    const onKeyDown = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'Enter') { e.preventDefault(); handleKey('Enter') }
      else if (e.key === 'Backspace') { e.preventDefault(); handleKey('Backspace') }
      else if (/^[a-zA-Z]$/.test(e.key) && puzzleLetters.has(e.key.toUpperCase())) handleKey(e.key.toUpperCase())
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleKey, puzzle])

  /** Reset all unlimited session state (refs + timer + score). */
  const resetUnlimitedState = useCallback(() => {
    unlimitedGameOverRef.current = false
    unlimitedPausedRef.current = false
    pausedAtRef.current = null
    setPaused(false)
    unlimitedRoundRef.current = 0
    setUnlimitedRound((r) => r + 1) // force timer effect to re-arm with fresh state
    setUnlimitedTimeLimit(300)
    setUnlimitedElapsed(0)
    unlimitedStartTimeRef.current = null
    setSessionScore(0)
    sessionScoreRef.current = 0
    setSessionWords(0)
    sessionWordsRef.current = 0
  }, [])

  const changeMode = useCallback(
    (newMode) => {
      if (newMode === mode) {
        // Re-playing the same mode: in daily mode, fall back to random when
        // today's puzzle is already finished (same rule as Wordle).
        if (newMode === 'daily' && loadStats().lastPlayedDaily === getTodayUTC8()) {
          modeRef.current = 'random'
          setMode('random')
          showToast('Daily puzzle already done, switching to Random mode', 'info')
          startPuzzle(generatePuzzle(), true)
        }
        return
      }
      if (mode === 'unlimited' && foundRef.current.length > 0 && !unlimitedGameOverRef.current) {
        finishPuzzle()
      }
      // Leaving unlimited: clear its session state so stale game-over/pause
      // flags can't hide the hive in the next mode.
      if (mode === 'unlimited') {
        resetUnlimitedState()
      }
      // Entering unlimited starts a fresh session — a partial non-unlimited
      // puzzle's score/words must not leak into the unlimited total.
      if (newMode === 'unlimited' && mode !== 'unlimited') {
        setSessionScore(0)
        sessionScoreRef.current = 0
        setSessionWords(0)
        sessionWordsRef.current = 0
      }
      modeRef.current = newMode
      setMode(newMode)
      if (newMode === 'daily') {
        startPuzzle(getPuzzleForToday(), true)
      } else {
        startPuzzle(generatePuzzle(), true)
      }
    },
    [mode, finishPuzzle, startPuzzle, showToast, resetUnlimitedState],
  )

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
    const finalScore = sessionScoreRef.current
    const finalWords = sessionWordsRef.current
    setResult({
      title: 'Session Over!',
      message: `You found ${finalWords} words and scored ${finalScore} points.`,
      totalScore: finalScore,
      words: finalWords,
      stats: loadStats(),
    })
    doSubmitScore(finalScore)
  }, [doSubmitScore])

  const giveUp = useCallback(() => {
    if (mode === 'unlimited') {
      endUnlimitedSession()
    } else {
      // Non-unlimited: sessionScore is 0 (submitWord adds to it only in the
      // same session) — submit the current puzzle's score directly.
      const finalScore = score
      setResult({
        title: 'Game Over',
        message: `You found ${found.length} words and scored ${finalScore} points.`,
        totalScore: finalScore,
        words: found.length,
        stats: loadStats(),
      })
      doSubmitScore(finalScore)
    }
  }, [mode, endUnlimitedSession, score, found, doSubmitScore])

  const shuffleLetters = useCallback(() => {
    // Free: just permutes hex positions visually — same letters, different layout
    setShuffleSeed((s) => s + 1)
  }, [])

  const refreshPuzzle = useCallback(() => {
    // Costs 60s: generates a completely new random puzzle set
    setUnlimitedTimeLimit(prev => Math.max(0, prev - 60))
    showToast('-60s for new puzzle', 'warning')
    startPuzzle(generatePuzzle())
  }, [startPuzzle])

  // honeycomb arrangement
  const hiveLayout = useMemo(() => {
    const outer = [...puzzle.letters]
    // deterministic shuffle by shuffleSeed
    let seed = shuffleSeed * 2654435761 % 4294967296
    const rand = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return seed / 2147483648
    }
    for (let i = outer.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      ;[outer[i], outer[j]] = [outer[j], outer[i]]
    }
    return [[outer[0], outer[1]], [outer[2], puzzle.center, outer[3]], [outer[4], outer[5]]]
  }, [puzzle, shuffleSeed])

  const foundWordsSorted = useMemo(
    () => [...found].sort((a, b) => a.word.localeCompare(b.word)),
    [found],
  )

  return (
    <GameShell
      title="Spelling Bee"
      accent="var(--nb-orange)"
      subtitle={mode === 'unlimited' ? 'Find as many words as you can before time runs out!' : 'How many words can you make with 7 letters?'}
      controls={
        <>
          <button className={`mode-btn${mode === 'daily' ? ' active' : ''}`} onClick={() => changeMode('daily')}>
            Daily
          </button>
          <button className={`mode-btn${mode === 'random' ? ' active' : ''}`} onClick={() => changeMode('random')}>
            Random
          </button>
          <button className={`mode-btn${mode === 'unlimited' ? ' active' : ''}`} onClick={() => {
            if (mode === 'unlimited') {
              // Restart unlimited from scratch
              resetUnlimitedState()
              startPuzzle(generatePuzzle(), true)
            } else {
              changeMode('unlimited')
            }
          }}>
            Unlimited
          </button>
          {mode === 'unlimited' && !unlimitedGameOverRef.current && (
            <button className="btn btn-sm btn-outline" onClick={togglePause}>
              {paused ? '▶ Resume' : '⏸ Pause'}
            </button>
          )}
          <button className="icon-btn" title="How to play" onClick={() => setShowHelp(true)}>Help</button>
          <button className="icon-btn" title="Stats" onClick={() => setShowStats(true)}>Stats</button>
        </>
      }
    >
      {/* Timer bar for unlimited mode */}
      {mode === 'unlimited' && !unlimitedGameOverRef.current && (
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

      {/* Session score for unlimited */}
      {mode === 'unlimited' && !unlimitedGameOverRef.current && (
        <div className="game-action-bar">
          <span className="game-action-bar-label">
            Session Score: {sessionScore} · +10s per word · Refresh: −60s
          </span>
          <div className="game-action-bar-btns">
            <button className="btn btn-sm btn-outline" onClick={giveUp}>
              Give Up
            </button>
          </div>
        </div>
      )}

      {/* rank progress bar */}
      {!unlimitedGameOverRef.current && (
        <div className="sb-rank-bar">
          <div className="sb-rank-label">
            <span className="sb-rank-name">{rank.name}</span>
            <span className="sb-rank-score">{score} / {maxScore_}</span>
          </div>
          <div className="sb-rank-track">
            {RANKS.map((r) => (
              <div
                key={r.name}
                className={`sb-rank-tick${maxScore_ > 0 && (score / maxScore_) * 100 >= r.pct ? ' reached' : ''}`}
                style={{ left: `${r.pct}%` }}
                title={`${r.name} (${r.pct}%)`}
              />
            ))}
            <div
              className="sb-rank-fill"
              style={{ width: maxScore_ > 0 ? `${Math.min(100, (score / maxScore_) * 100)}%` : '0%' }}
            />
          </div>
        </div>
      )}

      {/* current input */}
      {!unlimitedGameOverRef.current && (
        <div className={`sb-current${shake ? ' shake' : ''}`} data-testid="sb-current">
          {current.split('').map((c, i) => (
            <span key={i} className={c === puzzle.center ? 'sb-center-letter' : ''}>{c}</span>
          ))}
          {current.length === 0 && <span className="sb-placeholder">Type or click letters…</span>}
        </div>
      )}

      {/* Pause overlay — blocks the whole board while paused in unlimited mode */}
      {mode === 'unlimited' && paused && !unlimitedGameOverRef.current && (
        <div className="game-result sb-pause-overlay" data-testid="sb-pause-overlay">
          <div className="result-content">
            <div className="result-title">⏸ Paused</div>
            <div className="result-message">The clock is stopped. Your session score: {sessionScore} points.</div>
            <div className="result-actions">
              <button className="btn btn-primary" onClick={togglePause} data-testid="sb-resume">
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
          <span className="game-action-bar-label">Session complete — {sessionScore} points, {sessionWords} words</span>
          <div className="game-action-bar-btns">
            <button className="btn btn-sm btn-primary" onClick={() => changeMode('unlimited')}>
              Play Again
            </button>
          </div>
        </div>
      )}

      {/* honeycomb with refresh button beside it */}
      {!unlimitedGameOverRef.current && (
        <div className="sb-hive-wrap" data-testid="sb-hive-wrap">
          <div className="sb-hive" data-testid="sb-hive">
            {hiveLayout.map((row, ri) => (
              <div className="sb-hive-row" key={ri}>
                {row.map((letter, li) => (
                  <button
                    key={li}
                    className={`hex-cell${letter === puzzle.center ? ' hex-center' : ''}`}
                    onClick={() => handleKey(letter)}
                    data-testid={`hex-${letter}`}
                  >
                    <svg className="hex-shape" viewBox="0 0 84 96" aria-hidden="true">
                      <polygon points="42,0 84,24 84,72 42,96 0,72 0,24" />
                    </svg>
                    <span className="hex-letter">{letter}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
          <button className="btn btn-outline sb-refresh-btn" onClick={shuffleLetters} title="Shuffle letter positions">
            ⟳ Shuffle
          </button>
          {mode === 'unlimited' && (
            <button className="btn btn-outline sb-refresh-btn" onClick={refreshPuzzle} title="New puzzle (−60s)">
              ↺ Refresh
            </button>
          )}
        </div>
      )}

      {/* submit button */}
      {!unlimitedGameOverRef.current && (
        <div className="sb-actions">
          <button className="btn btn-primary" onClick={submitWord} data-testid="sb-submit">
            Submit
          </button>
          <button className="btn btn-outline" onClick={() => setCurrent((c) => c.slice(0, -1))}>
            ⌫ Delete
          </button>
        </div>
      )}

      {/* found words */}
      {!unlimitedGameOverRef.current && (
        <div className="game-action-bar" data-testid="sb-found-bar">
          <span className="game-action-bar-label">
            Found: {found.length} word{found.length === 1 ? '' : 's'} · {pangramsFound} pangram{pangramsFound === 1 ? '' : 's'}
          </span>
          <div className="game-action-bar-btns">
            <button className="btn btn-sm btn-secondary" onClick={() => setShowFound(true)}>
              View List
            </button>
            {mode !== 'unlimited' && (
              <button className="btn btn-sm btn-outline" onClick={finishPuzzle} data-testid="sb-finish">
                Finish
              </button>
            )}
          </div>
        </div>
      )}

      {/* Help modal */}
      {showHelp && (
        <Modal title="How to Play" onClose={() => setShowHelp(false)}>
          <ul className="help-list">
            <li>Make words with the 7 hive letters, every word must include the <strong>center letter</strong>.</li>
            <li>Words must be at least 4 letters long.</li>
            <li>Letters can be reused as many times as you like.</li>
            <li>4-letter words score 1 point; longer words score one point per letter.</li>
            <li>A <strong>pangram</strong>, a word using all 7 letters, earns a <strong>+7 bonus</strong>.</li>
            <li>Reach <strong>Queen Bee</strong> (100% of the max score) to win the crown.</li>
            <li><strong>Unlimited Mode:</strong> You have 5 minutes. Find words to earn +10 seconds. Shuffle letters for free, or Refresh for a new puzzle at −60 seconds. Keep going until time runs out!</li>
          </ul>
        </Modal>
      )}

      {/* Found words modal */}
      {showFound && (
        <Modal title={`Found Words (${found.length})`} onClose={() => setShowFound(false)}>
          {foundWordsSorted.length === 0 ? (
            <p>No words yet, start spelling!</p>
          ) : (
            <div className="sb-found-list">
              {foundWordsSorted.map((f) => (
                <span key={f.word} className={`sb-found-chip${f.pangram ? ' sb-pangram' : ''}`}>
                  {f.pangram ? '★ ' : ''}{f.word} <small>+{f.pts}</small>
                </span>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* Stats modal */}
      {showStats && (
        <Modal title="Your Statistics" onClose={() => setShowStats(false)}>
          <div className="stats-summary">
            <div className="stat-item">
              <span className="stat-value">{stats.puzzlesPlayed}</span>
              <span className="stat-label">Puzzles</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.bestScore}</span>
              <span className="stat-label">Best Score</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.bestRank}</span>
              <span className="stat-label">Best Rank</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.pangramsFound}</span>
              <span className="stat-label">Pangrams</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.totalWords}</span>
              <span className="stat-label">Total Words</span>
            </div>
          </div>
        </Modal>
      )}

      {/* Result overlay */}
      {result && (
        <div className="game-result" data-testid="sb-result">
          <div className="result-content">
            <button className="result-close" onClick={() => setResult(null)}>×</button>
            <div className="result-title">{result.title}</div>
            <div className="result-message">{result.message}</div>
            {result.score !== undefined && (
              <div className="result-stats">
                <div className="result-stat">
                  <span className="result-stat-value">{result.score}</span>
                  <span className="result-stat-label">Score</span>
                </div>
                <div className="result-stat">
                  <span className="result-stat-value">{result.words}</span>
                  <span className="result-stat-label">Words</span>
                </div>
                {result.pangrams !== undefined && (
                  <div className="result-stat">
                    <span className="result-stat-value">{result.pangrams}</span>
                    <span className="result-stat-label">Pangrams</span>
                  </div>
                )}
              </div>
            )}
            <div className="result-actions">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  doSubmitScore(result.totalScore ?? 0)
                }}
              >
                Submit Score
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setResult(null)
                  if (mode === 'unlimited') {
                    // Restart unlimited from scratch
                    resetUnlimitedState()
                    startPuzzle(generatePuzzle(), true)
                  } else {
                    changeMode(mode)
                  }
                }}
              >
                Play Again
              </button>
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
