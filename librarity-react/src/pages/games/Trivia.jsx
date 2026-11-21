import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useToast } from '../../contexts/ToastContext'
import { useGameState } from '../../contexts/GameStateContext'
import GameShell, { Modal } from '../../components/ui/GameShell'
import NamePrompt from '../../components/ui/NamePrompt'
import { getDisplayName } from '../../lib/logbook'

import triviaQuestions from '../../assets/trivia-questions.json'

const DEFAULT_STATS = {
    quizzesPlayed: 0,
    totalQuestions: 0,
    totalCorrect: 0,
    maxStreak: 0,
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
    } catch { /* ignore */ }
}

function shuffleArray(array) {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
}

const CATEGORY_LABELS = {
    history: 'History',
    science: 'Science',
    literature: 'Literature',
    geography: 'Geography',
    arts: 'Arts & Culture',
    general: 'General Knowledge',
}

function formatCategory(category) {
    return CATEGORY_LABELS[category] || category
}

function calculateGrade(accuracy) {
    if (accuracy === 100) return 'A+'
    if (accuracy >= 93) return 'A'
    if (accuracy >= 90) return 'A-'
    if (accuracy >= 87) return 'B+'
    if (accuracy >= 83) return 'B'
    if (accuracy >= 80) return 'B-'
    if (accuracy >= 77) return 'C+'
    if (accuracy >= 73) return 'C'
    if (accuracy >= 70) return 'C-'
    if (accuracy >= 67) return 'D+'
    if (accuracy >= 63) return 'D'
    if (accuracy >= 60) return 'D-'
    return 'F'
}

function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const BASE_POINTS = { easy: 10, medium: 20, hard: 30 }

export default function Trivia() {
    const { showToast } = useToast()
    const { recordScore } = useGameState()

    // Setup options
    const [selectedCategory, setSelectedCategory] = useState('all')
    const [selectedDifficulty, setSelectedDifficulty] = useState('mixed')
    const [questionCount, setQuestionCount] = useState(10)

    // Screen state: 'setup' | 'game' | 'results'
    const [screen, setScreen] = useState('setup')

    // Quiz state
    const [questions, setQuestions] = useState([])
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [score, setScore] = useState(0)
    const [streak, setStreak] = useState(0)
    const [maxStreak, setMaxStreak] = useState(0)
    const [correctCount, setCorrectCount] = useState(0)
    const [answers, setAnswers] = useState([])
    const [selectedAnswer, setSelectedAnswer] = useState(null) // { answer, isCorrect, points }
    const [timer, setTimer] = useState(0)

    // UI state
    const [showHelp, setShowHelp] = useState(false)
    const [showStats, setShowStats] = useState(false)
    const [namePrompt, setNamePrompt] = useState(null)
    const [actionBar, setActionBar] = useState(null)
    const [stats, setStats] = useState(() => loadStats())

    const nextTimeoutRef = useRef(null)

    const askForName = useCallback(() => {
        return new Promise((resolve) => setNamePrompt({ resolve }))
    }, [])

    // Timer: ticks every second while the quiz screen is showing
    useEffect(() => {
        if (screen !== 'game') return undefined
        const interval = setInterval(() => setTimer(t => t + 1), 1000)
        return () => clearInterval(interval)
    }, [screen])

    // Cleanup any pending transition timeout on unmount
    useEffect(() => () => {
        if (nextTimeoutRef.current) clearTimeout(nextTimeoutRef.current)
    }, [])

    /** Begin a quiz with the current filters. */
    const startQuiz = useCallback(() => {
        let filtered = [...triviaQuestions]
        if (selectedCategory !== 'all') {
            filtered = filtered.filter(q => q.category === selectedCategory)
        }
        if (selectedDifficulty !== 'mixed') {
            filtered = filtered.filter(q => q.difficulty === selectedDifficulty)
        }

        if (filtered.length < questionCount) {
            showToast(`Not enough questions for selected filters (${filtered.length} available)`, 'error')
            return
        }

        setQuestions(shuffleArray(filtered).slice(0, questionCount))
        setCurrentQuestionIndex(0)
        setScore(0)
        setStreak(0)
        setMaxStreak(0)
        setCorrectCount(0)
        setAnswers([])
        setSelectedAnswer(null)
        setTimer(0)
        setScreen('game')
    }, [selectedCategory, selectedDifficulty, questionCount, showToast])

    const question = questions[currentQuestionIndex]

    // Shuffle the answer order once per question (stable during the 2s reveal)
    const shuffledAnswers = useMemo(
        () => (question ? shuffleArray([...question.answers]) : []),
        // eslint-disable-next-line react-hooks/exhaustive-deps -- re-shuffle per question only
        [question?.question, currentQuestionIndex],
    )

    /** Score a selection and advance after the reveal delay. */
    const selectAnswer = (answer) => {
        if (selectedAnswer || !question) return
        const isCorrect = answer === question.correct

        // Base points by difficulty + streak bonus
        let points = 0
        if (isCorrect) {
            points = BASE_POINTS[question.difficulty] + streak * 5
            setScore(s => s + points)
            setStreak(s => s + 1)
            setCorrectCount(c => c + 1)
            setMaxStreak(m => Math.max(m, streak + 1))
            showToast(`Correct! +${points} points`, 'success')
        } else {
            setStreak(0)
            showToast(`Incorrect. The answer was: ${question.correct}`, 'error')
        }

        setSelectedAnswer({ answer, isCorrect, points })
        setAnswers(prev => [...prev, {
            question: question.question,
            category: question.category,
            difficulty: question.difficulty,
            userAnswer: answer,
            correctAnswer: question.correct,
            isCorrect,
            points,
        }])

        // Advance after reveal delay
        nextTimeoutRef.current = setTimeout(() => {
            setSelectedAnswer(null)
            if (currentQuestionIndex + 1 < questions.length) {
                setCurrentQuestionIndex(i => i + 1)
            } else {
                setScreen('results')
            }
        }, 2000)
    }

    /** Persist quiz stats once, when results are first shown. */
    const savedResultRef = useRef(false)
    useEffect(() => {
        if (screen !== 'results' || questions.length === 0) return
        if (savedResultRef.current) return
        savedResultRef.current = true

        const s = loadStats()
        s.quizzesPlayed += 1
        s.totalQuestions += questions.length
        s.totalCorrect += correctCount
        s.maxStreak = Math.max(s.maxStreak, maxStreak)
        for (const answer of answers) {
            const cat = answer.category
            if (!s.categoryStats[cat]) s.categoryStats[cat] = { correct: 0, total: 0 }
            s.categoryStats[cat].total += 1
            if (answer.isCorrect) s.categoryStats[cat].correct += 1
        }
        saveStats(s)
        setStats(s)
    }, [screen, questions.length, correctCount, maxStreak, answers])

    /** Return to setup, clearing per-quiz bookkeeping. */
    const resetGame = () => {
        savedResultRef.current = false
        setScreen('setup')
        setActionBar(null)
    }

    /** Leave the results on screen but keep a persistent summary bar. */
    const closeToActionBar = () => {
        const accuracy = answers.length > 0
            ? Math.round((correctCount / answers.length) * 100)
            : 0
        setActionBar(`Score: ${score} · ${correctCount}/${answers.length} correct · ${accuracy}%`)
        savedResultRef.current = false
        setScreen('setup')
    }

    const submitScore = useCallback(async () => {
        try {
            const username = await askForName()
            if (!username) return

            await recordScore({
                gameType: 'trivia',
                gameMode: selectedDifficulty === 'mixed' ? 'random' : selectedDifficulty,
                playerName: username || getDisplayName(),
                score,
                timeTaken: timer,
            })
            showToast(`Score submitted as "${username}"! ✅`, 'success')
        } catch (err) {
            console.error('Error submitting score:', err)
        }
    }, [askForName, recordScore, showToast, selectedDifficulty, score, timer])

    const shareResult = () => {
        const accuracy = questions.length > 0 ? (correctCount / questions.length) * 100 : 0
        const grade = calculateGrade(accuracy)

        const text = `🎯 Trivia Challenge\n\nScore: ${score}\nCorrect: ${correctCount}/${questions.length}\nGrade: ${grade}\nStreak: ${maxStreak}\n\nBy Unbinding`

        if (navigator.clipboard) {
            navigator.clipboard.writeText(text)
                .then(() => showToast('Score copied! 📋', 'success'))
                .catch(() => showToast('Failed to copy result', 'error'))
        } else {
            showToast('Clipboard not supported', 'error')
        }
    }

    const quitQuiz = () => {
        if (window.confirm('Are you sure you want to quit? Your progress will be lost.')) {
            resetGame()
        }
    }

    // Derived render values
    const accuracy = questions.length > 0 ? (correctCount / questions.length) * 100 : 0
    const grade = calculateGrade(accuracy)
    const resultsTitle = accuracy === 100 ? 'Perfect Score! 🎉'
        : accuracy >= 80 ? 'Excellent Work! 🌟'
            : accuracy >= 60 ? 'Good Job! 👍'
                : accuracy >= 40 ? 'Keep Practicing! 📚'
                    : 'Try Again! 💪'

    const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0
    const statAccuracy = stats.totalQuestions > 0
        ? ((stats.totalCorrect / stats.totalQuestions) * 100).toFixed(0)
        : 0
    const hasCategoryStats = Object.keys(stats.categoryStats || {}).length > 0

    return (
        <GameShell
            title="Trivia Challenge"
            subtitle="Test your knowledge across multiple categories!"
        >
            {/* Setup Screen */}
            {screen === 'setup' && (
                <div className="setup-screen">
                    <div className="setup-options">
                        <div className="option-group">
                            <label htmlFor="categorySelect">Category</label>
                            <select id="categorySelect" className="form-select" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                                <option value="all">All Categories</option>
                                <option value="history">History</option>
                                <option value="science">Science</option>
                                <option value="literature">Literature</option>
                                <option value="geography">Geography</option>
                                <option value="arts">Arts &amp; Culture</option>
                                <option value="general">General Knowledge</option>
                            </select>
                        </div>

                        <div className="option-group">
                            <label htmlFor="difficultySelect">Difficulty</label>
                            <select id="difficultySelect" className="form-select" value={selectedDifficulty} onChange={e => setSelectedDifficulty(e.target.value)}>
                                <option value="mixed">Mixed</option>
                                <option value="easy">Easy</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                            </select>
                        </div>

                        <div className="option-group">
                            <label htmlFor="questionCount">Number of Questions</label>
                            <select id="questionCount" className="form-select" value={questionCount} onChange={e => setQuestionCount(parseInt(e.target.value, 10))}>
                                <option value="5">5 Questions</option>
                                <option value="10">10 Questions</option>
                                <option value="15">15 Questions</option>
                                <option value="20">20 Questions</option>
                            </select>
                        </div>
                    </div>

                    <div className="setup-actions">
                        <button className="btn btn-primary btn-large" onClick={startQuiz}>Start Quiz</button>
                        <button className="btn btn-secondary" onClick={() => setShowStats(true)}>📊 Statistics</button>
                        <button className="btn btn-secondary" onClick={() => setShowHelp(true)}>❓ How to Play</button>
                    </div>
                </div>
            )}

            {/* Game Screen */}
            {screen === 'game' && question && (
                <div className="game-screen">
                    <div className="game-header">
                        <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${progress}%` }} />
                            <div className="progress-text">Question {currentQuestionIndex + 1} of {questions.length}</div>
                        </div>
                        <div className="game-stats">
                            <div className="stat-item">
                                <span className="stat-label">Score:</span>
                                <span className="stat-value">{score}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Streak:</span>
                                <span className="stat-value">{streak}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Time:</span>
                                <span className="stat-value">{formatTime(timer)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="question-container">
                        <div className="question-header">
                            <span className="question-category">{formatCategory(question.category)}</span>
                            <span className={`question-difficulty ${question.difficulty}`}>{question.difficulty.toUpperCase()}</span>
                        </div>
                        <h2 className="question-text">{question.question}</h2>
                        <div className="answers-grid">
                            {shuffledAnswers.map(answer => {
                                const isRevealed = Boolean(selectedAnswer)
                                const classes = ['answer-btn']
                                if (isRevealed) {
                                    if (answer === question.correct) classes.push('correct')
                                    else if (answer === selectedAnswer.answer && !selectedAnswer.isCorrect) classes.push('incorrect')
                                }
                                return (
                                    <button
                                        className={classes.join(' ')}
                                        key={answer}
                                        disabled={isRevealed}
                                        onClick={() => selectAnswer(answer)}
                                    >
                                        {answer}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div className="game-actions">
                        <button className="btn btn-secondary" onClick={quitQuiz}>Quit Quiz</button>
                    </div>
                </div>
            )}

            {/* Results Screen */}
            {screen === 'results' && (
                <div className="results-screen">
                    <div className="results-content">
                        <h2 className="results-title">{resultsTitle}</h2>
                        <div className="results-grade">{grade}</div>

                        <div className="results-stats">
                            <div className="result-stat">
                                <div className="result-stat-value">{score}</div>
                                <div className="result-stat-label">Final Score</div>
                            </div>
                            <div className="result-stat">
                                <div className="result-stat-value">{correctCount}/{questions.length}</div>
                                <div className="result-stat-label">Correct</div>
                            </div>
                            <div className="result-stat">
                                <div className="result-stat-value">{formatTime(timer)}</div>
                                <div className="result-stat-label">Time</div>
                            </div>
                            <div className="result-stat">
                                <div className="result-stat-value">{accuracy.toFixed(0)}%</div>
                                <div className="result-stat-label">Accuracy</div>
                            </div>
                        </div>

                        <div className="results-breakdown">
                            <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>Question Breakdown</h3>
                            {answers.map((answer, index) => (
                                <div className={`breakdown-item ${answer.isCorrect ? 'correct' : 'incorrect'}`} key={index}>
                                    <div className="breakdown-question">
                                        {index + 1}. {answer.question}
                                    </div>
                                    {!answer.isCorrect && (
                                        <div className="breakdown-answer user-answer">
                                            Your answer: {answer.userAnswer}
                                        </div>
                                    )}
                                    <div className="breakdown-answer correct-answer">
                                        {answer.isCorrect ? '✓ ' : ''}Correct answer: {answer.correctAnswer}
                                    </div>
                                    {answer.points > 0 && (
                                        <div className="breakdown-answer" style={{ color: 'var(--primary-color)', fontWeight: 600 }}>
                                            +{answer.points} points
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="results-actions">
                            <button className="btn btn-primary" onClick={shareResult}>📋 Share</button>
                            <button className="btn btn-secondary" onClick={submitScore}>🏆 Submit Score</button>
                            <button className="btn btn-secondary" onClick={resetGame}>🔄 Play Again</button>
                            <button className="result-close" style={{ position: 'static', fontSize: '1rem', width: 'auto', height: 'auto', borderRadius: 6, padding: '0.5rem 1rem', border: '2px solid var(--border-color)', background: 'none', cursor: 'pointer' }} onClick={closeToActionBar}>✕ Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Persistent action bar (after closing results) */}
            {actionBar && (
                <div className="game-action-bar">
                    <span className="game-action-bar-label">{actionBar}</span>
                    <div className="game-action-bar-btns">
                        <button className="btn btn-sm btn-primary" onClick={shareResult}>📋 Share</button>
                        <button className="btn btn-sm btn-secondary" onClick={resetGame}>🔄 Play Again</button>
                        <button className="btn btn-sm btn-outline" onClick={() => {
                            if (window.confirm('Start a new quiz? Current progress will be lost.')) resetGame()
                        }}>↺ Restart</button>
                    </div>
                </div>
            )}

            {/* Help modal */}
            {showHelp && (
                <Modal title="How to Play" onClose={() => setShowHelp(false)}>
                    <div style={{ textAlign: 'left' }}>
                        <h3>Objective</h3>
                        <p>Answer trivia questions correctly to earn points and build your streak!</p>

                        <h3>Scoring</h3>
                        <ul className="help-list">
                            <li><strong>Correct Answer:</strong> Base points + bonus for difficulty and streak</li>
                            <li><strong>Easy:</strong> 10 points</li>
                            <li><strong>Medium:</strong> 20 points</li>
                            <li><strong>Hard:</strong> 30 points</li>
                            <li><strong>Streak Bonus:</strong> +5 points per consecutive correct answer</li>
                        </ul>

                        <h3>Features</h3>
                        <ul className="help-list">
                            <li>Choose from multiple categories</li>
                            <li>Select difficulty level (Easy, Medium, Hard, Mixed)</li>
                            <li>Customize quiz length (5-20 questions)</li>
                            <li>Build a streak for bonus points</li>
                            <li>Review all answers at the end</li>
                        </ul>

                        <h3>Tips</h3>
                        <ul className="help-list">
                            <li>Read questions carefully before answering</li>
                            <li>Build a streak for maximum points</li>
                            <li>Try different categories to expand your knowledge</li>
                            <li>Challenge yourself with harder difficulties</li>
                        </ul>
                    </div>
                </Modal>
            )}

            {/* Stats modal */}
            {showStats && (
                <Modal title="Statistics" onClose={() => setShowStats(false)}>
                    <div className="stats-summary">
                        <div className="stat-item">
                            <div className="stat-value">{stats.quizzesPlayed}</div>
                            <div className="stat-label">Quizzes</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-value">{stats.totalQuestions}</div>
                            <div className="stat-label">Questions</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-value">{statAccuracy}%</div>
                            <div className="stat-label">Accuracy</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-value">{stats.maxStreak}</div>
                            <div className="stat-label">Best Streak</div>
                        </div>
                    </div>

                    <div className="category-performance">
                        <h3>Category Performance</h3>
                        {!hasCategoryStats ? (
                            <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>No statistics yet. Play a quiz to see your performance!</p>
                        ) : (
                            Object.entries(stats.categoryStats).map(([category, data]) => {
                                const acc = ((data.correct / data.total) * 100).toFixed(0)
                                return (
                                    <div className="category-stat" key={category}>
                                        <span className="category-name">{formatCategory(category)}</span>
                                        <span className="category-accuracy">{data.correct}/{data.total} ({acc}%)</span>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </Modal>
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
