import React, { useState, useEffect, useRef, useCallback } from 'react'
import GameShell from '../../components/ui/GameShell'
import { useToast } from '../../contexts/ToastContext'
import { getEasterEgg, applyEasterEggs, resolveEggColor, resolveEggSpecial } from '../../lib/easterEggs'

const API = 'https://api.dictionaryapi.dev/api/v2/entries/en'
const HISTORY_KEY = 'dictionary-history'
const HISTORY_MAX = 7

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
  } catch {
    return []
  }
}

function saveHistory(list) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list))
  } catch {}
}

export default function Dictionary() {
  const { showToast } = useToast()
  const [word, setWord] = useState('')
  const [results, setResults] = useState(null) // array of entry objects
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [history, setHistory] = useState(() => loadHistory())

  const clearHistory = useCallback(() => {
    setHistory([])
    try {
      localStorage.removeItem(HISTORY_KEY)
    } catch {}
  }, [])

  const inputRef = useRef(null)

  const lookup = useCallback(
    async (term) => {
      const clean = term.trim().toLowerCase()
      if (!clean) return
      setWord(clean)
      setLoading(true)
      setError(null)
      setResults(null)

      // Easter eggs first: crafted entries (unbinding, bernard, salvador,
      // claire) answer locally without hitting the API.
      const egg = getEasterEgg(clean)
      if (egg) {
        setResults([egg])
        setLoading(false)
        const next = [clean, ...history.filter((h) => h !== clean)].slice(0, HISTORY_MAX)
        setHistory(next)
        saveHistory(next)
        return
      }

      try {
        const res = await fetch(`${API}/${encodeURIComponent(clean)}`)
        if (res.status === 404) {
          setError(`No definitions found for "${clean}".`)
          setLoading(false)
          return
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        // Real-word eggs: one quiet extra synonym among the genuine ones.
        setResults(applyEasterEggs(clean, data))
        setLoading(false)
        // add to history (dedupe, most recent first)
        const next = [clean, ...history.filter((h) => h !== clean)].slice(0, HISTORY_MAX)
        setHistory(next)
        saveHistory(next)
      } catch (err) {
        setError(`Lookup failed: ${err.message}`)
        setLoading(false)
      }
    },
    [history],
  )

  // initial focus
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const playAudio = useCallback((audioUrl) => {
    try {
      new Audio(audioUrl).play()
    } catch {
      showToast('Audio not available', 'warning')
    }
  }, [showToast])

  const SynonymLinks = ({ words }) => {
    if (!words || words.length === 0) return null
    return (
      <div className="tool-chip-row">
        {words.slice(0, 8).map((w) => (
          <button key={w} className="tool-chip" onClick={() => lookup(w)}>
            {w}
          </button>
        ))}
      </div>
    )
  }

  return (
    <GameShell
      title="Dictionary"
      subtitle="Definitions, pronunciation, and more"
      controls={
        history.length > 0 && (
          <button className="btn btn-sm btn-secondary" title="Clear search history" onClick={clearHistory} data-testid="dict-clear">
            Clear
          </button>
        )
      }
    >
      <div className="tool-search-row" data-testid="dict-search">
        <input
          ref={inputRef}
          className="form-input tool-search-input"
          type="text"
          value={word}
          placeholder="Search a word…"
          onChange={(e) => setWord(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') lookup(word) }}
        />
        <button className="btn btn-primary" onClick={() => lookup(word)} data-testid="dict-search-btn">
          Search
        </button>
      </div>

      {history.length > 0 && (
        <div className="tool-history" data-testid="dict-history">
          <span className="tool-history-label">Recent:</span>
          {history.slice(0, 10).map((h) => (
            <button key={h} className="tool-chip" onClick={() => lookup(h)}>{h}</button>
          ))}
        </div>
      )}

      {loading && <div className="tool-loading">Looking up “{word}”…</div>}

      {error && (
        <div className="tool-error" data-testid="dict-error">
          <p>{error}</p>
          <p className="tool-error-hint">Check the spelling, or try another word.</p>
        </div>
      )}

      {results && (
        <div className="tool-results" data-testid="dict-results">
          {results.map((entry, ei) => {
            const phonetics = entry.phonetics || []
            const audio = phonetics.find((p) => p.audio)
            const phoneticText = phonetics.find((p) => p.text)?.text
            return (
              <div key={ei} className={`tool-entry${entry.color ? ' word-color' : ''} ${resolveEggSpecial(entry) || ''}`.trim()} style={entry.color ? { '--egg-fg': resolveEggColor(entry.color), '--egg-bg': `${resolveEggColor(entry.color)}22`, '--egg-border': resolveEggColor(entry.color) } : undefined}>
                <div className="tool-entry-head">
                  <h2 className="tool-entry-word">{entry.word}</h2>
                  {resolveEggSpecial(entry) === 'egg-special-owner' && (
                    <span className="tool-entry-word-tooltip egg-badge-owner" title="⚡ OWNER — this site's creator has their own dictionary entry. Special green for a special person.">
                      ⚡ owner
                    </span>
                  )}
                  {resolveEggSpecial(entry) === 'egg-special-claire' && (
                    <span className="tool-entry-word-tooltip egg-badge-claire" title="♡ A very special entry for a very special person. The only one with polka dots. ♡">
                      ♡ claire
                    </span>
                  )}
                  {resolveEggSpecial(entry) === 'egg-special-goat' && (
                    <span className="tool-entry-word-tooltip egg-badge-goat" title="I was forced to do this sh*t.">
                      dani
                    </span>
                  )}
                  {entry.color && !resolveEggSpecial(entry) && (
                    <span className="tool-entry-word-tooltip" title="This is a secret dictionary entry for a real person in our library community! 🥚">
                      egg 🥚
                    </span>
                  )}
                  {phoneticText && <span className="tool-entry-phonetic">{phoneticText}</span>}
                  {audio?.audio && (
                    <button
                      className="icon-btn"
                      title="Play pronunciation"
                      onClick={() => playAudio(audio.audio)}
                    >
                      ▶
                    </button>
                  )}
                </div>

                {(entry.meanings || []).map((meaning, mi) => (
                  <div key={mi} className="tool-meaning">
                    <h3 className="tool-meaning-pos">
                      <em>{meaning.partOfSpeech}</em>
                    </h3>

                    <ol className="tool-definition-list">
                      {(meaning.definitions || []).slice(0, 6).map((def, di) => (
                        <li key={di} className="tool-definition">
                          <p>{def.definition}</p>
                          {def.example && <p className="tool-example">“{def.example}”</p>}
                        </li>
                      ))}
                    </ol>

                    {meaning.synonyms?.length > 0 && (
                      <div className="tool-related">
                        <span className="tool-related-label">Synonyms:</span>
                        <SynonymLinks words={meaning.synonyms} />
                      </div>
                    )}
                    {meaning.antonyms?.length > 0 && (
                      <div className="tool-related">
                        <span className="tool-related-label">Antonyms:</span>
                        <SynonymLinks words={meaning.antonyms} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {!results && !loading && !error && (
        <div className="tool-empty">
          <p>Start by searching for a word above.</p>
        </div>
      )}
    </GameShell>
  )
}
