import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import GameShell from '../../components/ui/GameShell'
import { useToast } from '../../contexts/ToastContext'

const API_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en'
const HISTORY_KEY = 'dictionary-history'
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

function extractPhonetics(data) {
  const phonetics = { text: null, audio: null }
  for (const entry of data) {
    if (entry.phonetics && entry.phonetics.length > 0) {
      for (const p of entry.phonetics) {
        if (!phonetics.text && p.text) phonetics.text = p.text
        if (!phonetics.audio && p.audio) phonetics.audio = p.audio
        if (phonetics.text && phonetics.audio) return phonetics
      }
    }
  }
  return phonetics
}

export default function Dictionary() {
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
      const response = await fetch(`${API_BASE}/${encodeURIComponent(cleanWord)}`)
      if (!response.ok) {
        if (response.status === 404) {
          setError(`No definition found for "${cleanWord}"`)
        } else {
          setError('Failed to fetch definition. Please try again.')
        }
        return
      }

      const data = await response.json()
      addToHistory(cleanWord)
      setResults(data)
    } catch (err) {
      console.error('Dictionary API error:', err)
      setError('Failed to connect to dictionary service. Please check your internet connection.')
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

  const { showToast } = useToast()

  const playAudio = useCallback((url) => {
    if (!url) return
    try {
      const audio = new Audio(url)
      audio.play().catch(() => {
        showToast('Failed to play audio', 'error')
      })
    } catch {
      showToast('Failed to play audio', 'error')
    }
  }, [showToast])

  const phonetics = useMemo(() => results ? extractPhonetics(results) : null, [results])

  const displayResultsHtml = useMemo(() => {
    if (!results) return null

    const w = results[0]?.word || currentWord
    let html = ''

    // Word header
    html += `<div class="word-header"><h2 class="word-title">${escapeHtml(w)}</h2>`

    // Phonetics
    if (phonetics?.text || phonetics?.audio) {
      html += `<div class="word-phonetics">`
      if (phonetics.text) {
        html += `<span class="phonetic-text">${escapeHtml(phonetics.text)}</span>`
      }
      if (phonetics.audio) {
        html += `<button class="btn-audio" data-audio="${escapeHtml(phonetics.audio)}" title="Play pronunciation">🔊</button>`
      }
      html += `</div>`
    }
    html += `</div>`

    // Meanings
    results.forEach((entry) => {
      entry.meanings?.forEach((meaning) => {
        html += `<div class="meaning-section"><h3 class="part-of-speech">${escapeHtml(meaning.partOfSpeech)}</h3>`

        if (meaning.definitions?.length > 0) {
          html += `<ol class="definitions-list">`
          meaning.definitions.forEach((def) => {
            html += `<li class="definition-item"><p class="definition-text">${escapeHtml(def.definition)}</p>`

            if (def.example) {
              html += `<p class="definition-example"><em>"${escapeHtml(def.example)}"</em></p>`
            }

            // Synonyms
            if (def.synonyms && def.synonyms.length > 0) {
              html += `<div class="definition-synonyms"><strong>Synonyms:</strong> `
              html += def.synonyms.slice(0, 5).map(s => `<button class="synonym-link" data-word="${escapeHtml(s)}">${escapeHtml(s)}</button>`).join(', ')
              if (def.synonyms.length > 5) {
                html += ` <span class="more-synonyms">+${def.synonyms.length - 5} more</span>`
              }
              html += `</div>`
            }

            // Antonyms
            if (def.antonyms && def.antonyms.length > 0) {
              html += `<div class="definition-antonyms"><strong>Antonyms:</strong> `
              html += def.antonyms.slice(0, 5).map(a => `<button class="synonym-link" data-word="${escapeHtml(a)}">${escapeHtml(a)}</button>`).join(', ')
              html += `</div>`
            }

            html += `</li>`
          })
          html += `</ol>`
        }
        html += `</div>`
      })
    })

    // Footer
    html += `<div class="dictionary-footer"><p class="source-attribution">Powered by <a href="https://dictionaryapi.dev/" target="_blank" rel="noopener">Free Dictionary API</a></p></div>`

    return html
  }, [results, currentWord, phonetics])

  // Handle clicks on synonym links and audio buttons
  useEffect(() => {
    const currentRef = resultsRef.current
    if (!currentRef) return

    const handleSynonymClick = (e) => {
      const btn = e.target.closest('.synonym-link')
      if (btn) {
        const synWord = btn.dataset.word
        const input = document.getElementById('dictionary-input')
        if (input) input.value = synWord
        searchWord(synWord)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }

    const handleAudioClick = (e) => {
      const btn = e.target.closest('.btn-audio')
      if (btn) {
        const url = btn.dataset.audio
        playAudio(url)
      }
    }

    currentRef.addEventListener('click', handleSynonymClick)
    currentRef.addEventListener('click', handleAudioClick)

    return () => {
      currentRef.removeEventListener('click', handleSynonymClick)
      currentRef.removeEventListener('click', handleAudioClick)
    }
  }, [results, searchWord, playAudio])

  return (
    <GameShell title="Dictionary" subtitle="Look up word definitions, audio pronunciation, and examples">
      {/* Search Form */}
      <div className="dictionary-tool">
        <div className="dictionary-search">
          <form className="search-form" onSubmit={handleSearch}>
            <div className="search-input-group">
              <input
                ref={inputRef}
                type="text"
                id="dictionary-input"
                className="search-input"
                placeholder="Enter a word to look up..."
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
        <div className="dictionary-results" ref={resultsRef}>
          {/* Welcome / Empty State */}
          {!results && !loading && !error && !currentWord && (
            <div className="dictionary-welcome">
              <div className="welcome-icon">📚</div>
              <h3>Welcome to the Dictionary</h3>
              <p>Enter a word above to see its definition, pronunciation, and usage examples.</p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="dictionary-loading">
              <div className="loading-spinner" />
              <p>Looking up "{escapeHtml(currentWord)}"...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="dictionary-error">
              <div className="error-icon">❌</div>
              <h3>Word Not Found</h3>
              <p>{escapeHtml(error)}</p>
              <p className="error-hint">Try checking the spelling or try a different word.</p>
            </div>
          )}

          {/* Results */}
          {results && (
            <div className="dictionary-content" dangerouslySetInnerHTML={{ __html: displayResultsHtml }} />
          )}
        </div>
      </div>
    </GameShell>
  )
}