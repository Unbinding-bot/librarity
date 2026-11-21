import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import GameShell from '../../components/ui/GameShell'

const API_BASE = 'https://api.datamuse.com/words'
const HISTORY_KEY = 'thesaurus-history'
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

export default function Thesaurus() {
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
      const [synonyms, antonyms, related] = await Promise.all([
        fetchWords(`${API_BASE}?rel_syn=${encodeURIComponent(cleanWord)}&max=50`),
        fetchWords(`${API_BASE}?rel_ant=${encodeURIComponent(cleanWord)}&max=30`),
        fetchWords(`${API_BASE}?ml=${encodeURIComponent(cleanWord)}&max=30`)
      ])

      if (synonyms.length === 0 && antonyms.length === 0 && related.length === 0) {
        setError(`No results found for "${cleanWord}"`)
        return
      }

      addToHistory(cleanWord)
      setResults({ synonyms, antonyms, related })
    } catch (err) {
      console.error('Thesaurus API error:', err)
      setError('Failed to fetch results. Please check your internet connection.')
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

    let h = `<div class="thesaurus-content">`

    // Word header
    h += `<div class="word-header"><h2 class="word-title">${escapeHtml(currentWord)}</h2></div>`

    // Synonyms section
    if (results.synonyms?.length > 0) {
      h += `<div class="word-section synonyms-section"><h3 class="section-title">✅ Synonyms</h3><div class="word-grid">`
      results.synonyms.forEach(item => {
        const score = item.score || 0
        h += `<button class="word-chip synonym-chip" data-word="${escapeHtml(item.word)}" title="Score: ${score}">${escapeHtml(item.word)}</button>`
      })
      h += `</div></div>`
    }

    // Antonyms section
    if (results.antonyms?.length > 0) {
      h += `<div class="word-section antonyms-section"><h3 class="section-title">❌ Antonyms</h3><div class="word-grid">`
      results.antonyms.forEach(item => {
        h += `<button class="word-chip antonym-chip" data-word="${escapeHtml(item.word)}">${escapeHtml(item.word)}</button>`
      })
      h += `</div></div>`
    }

    // Related words section
    if (results.related?.length > 0) {
      h += `<div class="word-section related-section"><h3 class="section-title">🔗 Related Words</h3><div class="word-grid">`
      results.related.slice(0, 20).forEach(item => {
        h += `<button class="word-chip related-chip" data-word="${escapeHtml(item.word)}">${escapeHtml(item.word)}</button>`
      })
      h += `</div></div>`
    }

    // Footer
    h += `<div class="thesaurus-footer"><p class="source-attribution">Powered by <a href="https://www.datamuse.com/api/" target="_blank" rel="noopener">Datamuse API</a></p></div>`
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
        const input = document.getElementById('thesaurus-input')
        if (input) input.value = chipWord
        searchWord(chipWord)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }

    currentRef.addEventListener('click', handleClick)
    return () => currentRef.removeEventListener('click', handleClick)
  }, [results, searchWord])

  return (
    <GameShell title="Thesaurus" subtitle="Find synonyms, antonyms, and related words">
      <div className="thesaurus-tool">
        <div className="thesaurus-search">
          <form className="search-form" onSubmit={handleSearch}>
            <div className="search-input-group">
              <input
                ref={inputRef}
                type="text"
                id="thesaurus-input"
                className="search-input"
                placeholder="Enter a word to find synonyms..."
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
        <div className="thesaurus-results" ref={resultsRef}>
          {/* Welcome / Empty State */}
          {!results && !loading && !error && !currentWord && (
            <div className="thesaurus-welcome">
              <div className="welcome-icon">💭</div>
              <h3>Welcome to the Thesaurus</h3>
              <p>Enter a word above to discover synonyms, antonyms, and related words.</p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="thesaurus-loading">
              <div className="loading-spinner" />
              <p>Searching for "{escapeHtml(currentWord)}"...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="thesaurus-error">
              <div className="error-icon">❌</div>
              <h3>No Results Found</h3>
              <p>{escapeHtml(error)}</p>
              <p className="error-hint">Try a different word or check the spelling.</p>
            </div>
          )}

          {/* Results */}
          {results && (
            <div className="thesaurus-content" dangerouslySetInnerHTML={{ __html: html }} />
          )}
        </div>
      </div>
    </GameShell>
  )
}