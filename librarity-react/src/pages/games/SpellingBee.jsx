import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useToast } from '../../contexts/ToastContext'
import { useGameState } from '../../contexts/GameStateContext'
import GameShell, { Modal } from '../../components/ui/GameShell'
import NamePrompt from '../../components/ui/NamePrompt'
import { getDisplayName } from '../../lib/logbook'

// Bundled word list
import wordListData from '../../assets/spelling-bee-words.json'
import dailyOverridesData from '../../assets/daily-overrides.json'

const TODAY_STR = new Date().toISOString().split('T')[0]

const RANKS = [
    { name: 'Beginner', percent: 0 },
    { name: 'Good Start', percent: 2 },
    { name: 'Moving Up', percent: 5 },
    { name: 'Good', percent: 8 },
    { name: 'Solid', percent: 15 },
    { name: 'Nice', percent: 25 },
    { name: 'Great', percent: 40 },
    { name: 'Amazing', percent: 50 },
    { name: 'Genius', percent: 70 },
    { name: 'Queen Bee', percent: 100 },
]

const DEFAULT_STATS = {
    puzzlesPlayed: 0,
    queenBees: 0,
    totalWordsFound: 0,
    totalScore: 0,
    rankCounts: {},
    lastPlayedDaily: null,
    lastPlayedRandom: null,
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
    } catch { /* ignore */ }
}

/** Word list for the puzzle (normalised once). */
const WORD_LIST = wordListData.map(w => w.toUpperCase())

/** Score a word: 4-letter = 1pt, longer = per-letter, pangram +7. */
function wordScore(word) {
    let score = word.length === 4 ? 1 : word.length
    if (new Set(word).size === 7) score += 7
    return score
}

/** Seed-picked daily puzzles (same list as original). */
const SEED_PUZZLES = [
    { center: 'E', outer: ['R', 'A', 'T', 'I', 'N', 'G'] },
    { center: 'A', outer: ['R', 'E', 'T', 'I', 'N', 'G'] },
    { center: 'T', outer: ['R', 'E', 'A', 'I', 'N', 'G'] },
    { center: 'I', outer: ['R', 'E', 'A', 'T', 'N', 'G'] },
    { center: 'O', outer: ['R', 'A', 'T', 'I', 'N', 'G'] },
    { center: 'R', outer: ['E', 'A', 'T', 'I', 'N', 'G'] },
    { center: 'S', outer: ['E', 'A', 'R', 'T', 'I', 'N'] },
    { center: 'L', outer: ['E', 'A', 'R', 'T', 'I', 'N'] },
    { center: 'D', outer: ['E', 'A', 'R', 'T', 'I', 'N'] },
    { center: 'C', outer: ['E', 'A', 'R', 'T', 'I', 'N'] },
]

export default function SpellingBee() {
    const { showToast } = useToast()
    const { recordScore } = useGameState()

    // Puzzle state
    const [centerLetter, setCenterLetter] = useState('')
    const [outerLetters, setOuterLetters] = useState([])
    const [currentInput, setCurrentInput] = useState('')
    const [foundWords, setFoundWords] = useState([])
    const [score, setScore] = useState(0)
    const [mode, setMode] = useState('daily')
    const [shakeInput, setShakeInput] = useState(false)
    const [clickedLetter, setClickedLetter] = useState(null)

    // UI state
    const [showHelp, setShowHelp] = useState(false)
    const [showStats, setShowStats] = useState(false)
    const [showRankDist, setShowRankDist] = useState(false)
    const [showWordList, setShowWordList] = useState(true)
    const [showResult, setShowResult] = useState(false)
    const [result, setResult] = useState(null)
    const [namePrompt, setNamePrompt] = useState(null)
    const [actionBar, setActionBar] = useState(null)
    const [stats, setStats] = useState(() => loadStats())

    const modeRef = useRef('daily')
    const allLetters = useMemo(() => [centerLetter, ...outerLetters], [centerLetter, outerLetters])

    const askForName = useCallback(() => {
        return new Promise((resolve) => setNamePrompt({ resolve }))
    }, [])

    /** Load daily puzzle: override first, then date-seeded. */
    const loadDailyPuzzle = useCallback(() => {
        try {
            const overrides = dailyOverridesData.overrides || []
            const override = overrides.find(
                o => o.date === TODAY_STR && (o.gameType === 'spelling_bee' || o.gameId === 'spelling_bee') && o.active,
            )
            const c = override?.challenge?.centerLetter || override?.centerLetter
            const o = override?.challenge?.outerLetters || override?.outerLetters
            if (c && o) {
                setCenterLetter(c.toUpperCase())
                setOuterLetters(o.toUpperCase().split('').slice(0, 6))
                return
            }
        } catch { /* ignore */ }

        const start = new Date('2024-01-01')
        const daysSinceStart = Math.floor((new Date() - start) / 86400000)
        const puzzle = SEED_PUZZLES[Math.abs(daysSinceStart) % SEED_PUZZLES.length]
        setCenterLetter(puzzle.center)
        setOuterLetters([...puzzle.outer])
    }, [])

    /** Random puzzle: 7 unique letters. */
    const generateRandomPuzzle = useCallback(() => {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        const letters = []
        while (letters.length < 7) {
            const letter = alphabet[Math.floor(Math.random() * alphabet.length)]
            if (!letters.includes(letter)) letters.push(letter)
        }
        setCenterLetter(letters[0])
        setOuterLetters(letters.slice(1))
    }, [])

    /** Compute valid words / pangrams / max score whenever letters change. */
    const { validWords, pangrams, maxScore } = useMemo(() => {
        const valid = new Set()
        const pangs = new Set()
        let max = 0
        if (!centerLetter || outerLetters.length === 0) return { validWords: valid, pangrams: pangs, maxScore: 0 }

        const all = [centerLetter, ...outerLetters]
        for (const raw of WORD_LIST) {
            if (raw.length < 4) continue
            if (!raw.includes(centerLetter)) continue
            let ok = true
            for (const ch of raw) {
                if (!all.includes(ch)) { ok = false; break }
            }
            if (!ok) continue
            valid.add(raw)
            if (new Set(raw).size === 7) pangs.add(raw)
            max += wordScore(raw)
        }
        return { validWords: valid, pangrams: pangs, maxScore: max }
    }, [centerLetter, outerLetters])

    /** Start a fresh round for the current mode. */
    const startGame = useCallback((roundMode) => {
        if (roundMode === 'daily') loadDailyPuzzle()
        else generateRandomPuzzle()
        setCurrentInput('')
        setFoundWords([])
        setScore(0)
        setResult(null)
        setActionBar(null)
    }, [loadDailyPuzzle, generateRandomPuzzle])

    // Initial game start
    const startedRef = useRef(false)
    useEffect(() => {
        if (startedRef.current) return
        startedRef.current = true

        const s = loadStats()
        setStats(s)
        if (modeRef.current === 'daily' && s.lastPlayedDaily === TODAY_STR) {
            modeRef.current = 'random'
            setMode('random')
            showToast('Daily puzzle already done — switching to Random mode', 'info')
        }
        startGame(modeRef.current)
    }, [startGame, showToast])

    const addLetter = useCallback((letter) => {
        setCurrentInput(prev => prev + letter)
        setClickedLetter(letter)
        setTimeout(() => setClickedLetter(null), 300)
    }, [])

    const deleteLetter = useCallback(() => {
        setCurrentInput(prev => prev.slice(0, -1))
    }, [])

    const shuffleLetters = useCallback(() => {
        setOuterLetters(prev => {
            const shuffled = [...prev]
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1))
                ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
            }
            return shuffled
        })
    }, [])

    const doShake = () => {
        setShakeInput(true)
        setTimeout(() => setShakeInput(false), 500)
    }

    const submitScore = useCallback(async (scoreToSubmit) => {
        try {
            const username = await askForName()
            if (!username) return

            await recordScore({
                gameType: 'spelling_bee',
                gameMode: modeRef.current,
                playerName: username || getDisplayName(),
                score: scoreToSubmit,
                timeTaken: null,
            })
            showToast(`Score submitted as "${username}"! ✅`, 'success')
        } catch (err) {
            console.error('Error submitting score:', err)
        }
    }, [askForName, recordScore, showToast])

    /** Finish puzzle: stats, result modal, optional leaderboard submit. */
    const finishPuzzle = useCallback((finalWords, finalScore) => {
        const percent = maxScore > 0 ? (finalScore / maxScore) * 100 : 0
        let finalRank = RANKS[0]
        for (const rank of RANKS) {
            if (percent >= rank.percent) finalRank = rank
        }

        // Update stats
        const s = loadStats()
        s.puzzlesPlayed += 1
        s.totalWordsFound += finalWords.length
        s.totalScore += finalScore
        if (finalRank.name === 'Queen Bee') s.queenBees += 1
        s.rankCounts[finalRank.name] = (s.rankCounts[finalRank.name] || 0) + 1
        if (modeRef.current === 'daily') s.lastPlayedDaily = TODAY_STR
        else s.lastPlayedRandom = TODAY_STR
        saveStats(s)
        setStats(s)

        const pangsFound = finalWords.filter(w => pangrams.has(w)).length

        setResult({
            rank: finalRank.name,
            score: finalScore,
            words: finalWords.length,
            pangrams: pangsFound,
            percent: Math.round(percent),
        })
        setShowResult(true)

        // Submit to leaderboard (daily only, auto)
        if (modeRef.current === 'daily') {
            submitScore(finalScore)
        }
    }, [maxScore, pangrams, submitScore])

    const submitWord = useCallback(() => {
        const word = currentInput.toUpperCase()

        if (word.length < 4) {
            doShake()
            showToast('Too short! Words must be at least 4 letters.', 'error')
            return
        }
        if (!word.includes(centerLetter)) {
            doShake()
            showToast(`Must include center letter: ${centerLetter}`, 'error')
            return
        }
        if (foundWords.includes(word)) {
            doShake()
            showToast('Already found!', 'error')
            return
        }
        if (!validWords.has(word)) {
            doShake()
            showToast('Not in word list', 'error')
            return
        }

        // Valid word
        const ws = wordScore(word)
        setFoundWords(prev => [...prev, word])
        setScore(prev => prev + ws)

        if (pangrams.has(word)) {
            showToast(`🎉 PANGRAM! +${ws} points!`, 'success')
        } else {
            showToast(`+${ws} point${ws > 1 ? 's' : ''}!`, 'success')
        }

        setCurrentInput('')

        // Queen Bee check
        if (foundWords.length + 1 === validWords.size) {
            setTimeout(() => finishPuzzle([...foundWords, word], score + ws), 1000)
        }
    }, [currentInput, centerLetter, foundWords, score, validWords, pangrams, showToast, finishPuzzle])

    const changeMode = (newMode) => {
        if (modeRef.current === newMode) return
        modeRef.current = newMode
        setMode(newMode)
        startGame(newMode)
        showToast(`Switched to ${newMode === 'daily' ? 'Daily Puzzle' : 'Random Puzzle'} mode`, 'success')
    }

    const shareResult = () => {
        const percent = maxScore > 0 ? (score / maxScore) * 100 : 0
        let finalRank = RANKS[0]
        for (const rank of RANKS) {
            if (percent >= rank.percent) finalRank = rank
        }
        const pangsFound = foundWords.filter(w => pangrams.has(w)).length

        const text = `🐝 Spelling Bee ${mode === 'daily' ? '(Daily)' : '(Random)'}\n\n` +
            `Rank: ${finalRank.name}\n` +
            `Score: ${score}/${maxScore}\n` +
            `Words: ${foundWords.length}/${validWords.size}\n` +
            `Pangrams: ${pangsFound}/${pangrams.size}\n\n` +
            `By Unbinding`

        navigator.clipboard.writeText(text)
            .then(() => showToast('Score copied! 📋', 'success'))
            .catch(() => showToast('Failed to copy', 'error'))
    }

    const closeResult = () => {
        setShowResult(false)
        setActionBar(`Score: ${score} · ${foundWords.length} words found`)
    }

    // Physical keyboard
    useEffect(() => {
        const onKeyDown = (e) => {
            if (showHelp || showStats || showResult || namePrompt) return
            if (e.ctrlKey || e.metaKey || e.altKey) return
            if (e.key === 'Enter') {
                submitWord()
            } else if (e.key === 'Backspace') {
                deleteLetter()
            } else if (e.key === ' ') {
                e.preventDefault()
                shuffleLetters()
            } else if (/^[a-zA-Z]$/.test(e.key)) {
                const letter = e.key.toUpperCase()
                if (allLetters.includes(letter)) addLetter(letter)
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [submitWord, deleteLetter, shuffleLetters, addLetter, allLetters, showHelp, showStats, showResult, namePrompt])

    const percent = maxScore > 0 ? (score / maxScore) * 100 : 0
    let currentRank = RANKS[0]
    for (const rank of RANKS) {
        if (percent >= rank.percent) currentRank = rank
    }
    const pangsFoundNow = foundWords.filter(w => pangrams.has(w)).length

    // Honeycomb arrangement: 2 / 3 / 2 rows
    const honeycombRows = [
        [outerLetters[0], outerLetters[1]],
        [outerLetters[2], centerLetter, outerLetters[3]],
        [outerLetters[4], outerLetters[5]],
    ]

    const sortedWords = [...foundWords].sort()
    const distMax = Math.max(1, ...Object.values(stats.rankCounts || {}))

    return (
        <GameShell
            title="Spelling Bee"
            subtitle="Make words using the letters in the hive. Every word must use the center letter!"
            controls={(
                <>
                    <button className={`mode-btn ${mode === 'daily' ? 'active' : ''}`} onClick={() => changeMode('daily')}>📅 Daily Puzzle</button>
                    <button className={`mode-btn ${mode === 'random' ? 'active' : ''}`} onClick={() => changeMode('random')}>🎲 Random Puzzle</button>
                    <button className="icon-btn" aria-label="View Statistics" onClick={() => setShowStats(true)}>📊</button>
                    <button className="icon-btn" aria-label="How to Play" onClick={() => setShowHelp(true)}>❓</button>
                </>
            )}
        >
            {/* Game stats */}
            <div className="game-stats">
                <div className="stat-box">
                    <div className="stat-value">{score}</div>
                    <div className="stat-label">Score</div>
                </div>
                <div className="stat-box">
                    <div className="stat-value">{foundWords.length}</div>
                    <div className="stat-label">Words</div>
                </div>
                <div className="stat-box">
                    <div className="stat-value">{pangsFoundNow}</div>
                    <div className="stat-label">Pangrams</div>
                </div>
            </div>

            {/* Progress bar */}
            <div className="progress-container">
                <div className="progress-labels">
                    {RANKS.map(r => <span className="progress-label" key={r.name}>{r.name}</span>)}
                </div>
                <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${Math.min(percent, 100)}%` }} />
                    <div className="progress-markers">
                        {RANKS.filter(r => r.percent > 0 && r.percent < 100).map(r => (
                            <div className="progress-marker" style={{ left: `${r.percent}%` }} key={r.name} />
                        ))}
                    </div>
                    <div className="progress-info">
                        <span>{currentRank.name}</span>
                        <span>{Math.round(percent)}%</span>
                        <span>{score}/{maxScore}</span>
                    </div>
                </div>
            </div>

            {/* Input area */}
            <div className="input-section">
                <div className="word-input">
                    <div className={`input-display ${shakeInput ? 'shake' : ''}`} style={{ fontFamily: 'var(--font-handwritten)' }}>
                        {currentInput || ' '}
                    </div>
                    <div className="input-buttons">
                        <button className="input-btn" aria-label="Delete letter" onClick={deleteLetter}><span>Delete</span></button>
                        <button className="input-btn" aria-label="Shuffle letters" onClick={shuffleLetters}><span>🔄 Shuffle</span></button>
                        <button className="input-btn input-btn-primary" aria-label="Submit word" onClick={submitWord}><span>Enter</span></button>
                    </div>
                </div>
            </div>

            {/* Honeycomb */}
            <div className="honeycomb-container">
                {honeycombRows.map((row, i) => (
                    <div className="honeycomb-row" key={i}>
                        {row.map((letter, j) => letter ? (
                            <div
                                className={`hex-cell ${letter === centerLetter ? 'center' : ''} ${clickedLetter === letter ? 'clicked' : ''}`}
                                key={j}
                                onClick={() => addLetter(letter)}
                            >
                                <div className="hex-shape">
                                    <div className="hex-letter">{letter}</div>
                                </div>
                            </div>
                        ) : null)}
                    </div>
                ))}
            </div>

            {/* Word list */}
            <div className="word-list-section">
                <div className="word-list-header">
                    <h3>Your Words ({foundWords.length})</h3>
                    <button className="toggle-btn" onClick={() => setShowWordList(v => !v)}>
                        {showWordList ? '▼' : '▲'}
                    </button>
                </div>
                {showWordList && (
                    <div className="word-list-content">
                        {foundWords.length === 0 ? (
                            <div className="word-list-empty">
                                <p>No words found yet. Start spelling!</p>
                            </div>
                        ) : (
                            <div className="word-list-grid">
                                {sortedWords.map(word => (
                                    <div className={`word-chip ${pangrams.has(word) ? 'pangram' : ''}`} key={word}>
                                        {word}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Action bar */}
            {actionBar && (
                <div className="game-action-bar">
                    <span className="game-action-bar-label">{actionBar}</span>
                    <div className="game-action-bar-btns">
                        <button className="btn btn-sm btn-primary" onClick={shareResult}>📋 Share</button>
                        <button className="btn btn-sm btn-secondary" onClick={() => startGame(mode)}>🔄 Play Again</button>
                        <button className="btn btn-sm btn-outline" onClick={() => {
                            if (window.confirm('Start a new puzzle? Current progress will be lost.')) startGame(mode)
                        }}>↺ New Puzzle</button>
                    </div>
                </div>
            )}

            {/* Help modal */}
            {showHelp && (
                <Modal title="How to Play" onClose={() => setShowHelp(false)}>
                    <p style={{ textAlign: 'left' }}>Make as many words as you can from the 7 letters in the hive.</p>
                    <ul className="help-list" style={{ textAlign: 'left' }}>
                        <li>Words must be at least 4 letters long.</li>
                        <li>Words must include the center letter.</li>
                        <li>Letters can be used more than once.</li>
                        <li>4-letter words are worth 1 point; longer words score 1 point per letter.</li>
                        <li>Pangrams (words using all 7 letters) earn a <strong>+7 bonus</strong>!</li>
                    </ul>
                    <div className="rankings-info" style={{ textAlign: 'left' }}>
                        <h3>Ranks</h3>
                        <p>Score percentages of the maximum: Beginner → Good Start → Moving Up → Good → Solid → Nice → Great → Amazing → Genius → <strong>Queen Bee</strong>.</p>
                    </div>
                </Modal>
            )}

            {/* Stats modal */}
            {showStats && (
                <Modal title="Statistics" onClose={() => setShowStats(false)}>
                    <div className="stats-summary">
                        <div className="stat-item">
                            <div className="stat-value">{stats.puzzlesPlayed}</div>
                            <div className="stat-label">Puzzles Played</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-value">{stats.queenBees}</div>
                            <div className="stat-label">Queen Bees</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-value">{stats.totalWordsFound}</div>
                            <div className="stat-label">Total Words</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-value">
                                {stats.puzzlesPlayed > 0 ? Math.round(stats.totalScore / stats.puzzlesPlayed) : 0}
                            </div>
                            <div className="stat-label">Avg Score</div>
                        </div>
                    </div>

                    <button className="btn btn-secondary toggle-btn" onClick={() => setShowRankDist(d => !d)}>
                        {showRankDist ? 'Hide Best Ranks ▲' : 'Show Best Ranks ▼'}
                    </button>

                    {showRankDist && (
                        <div className="rank-distribution" style={{ marginTop: '1rem' }}>
                            {RANKS.map(rank => {
                                const count = stats.rankCounts?.[rank.name] || 0
                                const pct = (count / distMax) * 100
                                return (
                                    <div className="rank-bar" key={rank.name}>
                                        <div className="rank-bar-label">{rank.name}</div>
                                        <div className="rank-bar-fill" style={{ width: `${Math.max(pct, 10)}%` }}>{count}</div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </Modal>
            )}

            {/* Result modal */}
            {result && (
                <div className="game-result" style={{ display: 'flex' }} onClick={e => { if (e.target === e.currentTarget) closeResult() }}>
                    <div className="result-content">
                        <button className="result-close" onClick={closeResult}>&times;</button>
                        <div className="result-rank">{result.rank}</div>
                        <h2 className="result-title">Puzzle Complete!</h2>
                        <div className="result-summary">
                            <div className="result-stats-grid">
                                <div className="result-stat">
                                    <div className="result-stat-value">{result.score}</div>
                                    <div className="result-stat-label">Score</div>
                                </div>
                                <div className="result-stat">
                                    <div className="result-stat-value">{result.words}</div>
                                    <div className="result-stat-label">Words</div>
                                </div>
                                <div className="result-stat">
                                    <div className="result-stat-value">{result.pangrams}</div>
                                    <div className="result-stat-label">Pangrams</div>
                                </div>
                                <div className="result-stat">
                                    <div className="result-stat-value">{result.percent}%</div>
                                    <div className="result-stat-label">Complete</div>
                                </div>
                            </div>
                        </div>
                        <div className="result-actions">
                            <button className="btn btn-primary" onClick={shareResult}>📋 Share</button>
                            {mode === 'daily' && (
                                <button className="btn btn-secondary" onClick={() => { setShowResult(false); submitScore(score) }}>🏆 Submit Score</button>
                            )}
                            <button className="btn btn-secondary" onClick={() => startGame(mode)}>🔄 Play Again</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Name prompt */}
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
