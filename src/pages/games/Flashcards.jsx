import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import GameShell, { Modal } from '../../components/ui/GameShell'
import { useToast } from '../../contexts/ToastContext'
import { useGameState } from '../../contexts/GameStateContext'
import NamePrompt from '../../components/ui/NamePrompt'
import { getDisplayName } from '../../lib/logbook'

import builtinDecks from '../../assets/flashcard-decks.json'

const DEFAULT_STATS = {
  decksStudied: 0,
  totalSessions: 0,
  totalStudyTime: 0,
  totalRatings: 0,
  masteredCards: 0,
}

function loadStats() {
  try {
    const saved = localStorage.getItem('flashcardStats')
    return saved ? { ...DEFAULT_STATS, ...JSON.parse(saved) } : { ...DEFAULT_STATS }
  } catch {
    return { ...DEFAULT_STATS }
  }
}

function saveStats(stats) {
  try {
    localStorage.setItem('flashcardStats', JSON.stringify(stats))
  } catch {}
}

function loadCustomDecks() {
  try {
    return JSON.parse(localStorage.getItem('customFlashcardDecks') || '[]')
  } catch {
    return []
  }
}

function saveCustomDecks(decks) {
  try {
    localStorage.setItem('customFlashcardDecks', JSON.stringify(decks))
  } catch {}
}

function loadProgress(deckId) {
  try {
    return JSON.parse(localStorage.getItem(`flashcard_progress_${deckId}`) || '{}')
  } catch {
    return {}
  }
}

function saveProgress(deckId, progress) {
  try {
    localStorage.setItem(`flashcard_progress_${deckId}`, JSON.stringify(progress))
  } catch {}
}

/** Progress shape: { [cardIndex]: { status: 'new'|'learning'|'mastered', seen: n } } */
function rateCard(progress, index, rating) {
  const p = { ...progress }
  const card = p[index] || { status: 'new', seen: 0 }
  const updated = { ...card, seen: card.seen + 1 }
  if (rating === 'hard') {
    updated.status = 'learning'
  } else if (rating === 'good') {
    updated.status = card.status === 'new' ? 'learning' : 'mastered'
  } else if (rating === 'easy') {
    updated.status = 'mastered'
  }
  p[index] = updated
  return p
}

export default function Flashcards() {
  const { showToast } = useToast()
  const { recordScore } = useGameState()

  const [customDecks, setCustomDecks] = useState(() => loadCustomDecks())
  const [screen, setScreen] = useState('decks') // decks | study | complete
  const [activeDeck, setActiveDeck] = useState(null)
  const [cardIndex, setCardIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [sessionProgress, setSessionProgress] = useState({})
  const [studyStart, setStudyStart] = useState(null)
  const [studyTime, setStudyTime] = useState(0)

  const [showStats, setShowStats] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [showManage, setShowManage] = useState(false)
  const [showProgress, setShowProgress] = useState(false)
  const [stats, setStats] = useState(() => loadStats())
  // Cumulative session score — accumulates across sessions
  const [sessionScore, setSessionScore] = useState(0)

  // new deck form
  const [deckName, setDeckName] = useState('')
  const [deckCategory, setDeckCategory] = useState('custom')
  const [deckIcon, setDeckIcon] = useState('Deck')
  const [deckCards, setDeckCards] = useState([{ front: '', back: '' }])

  const startedRef = useRef(false)
  const sessionRef = useRef(null)
  const [namePrompt, setNamePrompt] = useState(null)

  const doSubmitScore = useCallback(
    async (score) => {
      try {
        const username = await new Promise((resolve) => setNamePrompt({ resolve }))
        if (!username) return
        await recordScore({
          gameType: 'flashcards',
          gameMode: 'unlimited',
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
    [recordScore, showToast],
  )

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    setStats(loadStats())
  }, [])

  const allDecks = useMemo(() => [...builtinDecks, ...customDecks], [customDecks])

  const deckProgress = useCallback(
    (deckId) => loadProgress(deckId),
    [],
  )

  const startStudy = useCallback(
    (deck) => {
      const progress = loadProgress(deck.id)
      // First card with status != mastered, else start at 0
      let firstIdx = 0
      for (let i = 0; i < deck.cards.length; i++) {
        if (!progress[i] || progress[i].status !== 'mastered') {
          firstIdx = i
          break
        }
      }
      setActiveDeck(deck)
      setCardIndex(firstIdx)
      setFlipped(false)
      setSessionProgress({})
      setStudyStart(Date.now())
      setStudyTime(0)
      setScreen('study')
    },
    [],
  )

  const finishStudy = useCallback(() => {
    if (!activeDeck) return
    const elapsed = Math.round((Date.now() - studyStart) / 1000)
    setStudyTime(elapsed)

    // merge session progress into stored progress
    const stored = loadProgress(activeDeck.id)
    const merged = { ...stored }
    let mastered = 0
    for (const [idx, p] of Object.entries(sessionProgress)) {
      merged[idx] = p
    }
    for (const p of Object.values(merged)) {
      if (p.status === 'mastered') mastered++
    }
    saveProgress(activeDeck.id, merged)

    const s = loadStats()
    s.decksStudied += 1
    s.totalSessions += 1
    s.totalStudyTime += elapsed
    s.totalRatings += Object.keys(sessionProgress).length
    s.masteredCards = mastered
    saveStats(s)
    setStats(s)

    // record score: 10 pts per newly-mastered card this session
    const newlyMastered = Object.values(sessionProgress).filter((p) => p.status === 'mastered').length
    const score = newlyMastered * 10 + Math.max(0, 60 - elapsed)
    setSessionScore(prev => prev + score)
    sessionRef.current = { score, mastered: newlyMastered, time: elapsed, deckName: activeDeck.name }
    setScreen('complete')
    // auto-submit to leaderboard
    doSubmitScore(score)
  }, [activeDeck, studyStart, sessionProgress, doSubmitScore])

  const handleRate = useCallback(
    (rating) => {
      if (!activeDeck) return
      const updated = rateCard(sessionProgress, cardIndex, rating)
      setSessionProgress(updated)
      // find next non-mastered card (within this session's view)
      let nextIdx = -1
      for (let i = cardIndex + 1; i < activeDeck.cards.length; i++) {
        const p = updated[i]
        if (!p || p.status !== 'mastered') {
          nextIdx = i
          break
        }
      }
      if (nextIdx === -1) {
        for (let i = 0; i <= cardIndex; i++) {
          const p = updated[i]
          if (!p || p.status !== 'mastered') {
            nextIdx = i
            break
          }
        }
      }
      if (nextIdx === -1 || (nextIdx === cardIndex && Object.keys(updated).length >= activeDeck.cards.length)) {
        // all cards rated at least once — session complete if all mastered or cycled
        const allMastered = activeDeck.cards.every((_, i) => updated[i]?.status === 'mastered')
        if (allMastered || nextIdx === -1) {
          finishStudy()
          return
        }
        setCardIndex(nextIdx)
      } else {
        setCardIndex(nextIdx)
      }
      setFlipped(false)
    },
    [activeDeck, cardIndex, sessionProgress, finishStudy],
  )

  const createDeck = useCallback(() => {
    if (!deckName.trim()) {
      showToast('Give your deck a name', 'error')
      return
    }
    const validCards = deckCards.filter((c) => c.front.trim() && c.back.trim())
    if (validCards.length === 0) {
      showToast('Add at least one card with front and back', 'error')
      return
    }
    const deck = {
      id: `custom_${Date.now()}`,
      name: deckName.trim(),
      category: deckCategory || 'custom',
      icon: deckIcon || 'Deck',
      custom: true,
      cards: validCards.map((c) => ({ front: c.front.trim(), back: c.back.trim() })),
    }
    const decks = [...loadCustomDecks(), deck]
    saveCustomDecks(decks)
    setCustomDecks(decks)
    setDeckName('')
    setDeckCategory('custom')
    setDeckIcon('Deck')
    setDeckCards([{ front: '', back: '' }])
    setShowCreate(false)
    showToast(`Deck "${deck.name}" created`, 'success')
  }, [deckName, deckCategory, deckIcon, deckCards, showToast])

  const deleteDeck = useCallback(
    (deckId) => {
      const decks = loadCustomDecks().filter((d) => d.id !== deckId)
      saveCustomDecks(decks)
      setCustomDecks(decks)
      try {
        localStorage.removeItem(`flashcard_progress_${deckId}`)
      } catch {}
      showToast('Deck deleted', 'info')
    },
    [showToast],
  )

  if (screen === 'decks') {
    return (
      <GameShell
        title="Flashcards"
        subtitle="Study, flip, and master your decks"
        wide
        accent="var(--nb-lavender)"
        controls={
          <>
            <button className="btn btn-sm btn-secondary" onClick={() => setShowCreate(true)} data-testid="fc-create">
              + New Deck
            </button>
            <button className="btn btn-sm btn-outline" onClick={() => setShowManage(true)}>
              Manage
            </button>
            <button className="icon-btn" title="Stats" onClick={() => setShowStats(true)}>Stats</button>
          </>
        }
      >
        <div className="fc-deck-grid" data-testid="fc-deck-grid">
          {allDecks.map((deck) => {
            const prog = deckProgress(deck.id)
            const total = deck.cards.length
            const mastered = Object.values(prog).filter((p) => p.status === 'mastered').length
            const learning = Object.values(prog).filter((p) => p.status === 'learning').length
            const pct = total > 0 ? Math.round((mastered / total) * 100) : 0
            return (
              <div key={deck.id} className="fc-deck-card" data-testid={`fc-deck-${deck.id}`}>
                <div className="fc-deck-head">
                  <span className="fc-deck-icon">{deck.icon}</span>
                  <div>
                    <h3 className="fc-deck-name">{deck.name}</h3>
                    <span className="fc-deck-cat">{deck.category} · {total} cards</span>
                  </div>
                </div>
                <div className="fc-deck-progress">
                  <div className="fc-progress-track">
                    <div className="fc-progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="fc-progress-labels">
                    <span>{pct}% mastered</span>
                    {learning > 0 && <span className="fc-learning-count">{learning} learning</span>}
                  </div>
                </div>
                <button className="btn btn-primary fc-deck-btn" onClick={() => startStudy(deck)}>
                  {mastered >= total && total > 0 ? '↻ Review' : '▶ Study'}
                </button>
              </div>
            )
          })}
        </div>

        {/* Stats modal */}
        {showStats && (
          <Modal title="Your Statistics" onClose={() => setShowStats(false)}>
            <div className="stats-summary">
              <div className="stat-item">
                <span className="stat-value">{stats.decksStudied}</span>
                <span className="stat-label">Decks</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{stats.totalSessions}</span>
                <span className="stat-label">Sessions</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{Math.floor(stats.totalStudyTime / 60)}m</span>
                <span className="stat-label">Study Time</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{stats.masteredCards}</span>
                <span className="stat-label">Mastered</span>
              </div>
            </div>
          </Modal>
        )}

        {/* Create deck modal */}
        {showCreate && (
          <Modal title="Create Custom Deck" onClose={() => setShowCreate(false)} wide>
            <div className="fc-create-form">
              <div className="fc-form-row">
                <label className="fc-form-label">Deck Name</label>
                <input
                  className="form-input"
                  value={deckName}
                  maxLength={40}
                  placeholder="e.g. French Verbs"
                  onChange={(e) => setDeckName(e.target.value)}
                />
              </div>
              <div className="fc-form-row fc-form-inline">
                <div>
                  <label className="fc-form-label">Category</label>
                  <input
                    className="form-input"
                    value={deckCategory}
                    maxLength={20}
                    onChange={(e) => setDeckCategory(e.target.value)}
                  />
                </div>
                <div>
                  <label className="fc-form-label">Icon</label>
                  <input
                    className="form-input"
                    value={deckIcon}
                    maxLength={4}
                    onChange={(e) => setDeckIcon(e.target.value)}
                  />
                </div>
              </div>
              <label className="fc-form-label">Cards</label>
              {deckCards.map((c, i) => (
                <div key={i} className="fc-form-card-row">
                  <input
                    className="form-input"
                    placeholder="Front"
                    value={c.front}
                    onChange={(e) => {
                      const next = [...deckCards]
                      next[i] = { ...next[i], front: e.target.value }
                      setDeckCards(next)
                    }}
                  />
                  <input
                    className="form-input"
                    placeholder="Back"
                    value={c.back}
                    onChange={(e) => {
                      const next = [...deckCards]
                      next[i] = { ...next[i], back: e.target.value }
                      setDeckCards(next)
                    }}
                  />
                  <button
                    className="icon-btn"
                    title="Remove card"
                    onClick={() => setDeckCards(deckCards.filter((_, j) => j !== i))}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                className="btn btn-sm btn-outline"
                onClick={() => setDeckCards([...deckCards, { front: '', back: '' }])}
              >
                ＋ Add Card
              </button>
              <div className="fc-create-actions">
                <button className="btn btn-primary" onClick={createDeck} data-testid="fc-create-save">
                  Create Deck
                </button>
                <button className="btn btn-outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Manage modal */}
        {showManage && (
          <Modal title="Manage Custom Decks" onClose={() => setShowManage(false)}>
            {customDecks.length === 0 ? (
              <p>No custom decks yet, create one to get started!</p>
            ) : (
              <div className="fc-manage-list">
                {customDecks.map((d) => (
                  <div key={d.id} className="fc-manage-row">
                    <span>{d.icon} {d.name} <small>({d.cards.length} cards)</small></span>
                    <button className="btn btn-sm btn-outline" onClick={() => deleteDeck(d.id)}>
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Modal>
        )}
      </GameShell>
    )
  }

  if (screen === 'study' && activeDeck) {
    const card = activeDeck.cards[cardIndex]
    const prog = deckProgress(activeDeck.id)
    const mastered = Object.values({ ...prog, ...sessionProgress }).filter((p) => p.status === 'mastered').length
    return (
      <GameShell
        title={activeDeck.name}
        subtitle={`Card ${cardIndex + 1} of ${activeDeck.cards.length} · ${mastered} mastered`}
        wide
        controls={
          <button className="btn btn-sm btn-outline" onClick={finishStudy}>
            Finish Session
          </button>
        }
      >
        <div className="fc-study-area" data-testid="fc-study">
          <div
            className={`fc-card${flipped ? ' fc-card-flipped' : ''}`}
            data-testid="fc-card"
            onClick={() => setFlipped((f) => !f)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault()
                setFlipped((f) => !f)
              }
            }}
          >
            <div className="fc-card-inner">
              <div className="fc-card-face fc-card-front">
                <span className="fc-card-side-label">Front</span>
                <div className="fc-card-text">{card.front}</div>
              </div>
              <div className="fc-card-face fc-card-back">
                <span className="fc-card-side-label">Back</span>
                <div className="fc-card-text">{card.back}</div>
              </div>
            </div>
          </div>
          <p className="fc-flip-hint">{flipped ? 'Click to see front' : 'Click to flip'}</p>

          {flipped && (
            <div className="fc-rating-row" data-testid="fc-rating">
              <button className="btn fc-rate-hard" onClick={() => handleRate('hard')}>
                Hard
              </button>
              <button className="btn fc-rate-good" onClick={() => handleRate('good')}>
                Good
              </button>
              <button className="btn fc-rate-easy" onClick={() => handleRate('easy')}>
                Easy
              </button>
            </div>
          )}
        </div>
      </GameShell>
    )
  }

  if (screen === 'complete' && sessionRef.current) {
    const session = sessionRef.current
    return (
      <GameShell title="Session Complete" subtitle={session.deckName}>
        <div className="game-result fc-complete-inline" data-testid="fc-complete">
          <div className="result-content">
            <div className="result-title">Done!</div>
            <div className="result-message">You rated {session.mastered} card{session.mastered === 1 ? '' : 's'} as mastered.</div>
            <div className="result-stats">
              <div className="result-stat">
                <span className="result-stat-value">{session.score}</span>
                <span className="result-stat-label">Score</span>
              </div>
              <div className="result-stat">
                <span className="result-stat-value">{Math.floor(session.time / 60)}:{String(session.time % 60).padStart(2, '0')}</span>
                <span className="result-stat-label">Time</span>
              </div>
            </div>
            <div className="result-actions">
              <button className="btn btn-secondary" onClick={() => setScreen('decks')}>
                Back to Decks
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
    <GameShell title="Flashcards" subtitle="Loading…">
      <p style={{ textAlign: 'center' }}>Loading decks…</p>
    </GameShell>
  )
}
