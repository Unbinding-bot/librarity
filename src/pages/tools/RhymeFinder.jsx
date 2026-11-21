import React, { useState, useEffect, useRef, useCallback } from 'react'
import GameShell from '../../components/ui/GameShell'
import { useToast } from '../../contexts/ToastContext'

const API = 'https://api.datamuse.com/words'
const HISTORY_KEY = 'rhyme-history'
const HISTORY_MAX = 20

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

/**
 * Datamuse's CloudFront cache occasionally serves a stale object that was
 * cached before CORS was enabled (no Access-Control-Allow-Origin header),
 * which breaks fetch() from the browser. Appending a cache-buster query
 * param forces a fresh origin response that always carries the CORS header.
 */
let _cb = 0
async function datamuse(params) {
  const qs = new URLSearchParams(params)
  qs.set('cb', String(++_cb))
  const res = await fetch(`${API}?${qs.toString()}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/** Group perfect rhymes by syllable count (Datamuse returns numSyllables). */
function groupBySyllables(items) {
  const groups = {}
  for (const it of items) {
    const n = it.numSyllables || 1
    if (!groups[n]) groups[n] = []
    groups[n].push(it)
  }
  return Object.entries(groups)
    .map(([n, words]) => ({ syllables: parseInt(n), words }))
    .sort((a, b) => a.syllables - b.syllables)
}

export default function RhymeFinder() {
  const { showToast } = useToast()
  const [word, setWord] = useState('')
  const [perfect, setPerfect] = useState(null) // grouped
  const [near, setNear] = useState(null)
  const [homophones, setHomophones] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState(null)
  const [history, setHistory] = useState(() => loadHistory())

  const inputRef = useRef(null)

  const lookup = useCallback(
    async (term) => {
      const clean = term.trim().toLowerCase()
      if (!clean) return
      setWord(clean)
      setLoading(true)
      setError(null)
      setSearched(true)
      setPerfect(null)
      setNear(null)
      setHomophones(null)
      try {
        const [rhy, nry, hom] = await Promise.all([
          datamuse({ rel_rhy: clean, max: 100 }),
          datamuse({ rel_nry: clean, max: 50 }),
          datamuse({ rel_hom: clean, max: 20 }),
        ])
        setPerfect(groupBySyllables(rhy))
        setNear(nry)
        setHomophones(hom)
        setLoading(false)
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

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const ChipList = ({ items, emptyText }) => {
    if (!items) return null
    if (items.length === 0) return <p className="tool-empty-list">{emptyText}</p>
    return (
      <div className="tool-chip-row">
        {items.map((it) => (
          <button key={it.word} className="tool-chip" onClick={() => lookup(it.word)}>
            {it.word}
            {it.numSyllables != null && <small> ({it.numSyllables})</small>}
          </button>
        ))}
      </div>
    )
  }

  return (
    <GameShell
      title="Rhyme Finder"
      subtitle="Perfect rhymes, near rhymes, and homophones"
    >
      <div className="tool-search-row" data-testid="rhyme-search">
        <input
          ref={inputRef}
          className="form-input tool-search-input"
          type="text"
          value={word}
          placeholder="Find rhymes for…"
          onChange={(e) => setWord(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') lookup(word) }}
        />
        <button className="btn btn-primary" onClick={() => lookup(word)} data-testid="rhyme-search-btn">
          Find Rhymes
        </button>
      </div>

      {history.length > 0 && (
        <div className="tool-history" data-testid="rhyme-history">
          <span className="tool-history-label">Recent:</span>
          {history.slice(0, 10).map((h) => (
            <button key={h} className="tool-chip" onClick={() => lookup(h)}>{h}</button>
          ))}
        </div>
      )}

      {loading && <div className="tool-loading">Finding rhymes for “{word}”…</div>}

      {error && (
        <div className="tool-error" data-testid="rhyme-error">
          <p>{error}</p>
        </div>
      )}

      {searched && !loading && !error && (
        <div className="tool-results" data-testid="rhyme-results">
          <section className="tool-section">
            <h3 className="tool-section-title">Perfect Rhymes</h3>
            {(!perfect || perfect.length === 0) ? (
              <p className="tool-empty-list">No perfect rhymes found for “{word}”.</p>
            ) : (
              perfect.map((g) => (
                <div key={g.syllables} className="tool-rhyme-group">
                  <h4 className="tool-rhyme-syllables">
                    {g.syllables} syllable{g.syllables === 1 ? '' : 's'} ({g.words.length})
                  </h4>
                  <div className="tool-chip-row">
                    {g.words.map((w) => (
                      <button key={w.word} className="tool-chip" onClick={() => lookup(w.word)}>
                        {w.word}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </section>

          <section className="tool-section">
            <h3 className="tool-section-title">Near Rhymes</h3>
            <ChipList items={near} emptyText={`No near rhymes found for "${word}".`} />
          </section>

          <section className="tool-section">
            <h3 className="tool-section-title">Homophones</h3>
            <ChipList items={homophones} emptyText={`No homophones found for "${word}".`} />
          </section>
        </div>
      )}

      {!searched && !loading && (
        <div className="tool-empty">
          <p>Search a word to find words that rhyme with it.</p>
        </div>
      )}
    </GameShell>
  )
}
