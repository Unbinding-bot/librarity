import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import GameShell, { Modal } from '../../components/ui/GameShell'
import NamePrompt from '../../components/ui/NamePrompt'
import { useToast } from '../../contexts/ToastContext'
import { useGameState } from '../../contexts/GameStateContext'
import { getDisplayName } from '../../lib/logbook'

import validWordsData from '../../assets/wordle-valid.json'
import targetWordsData from '../../assets/wordle-targets.json'
import dailyOverridesData from '../../assets/daily-overrides.json'

const WORD_LENGTH = 5
const MAX_GUESSES = 6
const VALID_SET = new Set(validWordsData.map((w) => String(w).toUpperCase()))

const KEY_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Enter', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Backspace'],
]

const DEFAULT_STATS = {
  gamesPlayed: 0,
  gamesWon: 0,
  winRate: 0,
  currentStreak: 0,
  maxStreak: 0,
  guessDistribution: [0, 0, 0, 0, 0, 0],
  lastPlayedDaily: null,
  lastPlayedRandom: null,
}

function loadStats() {
  try {
    const saved = localStorage.getItem('wordle_stats')
    return saved ? { ...DEFAULT_STATS, ...JSON.parse(saved) } : { ...DEFAULT_STATS }
  } catch {
    return { ...DEFAULT_STATS }
  }
}

function saveStats(stats) {
  try {
    localStorage.setItem('wordle_stats', JSON.stringify(stats))
  } catch {}
}

/** Two-pass Wordle check: correct first, then present. */
function checkGuess(guess, word) {
  const result = Array(WORD_LENGTH).fill('absent')
  const wordLetters = word.split('')
  const guessLetters = guess.split('')

  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guessLetters[i] === wordLetters[i]) {
      result[i] = 'correct'
      wordLetters[i] = null
      guessLetters[i] = null
    }
  }
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guessLetters[i] !== null) {
      const idx = wordLetters.indexOf(guessLetters[i])
      if (idx !== -1) {
        result[i] = 'present'
        wordLetters[idx] = null
      }
    }
  }
  return result
}

/** Build keyboard state { letter: 'correct'|'present'|'absent' } from revealed guesses. */
function buildKeyboardState(guesses, word) {
  const state = {}
  const priority = { correct: 3, present: 2, absent: 1 }
  for (const guess of guesses) {
    const result = checkGuess(guess, word)
    for (let i = 0; i < WORD_LENGTH; i++) {
      const letter = guess[i]
      const prev = state[letter]
      if (!prev || priority[result[i]] > priority[prev]) {
        state[letter] = result[i]
      }
    }
  }
  return state
}

export default function Wordle() {
  const { showToast } = useToast()
  const { recordScore } = useGameState()

  const [word, setWord] = useState('')
  const [guesses, setGuesses] = useState([])
  const [currentGuess, setCurrentGuess] = useState('')
  const [gameOver, setGameOver] = useState(false)
  const [won, setWon] = useState(false)
  const [revealedRows, setRevealedRows] = useState(0)
  const [revealingRow, setRevealingRow] = useState(-1)
  const [revealedCols, setRevealedCols] = useState(0)
  const [shakeRow, setShakeRow] = useState(-1)
  const [winRow, setWinRow] = useState(-1)
  const [mode, setMode] = useState('daily')

  // Unlimited (random) session state
  const [unlimitedActive, setUnlimitedActive] = useState(false)
  const [unlimitedRound, setUnlimitedRound] = useState(0)
  const [unlimitedScore, setUnlimitedScore] = useState(0)
  const [unlimitedStreak, setUnlimitedStreak] = useState(0)

  // UI state
  const [showHelp, setShowHelp] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showExamples, setShowExamples] = useState(false)
  const [showDistribution, setShowDistribution] = useState(false)
  const [result, setResult] = useState(null)
  const [namePrompt, setNamePrompt] = useState(null)
  const [actionBar, setActionBar] = useState(null)
  const [stats, setStats] = useState(() => loadStats())

  const lastAttemptsRef = useRef(undefined)
  const wordRef = useRef('')
  const answerRef = useRef('') // persist answer for endgame display even after clearing wordRef
  const revealingRef = useRef(false)
  const roundIdRef = useRef(0) // bumped every startRound — invalidates stale reveal timeouts
  const modeRef = useRef('daily')
  const unlimitedRef = useRef({ active: false, round: 0, score: 0, streak: 0 })
  const finalSessionScoreRef = useRef(null) // session score snapshot for Submit Score after the session ends
  const startedRef = useRef(false)

  const todayStr = new Date().toISOString().split('T')[0]
  const keyboardState = useMemo(
    () => buildKeyboardState(guesses.slice(0, revealedRows), word),
    [guesses, revealedRows, word],
  )

  const askForName = useCallback(
    () => new Promise((resolve) => setNamePrompt({ resolve })),
    [],
  )

  /** Daily word: override first, then date-seeded index. */
  const getDailyWord = useCallback(() => {
    try {
      const overrides = dailyOverridesData.overrides || []
      const override = overrides.find(
        (o) =>
          o.date === todayStr &&
          (o.gameType === 'wordle' || o.gameId === 'wordle') &&
          o.active,
      )
      const overrideWord = override?.challenge?.word || override?.customWord
      if (overrideWord) return overrideWord.toUpperCase()
    } catch {}

    const start = new Date('2024-01-01')
    const daysSince = Math.floor((new Date() - start) / 86400000)
    return targetWordsData[Math.abs(daysSince) % targetWordsData.length].toUpperCase()
  }, [todayStr])

  const getRandomWord = useCallback(
    () => targetWordsData[Math.floor(Math.random() * targetWordsData.length)].toUpperCase(),
    [],
  )

  /** Start a round. Keeps unlimited session counters when active. */
  const startRound = useCallback(
    (roundMode, opts = {}) => {
      // Invalidate any in-flight reveal timeout from the previous round so a
      // mode switch mid-animation can't fire handleWin/handleLose into the
      // new round (false wins corrupted streak/score; stale losses ended it).
      roundIdRef.current += 1
      revealingRef.current = false // new round = no animation in flight (stale timeout early-returns)
      const newWord = roundMode === 'daily' ? getDailyWord() : getRandomWord()
      wordRef.current = newWord
      answerRef.current = newWord
      setWord(newWord)
      setGuesses([])
      setCurrentGuess('')
      setGameOver(false)
      setWon(false)
      setRevealedRows(0)
      setRevealingRow(-1)
      setShakeRow(-1)
      setWinRow(-1)
      setResult(null)
      lastAttemptsRef.current = opts.keepLastAttempts ? lastAttemptsRef.current : undefined

      if (!opts.keepUnlimited) setActionBar(null)

      if (roundMode === 'unlimited') {
        const u = unlimitedRef.current
        const active = opts.resumeUnlimited ?? u.active
        if (!active) {
          unlimitedRef.current = { active: true, round: 0, score: 0, streak: 0 }
          setUnlimitedScore(0)
          setUnlimitedStreak(0)
        }
        unlimitedRef.current.active = true
        unlimitedRef.current.round += 1
        setUnlimitedActive(true)
        setUnlimitedRound(unlimitedRef.current.round)
      } else {
        setUnlimitedActive(false)
      }
    },
    [getDailyWord, getRandomWord],
  )

  // Initial game start (ref guard survives StrictMode double-invoke)
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    const s = loadStats()
    setStats(s)
    if (modeRef.current === 'daily' && s.lastPlayedDaily === todayStr) {
      modeRef.current = 'unlimited'
      setMode('unlimited')
      showToast('Daily challenge already done, switching to Unlimited mode', 'info')
    }
    startRound(modeRef.current)
  }, [startRound, showToast, todayStr])

  /** Update lifetime stats after a finished round. Returns the new stats. */
  const updateStats = useCallback(
    (roundWon, attempts) => {
      const s = loadStats()
      s.gamesPlayed += 1
      if (roundWon) {
        s.gamesWon += 1
        s.currentStreak += 1
        s.maxStreak = Math.max(s.maxStreak, s.currentStreak)
        if (attempts >= 1 && attempts <= 6) s.guessDistribution[attempts - 1] += 1
      } else {
        s.currentStreak = 0
      }
      s.winRate = Math.round((s.gamesWon / s.gamesPlayed) * 100)
      if (modeRef.current === 'daily') s.lastPlayedDaily = todayStr
      else s.lastPlayedRandom = todayStr
      saveStats(s)
      setStats(s)
      return s
    },
    [todayStr],
  )

  const handleWin = useCallback(
    (attempts) => {
      const s = updateStats(true, attempts)
      lastAttemptsRef.current = attempts
      const roundId = roundIdRef.current

      if (modeRef.current === 'daily') {
        setTimeout(() => {
          if (roundId !== roundIdRef.current) return // round restarted meanwhile
          setResult({
            title: 'Congratulations!',
            message: `You solved it in ${attempts} ${attempts === 1 ? 'try' : 'tries'}!`,
            stats: s,
          })
        }, 1600)
      } else if (modeRef.current === 'unlimited') {
        const roundPoints = (7 - attempts) * 100
        const streakBonus = unlimitedRef.current.streak * 50
        const earned = roundPoints + streakBonus
        unlimitedRef.current.score += earned
        unlimitedRef.current.streak += 1
        setUnlimitedScore(unlimitedRef.current.score)
        setUnlimitedStreak(unlimitedRef.current.streak)
        showToast(`+${earned} pts (${roundPoints} base + ${streakBonus} streak bonus)`, 'success')
        // Clear won flag so next round can receive input; then start fresh.
        setWon(false)
        setTimeout(() => {
          // Don't restart if the user already switched mode / restarted during
          // the win toast — that round belongs to the old session.
          if (roundId !== roundIdRef.current) return
          startRound(modeRef.current)
        }, 1800)
      } else {
        // Random mode — show result after animation
        setTimeout(() => {
          if (roundId !== roundIdRef.current) return // round restarted meanwhile
          setResult({
            title: 'You got it!',
            message: `Solved in ${attempts} ${attempts === 1 ? 'try' : 'tries'}!`,
            stats: s,
          })
        }, 1600)
      }
    },
    [startRound, showToast, updateStats],
  )

  /** Reset ALL unlimited session state — the single source of truth.
   * Call on every mode exit and every unlimited restart so a stale session
   * (score, streak, round counters) can't leak into the next mode. */
  const resetUnlimitedState = useCallback(() => {
    unlimitedRef.current = { active: false, round: 0, score: 0, streak: 0 }
    finalSessionScoreRef.current = null
    setUnlimitedActive(false)
    setUnlimitedRound(0)
    setUnlimitedScore(0)
    setUnlimitedStreak(0)
  }, [])

  const endUnlimitedSession = useCallback(() => {
    const u = unlimitedRef.current
    const s = loadStats()
    // Snapshot the session score BEFORE zeroing unlimitedRef — the result
    // modal's Submit Score reads this after the session state is gone
    // (reading unlimitedRef.current.score directly submitted 0).
    finalSessionScoreRef.current = u.score
    // Invalidate in-flight round timeouts (e.g. the 1800ms auto-next-restart
    // from handleWin) so they can't startRound behind this modal and wipe it.
    roundIdRef.current += 1
    setResult({
      title: u.round > 1 ? 'Session Over!' : 'Unlucky!',
      message: `The word was: ${answerRef.current || wordRef.current}`,
      session: { score: u.score, rounds: u.round - 1 },
      stats: s,
    })
    lastAttemptsRef.current = null
    resetUnlimitedState()
  }, [resetUnlimitedState])

  const giveUp = useCallback(() => {
    if (unlimitedRef.current.active) {
      endUnlimitedSession()
    } else {
      setResult({
        title: 'Game Over',
        message: `The word was: ${answerRef.current || wordRef.current}`,
        stats: loadStats(),
      })
      setGameOver(true)
      updateStats(false, MAX_GUESSES + 1)
    }
  }, [endUnlimitedSession, updateStats])

  const handleLose = useCallback(() => {
    const s = updateStats(false, MAX_GUESSES + 1)
    lastAttemptsRef.current = MAX_GUESSES + 1
    const roundId = roundIdRef.current

    if (unlimitedRef.current.active) {
      // Unlimited: end session on loss — same as other games (hearts/time based)
      const theWord = answerRef.current || wordRef.current
      unlimitedRef.current.streak = 0
      setUnlimitedStreak(0)
      setResult(null)
      showToast(`Session over! Was: ${theWord}`, 'error')
      endUnlimitedSession()
    } else {
      setTimeout(() => {
        // Mode switched during the 500ms delay — don't show a stale popup
        // (it would also leak the NEW round's answer via wordRef).
        if (roundId !== roundIdRef.current) return
        setResult({
          title: 'Game Over',
          message: `The word was: ${answerRef.current || wordRef.current}`,
          stats: s,
        })
      }, 500)
    }
  }, [updateStats, endUnlimitedSession])

  const submitGuess = useCallback(() => {
    if (gameOver || revealingRef.current) return

    if (currentGuess.length === 0) {
      showToast('Type a word first', 'error')
      return
    }
    if (currentGuess.length !== WORD_LENGTH) {
      setShakeRow(guesses.length)
      setTimeout(() => setShakeRow(-1), 500)
      showToast('Not enough letters', 'error')
      return
    }
    if (!VALID_SET.has(currentGuess)) {
      setShakeRow(guesses.length)
      setTimeout(() => setShakeRow(-1), 500)
      showToast('Not in word list', 'error')
      return
    }

    const guess = currentGuess
    const row = guesses.length
    const roundId = roundIdRef.current
    // clear the input immediately so the next row starts empty — otherwise
    // the typed word lingers in the input box after submitting.
    // NOTE: wordRef is NOT cleared here — the answer word must survive the
    // reveal animation for the final comparison, Share grid and result display
    // (clearing it caused the "always losing" regression, plan bug #1).
    setCurrentGuess('')
    revealingRef.current = true
    setRevealingRow(row)
    setRevealedCols(0)
    setGuesses((prev) => [...prev, guess])

    for (let c = 1; c <= WORD_LENGTH; c++) {
      setTimeout(() => setRevealedCols(c), c * 200)
    }

    setTimeout(() => {
      // Round was restarted/mode switched while tiles were animating — the
      // comparison below belongs to a board that no longer exists.
      if (roundId !== roundIdRef.current) return
      revealingRef.current = false
      setRevealingRow(-1)
      setRevealedCols(0)
      setRevealedRows(row + 1)

      if (guess === answerRef.current) {
        setWinRow(row)
        setGameOver(true)
        setWon(true)
        handleWin(row + 1)
      } else if (!won && row === MAX_GUESSES - 1) {
        setGameOver(true)
        handleLose()
      }
    }, WORD_LENGTH * 200 + 100)
  }, [currentGuess, guesses.length, gameOver, won, showToast, handleWin, handleLose])

  const handleInput = useCallback(
    (key) => {
      if (gameOver || revealingRef.current || result) return

      if (key === 'Enter') {
        submitGuess()
      } else if (key === 'Backspace') {
        setCurrentGuess((prev) => prev.slice(0, -1))
      } else if (key.length === 1 && /[a-zA-Z]/.test(key)) {
        setCurrentGuess((prev) => (prev.length < WORD_LENGTH ? prev + key.toUpperCase() : prev))
      }
    },
    [gameOver, revealingRef, result, submitGuess],
  )

  // Physical keyboard
  useEffect(() => {
    const onKeyDown = (e) => {
      if (showHelp || showStats || result || namePrompt) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === 'Enter' || e.key === 'Backspace' || /^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault()
        handleInput(e.key)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleInput, showHelp, showStats, result, namePrompt])

  const shareResult = () => {
    const attempts = guesses.length
    const text =
      `Wordle ${mode === 'daily' ? '(Daily)' : '(Random)'} ${won ? attempts : 'X'}/${MAX_GUESSES}\n\n` +
      guesses
        .map((g) =>
          checkGuess(g, wordRef.current)
            .map((s) => (s === 'correct' ? '🟩' : s === 'present' ? '🟨' : '⬜'))
            .join(''),
        )
        .join('\n') +
      '\n\nBy Unbinding'

    navigator.clipboard
      .writeText(text)
      .then(() => showToast('Score copied!', 'success'))
      .catch(() => showToast('Failed to copy', 'error'))
  }

  const doSubmitScore = async (attempts) => {
    try {
      const username = await askForName()
      if (!username) return

      // lastAttemptsRef === null marks an ended unlimited session: submit the
      // snapshotted session score (unlimitedRef was already reset to 0).
      const score =
        lastAttemptsRef.current === null
          ? finalSessionScoreRef.current ?? 0
          : Math.max(50, (7 - Math.min(attempts, 6)) * 100)

      await recordScore({
        gameType: 'wordle',
        gameMode: modeRef.current,
        playerName: username || getDisplayName(),
        score,
        timeTaken: null,
      })
      showToast(`Score submitted as "${username}"!`, 'success')
    } catch (err) {
      console.error('Error submitting score:', err)
      showToast('Could not submit score', 'error')
    }
  }

  const changeMode = (newMode) => {
    if (modeRef.current === newMode) return
    modeRef.current = newMode
    setMode(newMode)
    // Clear unlimited session state on every mode exit so stale score/streak
    // or a stuck active flag can't leak into the next mode.
    resetUnlimitedState()
    setResult(null)
    setActionBar(null)
    startRound(newMode)
    showToast(`Switched to ${newMode === 'daily' ? 'Daily Challenge' : newMode === 'unlimited' ? 'Unlimited' : 'Random Word'} mode`, 'success')
  }

  const playAgain = () => {
    setResult(null)
    if (modeRef.current === 'daily' && loadStats().lastPlayedDaily === todayStr) {
      showToast('Switching to Unlimited mode', 'info')
      changeMode('unlimited')
      return
    }
    // Fresh session (round 1, score 0) — never resume the ended one.
    resetUnlimitedState()
    startRound(modeRef.current)
  }

  const closeResult = () => {
    const r = result
    setResult(null)
    if (r) {
      // Session end modal (from endUnlimitedSession) has r.session with score/rounds
      if (r.session) {
        setActionBar(`Session complete — ${r.session.score} points in ${r.session.rounds} round${r.session.rounds === 1 ? '' : 's'}`)
      } else if (r.message.startsWith('You solved')) {
        const label = `Word: ${wordRef.current}, ${r.message.replace('You solved it in ', 'solved in ')}`
        setActionBar(label)
      } else {
        setActionBar(r.message)
      }
    }
  }

  const restartFromBar = () => {
    if (window.confirm('Restart the game? Current progress will be lost.')) {
      resetUnlimitedState()
      startRound(modeRef.current)
    }
  }

  const distribution = stats.guessDistribution
  const distMax = Math.max(...distribution, 1)
  const guessesDisplay = `${guesses.length}/${MAX_GUESSES}`

  return (
    <GameShell
      title="Wordle"
      subtitle="Guess the 5-letter word in 6 tries"
      accent="var(--nb-yellow)"
      controls={
        <>
          <button className={`mode-btn ${mode === 'daily' ? 'active' : ''}`} onClick={() => changeMode('daily')}>
            Daily
          </button>
          <button className={`mode-btn ${mode === 'random' ? 'active' : ''}`} onClick={() => changeMode('random')}>
            Random
          </button>
          <button className={`mode-btn ${mode === 'unlimited' ? 'active' : ''}`} onClick={() => changeMode('unlimited')}>
            Unlimited
          </button>
          <button className="icon-btn" aria-label="View Statistics" onClick={() => setShowStats(true)}>Stats</button>
          <button className="icon-btn" aria-label="How to Play" onClick={() => setShowHelp(true)}>Help</button>
        </>
      }
    >
      {/* Game info */}
      <div className="game-info">
        <div className="info-item">
          <span className="info-label">Mode:</span>
          <span className="info-value">{mode === 'daily' ? 'Daily Challenge' : 'Random Word'}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Guesses:</span>
          <span className="info-value">{guessesDisplay}</span>
        </div>
      </div>

      {/* Unlimited bar */}
      {unlimitedActive && (
        <div className="unlimited-bar">
          <div className="unlimited-stat">
            <span className="unlimited-label">Round</span>
            <span className="unlimited-value">{unlimitedRound}</span>
          </div>
          <div className="unlimited-stat">
            <span className="unlimited-label">Total Score</span>
            <span className="unlimited-value">{unlimitedScore}</span>
          </div>
          <div className="unlimited-stat">
            <span className="unlimited-label">Streak</span>
            <span className="unlimited-value">{unlimitedStreak}</span>
          </div>
          <button
            className="btn btn-sm btn-outline unlimited-end-btn"
            onClick={() => {
              if (window.confirm('End the session and see your score?')) endUnlimitedSession()
            }}
          >
            End Session
          </button>
        </div>
      )}

      {/* Board */}
      <div className="game-board" data-testid="game-board">
        {Array.from({ length: MAX_GUESSES }, (_, row) => {
          const submitted = guesses[row]
          const isCurrent = row === guesses.length && !gameOver
          const display = submitted || (isCurrent ? currentGuess : '')
          const isRevealing = revealingRow === row
          const colsShown = isRevealing
            ? revealedCols
            : submitted && row < revealedRows
              ? WORD_LENGTH
              : 0
          const result_ = submitted && colsShown === WORD_LENGTH ? checkGuess(submitted, word) : null

          return (
            <div className={`board-row ${shakeRow === row ? 'shake' : ''}`} data-row={row} key={row}>
              {Array.from({ length: WORD_LENGTH }, (_, col) => {
                const letter = display[col] || ''
                const status = result_ && col < colsShown ? result_[col] : null
                return (
                  <div
                    key={col}
                    className={['tile', letter ? 'filled' : '', status || '', winRow === row ? 'win' : '']
                      .filter(Boolean)
                      .join(' ')}
                    data-row={row}
                    data-col={col}
                  >
                    {letter}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Keyboard */}
      <div className="keyboard" data-testid="keyboard">
        {KEY_ROWS.map((row, i) => (
          <div className="keyboard-row" key={i}>
            {row.map((key) => {
              const large = key === 'Enter' || key === 'Backspace'
              const state = key.length === 1 ? keyboardState[key] : null
              return (
                <button
                  key={key}
                  className={`key ${large ? 'key-large' : ''} ${state || ''}`}
                  data-key={key}
                  onClick={() => handleInput(key)}
                >
                  {key === 'Backspace' ? '⌫' : key}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Persistent action bar */}
      {actionBar && (
        <div className="game-action-bar">
          <span className="game-action-bar-label">{actionBar}</span>
          <div className="game-action-bar-btns">
            <button className="btn btn-sm btn-primary" onClick={shareResult}>Share</button>
            <button className="btn btn-sm btn-secondary" onClick={playAgain}>Play Again</button>
          </div>
        </div>
      )}

      {/* Help modal */}
      {showHelp && (
        <Modal title="How to Play" onClose={() => setShowHelp(false)}>
          <p>Guess the <strong>WORDLE</strong> in 6 tries.</p>
          <ul className="help-list">
            <li>Each guess must be a valid 5-letter word.</li>
            <li>The color of the tiles will change to show how close your guess was to the word.</li>
          </ul>

          <button className="btn btn-secondary toggle-distribution" onClick={() => setShowExamples((e) => !e)}>
            {showExamples ? 'Hide Examples ▲' : 'Show Examples ▼'}
          </button>

          {showExamples && (
            <div className="help-examples">
              <h3>Examples</h3>
              <div className="example">
                <div className="example-row">
                  <div className="tile tile-correct correct">W</div>
                  <div className="tile">E</div>
                  <div className="tile">A</div>
                  <div className="tile">R</div>
                  <div className="tile">Y</div>
                </div>
                <p><strong>W</strong> is in the word and in the correct spot.</p>
              </div>
              <div className="example">
                <div className="example-row">
                  <div className="tile">P</div>
                  <div className="tile present">I</div>
                  <div className="tile">L</div>
                  <div className="tile">L</div>
                  <div className="tile">S</div>
                </div>
                <p><strong>I</strong> is in the word but in the wrong spot.</p>
              </div>
              <div className="example">
                <div className="example-row">
                  <div className="tile">V</div>
                  <div className="tile">A</div>
                  <div className="tile">G</div>
                  <div className="tile absent">U</div>
                  <div className="tile">E</div>
                </div>
                <p><strong>U</strong> is not in the word in any spot.</p>
              </div>
            </div>
          )}

          <div className="help-modes">
            <h3>Game Modes</h3>
            <p>
              <strong>Daily Challenge:</strong> One puzzle per day. Everyone gets the same word! Your
              score is submitted to the leaderboard.
            </p>
            <p>
              <strong>Random Word:</strong> Play unlimited random words for practice. Scores are not
              submitted to the leaderboard.
            </p>
          </div>
        </Modal>
      )}

      {/* Stats modal */}
      {showStats && (
        <Modal title="Statistics" onClose={() => setShowStats(false)}>
          <div className="stats-summary">
            <div className="stat-item">
              <div className="stat-value">{stats.gamesPlayed}</div>
              <div className="stat-label">Played</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{stats.winRate}%</div>
              <div className="stat-label">Win %</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{stats.currentStreak}</div>
              <div className="stat-label">Current Streak</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{stats.maxStreak}</div>
              <div className="stat-label">Max Streak</div>
            </div>
          </div>

          <button className="btn btn-secondary toggle-distribution" onClick={() => setShowDistribution((d) => !d)}>
            {showDistribution ? 'Hide Guess Distribution ▲' : 'Show Guess Distribution ▼'}
          </button>

          {showDistribution && (
            <div className="guess-distribution">
              <h3>Guess Distribution</h3>
              <div className="distribution-chart">
                {distribution.map((count, idx) => (
                  <div className="distribution-row" key={idx}>
                    <div className="distribution-label">{idx + 1}</div>
                    <div className="distribution-bar" style={{ width: `${(count / distMax) * 100}%` }}>
                      {count}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Result modal */}
      {result && (
        <div
          className="game-result"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeResult()
          }}
        >
          <div className="result-content">
            <button className="result-close" onClick={closeResult}>&times;</button>
            <h2 className="result-title">{result.title}</h2>
            <p className="result-message">{result.message}</p>
            {result.session && (
              <div className="unlimited-session-score">
                <div className="session-score-value">{result.session.score}</div>
                <div className="session-score-label">Session Score</div>
                <div className="session-rounds-value">
                  {result.session.rounds} word{result.session.rounds !== 1 ? 's' : ''} solved
                </div>
              </div>
            )}
            {result.stats && (
              <div className="result-stats">
                <div className="result-stat">
                  <div className="result-stat-value">{result.stats.gamesPlayed}</div>
                  <div className="result-stat-label">Played</div>
                </div>
                <div className="result-stat">
                  <div className="result-stat-value">{result.stats.winRate}%</div>
                  <div className="result-stat-label">Win Rate</div>
                </div>
                <div className="result-stat">
                  <div className="result-stat-value">{result.stats.currentStreak}</div>
                  <div className="result-stat-label">Streak</div>
                </div>
              </div>
            )}
            <div className="result-actions">
              <button className="btn btn-primary" onClick={shareResult}>Share</button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  const attempts = won ? guesses.length : MAX_GUESSES + 1
                  setResult(null)
                  doSubmitScore(attempts)
                  // After submitting, show action bar with replay button
                  setActionBar(`Word: ${answerRef.current || wordRef.current} — score submitted`)
                }}
              >
                Submit Score
              </button>
              <button className="btn btn-secondary" onClick={playAgain}>Play Again</button>
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
