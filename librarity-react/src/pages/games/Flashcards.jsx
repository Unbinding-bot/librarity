import React, { useState, useRef, useCallback } from 'react'
import { useToast } from '../../contexts/ToastContext'
import GameShell, { Modal } from '../../components/ui/GameShell'

import builtInDecks from '../../assets/flashcard-decks.json'

const DEFAULT_STATS = {
    totalCards: 0,
    masteredCards: 0,
    totalSessions: 0,
    totalStudyTime: 0,
    decks: {},
}

function loadStatsData() {
    try {
        const saved = localStorage.getItem('flashcardStats')
        return saved ? { ...DEFAULT_STATS, ...JSON.parse(saved) } : { ...DEFAULT_STATS }
    } catch {
        return { ...DEFAULT_STATS }
    }
}

function saveStatsData(stats) {
    try {
        localStorage.setItem('flashcardStats', JSON.stringify(stats))
    } catch { /* ignore */ }
}

function loadCustomDecks() {
    try {
        const stored = localStorage.getItem('customFlashcardDecks')
        return stored ? JSON.parse(stored) : []
    } catch {
        return []
    }
}

function saveCustomDecks(decks) {
    try {
        localStorage.setItem('customFlashcardDecks', JSON.stringify(decks))
    } catch { /* ignore */ }
}

function initCards(cards) {
    return cards.map(card => ({
        ...card,
        status: 'new',
        reviewCount: 0,
        lastReviewed: null,
    }))
}

function shuffleArray(array) {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
}

function formatStudyTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export default function Flashcards() {
    const { showToast } = useToast()

    // Screen state: 'setup' | 'study' | 'completion'
    const [screen, setScreen] = useState('setup')
    const [customDecks, setCustomDecks] = useState(() => loadCustomDecks())

    // Study state
    const [currentDeck, setCurrentDeck] = useState(null) // { ...deck, isCustom, cards }
    const [currentCardIndex, setCurrentCardIndex] = useState(0)
    const [isFlipped, setIsFlipped] = useState(false)
    const [lastStudyTime, setLastStudyTime] = useState(0)
    const studyStartTimeRef = useRef(0)

    // Create/edit deck modal state
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [editingDeckId, setEditingDeckId] = useState(null)
    const [deckName, setDeckName] = useState('')
    const [deckCategory, setDeckCategory] = useState('vocabulary')
    const [editorCards, setEditorCards] = useState([{ front: '', back: '' }])

    // UI state
    const [showManageModal, setShowManageModal] = useState(false)
    const [showHelp, setShowHelp] = useState(false)
    const [showStats, setShowStats] = useState(false)

    const allDecks = [...builtInDecks, ...customDecks]

    /** Enter the study screen for a deck, restoring saved card progress. */
    const startStudying = (deck, isCustom) => {
        const progressKey = `flashcard_progress_${deck.id || deck.name}`
        let cards
        try {
            const savedProgress = localStorage.getItem(progressKey)
            cards = savedProgress ? JSON.parse(savedProgress) : initCards(deck.cards)
        } catch {
            cards = initCards(deck.cards)
        }

        setCurrentDeck({ ...deck, isCustom, cards })
        setCurrentCardIndex(0)
        setIsFlipped(false)
        studyStartTimeRef.current = Date.now()
        setScreen('study')
    }

    const currentCard = currentDeck ? currentDeck.cards[currentCardIndex] : null

    const persistProgress = useCallback((deck) => {
        const progressKey = `flashcard_progress_${deck.id || deck.name}`
        try {
            localStorage.setItem(progressKey, JSON.stringify(deck.cards))
        } catch { /* ignore */ }

        // Update global stats
        const stats = loadStatsData()
        const deckKey = deck.id || deck.name
        if (!stats.decks[deckKey]) {
            stats.decks[deckKey] = {
                name: deck.name,
                totalCards: deck.cards.length,
                masteredCards: 0,
                sessions: 0,
            }
        }
        stats.decks[deckKey].masteredCards = deck.cards.filter(c => c.status === 'mastered').length
        saveStatsData(stats)
    }, [])

    /** Rate the current card and advance (or complete the deck). */
    const rateCard = (rating) => {
        if (!isFlipped) {
            showToast('Flip the card first to see the answer', 'warning')
            return
        }
        if (!currentDeck || !currentCard) return

        const updatedCards = currentDeck.cards.map((card, i) => {
            if (i !== currentCardIndex) return card
            const updated = { ...card, reviewCount: card.reviewCount + 1, lastReviewed: Date.now() }
            if (rating === 'hard') {
                updated.status = 'learning'
            } else if (rating === 'good') {
                updated.status = card.status === 'new' ? 'learning' : 'mastered'
            } else {
                updated.status = 'mastered'
            }
            return updated
        })
        const updatedDeck = { ...currentDeck, cards: updatedCards }
        setCurrentDeck(updatedDeck)
        persistProgress(updatedDeck)

        if (currentCardIndex < updatedCards.length - 1) {
            setCurrentCardIndex(i => i + 1)
            setIsFlipped(false)
        } else {
            showCompletion(updatedDeck)
        }
    }

    const showCompletion = (deck) => {
        const studyTime = Math.floor((Date.now() - studyStartTimeRef.current) / 1000)

        // Update session stats
        const stats = loadStatsData()
        stats.totalSessions += 1
        stats.totalStudyTime += studyTime
        const deckKey = deck.id || deck.name
        if (stats.decks[deckKey]) stats.decks[deckKey].sessions += 1
        saveStatsData(stats)

        setLastStudyTime(studyTime)
        setScreen('completion')
    }

    const previousCard = () => {
        if (currentCardIndex > 0) {
            setCurrentCardIndex(i => i - 1)
            setIsFlipped(false)
        }
    }

    const nextCard = () => {
        if (currentDeck && currentCardIndex < currentDeck.cards.length - 1) {
            setCurrentCardIndex(i => i + 1)
            setIsFlipped(false)
        }
    }

    const shuffleDeck = () => {
        if (!currentDeck) return
        setCurrentDeck({ ...currentDeck, cards: shuffleArray(currentDeck.cards) })
        setCurrentCardIndex(0)
        setIsFlipped(false)
        showToast('Deck shuffled!', 'success')
    }

    const resetProgress = () => {
        if (!currentDeck) return
        if (window.confirm('Reset progress for this deck? All review data will be lost.')) {
            const updatedDeck = { ...currentDeck, cards: initCards(currentDeck.cards) }
            setCurrentDeck(updatedDeck)
            persistProgress(updatedDeck)
            setCurrentCardIndex(0)
            setIsFlipped(false)
            showToast('Progress reset!', 'success')
        }
    }

    const studyAgain = () => {
        setCurrentCardIndex(0)
        setIsFlipped(false)
        studyStartTimeRef.current = Date.now()
        setScreen('study')
    }

    const exitStudy = () => {
        setCurrentDeck(null)
        setScreen('setup')
    }

    // ----- Custom deck editor -----

    const openCreateDeckModal = (deck = null) => {
        if (deck) {
            setEditingDeckId(deck.id)
            setDeckName(deck.name)
            setDeckCategory(deck.category)
            setEditorCards(deck.cards.map(c => ({ front: c.front, back: c.back })))
        } else {
            setEditingDeckId(null)
            setDeckName('')
            setDeckCategory('vocabulary')
            setEditorCards([{ front: '', back: '' }])
        }
        setShowCreateModal(true)
    }

    const saveDeck = () => {
        const name = deckName.trim()
        if (!name) {
            showToast('Please enter a deck name', 'error')
            return
        }
        if (editorCards.length === 0) {
            showToast('Please add at least one card', 'error')
            return
        }
        if (editorCards.some(c => !c.front.trim() || !c.back.trim())) {
            showToast('All cards must have both front and back', 'error')
            return
        }

        const deck = {
            id: editingDeckId || `custom_${Date.now()}`,
            name,
            category: deckCategory,
            icon: '📝',
            cards: editorCards.map(c => ({ front: c.front.trim(), back: c.back.trim() })),
        }

        setCustomDecks(prev => {
            const next = editingDeckId
                ? prev.map(d => (d.id === editingDeckId ? deck : d))
                : [...prev, deck]
            saveCustomDecks(next)
            return next
        })
        setShowCreateModal(false)
        showToast('Deck saved successfully!', 'success')
    }

    const deleteDeck = (deck) => {
        if (window.confirm(`Delete deck "${deck.name}"?`)) {
            setCustomDecks(prev => {
                const next = prev.filter(d => d.id !== deck.id)
                saveCustomDecks(next)
                return next
            })
            showToast('Deck deleted', 'success')
        }
    }

    // ----- Stats -----

    const statTotalCards = allDecks.reduce((sum, deck) => sum + deck.cards.length, 0)
    const flashStats = loadStatsData()
    let statTotalMastered = 0
    Object.values(flashStats.decks).forEach(deck => {
        statTotalMastered += deck.masteredCards || 0
    })
    const hours = Math.floor(flashStats.totalStudyTime / 3600)
    const minutes = Math.floor((flashStats.totalStudyTime % 3600) / 60)

    // Status badge counts for the current deck
    const statusCounts = currentDeck
        ? currentDeck.cards.reduce((acc, card) => {
            acc[card.status] = (acc[card.status] || 0) + 1
            return acc
        }, {})
        : {}
    const masteredCount = statusCounts.mastered || 0
    const learningCount = statusCounts.learning || 0
    const newCount = statusCounts.new || 0

    return (
        <GameShell
            title="Flashcards"
            subtitle="Study and memorize with interactive flashcards!"
        >
            {/* Setup Screen */}
            {screen === 'setup' && (
                <div className="setup-screen">
                    <div className="deck-selection">
                        <h2>Choose a Deck</h2>
                        <div className="decks-grid">
                            {allDecks.map(deck => (
                                <div className="deck-card" key={deck.id || deck.name} onClick={() => startStudying(deck, Boolean(customDecks.find(d => d.id === (deck.id || deck.name))))}>
                                    <div className="deck-icon">{deck.icon || '📇'}</div>
                                    <div className="deck-name">{deck.name}</div>
                                    <div className="deck-info">
                                        <span className="deck-category">{deck.category}</span>
                                        <span>{deck.cards.length} cards</span>
                                    </div>
                                </div>
                            ))}
                            {allDecks.length === 0 && (
                                <p style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-secondary)' }}>No decks available. Create a custom deck to get started!</p>
                            )}
                        </div>
                    </div>

                    <div className="custom-deck-section">
                        <h3>Or Create Your Own</h3>
                        <button className="btn btn-primary" onClick={() => openCreateDeckModal()}>+ Create Custom Deck</button>
                        <button className="btn btn-secondary" onClick={() => setShowManageModal(true)}>📝 Manage Decks</button>
                    </div>

                    <div className="setup-actions">
                        <button className="btn btn-secondary" onClick={() => setShowHelp(true)}>❓ How to Use</button>
                        <button className="btn btn-secondary" onClick={() => setShowStats(true)}>📊 Statistics</button>
                    </div>
                </div>
            )}

            {/* Study Screen */}
            {screen === 'study' && currentDeck && currentCard && (
                <div className="study-screen">
                    <div className="study-header">
                        <button className="btn btn-sm btn-secondary" onClick={exitStudy}>← Back</button>
                        <div className="deck-info">
                            <h2>{currentDeck.name}</h2>
                            <p>Card {currentCardIndex + 1} of {currentDeck.cards.length}</p>
                        </div>
                        <div className="study-stats">
                            <span className="stat-badge mastered">{masteredCount}</span>
                            <span className="stat-badge learning">{learningCount}</span>
                            <span className="stat-badge new">{newCount}</span>
                        </div>
                    </div>

                    <div className="flashcard-container">
                        <div className={`flashcard ${isFlipped ? 'flipped' : ''}`} onClick={() => setIsFlipped(f => !f)}>
                            <div className="flashcard-inner">
                                <div className="flashcard-front">
                                    <div className="card-content">{currentCard.front}</div>
                                    <div className="flip-hint">Click to flip</div>
                                </div>
                                <div className="flashcard-back">
                                    <div className="card-content">{currentCard.back}</div>
                                    <div className="flip-hint">Click to flip</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="study-controls">
                        <button className="btn btn-hard" onClick={() => rateCard('hard')}>😓 Hard</button>
                        <button className="btn btn-good" onClick={() => rateCard('good')}>😊 Good</button>
                        <button className="btn btn-easy" onClick={() => rateCard('easy')}>😎 Easy</button>
                    </div>

                    <div className="study-actions">
                        <button className="btn btn-sm btn-secondary" onClick={previousCard}>← Previous</button>
                        <button className="btn btn-sm btn-secondary" onClick={shuffleDeck}>🔀 Shuffle</button>
                        <button className="btn btn-sm btn-secondary" onClick={resetProgress}>🔄 Reset Progress</button>
                        <button className="btn btn-sm btn-secondary" onClick={nextCard}>Next →</button>
                    </div>
                </div>
            )}

            {/* Completion Screen */}
            {screen === 'completion' && currentDeck && (
                <div className="completion-screen">
                    <div className="completion-content">
                        <h2 className="completion-title">🎉 Deck Complete!</h2>
                        <div className="completion-stats">
                            <div className="stat-item">
                                <div className="stat-value">{currentDeck.cards.length}</div>
                                <div className="stat-label">Cards Reviewed</div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-value">{currentDeck.cards.filter(c => c.status === 'mastered').length}</div>
                                <div className="stat-label">Mastered</div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-value">{formatStudyTime(lastStudyTime)}</div>
                                <div className="stat-label">Study Time</div>
                            </div>
                        </div>
                        <div className="completion-actions">
                            <button className="btn btn-primary" onClick={studyAgain}>Study Again</button>
                            <button className="btn btn-secondary" onClick={exitStudy}>Choose Another Deck</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create/Edit Deck Modal */}
            {showCreateModal && (
                <Modal title={editingDeckId ? 'Edit Deck' : 'Create New Deck'} onClose={() => setShowCreateModal(false)} size="modal-large">
                    <div className="form-group">
                        <label htmlFor="deckName">Deck Name</label>
                        <input type="text" id="deckName" className="form-input" placeholder="e.g., Spanish Vocabulary" value={deckName} onChange={e => setDeckName(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="deckCategory">Category</label>
                        <select id="deckCategory" className="form-select" value={deckCategory} onChange={e => setDeckCategory(e.target.value)}>
                            <option value="vocabulary">Vocabulary</option>
                            <option value="science">Science</option>
                            <option value="history">History</option>
                            <option value="math">Math</option>
                            <option value="languages">Languages</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Cards</label>
                        <div className="cards-container">
                            {editorCards.map((card, i) => (
                                <div className="card-editor" key={i}>
                                    <div className="card-editor-header">
                                        <span className="card-editor-title">Card {i + 1}</span>
                                        <button className="remove-card-btn" onClick={() => setEditorCards(prev => prev.filter((_, j) => j !== i))}>Remove</button>
                                    </div>
                                    <div className="card-inputs">
                                        <textarea className="form-textarea card-front" placeholder="Front (Question)" value={card.front} onChange={e => setEditorCards(prev => prev.map((c, j) => j === i ? { ...c, front: e.target.value } : c))} />
                                        <textarea className="form-textarea card-back" placeholder="Back (Answer)" value={card.back} onChange={e => setEditorCards(prev => prev.map((c, j) => j === i ? { ...c, back: e.target.value } : c))} />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="btn btn-sm btn-secondary" onClick={() => setEditorCards(prev => [...prev, { front: '', back: '' }])}>+ Add Card</button>
                    </div>
                    <div className="modal-footer" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                        <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={saveDeck}>Save Deck</button>
                    </div>
                </Modal>
            )}

            {/* Manage Decks Modal */}
            {showManageModal && (
                <Modal title="Manage Decks" onClose={() => setShowManageModal(false)}>
                    <div className="custom-decks-list">
                        {customDecks.length === 0 ? (
                            <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No custom decks yet. Create one to get started!</p>
                        ) : (
                            customDecks.map(deck => (
                                <div className="custom-deck-item" key={deck.id}>
                                    <div className="custom-deck-info">
                                        <h4>{deck.name}</h4>
                                        <p>{deck.cards.length} cards • {deck.category}</p>
                                    </div>
                                    <div className="custom-deck-actions">
                                        <button className="btn btn-sm btn-secondary" onClick={() => { setShowManageModal(false); openCreateDeckModal(deck) }}>Edit</button>
                                        <button className="btn btn-sm btn-secondary" onClick={() => deleteDeck(deck)}>Delete</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Modal>
            )}

            {/* Help modal */}
            {showHelp && (
                <Modal title="How to Use Flashcards" onClose={() => setShowHelp(false)}>
                    <div style={{ textAlign: 'left' }}>
                        <h3>Studying</h3>
                        <p>Click on a flashcard to flip it and see the answer. Rate how well you knew the answer:</p>
                        <ul className="help-list">
                            <li><strong>Hard (😓):</strong> You didn't know it. Card will appear more frequently.</li>
                            <li><strong>Good (😊):</strong> You knew it after thinking. Normal review interval.</li>
                            <li><strong>Easy (😎):</strong> You knew it instantly. Longer review interval.</li>
                        </ul>

                        <h3>Card Status</h3>
                        <ul className="help-list">
                            <li><strong>New:</strong> Cards you haven't studied yet (blue badge)</li>
            <li><strong>Learning:</strong> Cards you're currently reviewing (yellow badge)</li>
                                        <li><strong>Mastered:</strong> Cards you know well (green badge)</li>
                        </ul>

                        <h3>Creating Custom Decks</h3>
                        <p>Click "Create Custom Deck" to make your own flashcards. Add as many cards as you need, then save the deck for later study.</p>

                        <h3>Tips</h3>
                        <ul className="help-list">
                            <li>Study regularly for best retention</li>
                            <li>Be honest with your ratings</li>
                            <li>Focus on cards you find difficult</li>
                            <li>Use the shuffle option for variety</li>
                        </ul>
                    </div>
                </Modal>
            )}

            {/* Stats modal */}
            {showStats && (
                <Modal title="Study Statistics" onClose={() => setShowStats(false)}>
                    <div className="stats-summary">
                        <div className="stat-item">
                            <div className="stat-value">{statTotalCards}</div>
                            <div className="stat-label">Total Cards</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-value">{statTotalMastered}</div>
                            <div className="stat-label">Mastered</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-value">{flashStats.totalSessions}</div>
                            <div className="stat-label">Sessions</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-value">{hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`}</div>
                            <div className="stat-label">Study Time</div>
                        </div>
                    </div>

                    <div className="deck-performance">
                        <h3>Deck Progress</h3>
                        {Object.keys(flashStats.decks).length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>No study sessions yet.</p>
                        ) : (
                            Object.values(flashStats.decks).map(deck => {
                                const progress = (deck.masteredCards / deck.totalCards * 100).toFixed(0)
                                return (
                                    <div className="deck-stat" key={deck.name}>
                                        <span className="deck-stat-name">{deck.name}</span>
                                        <div className="deck-stat-progress">
                                            <div className="progress-bar-small">
                                                <div className="progress-fill-small" style={{ width: `${progress}%` }} />
                                            </div>
                                            <span>{deck.masteredCards}/{deck.totalCards}</span>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </Modal>
            )}
        </GameShell>
    )
}
