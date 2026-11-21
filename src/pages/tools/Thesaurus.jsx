import React, { useState, useEffect, useRef, useCallback } from 'react'
import GameShell from '../../components/ui/GameShell'
import { useToast } from '../../contexts/ToastContext'

const API = 'https://api.datamuse.com/words'
const HISTORY_KEY = 'thesaurus-history'
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

export default function Thesaurus() {
  const { showToast } = useToast()
  const [word, setWord] = useState('')
  const [tab, setTab] = useState('synonyms') // synonyms | antonyms | related
  const [synonyms, setSynonyms] = useState(null)
  const [antonyms, setAntonyms] = useState(null)
  const [related, setRelated] = useState(null)
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
      setSynonyms(null)
      setAntonyms(null)
      setRelated(null)
      try {
        const [syn, ant, means] = await Promise.all([
          datamuse({ rel_syn: clean, max: 20 }),
          datamuse({ rel_ant: clean, max: 20 }),
          datamuse({ ml: clean, max: 20 }),
        ])
        setSynonyms(syn)
        setAntonyms(ant)
        setRelated(means)
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

  const WordList = ({ items, emptyText }) => {
    if (!items) return null
    if (items.length === 0) {
      return <p className="tool-empty-list">{emptyText}</p>
    }
    return (
      <div className="tool-chip-row">
        {items.map((it) => (
          <button key={it.word} className="tool-chip" onClick={() => lookup(it.word)}>
            {it.word}
            {it.score != null && it.tab !== 'related' && <small> ({(it.score / 1000).toFixed(1)})</small>}
          </button>
        ))}
      </div>
    )
  }

  return (
    <GameShell
      title="Thesaurus"
      subtitle="Synonyms, antonyms, and related words"
    >
      <div className="tool-search-row" data-testid="thes-search">
        <input
          ref={inputRef}
          className="form-input tool-search-input"
          type="text"
          value={word}
          placeholder="Search a word…"
          onChange={(e) => setWord(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') lookup(word) }}
        />
        <button className="btn btn-primary" onClick={() => lookup(word)} data-testid="thes-search-btn">
          Search
        </button>
      </div>

      {history.length > 0 && (
        <div className="tool-history" data-testid="thes-history">
          <span className="tool-history-label">Recent:</span>
          {history.slice(0, 10).map((h) => (
            <button key={h} className="tool-chip" onClick={() => lookup(h)}>{h}</button>
          ))}
        </div>
      )}

      {loading && <div className="tool-loading">Looking up “{word}”…</div>}

      {error && (
        <div className="tool-error" data-testid="thes-error">
          <p>{error}</p>
        </div>
      )}

      {searched && !loading && !error && (
        <div className="tool-results" data-testid="thes-results">
          <div className="tool-tabs">
            <button className={`tool-tab${tab === 'synonyms' ? ' active' : ''}`} onClick={() => setTab('synonyms')}>
              Synonyms {synonyms ? `(${synonyms.length})` : ''}
            </button>
            <button className={`tool-tab${tab === 'antonyms' ? ' active' : ''}`} onClick={() => setTab('antonyms')}>
              Antonyms {antonyms ? `(${antonyms.length})` : ''}
            </button>
            <button className={`tool-tab${tab === 'related' ? ' active' : ''}`} onClick={() => setTab('related')}>
              Related {related ? `(${related.length})` : ''}
            </button>
          </div>

          {tab === 'synonyms' && <WordList items={synonyms} emptyText={`No synonyms found for "${word}".`} />}
          {tab === 'antonyms' && <WordList items={antonyms} emptyText={`No antonyms found for "${word}".`} />}
          {tab === 'related' && <WordList items={related} emptyText={`No related words found for "${word}".`} />}
        </div>
      )}

      {!searched && !loading && (
        <div className="tool-empty">
          <p>Search a word to find synonyms, antonyms, and related terms.</p>
        </div>
      )}
    </GameShell>
  )
}
