import React, { useState, useEffect, useRef } from 'react'
import { getDisplayName } from '../../lib/logbook'

/**
 * Modal prompt asking for a player name before submitting a score.
 * Resolves via onDone(name) — name may be empty if the user skipped.
 */
export default function NamePrompt({ onDone }) {
  const [name, setName] = useState(() => getDisplayName() || '')
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') onDone('')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDone])

  const submit = (e) => {
    e.preventDefault()
    onDone(name.trim())
  }

  return (
    <div className="modal" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget) onDone('') }}>
      <form className="modal-content modal-medium name-prompt" onSubmit={submit}>
        <div className="modal-header">
          <h2 className="modal-title">🏆 Submit Score</h2>
          <button type="button" className="modal-close" onClick={() => onDone('')} aria-label="Close">&times;</button>
        </div>
        <div className="modal-body">
          <label className="name-prompt-label" htmlFor="name-prompt-input">Your display name</label>
          <input
            id="name-prompt-input"
            ref={inputRef}
            type="text"
            className="form-input"
            value={name}
            maxLength={24}
            placeholder="e.g. Bookworm42"
            onChange={(e) => setName(e.target.value)}
          />
          <div className="result-actions">
            <button type="submit" className="btn btn-primary">Submit</button>
            <button type="button" className="btn btn-secondary" onClick={() => onDone('')}>Cancel</button>
          </div>
        </div>
      </form>
    </div>
  )
}
