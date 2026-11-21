import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useToast } from '../../contexts/ToastContext'
import { useGameState } from '../../contexts/GameStateContext'
import GameShell, { Modal } from '../../components/ui/GameShell'
import NamePrompt from '../../components/ui/NamePrompt'
import { getDisplayName } from '../../lib/logbook'

// Bundled word list (uppercase 4-letter words)
import wordListData from '../../assets/word-ladder-words.json'
import dailyOverridesData from '../../assets/daily-overrides.json'

const TODAY_STR = new Date().toISOString().split('T')[0]

const WORD_LIST = wordListData
const VALID_SET = new Set(WORD_LIST)

/** Score: higher-is-better conversion of steps + time (lower is better). */
function ladderScore(steps, time) {
    return Math.max(0, 10000 - (steps * 100 + time))
}

const DEFAULT_STATS = {
    puzzlesSolved: 0,
    perfectSolves: 0,
    totalSteps: 0,
    totalTime: 0,
    bestTime: null,
    efficiency: { perfect: 0, good: 0, okay: 0, other: 0 },
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
    } catch { /* ignore */ }
}

/** Predefined daily puzzles with known solutions (same list as original). */
const SEED_PUZZLES = [
    { start: 'COLD', end: 'WARM' },
    { start: 'HEAD', end: 'TAIL' },
    { start: 'WORD', end: 'PLAY' },
    { start: 'LOVE', end: 'HATE' },
    { start: 'FOUR', end: 'FIVE' },
    { start: 'SLOW', end: 'FAST' },
    { start: 'DARK', end: 'LITE' },
    { start: 'GOOD', end: 'EVIL' },
    { start: 'HARD', end: 'EASY' },
    { start: 'POOR', end: 'RICH' },
]

/** All valid one-letter-change neighbours of a word. */
function getNeighbors(word) {
    const neighbors = []
    const wordArray = word.split('')
    for (let i = 0; i < wordArray.length; i++) {
        const original = wordArray[i]
        for (let c = 65; c <= 90; c++) {
            const letter = String.fromCharCode(c)
            if (letter !== original) {
                wordArray[i] = letter
                const newWord = wordArray.join('')
                if (VALID_SET.has(newWord)) neighbors.push(newWord)
            }
        }
        wordArray[i] = original
    }
    return neighbors
}

/** BFS: shortest word-ladder path from start to end ([] if none). */
function solvePuzzle(start, end) {
    if (start === end) return [start]
    const queue = [[start]]
    const visited = new Set([start])
    while (queue.length > 0) {
        const path = queue.shift()
        const word = path[path.length - 1]
        for (const neighbor of getNeighbors(word)) {
            if (neighbor === end) return [...path, neighbor]
            if (!visited.has(neighbor)) {
                visited.add(neighbor)
                queue.push([...path, neighbor])
            }
        }
    }
    return []
}

function isOneLetterDiff(word1, word2) {
    if (word1.length !== word2.length) return false
    let diffCount = 0
    for (let i = 0; i < word1.length; i++) {
        if (word1[i] !== word2[i]) diffCount++
    }
    return diffCount === 1
}

/** First differing letter pair, e.g. "C → W". */
function getDifference(word1, word2) {
    for (let i = 0; i < word1.length; i++) {
        if (word1[i] !== word2[i]) return `${word1[i]} → ${word2[i]}`
    }
    return ''
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function WordLadder() {
    const { showToast } = useToast()
    const { recordScore } = useGameState()

    // Puzzle state
    const [startWord, setStartWord] = useState('')
    const [endWord, setEndWord] = useState('')
    const [currentPath, setCurrentPath] = useState([])
    const [hintsUsed, setHintsUsed] = useState(0)
    const [mode, setMode] = useState('daily')
    const [message, setMessage] = useState(null) // { text, type }
    const [inputValue, setInputValue] = useState('')
    const [inputError, setInputError] = useState(false)

    // UI state
    const [showHelp, setShowHelp] = useState(false)
    const [showStats, setShowStats] = useState(false)
    const [showResult, setShowResult] = useState(false)
    const [result, setResult] = useState(null) // { rating, message, steps, time }
    const [namePrompt, setNamePrompt] = useState(null)
    const [actionBar, setActionBar] = useState(null)
    const [stats, setStats] = useState(() => loadStats())

    const modeRef = useRef('daily')
    const startTimeRef = useRef(0)

    const askForName = useCallback(() => {
        return new Promise((resolve) => setNamePrompt({ resolve }))
    }, [])

    /** Pick the daily puzzle: override first, then date-seeded. */
    const pickDailyPuzzle = useCallback(() => {
        try {
            const overrides = dailyOverridesData.overrides || []
            const override = overrides.find(
                o => o.date === TODAY_STR && (o.gameType === 'word_ladder' || o.gameId === 'word_ladder') && o.active,
            )
            const s = override?.challenge?.startWord || override?.startWord
            const e = override?.challenge?.endWord || override?.endWord
            if (s && e) return { start: s.toUpperCase(), end: e.toUpperCase() }
        } catch { /* ignore */ }

        const start = new Date('2024-01-01')
        const daysSinceStart = Math.floor((new Date() - start) / 86400000)
        const puzzle = SEED_PUZZLES[Math.abs(daysSinceStart) % SEED_PUZZLES.length]
        return { start: puzzle.start, end: puzzle.end }
    }, [])

    /** Pick a random solvable pair with a 3-9 step solution. */
    const pickRandomPuzzle = useCallback(() => {
        const fourLetterWords = WORD_LIST.filter(w => w.length === 4)
        let attempts = 0
        while (attempts < 50) {
            const idx1 = Math.floor(Math.random() * fourLetterWords.length)
            const idx2 = Math.floor(Math.random() * fourLetterWords.length)
            if (idx1 !== idx2) {
                const word1 = fourLetterWords[idx1]
                const word2 = fourLetterWords[idx2]
                const solution = solvePuzzle(word1, word2)
                if (solution.length > 2 && solution.length < 10) {
                    return { start: word1, end: word2 }
                }
            }
            attempts++
        }
        return { start: 'COLD', end: 'WARM' }
    }, [])

    /** Start a fresh round for the current mode. */
    const startGame = useCallback((roundMode) => {
        const puzzle = roundMode === 'daily' ? pickDailyPuzzle() : pickRandomPuzzle()
        setStartWord(puzzle.start)
        setEndWord(puzzle.end)
        setCurrentPath([puzzle.start])
        setHintsUsed(0)
        startTimeRef.current = Date.now()
        setInputValue('')
        setMessage(null)
        setResult(null)
        setShowResult(false)
        setActionBar(null)
    }, [pickDailyPuzzle, pickRandomPuzzle])

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

    // Shortest solution length, derived whenever the puzzle changes
    const solutionLen = useMemo(
        () => (startWord && endWord ? solvePuzzle(startWord, endWord).length : 0),
        [startWord, endWord],
    )
    const minStepsValue = solutionLen > 0 ? solutionLen - 1 : '?'

    const submitScore = useCallback(async (steps, time) => {
        try {
            const username = await askForName()
            if (!username) return

            await recordScore({
                gameType: 'word_ladder',
                gameMode: modeRef.current,
                playerName: username || getDisplayName(),
                score: ladderScore(steps, time),
                timeTaken: time,
            })
            showToast(`Score submitted as "${username}"! ✅`, 'success')
        } catch (err) {
            console.error('Error submitting score:', err)
        }
    }, [askForName, recordScore, showToast])

    /** Handle a solved puzzle: rating, stats, result modal, daily submit. */
    const handleWin = useCallback((finalPath) => {
        const elapsedTime = Math.floor((Date.now() - startTimeRef.current) / 1000)
        const steps = finalPath.length - 1
        const extraSteps = steps - minStepsValue

        let rating = '⭐⭐⭐'
        let resultMessage = 'Puzzle solved!'
        if (extraSteps === 0) {
            rating = '⭐⭐⭐⭐⭐'
            resultMessage = 'Perfect solution!'
        } else if (extraSteps <= 2) {
            rating = '⭐⭐⭐⭐'
            resultMessage = 'Great job!'
        } else if (extraSteps <= 5) {
            rating = '⭐⭐⭐'
            resultMessage = 'Good work!'
        } else {
            rating = '⭐⭐'
            resultMessage = 'Puzzle complete!'
        }

        // Update stats
        const s = loadStats()
        s.puzzlesSolved += 1
        s.totalSteps += steps
        s.totalTime += elapsedTime
        if (extraSteps === 0) {
            s.perfectSolves += 1
            s.efficiency.perfect += 1
        } else if (extraSteps <= 2) {
            s.efficiency.good += 1
        } else if (extraSteps <= 5) {
            s.efficiency.okay += 1
        } else {
            s.efficiency.other += 1
        }
        if (!s.bestTime || elapsedTime < s.bestTime) s.bestTime = elapsedTime
        if (modeRef.current === 'daily') s.lastPlayedDaily = TODAY_STR
        saveStats(s)
        setStats(s)

        setResult({ rating, message: resultMessage, steps, time: elapsedTime })
        setShowResult(true)

        // Auto-submit score to leaderboard (daily mode only)
        if (modeRef.current === 'daily') {
            submitScore(steps, elapsedTime)
        }
    }, [minStepsValue, submitScore])

    const flashInputError = () => {
        setInputError(true)
        setTimeout(() => setInputError(false), 500)
    }

    const submitWord = useCallback(() => {
        const word = inputValue.toUpperCase().trim()

        if (!word) {
            setMessage({ text: 'Please enter a word', type: 'error' })
            return
        }
        if (word.length !== startWord.length) {
            setMessage({ text: 'Word must be same length as start word', type: 'error' })
            flashInputError()
            return
        }
        if (!VALID_SET.has(word)) {
            setMessage({ text: 'Not a valid word', type: 'error' })
            flashInputError()
            return
        }
        if (currentPath.includes(word)) {
            setMessage({ text: 'Word already used', type: 'error' })
            return
        }
        const lastWord = currentPath[currentPath.length - 1]
        if (!isOneLetterDiff(lastWord, word)) {
            setMessage({ text: 'You can only change one letter at a time', type: 'error' })
            flashInputError()
            return
        }

        // Valid move!
        const newPath = [...currentPath, word]
        setCurrentPath(newPath)
        setInputValue('')
        setMessage(null)

        // Check if solved
        if (word === endWord) {
            handleWin(newPath)
        }
    }, [inputValue, startWord, currentPath, endWord, handleWin])

    const getHint = useCallback(() => {
        const currentWord = currentPath[currentPath.length - 1]
        if (currentWord === endWord) {
            setMessage({ text: 'Puzzle already solved!', type: 'info' })
            return
        }

        const pathFromHere = solvePuzzle(currentWord, endWord)
        if (pathFromHere.length > 1) {
            const nextWord = pathFromHere[1]
            setMessage({ text: `💡 Hint: Try a word starting with "${nextWord[0]}"`, type: 'hint' })
            setHintsUsed(h => h + 1)
        } else {
            setMessage({ text: 'No hint available', type: 'info' })
        }
    }, [currentPath, endWord])

    const undoStep = useCallback(() => {
        if (currentPath.length <= 1) {
            setMessage({ text: 'Cannot undo start word', type: 'error' })
            return
        }
        setCurrentPath(prev => prev.slice(0, -1))
        setInputValue('')
        setMessage(null)
        showToast('Step removed', 'success')
    }, [currentPath, showToast])

    const resetPuzzle = useCallback(() => {
        if (window.confirm('Reset the puzzle? This will clear your progress.')) {
            setCurrentPath([startWord])
            setHintsUsed(0)
            startTimeRef.current = Date.now()
            setInputValue('')
            setMessage(null)
            showToast('Puzzle reset', 'success')
        }
    }, [startWord, showToast])

    const changeMode = (newMode) => {
        if (modeRef.current === newMode) return

        // Block switching to daily if already played today
        if (newMode === 'daily') {
            const s = loadStats()
            if (s.lastPlayedDaily === TODAY_STR) {
                showToast("You've already played today's challenge! Come back tomorrow.", 'info')
                return
            }
        }

        modeRef.current = newMode
        setMode(newMode)
        startGame(newMode)
        showToast(`Switched to ${newMode === 'daily' ? 'Daily Challenge' : 'Random Puzzle'} mode`, 'success')
    }

    const shareResult = () => {
        const steps = currentPath.length - 1
        const extraSteps = steps - minStepsValue

        let text = `🪜 Word Ladder ${mode === 'daily' ? '(Daily)' : '(Random)'}\n\n`
        text += `${startWord} ➜ ${endWord}\n`
        text += `Steps: ${steps}/${minStepsValue}`
        if (extraSteps > 0) text += ` (+${extraSteps})`
        text += `\n`
        if (hintsUsed > 0) text += `Hints: ${hintsUsed}\n`
        text += `\nBy Unbinding`

        navigator.clipboard.writeText(text)
            .then(() => showToast('Score copied! 📋', 'success'))
            .catch(() => showToast('Failed to copy', 'error'))
    }

    const closeResult = () => {
        setShowResult(false)
        if (result) {
            setActionBar(`Completed in ${result.steps} steps · ${formatTime(result.time)}`)
        }
    }

    // Derived render data
    const solved = currentPath[currentPath.length - 1] === endWord
    const avgSteps = stats.puzzlesSolved > 0
        ? (stats.totalSteps / stats.puzzlesSolved).toFixed(1)
        : 0
    const efficiencies = [
        { label: 'Perfect', count: stats.efficiency?.perfect || 0, color: '#4caf50' },
        { label: 'Good', count: stats.efficiency?.good || 0, color: '#8bc34a' },
        { label: 'Okay', count: stats.efficiency?.okay || 0, color: '#ffc107' },
        { label: 'Other', count: stats.efficiency?.other || 0, color: '#ff9800' },
    ]
    const maxCount = Math.max(...efficiencies.map(e => e.count), 1)

    return (
        <GameShell
            title="Word Ladder"
            subtitle="Transform one word into another by changing one letter at a time!"
            controls={(
                <>
                    <button className={`mode-btn ${mode === 'daily' ? 'active' : ''}`} onClick={() => changeMode('daily')}>📅 Daily Challenge</button>
                    <button className={`mode-btn ${mode === 'random' ? 'active' : ''}`} onClick={() => changeMode('random')}>🎲 Random Puzzle</button>
                    <button className="icon-btn" aria-label="View Statistics" onClick={() => setShowStats(true)}>📊</button>
                    <button className="icon-btn" aria-label="How to Play" onClick={() => setShowHelp(true)}>❓</button>
                </>
            )}
        >
            {/* Puzzle Info */}
            <div className="puzzle-info">
                <div className="word-pair">
                    <div className="word-box start-word">
                        <div className="word-label">Start</div>
                        <div className="word-value">{startWord}</div>
                    </div>
                    <div className="arrow">➜</div>
                    <div className="word-box end-word">
                        <div className="word-label">Target</div>
                        <div className="word-value">{endWord}</div>
                    </div>
                </div>
                <div className="puzzle-stats">
                    <div className="stat-item">
                        <span className="stat-label">Min Steps:</span>
                        <span className="stat-value">{minStepsValue}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Your Steps:</span>
                        <span className="stat-value">{currentPath.length - 1}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Hints Used:</span>
                        <span className="stat-value">{hintsUsed}</span>
                    </div>
                </div>
            </div>

            {/* Ladder Display */}
            <div className="ladder-container">
                <div className="ladder">
                    {currentPath.map((word, index) => {
                        const classes = ['rung']
                        if (index === 0) classes.push('start')
                        if (index === currentPath.length - 1 && word !== endWord) classes.push('current')
                        if (word === endWord) classes.push('end')
                        const diff = index > 0 ? getDifference(currentPath[index - 1], word) : ''
                        return (
                            <div className={classes.join(' ')} key={`${word}-${index}`}>
                                <span className="rung-number">Step {index}:</span>
                                <span className="rung-word">{word}</span>
                                {diff && <span className="rung-diff">{diff}</span>}
                            </div>
                        )
                    })}
                    {!solved && endWord && (
                        <>
                            <div className="rung placeholder">
                                <span className="rung-number">Step {currentPath.length}:</span>
                                <span className="rung-word">...</span>
                            </div>
                            <div className="rung end">
                                <span className="rung-number">Step ?:</span>
                                <span className="rung-word">{endWord}</span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Input Section */}
            <div className="input-section">
                <div className="input-group">
                    <input
                        type="text"
                        className={`word-input ${inputError ? 'error' : ''}`}
                        placeholder="Type your next word..."
                        maxLength={4}
                        autoComplete="off"
                        autoCapitalize="characters"
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') submitWord() }}
                    />
                    <button className="btn btn-primary" onClick={submitWord}>Submit</button>
                </div>
                <div className="action-buttons">
                    <button className="btn btn-secondary" onClick={getHint}>💡 Get Hint</button>
                    <button className="btn btn-secondary" onClick={undoStep}>↶ Undo</button>
                    <button className="btn btn-secondary" onClick={resetPuzzle}>🔄 Reset</button>
                </div>
            </div>

            {/* Message Display */}
            <div className={`message-display ${message?.type || ''}`}>{message?.text || ''}</div>

            {/* Help modal */}
            {showHelp && (
                <Modal title="How to Play" onClose={() => setShowHelp(false)}>
                    <div style={{ textAlign: 'left' }}>
                        <h3>Objective</h3>
                        <p>Transform the <strong>start word</strong> into the <strong>target word</strong> by changing one letter at a time. Each intermediate step must be a valid word!</p>

                        <h3>Rules</h3>
                        <ul className="help-list">
                            <li>Change exactly <strong>one letter</strong> per step.</li>
                            <li>Each word must be a valid English word.</li>
                            <li>You cannot skip steps or rearrange letters.</li>
                            <li>Try to reach the target in the minimum number of steps.</li>
                        </ul>

                        <h3>Example</h3>
                        <div className="example-ladder">
                            <div className="example-rung">
                                <span className="rung-number">Start:</span>
                                <span className="rung-word">COLD</span>
                            </div>
                            <div className="example-rung">
                                <span className="rung-number">Step 1:</span>
                                <span className="rung-word">CORD</span>
                                <span className="rung-hint">(changed L to R)</span>
                            </div>
                            <div className="example-rung">
                                <span className="rung-number">Step 2:</span>
                                <span className="rung-word">CARD</span>
                                <span className="rung-hint">(changed O to A)</span>
                            </div>
                            <div className="example-rung">
                                <span className="rung-number">Step 3:</span>
                                <span className="rung-word">WARD</span>
                                <span className="rung-hint">(changed C to W)</span>
                            </div>
                            <div className="example-rung">
                                <span className="rung-number">Target:</span>
                                <span className="rung-word">WARM</span>
                                <span className="rung-hint">(changed D to M)</span>
                            </div>
                        </div>

                        <h3>Scoring</h3>
                        <ul className="help-list">
                            <li><strong>Perfect:</strong> Reach target in minimum steps</li>
                            <li><strong>Good:</strong> 1-2 extra steps</li>
                            <li><strong>Okay:</strong> 3-5 extra steps</li>
                            <li>Using hints will add to your final step count</li>
                        </ul>

                        <h3>Features</h3>
                        <ul className="help-list">
                            <li><strong>💡 Hint:</strong> Get a suggestion for the next word</li>
                            <li><strong>↶ Undo:</strong> Remove your last step</li>
                            <li><strong>🔄 Reset:</strong> Start the puzzle over</li>
                        </ul>
                    </div>
                </Modal>
            )}

            {/* Stats modal */}
            {showStats && (
                <Modal title="Statistics" onClose={() => setShowStats(false)}>
                    <div className="stats-summary">
                        <div className="stat-item">
                            <div className="stat-value">{stats.puzzlesSolved}</div>
                            <div className="stat-label">Solved</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-value">{stats.perfectSolves}</div>
                            <div className="stat-label">Perfect</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-value">{avgSteps}</div>
                            <div className="stat-label">Avg Steps</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-value">{stats.bestTime ? formatTime(stats.bestTime) : '--'}</div>
                            <div className="stat-label">Best Time</div>
                        </div>
                    </div>

                    <div className="efficiency-chart">
                        <h3>Solution Efficiency</h3>
                        {efficiencies.map(eff => (
                            <div className="efficiency-bar" key={eff.label}>
                                <div className="efficiency-label">{eff.label}</div>
                                <div className="efficiency-fill" style={{ width: `${(eff.count / maxCount) * 100}%`, background: eff.color }}>
                                    {eff.count}
                                </div>
                            </div>
                        ))}
                    </div>
                </Modal>
            )}

            {/* Result modal */}
            {showResult && result && (
                <Modal title="🎉 Puzzle Solved!" onClose={closeResult}>
                    <div className="result-rating">{result.rating}</div>
                    <div className="result-message">{result.message}</div>
                    <div className="result-stats">
                        <div className="result-stat">
                            <span className="result-label">Your Steps:</span>
                            <span className="result-value">{result.steps}</span>
                        </div>
                        <div className="result-stat">
                            <span className="result-label">Minimum:</span>
                            <span className="result-value">{minStepsValue}</span>
                        </div>
                        <div className="result-stat">
                            <span className="result-label">Time:</span>
                            <span className="result-value">{formatTime(result.time)}</span>
                        </div>
                        <div className="result-stat">
                            <span className="result-label">Hints:</span>
                            <span className="result-value">{hintsUsed}</span>
                        </div>
                    </div>
                    <div className="result-ladder">
                        {currentPath.map((word, index) => (
                            <div className={`rung ${index === 0 ? 'start' : ''} ${index === currentPath.length - 1 ? 'end' : ''}`} key={index}>
                                <span className="rung-number">Step {index}:</span>
                                <span className="rung-word">{word}</span>
                            </div>
                        ))}
                    </div>
                    <div className="result-actions">
                        <button className="btn btn-primary" onClick={shareResult}>📋 Share</button>
                        <button className="btn btn-secondary" onClick={() => submitScore(result.steps, result.time)}>🏆 Submit Score</button>
                        <button className="btn btn-secondary" onClick={() => startGame(mode)}>🔄 New Puzzle</button>
                    </div>
                </Modal>
            )}

            {/* Persistent action bar */}
            {actionBar && (
                <div className="game-action-bar">
                    <span className="game-action-bar-label">{actionBar}</span>
                    <div className="game-action-bar-btns">
                        <button className="btn btn-sm btn-primary" onClick={shareResult}>📋 Share</button>
                        <button className="btn btn-sm btn-secondary" onClick={() => startGame(mode)}>🔄 New Puzzle</button>
                        <button className="btn btn-sm btn-outline" onClick={() => {
                            if (window.confirm('Start a new puzzle? Current progress will be lost.')) startGame(mode)
                        }}>↺ Restart</button>
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
