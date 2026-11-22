import React, { useState, useEffect, useRef, useCallback } from 'react'
import GameShell from '../components/ui/GameShell'
import SkeletonLoader from '../components/ui/SkeletonLoader'
import { useToast } from '../contexts/ToastContext'
import { getAnonClient as getClient } from '../lib/supabase'
import { getUsername, setUsername, getDisplayName, addLogbookEntry, getLogbookEntries } from '../lib/logbook'

const PAGE_SIZE = 15

export default function VisitorLogbook() {
  const { showToast } = useToast()

  // identity
  const [identityName, setIdentityName] = useState(() => getUsername())
  const [showEdit, setShowEdit] = useState(false)
  const [editName, setEditName] = useState('')

  // sign form
  const [nameInput, setNameInput] = useState(() => getUsername() || '')
  const [message, setMessage] = useState('')
  const [signing, setSigning] = useState(false)

  // entries
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)

  const entriesTopRef = useRef(null)

  const loadEntries = useCallback(async () => {
    setLoading(true)
    const list = await getLogbookEntries(getClient())
    setEntries(list)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  const saveIdentity = useCallback(() => {
    setUsername(editName.trim() || null)
    setIdentityName(getUsername())
    setShowEdit(false)
    setNameInput(getUsername() || '')
    showToast(editName.trim() ? `Name set to "${editName.trim()}"` : 'Now browsing as Anonymous', 'success')
  }, [editName, showToast])

  const goAnonymous = useCallback(() => {
    setUsername(null)
    setIdentityName(null)
    setShowEdit(false)
    setNameInput('')
    showToast('Now browsing as Anonymous', 'info')
  }, [showToast])

  const handleSign = useCallback(async (e) => {
    e.preventDefault()
    const msg = message.trim()
    if (!msg) {
      showToast('Write a message first', 'warning')
      return
    }
    setSigning(true)
    await addLogbookEntry(msg, nameInput.trim() || null, getClient())
    setMessage('')
    setNameInput(getUsername() || '')
    setIdentityName(getUsername())
    setPage(0)
    await loadEntries()
    setSigning(false)
    showToast('Signed the logbook!', 'success')
    entriesTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [message, nameInput, loadEntries, showToast])

  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE))
  const visible = entries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <GameShell
      title="Visitor Logbook"
      subtitle="Sign the library's guest book, your name, date and time are recorded"
      full
    >
      {/* Visitor card: identity + sign form */}
      <div className="visitor-card" data-testid="vl-card">
        <div className="visitor-card-identity">
          <span className="vc-label">Visiting as</span>
          <span className={`vc-name${identityName ? '' : ' vc-name-anon'}`} data-testid="vl-identity">
            {identityName || 'Anonymous'}
          </span>
          <button className="vc-edit-btn" data-testid="vl-change" onClick={() => { setEditName(identityName || ''); setShowEdit((s) => !s) }}>
            Change
          </button>
        </div>
        {showEdit && (
          <div className="visitor-card-edit" data-testid="vl-edit">
            <input
              className="form-input vc-input"
              type="text"
              maxLength={40}
              placeholder="New name…"
              value={editName}
              autoFocus
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveIdentity()
                if (e.key === 'Escape') setShowEdit(false)
              }}
              data-testid="vl-edit-input"
            />
            <div className="vc-edit-actions">
              <button className="btn btn-sm btn-primary" onClick={saveIdentity} data-testid="vl-edit-save">Save</button>
              <button className="btn btn-sm btn-outline" onClick={goAnonymous} data-testid="vl-edit-anon">Go Anonymous</button>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button>
            </div>
          </div>
        )}
        <form className="visitor-card-form" onSubmit={handleSign}>
          <div className="vc-field-row">
            <input
              className="form-input vc-input"
              type="text"
              maxLength={40}
              placeholder="Your name…"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              data-testid="vl-name"
            />
            <textarea
              className="form-textarea vc-textarea"
              maxLength={280}
              rows={2}
              placeholder="Leave a message in the logbook… (max 280 chars)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              data-testid="vl-message"
            />
          </div>
          <div className="vc-form-actions">
            <span className="vc-char-count">{message.length}/280</span>
            <button className="btn btn-primary vc-sign-btn" type="submit" disabled={signing} data-testid="vl-sign">
              {signing ? 'Saving…' : 'Sign the Logbook'}
            </button>
          </div>
        </form>
      </div>

      {/* Entries */}
      <div className="logbook-entries-header" ref={entriesTopRef}>
        <span className="logbook-entry-count" data-testid="vl-count">
          {entries.length ? `${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}` : ''}
        </span>
        <button className="btn btn-sm btn-outline" onClick={loadEntries} data-testid="vl-refresh">Refresh</button>
      </div>

      {loading ? (
        <SkeletonLoader count={6} variant="list" />
      ) : entries.length === 0 ? (
        <div className="logbook-empty" data-testid="vl-empty">
          <span className="logbook-empty-icon">Logbook</span>
          <p>No entries yet, be the first to sign!</p>
        </div>
      ) : (
        <div className="logbook-entries" data-testid="vl-entries">
          {visible.map((entry, i) => (
            <article key={entry.id} className="logbook-entry" style={{ animationDelay: `${Math.min(i, PAGE_SIZE) * 35}ms` }}>
              <div className="logbook-entry-header">
                <span className="logbook-entry-name">{entry.name}</span>
                <span className="logbook-entry-date">{entry.date} · {entry.time}</span>
              </div>
              <div className="logbook-entry-msg">{entry.message}</div>
            </article>
          ))}
          {totalPages > 1 && (
            <div className="logbook-pagination">
              <button
                className="btn btn-sm btn-outline"
                disabled={page === 0}
                onClick={() => { setPage((p) => Math.max(0, p - 1)); entriesTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
                data-testid="vl-prev"
              >
                ‹ Prev
              </button>
              <span className="logbook-page-info" data-testid="vl-page-info">
                Page {page + 1} of {totalPages}
              </span>
              <button
                className="btn btn-sm btn-outline"
                disabled={page >= totalPages - 1}
                onClick={() => { setPage((p) => p + 1); entriesTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
                data-testid="vl-next"
              >
                Next ›
              </button>
            </div>
          )}
        </div>
      )}
    </GameShell>
  )
}