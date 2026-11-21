import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import GameShell from '../../components/ui/GameShell'

const API_BASE = 'https://api.datamuse.com/words'
const HISTORY_KEY = 'rhyme-history'
const MAX_HISTORY = 20

function loadHistory() {
  try {
    const saved = localStorage.getItem(HISTORY_KEY)
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

function saveHistory(history) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  } catch { /* ignore */ }
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function fetchWords(url) {
  return fetch(url).then(res => {
    if (!res.ok) throw new Error(`API request failed: ${res.status}`)
    return res.json()
  })
}

function groupBySyllables(words) {
  const grouped = {}
  words.forEach(word => {
    const syllables = word.numSyllables || 'unknown'
    if (!grouped[syllables]) grouped[syllables] = []
    grouped[syllables].push(word)
  })
  return grouped
}

export default function RhymeFinder() {
  const [word, setWord] = useState('')
  const [currentWord, setCurrentWord] = useState(null)
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [history, setHistoryState] = useState(() => loadHistory())

  const inputRef = useRef(null)
  const resultsRef = useRef(null)

  const addToHistory = useCallback((w) => {
    const cleanWord = w.toLowerCase().trim()
    const newHistory = [cleanWord, ...history.filter(item => item !== cleanWord)].slice(0, MAX_HISTORY)
    setHistoryState(newHistory)
    saveHistory(newHistory)
  }, [history])

  const clearHistory = useCallback(() => {
    if (window.confirm('Clear all search history?')) {
      setHistoryState([])
      saveHistory([])
    }
  }, [])

  const searchWord = useCallback(async (searchWord) => {
    const cleanWord = searchWord.toLowerCase().trim()
    if (!cleanWord) return

    setCurrentWord(cleanWord)
    setLoading(true)
    setError(null)
    setResults(null)

    try {
      const [perfectRhymes, nearRhymes, homophones] = await Promise.all([
        fetchWords(`${API_BASE}?rel_rhy=${encodeURIComponent(cleanWord)}&max=100`),
        fetchWords(`${API_BASE}?rel_nry=${encodeURIComponent(cleanWord)}&max=50`),
        fetchWords(`${API_BASE}?rel_hom=${encodeURIComponent(cleanWord)}&max=30`)
      ])

      if (perfectRhymes.length === 0 && nearRhymes.length === 0 && homophones.length === 0) {
        setError(`No rhymes found for "${cleanWord}"`)
        return
      }

      addToHistory(cleanWord)
      setResults({ perfectRhymes, nearRhymes, homophones })
    } catch (err) {
      console.error('Rhyme API error:', err)
      setError('Failed to fetch rhymes. Please check your internet connection.')
    } finally {
      setLoading(false)
      setTimeout(() => resultsRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 100)
    }
  }, [addToHistory])

  const handleSearch = useCallback((e) => {
    e.preventDefault()
    if (word.trim()) {
      searchWord(word)
    }
  }, [searchWord, word])

  const handleInputChange = useCallback((e) => {
    setWord(e.target.value)
  }, [])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (word.trim()) searchWord(word)
    }
  }, [searchWord, word])

  const html = useMemo(() => {
    if (!results) return null

    let h = `<div class="rhyme-content">`

    // Word header
    h += `<div class="word-header"><h2 class="word-title">${escapeHtml(currentWord)}</h2><p class="word-subtitle">Words that rhyme with "${escapeHtml(currentWord)}"</p></div>`

    // Perfect rhymes section
    if (results.perfectRhymes?.length > 0) {
      const grouped = groupBySyllables(results.perfectRhymes)
      h += `<div class="word-section perfect-rhymes-section"><h3 class="section-title">🎯 Perfect Rhymes <span class="count">(${results.perfectRhymes.length})</span></h3><p class="section-description">Words with identical ending sounds</p><div class="word-grid">`

      Object.keys(grouped).sort((a, b) => a - b).forEach(syllables => {
        grouped[syllables].forEach(item => {
          const numSyllables = item.numSyllables || ''
          h += `<button class="word-chip perfect-chip" data-word="${escapeHtml(item.word)}" title="Syllables: ${numSyllables}, Score: ${item.score || 0}">${escapeHtml(item.word)}${numSyllables ? `<span class="syllable-count">${numSyllables}</span>` : ''}</button>`
        })
      })

      h += `</div></div>`
    }

    // Near rhymes section
    if (results.nearRhymes?.length > 0) {
      h += `<div class="word-section near-rhymes-section"><h3 class="section-title">🎼 Near Rhymes <span class="count">(${results.nearRhymes.length})</span></h3><p class="section-description">Words with similar but not identical sounds</p><div class="word-grid">`

      results.nearRhymes.forEach(item => {
        h += `<button class="word-chip near-chip" data-word="${escapeHtml(item.word)}">${escapeHtml(item.word)}</button>`
      })

      h += `</div></div>`
    }

    // Homophones section
    if (results.homophones?.length > 0) {
      h += `<div class="word-section homophones-section"><h3 class="section-title">🔊 Homophones <span class="count">(${results.homophones.length})</span></h3><p class="section-description">Words that sound exactly the same</p><div class="word-grid">`

      results.homophones.forEach(item => {
        h += `<button class="word-chip homophone-chip" data-word="${escapeHtml(item.word)}">${escapeHtml(item.word)}</button>`
      })

      h += `</div></div>`
    }

    // Footer
    h += `<div class="rhyme-footer"><p class="source-attribution">Powered by <a href="https://www.datamuse.com/api/" target="_blank" rel="noopener">Datamuse API</a></p></div>`
    h += `</div>`

    return h
  }, [results, currentWord])

  // Handle clicks on word chips
  useEffect(() => {
    const currentRef = resultsRef.current
    if (!currentRef) return

    const handleClick = (e) => {
      const btn = e.target.closest('.word-chip')
      if (btn) {
        const chipWord = btn.dataset.word
        const input = document.getElementById('rhyme-input')
        if (input) input.value = chipWord
        searchWord(chipWord)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }

    currentRef.addEventListener('click', handleClick)
    return () => currentRef.removeEventListener('click', handleClick)
  }, [results, searchWord])

  return (
    <GameShell title="Rhyme Finder" subtitle="Find perfect rhymes, near rhymes, and sound-alike words">
      <div className="rhyme-tool">
        <div className="rhyme-search">
          <form className="search-form" onSubmit={handleSearch}>
            <div className="search-input-group">
              <input
                ref={inputRef}
                type="text"
                id="rhyme-input"
                className="search-input"
                placeholder="Enter a word to find rhymes..."
                autocomplete="off"
                spellcheck="false"
                value={word}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                required
              />
              <button type="submit" className="btn btn-primary search-btn">
                <span className="search-icon">🔍</span>
                <span className="search-text">Search</span>
              </button>
            </div>
          </form>

          {/* History */}
          {history.length > 0 && (
            <div className="search-history">
              <div className="history-header">
                <span className="history-title">Recent Searches</span>
                <button className="btn-link" title="Clear history" onClick={clearHistory}>Clear</button>
              </div>
              <div className="history-items">
                {history.slice(0, 10).map(hWord => (
                  <button className="history-item" key={hWord} data-word={hWord} onClick={() => {
                    setWord(hWord)
                    searchWord(hWord)
                  }}>
                    {escapeHtml(hWord)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="rhyme-results" ref={resultsRef}>
          {/* Welcome / Empty State */}
          {!results && !loading && !error && !currentWord && (
            <div className="rhyme-welcome">
              <div className="welcome-icon">🎤</div>
              <h3>Welcome to the Rhyme Finder</h3>
              <p>Enter a word above to discover rhyming words for poetry, lyrics, or creative writing.</p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="rhyme-loading">
              <div className="loading-spinner" />
              <p>Finding rhymes for "{escapeHtml(currentWord)}"...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="rhyme-error">
              <div className="error-icon">❌</div>
              <h3>No Rhymes Found</h3>
              <p>{escapeHtml(error)}</p>
              <p className="error-hint">Try a different word or check the spelling.</p>
            </div>
          )}

          {/* Results */}
          {results && (
            <div className="rhyme-content" dangerouslySetInnerHTML={{ __html: html }} />
          )}
        </div>
      </div>
    </GameShell>
  )
}