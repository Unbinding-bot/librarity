import React, { useEffect, useState, useCallback } from 'react'
import { getAuthClient } from '../lib/supabase'
import { fetchSiteItems, mergeSiteItems, createSiteItem, updateSiteItem, deleteSiteItem } from '../lib/siteItems'
import { GAMES, TOOLS, gameTypeLabel } from '../lib/gamesRegistry'

const EMPTY_FORM = {
  title: '',
  description: '',
  image_url: '',
  start_date: '',
  end_date: '',
  image_ratio: '', // e.g. "1080:520" — the pubmat's own aspect ratio
  image_size: '', // e.g. "1080x520" — the pubmat's display size
}

// Preset ratios for the dev/test picker. Each entry is [label, "W:H"].
const AR_PRESETS = [
  ['4:5 (portrait)', '4:5'],
  ['9:16 (phone poster)', '1080:1920'],
  ['1080:520 (pubmat)', '1080:520'],
  ['1:1 (square)', '1:1'],
  ['16:9 (widescreen)', '16:9'],
]

// Empty form state for site items (games/tools)
const EMPTY_SITE_ITEM = {
  name: '',
  description: '',
  accent: 'card-accent-green',
  section: 'games',
  position: 0,
}

// Empty form state for leaderboard rows. game_mode only accepts 'daily' or
// 'random' (DB trigger); anything else fails with "Invalid game_mode".
const EMPTY_LB_FORM = {
  game_type: 'wordle',
  game_mode: 'daily',
  player_name: '',
  score: 0,
  time_taken: '',
  date_played: '', // pre-filled to today when the form opens
}

export default function Admin() {
  const [session, setSession] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [activeTab, setActiveTab] = useState('events') // 'events' | 'leaderboard' | 'games' | 'tools'

  // login form
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)

  // events list
  const [events, setEvents] = useState([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [listError, setListError] = useState('')

  // create/edit form
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [imageFile, setImageFile] = useState(null)
  // Unsaved preview measurement of the picked/pasted image ("WxH"), used to
  // generate the 5 size choices. Not persisted — only the chosen size is.
  const [naturalSize, setNaturalSize] = useState('')

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setImageFile(null)
    setNaturalSize('')
    setFormError('')
    setShowForm(true)
  }
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // delete confirm: holds the event id pending confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  // ===== Leaderboard management state =====
  const [lbEntries, setLbEntries] = useState([])
  const [loadingLb, setLoadingLb] = useState(false)
  const [lbError, setLbError] = useState('')
  const [lbGameFilter, setLbGameFilter] = useState('all')
  const [lbConfirmDeleteId, setLbConfirmDeleteId] = useState(null)
  // create/edit form (raw rows in `leaderboards`). game_mode is limited to
  // daily/random — a DB trigger rejects every other value ("Invalid game_mode").
  const [showLbForm, setShowLbForm] = useState(false)
  const [editingLbId, setEditingLbId] = useState(null)
  const [lbForm, setLbForm] = useState(EMPTY_LB_FORM)
  const [savingLb, setSavingLb] = useState(false)
  const [lbFormError, setLbFormError] = useState('')

  // ===== Site items (games/tools) state =====
  const [siteItems, setSiteItems] = useState([])
  const [loadingSiteItems, setLoadingSiteItems] = useState(false)
  const [siteItemsError, setSiteItemsError] = useState('')
  const [showSiteForm, setShowSiteForm] = useState(false)
  const [editingSiteId, setEditingSiteId] = useState(null)
  const [siteForm, setSiteForm] = useState(EMPTY_SITE_ITEM)
  const [savingSite, setSavingSite] = useState(false)
  const [siteFormError, setSiteFormError] = useState('')
  const [siteConfirmDeleteId, setSiteConfirmDeleteId] = useState(null)

  useEffect(() => {
    const sb = getAuthClient()
    if (!sb) {
      setCheckingSession(false)
      return
    }
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setCheckingSession(false)
    })
    const { data: sub } = sb.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const loadEvents = useCallback(async () => {
    const sb = getAuthClient()
    if (!sb) return
    setLoadingEvents(true)
    setListError('')
    try {
      const { data, error } = await sb
        .from('events')
        .select('*')
        .order('start_date', { ascending: true })
      if (error) throw error
      setEvents(data || [])
    } catch (err) {
      setListError(err?.message || 'Could not load events. Has the events table been set up?')
      setEvents([])
    } finally {
      setLoadingEvents(false)
    }
  }, [])

  useEffect(() => {
    if (session) loadEvents()
  }, [session, loadEvents])

  const handleLogin = async (e) => {
    e.preventDefault()
    const sb = getAuthClient()
    if (!sb) return
    setLoggingIn(true)
    setLoginError('')
    try {
      const { error } = await sb.auth.signInWithPassword({ email, password })
      if (error) throw error
    } catch (err) {
      setLoginError(err?.message || 'Login failed')
    } finally {
      setLoggingIn(false)
    }
  }

  const handleLogout = async () => {
    const sb = getAuthClient()
    if (!sb) return
    await sb.auth.signOut()
  }

  const openEdit = (event) => {
    setEditingId(event.id)
    setForm({
      title: event.title || '',
      description: event.description || '',
      image_url: event.image_url || '',
      start_date: event.start_date || '',
      end_date: event.end_date || '',
      image_ratio: event.image_ratio || '',
      image_size: event.image_size || '',
    })
    setImageFile(null)
    setNaturalSize('')
    setFormError('')
    setShowForm(true)
  }

  const uploadImage = async (file) => {
    const sb = getAuthClient()
    if (!sb) throw new Error('Supabase unavailable')
    const ext = (file.name.split('.').pop() || 'png').toLowerCase()
    const path = `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error } = await sb.storage
      .from('event-images')
      .upload(path, file, { cacheControl: '3600', upsert: false })
    if (error) throw error
    const { data } = sb.storage.from('event-images').getPublicUrl(path)
    return data.publicUrl
  }

  const handleSave = async (e) => {
    e.preventDefault()
    const sb = getAuthClient()
    if (!sb) return
    setFormError('')

    if (!form.title.trim()) { setFormError('Title is required.'); return }
    if (!form.start_date) { setFormError('Start date is required.'); return }
    if (!form.end_date) { setFormError('End date is required.'); return }
    if (form.end_date < form.start_date) {
      setFormError('End date must be on or after the start date.')
      return
    }

    setSaving(true)
    try {
      let imageUrl = form.image_url
      if (imageFile) {
        imageUrl = await uploadImage(imageFile)
      }
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        image_url: imageUrl || '',
        start_date: form.start_date,
        end_date: form.end_date,
        image_ratio: normalizeSize(form.image_ratio) || null,
        image_size: normalizeSize(form.image_size) || null,
      }
      let error
      if (editingId) {
        ({ error } = await sb.from('events').update(payload).eq('id', editingId))
      } else {
        ({ error } = await sb.from('events').insert(payload))
      }
      if (error) throw error
      setShowForm(false)
      setEditingId(null)
      setForm(EMPTY_FORM)
      setImageFile(null)
      loadEvents()
    } catch (err) {
      setFormError(err?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    const sb = getAuthClient()
    if (!sb) return
    try {
      const { error } = await sb.from('events').delete().eq('id', id)
      if (error) throw error
    } catch (err) {
      setListError(err?.message || 'Delete failed')
    } finally {
      setConfirmDeleteId(null)
      loadEvents()
    }
  }

  // ===== Leaderboard management =====
  const loadLeaderboardEntries = useCallback(async () => {
    const sb = getAuthClient()
    if (!sb) return
    setLoadingLb(true)
    setLbError('')
    try {
      let query = sb
        .from('leaderboards')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)
      if (lbGameFilter !== 'all') query = query.eq('game_type', lbGameFilter)
      const { data, error } = await query
      if (error) throw error
      setLbEntries(data || [])
    } catch (err) {
      setLbError(err?.message || 'Could not load leaderboard entries.')
      setLbEntries([])
    } finally {
      setLoadingLb(false)
    }
  }, [lbGameFilter])

  useEffect(() => {
    if (session && activeTab === 'leaderboard') loadLeaderboardEntries()
  }, [session, activeTab, loadLeaderboardEntries])

  const handleLbDelete = async (id) => {
    const sb = getAuthClient()
    if (!sb) return
    try {
      const { error } = await sb.from('leaderboards').delete().eq('id', id)
      if (error) throw error
    } catch (err) {
      setLbError(err?.message || 'Delete failed')
    } finally {
      setLbConfirmDeleteId(null)
      loadLeaderboardEntries()
    }
  }

  const todayStr = () => new Date().toISOString().split('T')[0]

  const openLbCreate = () => {
    setEditingLbId(null)
    setLbForm({ ...EMPTY_LB_FORM, date_played: todayStr() })
    setLbFormError('')
    setShowLbForm(true)
  }

  const openLbEdit = (entry) => {
    setEditingLbId(entry.id)
    setLbForm({
      game_type: entry.game_type || 'wordle',
      game_mode: entry.game_mode || 'daily',
      player_name: entry.player_name || '',
      score: entry.score ?? 0,
      time_taken: entry.time_taken ?? '',
      date_played: entry.date_played || todayStr(),
    })
    setLbFormError('')
    setShowLbForm(true)
  }

  const handleLbSave = async (e) => {
    e.preventDefault()
    const sb = getAuthClient()
    if (!sb) return
    setLbFormError('')
    if (!lbForm.player_name.trim()) { setLbFormError('Player name is required.'); return }
    if (!lbForm.date_played) { setLbFormError('Date played is required.'); return }
    setSavingLb(true)
    try {
      const payload = {
        game_type: lbForm.game_type,
        game_mode: lbForm.game_mode,
        player_name: lbForm.player_name.trim(),
        score: parseInt(lbForm.score, 10) || 0,
        time_taken: lbForm.time_taken === '' ? null : parseInt(lbForm.time_taken, 10),
        date_played: lbForm.date_played,
      }
      let error
      if (editingLbId) {
        ({ error } = await sb.from('leaderboards').update(payload).eq('id', editingLbId))
      } else {
        ({ error } = await sb.from('leaderboards').insert(payload))
      }
      if (error) throw error
      setShowLbForm(false)
      setEditingLbId(null)
      setLbForm(EMPTY_LB_FORM)
      loadLeaderboardEntries()
    } catch (err) {
      setLbFormError(err?.message || 'Save failed')
    } finally {
      setSavingLb(false)
    }
  }

  // ===== Site items (games/tools) =====
  const loadSiteItems = useCallback(async () => {
    setLoadingSiteItems(true)
    setSiteItemsError('')
    try {
      const rows = await fetchSiteItems()
      setSiteItems(rows)
    } catch (err) {
      setSiteItemsError(err?.message || 'Could not load site items.')
      setSiteItems([])
    } finally {
      setLoadingSiteItems(false)
    }
  }, [])

  useEffect(() => {
    if (session && (activeTab === 'games' || activeTab === 'tools')) loadSiteItems()
  }, [session, activeTab, loadSiteItems])

  const openSiteCreate = (section, itemId = null) => {
    setEditingSiteId(null)
    // When overriding an existing registry entry, pre-fill the form with the
    // entry's current name/description so the admin edits what's already live
    // instead of typing from scratch.
    const reg = itemId
      ? (section === 'tools' ? TOOLS : GAMES).find((g) => g.id === itemId)
      : null
    setSiteForm({
      ...EMPTY_SITE_ITEM,
      section,
      item_id: itemId,
      name: reg ? reg.name : '',
      description: reg ? reg.description : '',
    })
    setSiteFormError('')
    setShowSiteForm(true)
  }

  const openSiteEdit = (row) => {
    setEditingSiteId(row.id)
    setSiteForm({
      name: row.name || '',
      description: row.description || '',
      accent: row.accent || 'card-accent-green',
      section: row.section,
      item_id: row.item_id || null,
      position: row.position ?? 0,
    })
    setSiteFormError('')
    setShowSiteForm(true)
  }

  const handleSiteSave = async (e) => {
    e.preventDefault()
    setSiteFormError('')
    if (!siteForm.name.trim()) { setSiteFormError('Name is required.'); return }
    setSavingSite(true)
    try {
      const payload = {
        section: siteForm.section,
        item_id: siteForm.item_id || null, // set = override of a registry entry; null = coming-soon teaser
        name: siteForm.name.trim(),
        description: siteForm.description.trim(),
        accent: siteForm.accent,
        position: Number(siteForm.position) || 0,
      }
      if (editingSiteId) {
        await updateSiteItem(editingSiteId, payload)
      } else {
        await createSiteItem(payload)
      }
      setShowSiteForm(false)
      setEditingSiteId(null)
      setSiteForm(EMPTY_SITE_ITEM)
      loadSiteItems()
    } catch (err) {
      setSiteFormError(err?.message || 'Save failed — has the site_items table been set up?')
    } finally {
      setSavingSite(false)
    }
  }

  const handleSiteDelete = async (id) => {
    try {
      await deleteSiteItem(id)
    } catch (err) {
      setSiteItemsError(err?.message || 'Delete failed')
    } finally {
      setSiteConfirmDeleteId(null)
      loadSiteItems()
    }
  }

  // ===== Render: signed out =====
  if (checkingSession) {
    return (
      <section className="page" style={pageStyles}>
        <p style={mutedStyles}>Checking session…</p>
      </section>
    )
  }

  if (!session) {
    return (
      <section className="page" style={pageStyles}>
        <div className="admin-login">
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display, "Archivo Black", sans-serif)', fontWeight: 400 }}>
            Admin Login
          </h1>
          <p style={mutedStyles}>Sign in to manage library events.</p>
          <form onSubmit={handleLogin} className="admin-login__form">
            <label className="admin-field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
              />
            </label>
            <label className="admin-field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </label>
            {loginError && <p className="admin-error" role="alert">{loginError}</p>}
            <button type="submit" className="btn btn--primary" disabled={loggingIn}>
              {loggingIn ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </section>
    )
  }

  // ===== Render: signed in =====
  const TABS = [
    { id: 'events', label: 'Events' },
    { id: 'leaderboard', label: 'Leaderboard' },
    { id: 'games', label: 'Games & Tools' },
  ]

  // The events create/edit form. Rendered inline directly below the event
  // row being edited; rendered at the bottom of the tab for new events.
  const renderEventForm = (inline) => (
    <form className={`admin-form${inline ? ' admin-form--inline' : ''}`} onSubmit={handleSave}>
      <h2 style={{ margin: 0, fontFamily: 'var(--font-display, "Archivo Black", sans-serif)', fontWeight: 400 }}>
        {editingId ? 'Edit Event' : 'New Event'}
      </h2>

      <label className="admin-field">
        <span>Title *</span>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />
      </label>

      <label className="admin-field">
        <span>Description</span>
        <textarea
          rows={4}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </label>

      <div className="admin-form__row">
        <label className="admin-field">
          <span>Start date *</span>
          <input
            type="date"
            value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            required
          />
        </label>
        <label className="admin-field">
          <span>End date *</span>
          <input
            type="date"
            value={form.end_date}
            onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            required
          />
        </label>
      </div>

      <div className="admin-field">
        <span>Event image (pubmat)</span>
        <input
          type="file"
          accept="image/*"
          onChange={async (e) => {
            const file = e.target.files?.[0] || null
            setImageFile(file)
            // Auto-detect the natural size from the picked image
            // (overridable below); the size picker derives from it.
            if (file) {
              const s = await sizeFromFile(file)
              if (s) {
                setNaturalSize(s)
                setForm((f) => ({ ...f, image_size: s }))
              }
            }
          }}
        />
        {editingId && (
          <span className="admin-field__hint">
            Leave empty to keep the current image.
          </span>
        )}
        <span className="admin-field__hint">…or paste an image URL:</span>
        <input
          type="url"
          placeholder="https://…"
          value={form.image_url}
          onChange={(e) => setForm({ ...form, image_url: e.target.value })}
        />
        {form.image_url && !imageFile && (
          <img
            src={form.image_url}
            alt="Preview"
            style={{ maxWidth: '200px', marginTop: '0.5rem', border: '2px solid var(--color-border, #000000)' }}
            onLoad={(e) => {
              const s = sizeFromImgElement(e.currentTarget)
              if (s) {
                setNaturalSize(s)
                setForm((f) => ({ ...f, image_size: f.image_size || s }))
              }
            }}
          />
        )}

        <span className="admin-field__hint">
          Image size (drives how the card is sized on the site):
        </span>
        <div className="admin-ar-picker">
          {sizeChoices(naturalSize).map((value) => {
            const parsed = parseSize(value)
            const isActual = value === form._naturalSize
            return (
              <button
                key={value}
                type="button"
                className={`admin-ar-chip${normalizeSize(form.image_size) === value ? ' admin-ar-chip--active' : ''}`}
                onClick={() => setForm({ ...form, image_size: value })}
              >
                {parsed ? `${parsed.w}×${parsed.h}` : value}
                {isActual ? ' · actual' : ''}
              </button>
            )
          })}
        </div>
        <input
          type="text"
          placeholder="custom W:H (e.g. 1080:520)"
          value={form.image_ratio}
          onChange={(e) => setForm({ ...form, image_ratio: e.target.value })}
        />
        <span className="admin-field__hint">
          Auto-filled when you upload or paste an image. Leave empty to let
          the site detect it automatically.
        </span>
      </div>

      {formError && <p className="admin-error" role="alert">{formError}</p>}

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create event'}
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => { setShowForm(false); setEditingId(null) }}
        >
          Cancel
        </button>
      </div>
    </form>
  )

  // The leaderboard create/edit form. Same inline-below-the-row pattern:
  // editing an entry renders the form right under that entry's row.
  const renderLbForm = (inline) => (
    <form className={`admin-form${inline ? ' admin-form--inline' : ''}`} onSubmit={handleLbSave}>
      <h2 style={{ margin: 0, fontFamily: 'var(--font-display, "Archivo Black", sans-serif)', fontWeight: 400 }}>
        {editingLbId ? 'Edit entry' : 'New entry'}
      </h2>

      <div className="admin-form__row">
        <label className="admin-field">
          <span>Game *</span>
          <select
            value={lbForm.game_type}
            onChange={(e) => setLbForm({ ...lbForm, game_type: e.target.value })}
          >
            {GAMES.map((g) => (
              <option key={g.scoreType} value={g.scoreType}>{g.name}</option>
            ))}
          </select>
        </label>
        <label className="admin-field">
          <span>Mode *</span>
          <select
            value={lbForm.game_mode}
            onChange={(e) => setLbForm({ ...lbForm, game_mode: e.target.value })}
          >
            <option value="daily">Daily</option>
            <option value="random">Random</option>
            {/* Games can submit other modes (trivia difficulty ids,
                flashcards "unlimited"). Keep the row's real mode selectable
                so editing doesn't silently rewrite it to daily. */}
            {!['daily', 'random'].includes(lbForm.game_mode) && lbForm.game_mode && (
              <option value={lbForm.game_mode}>{lbForm.game_mode}</option>
            )}
          </select>
        </label>
      </div>

      <label className="admin-field">
        <span>Player name *</span>
        <input
          type="text"
          value={lbForm.player_name}
          onChange={(e) => setLbForm({ ...lbForm, player_name: e.target.value })}
          required
        />
      </label>

      <div className="admin-form__row">
        <label className="admin-field">
          <span>Score *</span>
          <input
            type="number"
            value={lbForm.score}
            onChange={(e) => setLbForm({ ...lbForm, score: e.target.value })}
            required
          />
        </label>
        <label className="admin-field">
          <span>Time taken (seconds)</span>
          <input
            type="number"
            min="0"
            value={lbForm.time_taken}
            onChange={(e) => setLbForm({ ...lbForm, time_taken: e.target.value })}
            placeholder="empty if none"
          />
        </label>
        <label className="admin-field">
          <span>Date played *</span>
          <input
            type="date"
            value={lbForm.date_played}
            onChange={(e) => setLbForm({ ...lbForm, date_played: e.target.value })}
            required
          />
        </label>
      </div>

      <p className="admin-field__hint">
        Mode is limited to Daily / Random — the database rejects any
        other value. Note the leaderboard page shows best-per-player
        rows from a view; edits here update the raw row.
      </p>

      {lbFormError && <p className="admin-error" role="alert">{lbFormError}</p>}

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="submit" className="btn btn--primary" disabled={savingLb}>
          {savingLb ? 'Saving…' : editingLbId ? 'Save changes' : 'Create entry'}
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => { setShowLbForm(false); setEditingLbId(null) }}
        >
          Cancel
        </button>
      </div>
    </form>
  )

  return (
    <section className="page" style={pageStyles}>
      <div className="admin-panel">
        <div className="admin-panel__head">
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display, "Archivo Black", sans-serif)', fontWeight: 400 }}>
            Admin
          </h1>
          <button className="btn btn--ghost" onClick={handleLogout}>
            Log out
          </button>
        </div>

        {/* Tabs */}
        <div className="admin-tabs" role="tablist" aria-label="Admin sections">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`admin-tab${activeTab === tab.id ? ' admin-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ===== Events tab ===== */}
        {activeTab === 'events' && (
          <>
            <div className="admin-panel__head">
              <h2 style={{ margin: 0, fontFamily: 'var(--font-display, "Archivo Black", sans-serif)', fontWeight: 400 }}>
                Events
              </h2>
              <button className="btn btn--primary" onClick={openCreate}>
                + New Event
              </button>
            </div>

            {listError && <p className="admin-error" role="alert">{listError}</p>}

        {loadingEvents ? (
          <p style={mutedStyles}>Loading events…</p>
        ) : events.length === 0 ? (
          <p style={mutedStyles}>
            No events yet. Click "+ New Event" to add the first one.
            (If saving fails, make sure the <code>events</code> table and{' '}
            <code>event-images</code> bucket exist, see docs/supabase-setup.md.)
          </p>
        ) : (
          <div className="admin-list">
            {events.map((event) => (
              <React.Fragment key={event.id}>
              <div className="admin-list__row">
                <div className="admin-list__thumb">
                  {event.image_url ? (
                    <img src={event.image_url} alt="" />
                  ) : (
                    <span aria-hidden="true">★</span>
                  )}
                </div>
                <div className="admin-list__info">
                  <strong>{event.title}</strong>
                  <span className="admin-list__dates">
                    {event.start_date} → {event.end_date}
                  </span>
                </div>
                <div className="admin-list__actions">
                  {confirmDeleteId === event.id ? (
                    <>
                      <span className="admin-list__confirm">Delete?</span>
                      <button
                        className="btn btn--ghost admin-btn-danger"
                        onClick={() => handleDelete(event.id)}
                      >
                        Yes, delete
                      </button>
                      <button
                        className="btn btn--ghost"
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="btn btn--ghost" onClick={() => openEdit(event)}>
                        Edit
                      </button>
                      <button
                        className="btn btn--ghost admin-btn-danger"
                        onClick={() => setConfirmDeleteId(event.id)}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
              {/* Edit form renders directly below the row being edited */}
              {showForm && editingId === event.id && renderEventForm(true)}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Create form for new events (edits render inline above) */}
        {showForm && !editingId && renderEventForm()}
          </>
        )}

        {/* ===== Leaderboard tab ===== */}
        {activeTab === 'leaderboard' && (
          <>
            <div className="admin-panel__head">
              <h2 style={{ margin: 0, fontFamily: 'var(--font-display, "Archivo Black", sans-serif)', fontWeight: 400 }}>
                Leaderboard entries
              </h2>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <select
                  className="admin-field__select"
                  value={lbGameFilter}
                  onChange={(e) => setLbGameFilter(e.target.value)}
                  aria-label="Filter by game"
                >
                  <option value="all">All games</option>
                  {GAMES.map((g) => (
                    <option key={g.scoreType} value={g.scoreType}>{g.name}</option>
                  ))}
                </select>
                <button className="btn btn--ghost" onClick={loadLeaderboardEntries}>
                  Refresh
                </button>
                <button className="btn btn--primary" onClick={openLbCreate}>
                  + New entry
                </button>
              </div>
            </div>

            <p className="admin-field__hint">
              Showing the most recent 200 raw rows from the <code>leaderboards</code> table
              (one row per submitted score). Best-per-player views come from the
              {' '}<code>leaderboards_best</code> view — deleting a raw row removes the
              player's entry everywhere.
            </p>

            {lbError && <p className="admin-error" role="alert">{lbError}</p>}

            {loadingLb ? (
              <p style={mutedStyles}>Loading entries…</p>
            ) : lbEntries.length === 0 ? (
              <p style={mutedStyles}>
                No leaderboard entries{lbGameFilter !== 'all' ? ' for this game' : ''} yet.
              </p>
            ) : (
              <div className="admin-list">
                {lbEntries.map((entry) => (
                  <React.Fragment key={entry.id}>
                  <div className="admin-list__row">
                    <div className="admin-list__info">
                      <strong>{entry.player_name}</strong>
                      <span className="admin-list__dates">
                        {gameTypeLabel(entry.game_type) || entry.game_type}
                        {' · '}{entry.game_mode || '—'}
                        {' · '}score {entry.score}
                        {entry.time_taken != null ? ` · ${formatLbTime(entry.time_taken)}` : ''}
                        {' · '}{entry.date_played}
                      </span>
                    </div>
                    <div className="admin-list__actions">
                      {lbConfirmDeleteId === entry.id ? (
                        <>
                          <span className="admin-list__confirm">Delete?</span>
                          <button
                            className="btn btn--ghost admin-btn-danger"
                            onClick={() => handleLbDelete(entry.id)}
                          >
                            Yes, delete
                          </button>
                          <button
                            className="btn btn--ghost"
                            onClick={() => setLbConfirmDeleteId(null)}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="btn btn--ghost" onClick={() => openLbEdit(entry)}>
                            Edit
                          </button>
                          <button
                            className="btn btn--ghost admin-btn-danger"
                            onClick={() => setLbConfirmDeleteId(entry.id)}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {/* Edit form renders directly below the row being edited */}
                  {showLbForm && editingLbId === entry.id && renderLbForm(true)}
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* Create form for new entries (edits render inline above) */}
            {showLbForm && !editingLbId && renderLbForm()}
          </>
        )}

        {/* ===== Games & Tools tab ===== */}
        {activeTab === 'games' && (
          <GamesToolsTab
            siteItems={siteItems}
            loading={loadingSiteItems}
            error={siteItemsError}
            showForm={showSiteForm}
            editingId={editingSiteId}
            form={siteForm}
            saving={savingSite}
            formError={siteFormError}
            confirmDeleteId={siteConfirmDeleteId}
            onOpenCreate={openSiteCreate}
            onOpenEdit={openSiteEdit}
            onSave={handleSiteSave}
            onDelete={handleSiteDelete}
            onCancelForm={() => { setShowSiteForm(false); setEditingSiteId(null) }}
            onSetForm={setSiteForm}
            onSetConfirmDelete={setSiteConfirmDeleteId}
            onDismissError={() => setSiteItemsError('')}
          />
        )}
      </div>
    </section>
  )
}

const pageStyles = {
  maxWidth: 'var(--max-width, 1200px)',
  margin: '0 auto',
  padding: 'var(--space-12, 3rem) var(--space-3, 1.5rem)',
}

const mutedStyles = {
  color: 'var(--color-text-muted, #757575)',
  fontSize: '0.95rem',
}

/** Seconds → "1m 23s" (same format the leaderboard page uses). */
function formatLbTime(seconds) {
  if (seconds == null) return '-'
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

// ===== Games & Tools management (site_items CRUD) =====

const ACCENTS = [
  ['Green', 'card-accent-green'],
  ['Yellow', 'card-accent-yellow'],
  ['Pink', 'card-accent-pink'],
  ['Sky', 'card-accent-sky'],
  ['Orange', 'card-accent-orange'],
  ['Lavender', 'card-accent-lavender'],
]

/**
 * The Games & Tools tab: manage DB rows that either override registry
 * entries (name/description) or add "coming soon" teasers.
 */
function GamesToolsTab({
  siteItems, loading, error, showForm, editingId, form, saving, formError,
  confirmDeleteId, onOpenCreate, onOpenEdit, onSave, onDelete, onCancelForm,
  onSetForm, onSetConfirmDelete, onDismissError,
}) {
  const gamesItems = siteItems.filter((r) => r.section === 'games')
  const toolsItems = siteItems.filter((r) => r.section === 'tools')

  const registryFor = (section) => (section === 'tools' ? TOOLS : GAMES)

  // The site-item create/edit form. Rendered inline directly below the
  // card it targets (the edited override/teaser, or the registry entry
  // being overridden); new teaser forms render under their section head.
  const renderSiteForm = () => (
    <form className="admin-form admin-form--inline" onSubmit={onSave}>
      <h2 style={{ margin: 0, fontFamily: 'var(--font-display, "Archivo Black", sans-serif)', fontWeight: 400 }}>
        {editingId ? 'Edit site item' : 'New site item'}
      </h2>

      <label className="admin-field">
        <span>Section</span>
        <select
          value={form.section}
          onChange={(e) => onSetForm({ ...form, section: e.target.value })}
        >
          <option value="games">Games</option>
          <option value="tools">Tools</option>
        </select>
      </label>

      <label className="admin-field">
        <span>Name *</span>
        <input
          type="text"
          value={form.name}
          onChange={(e) => onSetForm({ ...form, name: e.target.value })}
          required
        />
      </label>

      <label className="admin-field">
        <span>Description</span>
        <textarea
          rows={3}
          value={form.description}
          onChange={(e) => onSetForm({ ...form, description: e.target.value })}
        />
      </label>

      <div className="admin-form__row">
        <label className="admin-field">
          <span>Accent</span>
          <select
            value={form.accent}
            onChange={(e) => onSetForm({ ...form, accent: e.target.value })}
          >
            {ACCENTS.map(([label, value]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="admin-field">
          <span>Position</span>
          <input
            type="number"
            value={form.position}
            onChange={(e) => onSetForm({ ...form, position: e.target.value })}
          />
        </label>
      </div>

      {formError && <p className="admin-error" role="alert">{formError}</p>}

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create entry'}
        </button>
        <button type="button" className="btn btn--ghost" onClick={onCancelForm}>
          Cancel
        </button>
      </div>
    </form>
  )

  return (
    <>
      <p className="admin-field__hint">
        The Games and Tools grids are built from a code registry. Here you can
        rename/re-describe an existing entry (an <strong>override</strong>) or add a
        new <strong>coming soon</strong> teaser card that links nowhere.
        Requires the <code>site_items</code> table — see docs/supabase-setup.md.
      </p>

      {error && (
        <p className="admin-error" role="alert">
          {error}{' '}
          <button type="button" className="admin-error__dismiss" onClick={onDismissError}>
            dismiss
          </button>
        </p>
      )}

      {[['Games', 'games'], ['Tools', 'tools']].map(([label, section]) => (
        <div key={section}>
          <div className="admin-panel__head">
            <h2 style={{ margin: 0, fontFamily: 'var(--font-display, "Archivo Black", sans-serif)', fontWeight: 400 }}>
              {label}
            </h2>
            <button className="btn btn--primary" onClick={() => onOpenCreate(section)}>
              + New {label.slice(0, -1)} entry
            </button>
          </div>

          {/* New teaser ("+ New entry") form renders under its section head.
              Override creates carry form.item_id and render under their
              registry card below instead — without the item_id check the
              form would appear in both places. */}
          {showForm && !editingId && !form.item_id && form.section === section && renderSiteForm()}

          {/* Overrides of registry entries, editable inline */}
          <div className="admin-site-grid">
            {registryFor(section).map((entry) => {
              const override = siteItems.find((r) => r.section === section && r.item_id === entry.id)
              return (
                <div key={entry.id} className="admin-site-card">
                  <strong>{entry.name}</strong>
                  <span className="admin-site-card__kind">
                    {override ? 'Overridden' : 'From code registry'}
                  </span>
                  <span className="admin-site-card__desc">
                    {override ? (override.name || entry.name) : entry.description}
                  </span>
                  <div className="admin-list__actions">
                    <button
                      className="btn btn--ghost"
                      onClick={() => override
                        ? onOpenEdit(override)
                        : onOpenCreate(section, entry.id)}
                    >
                      {override ? 'Edit override' : 'Add override'}
                    </button>
                    {override && (
                      <button
                        className="btn btn--ghost admin-btn-danger"
                        onClick={() => onSetConfirmDelete(override.id)}
                      >
                        Remove override
                      </button>
                    )}
                  </div>
                  {confirmDeleteId === override?.id && (
                    <div className="admin-site-card__confirm">
                      <span>Remove this override?</span>
                      <button
                        className="btn btn--ghost admin-btn-danger"
                        onClick={() => onDelete(override.id)}
                      >
                        Yes
                      </button>
                      <button
                        className="btn btn--ghost"
                        onClick={() => onSetConfirmDelete(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  {/* Add/edit-override form renders directly below its card.
                      For "Add override" the form's item_id matches the
                      registry entry; for "Edit override" the row id matches. */}
                  {showForm && (
                    (editingId === override?.id) ||
                    (!editingId && form.item_id === entry.id && form.section === section)
                  ) && renderSiteForm()}
                </div>
              )
            })}

            {/* Coming-soon entries from the DB */}
            {(section === 'games' ? gamesItems : toolsItems)
              .filter((r) => !r.item_id)
              .map((row) => (
                <div key={row.id} className="admin-site-card admin-site-card--teaser">
                  <strong>{row.name || '(unnamed)'}</strong>
                  <span className="admin-site-card__kind">Coming soon</span>
                  <span className="admin-site-card__desc">{row.description}</span>
                  <div className="admin-list__actions">
                    <button className="btn btn--ghost" onClick={() => onOpenEdit(row)}>
                      Edit
                    </button>
                    {confirmDeleteId === row.id ? (
                      <>
                        <span className="admin-list__confirm">Delete?</span>
                        <button
                          className="btn btn--ghost admin-btn-danger"
                          onClick={() => onDelete(row.id)}
                        >
                          Yes, delete
                        </button>
                        <button
                          className="btn btn--ghost"
                          onClick={() => onSetConfirmDelete(null)}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        className="btn btn--ghost admin-btn-danger"
                        onClick={() => onSetConfirmDelete(row.id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  {/* Edit form for an existing teaser renders below its card */}
                  {showForm && editingId === row.id && renderSiteForm()}
                </div>
              ))}
          </div>
        </div>
      ))}
    </>
  )
}

/** Accept "W:H", "W/H", "WxH" or "WxH" and return a normalized "WxH", or null. */
function normalizeSize(raw) {
  if (!raw) return null
  const m = String(raw).trim().match(/^(\d{1,5})\s*[:/x]\s*(\d{1,5})$/)
  if (!m) return null
  const w = parseInt(m[1], 10)
  const h = parseInt(m[2], 10)
  if (!w || !h) return null
  return `${w}x${h}`
}

/** Read the natural dimensions of a file and return "WxH" or null. */
function sizeFromFile(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img.naturalWidth && img.naturalHeight
        ? `${img.naturalWidth}x${img.naturalHeight}` : null)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    img.src = url
  })
}

/** Read the natural dimensions of an <img> element and return "WxH" or null. */
function sizeFromImgElement(imgEl) {
  if (!imgEl) return null
  const w = imgEl.naturalWidth
  const h = imgEl.naturalHeight
  return w && h ? `${w}x${h}` : null
}

/**
 * Generate the 5 size choices for a pubmat: actual, 2 smaller, 2 bigger.
 * Each keeps the image's natural aspect ratio; the scale factors are
 * 0.5 / 0.75 / 1.0 / 1.5 / 2.0. The choices therefore depend on both the
 * image's aspect ratio (shape) and its size (scale).
 */
function sizeChoices(natural) {
  const parsed = parseSize(natural)
  if (!parsed) return []
  const { w, h } = parsed
  const factors = [0.5, 0.75, 1, 1.5, 2]
  return factors.map((f) => {
    const nw = Math.max(1, Math.round(w * f))
    const nh = Math.max(1, Math.round(h * f))
    return `${nw}x${nh}`
  })
}

/** Parse "WxH" (or W:H, W/H) into {w, h} or null. */
function parseSize(raw) {
  if (!raw) return null
  const m = String(raw).trim().match(/^(\d{1,6})\s*[:/x]\s*(\d{1,6})$/)
  if (!m) return null
  const w = parseInt(m[1], 10)
  const h = parseInt(m[2], 10)
  if (!w || !h) return null
  return { w, h }
}