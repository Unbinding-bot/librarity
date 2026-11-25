import React, { useState, useEffect } from 'react'
import { getDisplayName, setUsername } from '../../lib/logbook'

/**
 * NamePrompt — score-submission name modal.
 * onDone(name) resolves with the trimmed name (or '' to cancel).
 * A submitted (non-empty) name is remembered as the display name,
 * so the logbook and future score prompts pre-fill it.
 */
export default function NamePrompt({ onDone }) {
  const [name, setName] = useState(getDisplayName() === 'Anonymous' ? '' : getDisplayName())

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onDone('')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDone])

  const submit = () => {
    const trimmed = name.trim()
    if (trimmed) setUsername(trimmed)
    // Submitting with empty name = Anonymous = onDone('')
    onDone(trimmed)
  }

  return (
    <div className="modal name-prompt-modal" onClick={(e) => { if (e.target === e.currentTarget) onDone('') }}>
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">Submit Your Score</h2>
          <button className="modal-close" onClick={() => onDone('')} aria-label="Close">×</button>
        </div>
        <div className="modal-body">
          <p style={{ marginBottom: '1rem' }}>Enter your name to submit this score to the leaderboard:</p>
          <input
            className="form-input"
            type="text"
            value={name}
            maxLength={40}
            placeholder="Your name (or leave blank for Anonymous)"
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
            }}
          />
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
            <button className="btn btn-primary" onClick={submit}>
              Submit
            </button>
            <button className="btn btn-outline" onClick={() => setName('')}>
              Clear
            </button>
            <button className="btn btn-outline" onClick={() => onDone('')}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}