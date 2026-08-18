/**
 * Visitor Logbook
 *
 * Manages:
 * - Global username stored in localStorage (used by all games)
 * - Visitor log entries synced to Supabase (localStorage used as cache/fallback)
 * - Username identity bar shown at top of leaderboard page
 */

import { submitLogbookEntry as supabaseSubmit, getLogbookEntries as supabaseFetch }
    from '../api/supabase.js';

// ── Storage keys ──────────────────────────────────────────────────────────────
const USERNAME_KEY = 'library_username';
const LOGBOOK_KEY  = 'library_logbook';   // local cache
const MAX_LOCAL    = 200;

// ── Public username API ───────────────────────────────────────────────────────

/**
 * Get the stored username, or null if anonymous.
 */
export function getUsername() {
    try { return localStorage.getItem(USERNAME_KEY) || null; } catch { return null; }
}

/**
 * Set the global username. Pass null to go anonymous.
 */
export function setUsername(name) {
    try {
        if (name && name.trim()) {
            localStorage.setItem(USERNAME_KEY, name.trim().slice(0, 40));
        } else {
            localStorage.removeItem(USERNAME_KEY);
        }
    } catch {}
}

/**
 * Get display name — returns stored name or 'Anonymous'.
 */
export function getDisplayName() {
    return getUsername() || 'Anonymous';
}

/**
 * Prompt the user for a name if one isn't already saved, then return it.
 * Shows a small inline modal rather than a browser prompt().
 * Returns a Promise that resolves to the name string, or null if cancelled.
 * Also saves the name to localStorage so future submissions are instant.
 */
export function askForName() {
    return new Promise(resolve => {
        // Already have a name — resolve immediately
        const existing = getUsername();
        if (existing) { resolve(existing); return; }

        // Build a minimal modal
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position:fixed;inset:0;background:rgba(0,0,0,0.7);
            display:flex;align-items:center;justify-content:center;
            z-index:99999;padding:1rem;
        `;

        overlay.innerHTML = `
            <div style="
                background:var(--surface-color,#fff);border-radius:12px;
                padding:2rem;max-width:400px;width:100%;
                box-shadow:0 8px 32px rgba(0,0,0,0.3);
                font-family:var(--font-primary,sans-serif);
            ">
                <h2 style="margin:0 0 0.5rem;font-size:1.3rem;color:var(--primary-color,#5C6B3A);">
                    What's your name?
                </h2>
                <p style="margin:0 0 1.25rem;font-size:0.9rem;color:var(--text-secondary,#666);">
                    Your name will be saved for future score submissions.
                    You can change it anytime in the Visitor Logbook.
                </p>
                <input
                    id="_askNameInput"
                    type="text"
                    maxlength="40"
                    placeholder="Enter your name…"
                    autofocus
                    style="
                        width:100%;padding:0.65rem 0.9rem;
                        border:2px solid var(--border-color,#C8B99A);
                        border-radius:6px;font-size:1rem;
                        background:var(--bg-primary,#fff);
                        color:var(--text-color,#1a1a1a);
                        box-sizing:border-box;outline:none;
                        transition:border-color 0.2s;
                    "
                >
                <div style="display:flex;gap:0.5rem;margin-top:1rem;justify-content:flex-end;">
                    <button id="_askNameSkip" style="
                        padding:0.55rem 1.1rem;background:none;
                        border:2px solid var(--border-color,#ccc);
                        border-radius:6px;cursor:pointer;
                        font-size:0.9rem;color:var(--text-secondary,#666);
                    ">Skip</button>
                    <button id="_askNameSave" style="
                        padding:0.55rem 1.4rem;
                        background:var(--primary-color,#5C6B3A);
                        color:white;border:none;border-radius:6px;
                        cursor:pointer;font-size:0.9rem;font-weight:600;
                    ">Save & Submit</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const input   = overlay.querySelector('#_askNameInput');
        const saveBtn = overlay.querySelector('#_askNameSave');
        const skipBtn = overlay.querySelector('#_askNameSkip');

        // Focus the input
        setTimeout(() => input.focus(), 50);

        // Style focus ring
        input.addEventListener('focus', () => {
            input.style.borderColor = 'var(--primary-color,#5C6B3A)';
        });
        input.addEventListener('blur', () => {
            input.style.borderColor = 'var(--border-color,#C8B99A)';
        });

        function close(name) {
            document.body.removeChild(overlay);
            resolve(name || null);
        }

        saveBtn.addEventListener('click', () => {
            const val = input.value.trim();
            if (!val) { input.style.borderColor = '#B04030'; input.focus(); return; }
            setUsername(val);
            close(val);
        });

        skipBtn.addEventListener('click', () => close(null));

        // Enter to save
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') saveBtn.click();
            if (e.key === 'Escape') close(null);
        });

        // Click backdrop to cancel
        overlay.addEventListener('click', e => {
            if (e.target === overlay) close(null);
        });
    });
}

// ── Logbook entries API ───────────────────────────────────────────────────────

function loadLocalEntries() {
    try { return JSON.parse(localStorage.getItem(LOGBOOK_KEY) || '[]'); } catch { return []; }
}

function saveLocalEntries(entries) {
    try { localStorage.setItem(LOGBOOK_KEY, JSON.stringify(entries)); } catch {}
}

/**
 * Add a new logbook entry.
 * Saves to Supabase first, falls back to localStorage only.
 * @param {string} message
 * @param {string|null} nameOverride  - if provided, also updates the stored username
 * @returns {Promise<Array>} updated entries list
 */
export async function addLogbookEntry(message, nameOverride = null) {
    if (nameOverride) setUsername(nameOverride);
    const name = getDisplayName();
    const now  = new Date();

    const entry = {
        id:      crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
        name,
        message: message.trim().slice(0, 280),
        date:    now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
        time:    now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        ts:      now.toISOString(),
    };

    // Always write to localStorage immediately (optimistic)
    const local = loadLocalEntries();
    local.unshift(entry);
    if (local.length > MAX_LOCAL) local.splice(MAX_LOCAL);
    saveLocalEntries(local);

    // Also try Supabase — silently swallow errors so the UI never breaks
    try {
        await supabaseSubmit({ name: entry.name, message: entry.message });
    } catch (err) {
        console.warn('Logbook: could not save to Supabase, kept locally.', err.message);
    }

    return local;
}

/**
 * Get logbook entries.
 * Tries Supabase first, falls back to localStorage cache.
 * @returns {Promise<Array>}
 */
export async function getLogbookEntries() {
    try {
        const rows = await supabaseFetch({ limit: 200 });
        if (rows && rows.length > 0) {
            // Normalise Supabase rows into the same shape the UI expects
            const normalised = rows.map(r => {
                const d = new Date(r.created_at);
                return {
                    id:      r.id,
                    name:    r.name,
                    message: r.message,
                    date:    d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
                    time:    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                    ts:      r.created_at,
                };
            });
            // Keep local cache in sync
            saveLocalEntries(normalised);
            return normalised;
        }
    } catch (err) {
        console.warn('Logbook: could not fetch from Supabase, using local cache.', err.message);
    }
    // Fallback — whatever is in localStorage
    return loadLocalEntries();
}

// ── UI Component ─────────────────────────────────────────────────────────────

export class VisitorLogbook {
    /**
     * @param {string} containerId  - ID of element to render into
     */
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.warn(`VisitorLogbook: container #${containerId} not found`);
            return;
        }
        this.render();
    }

    render() {
        this.container.innerHTML = `
            <!-- Identity bar -->
            <section class="logbook-identity" id="logbookIdentity">
                <div class="identity-inner">
                    <span class="identity-label">You are visiting as:</span>
                    <span class="identity-name" id="identityName"></span>
                    <button class="identity-change-btn" id="identityChangeBtn">✏️ Change name</button>
                </div>

                <div class="identity-edit-form" id="identityEditForm" style="display:none;">
                    <input
                        type="text"
                        id="identityInput"
                        class="logbook-input"
                        maxlength="40"
                        placeholder="Your name (leave blank to stay Anonymous)"
                        autocomplete="nickname"
                    >
                    <div class="identity-edit-actions">
                        <button class="lb-btn lb-btn-primary" id="identitySaveBtn">Save</button>
                        <button class="lb-btn lb-btn-secondary" id="identityCancelBtn">Cancel</button>
                        <button class="lb-btn lb-btn-danger"   id="identityClearBtn">Go Anonymous</button>
                    </div>
                </div>
            </section>

            <!-- Logbook write section -->
            <section class="logbook-write">
                <h2 class="logbook-heading">📖 Visitor Logbook</h2>
                <p class="logbook-subheading">
                    Leave a message! Your name, date and time will be recorded.
                </p>

                <form class="logbook-form" id="logbookForm">
                    <div class="logbook-form-name-row">
                        <label for="logbookNameInput">Name:</label>
                        <input
                            type="text"
                            id="logbookNameInput"
                            class="logbook-input logbook-input-name"
                            maxlength="40"
                            placeholder="Your name (optional, updates your saved name)"
                        >
                    </div>
                    <div class="logbook-form-msg-row">
                        <label for="logbookMessage">Message:</label>
                        <textarea
                            id="logbookMessage"
                            class="logbook-textarea"
                            maxlength="280"
                            rows="3"
                            placeholder="Say something! (max 280 chars)"
                        ></textarea>
                        <div class="logbook-char-count"><span id="logbookCharCount">0</span> / 280</div>
                    </div>
                    <button type="submit" class="lb-btn lb-btn-primary lb-btn-sign">✍️ Sign the logbook</button>
                </form>
            </section>

            <!-- Logbook entries -->
            <section class="logbook-entries-section">
                <div class="logbook-entries-header">
                    <span id="logbookEntryCount" class="logbook-entry-count"></span>
                    <button class="lb-btn lb-btn-ghost" id="logbookRefreshBtn">🔄 Refresh</button>
                </div>
                <div class="logbook-entries" id="logbookEntries">
                    <!-- entries injected here -->
                </div>
                <div class="logbook-more" id="logbookMore" style="display:none;">
                    <button class="lb-btn lb-btn-secondary" id="logbookLoadMore">Load more entries</button>
                </div>
            </section>
        `;

        this._page = 0;
        this._pageSize = 20;
        this._attachEvents();
        this._refreshIdentityBar();
        this._renderEntries(true);
    }

    // ── Events ──────────────────────────────────────────────────────────────

    _attachEvents() {
        // Identity bar
        this.container.querySelector('#identityChangeBtn').addEventListener('click', () => this._showEdit());
        this.container.querySelector('#identitySaveBtn').addEventListener('click',   () => this._saveIdentity());
        this.container.querySelector('#identityCancelBtn').addEventListener('click', () => this._hideEdit());
        this.container.querySelector('#identityClearBtn').addEventListener('click',  () => {
            setUsername(null);
            this._hideEdit();
            this._refreshIdentityBar();
            this._prefillName();
        });
        this.container.querySelector('#identityInput').addEventListener('keydown', e => {
            if (e.key === 'Enter') this._saveIdentity();
            if (e.key === 'Escape') this._hideEdit();
        });

        // Logbook form
        const form    = this.container.querySelector('#logbookForm');
        const msgArea = this.container.querySelector('#logbookMessage');
        const counter = this.container.querySelector('#logbookCharCount');

        msgArea.addEventListener('input', () => {
            counter.textContent = msgArea.value.length;
        });

        form.addEventListener('submit', e => {
            e.preventDefault();
            this._submitEntry();
        });

        // Refresh / load more
        this.container.querySelector('#logbookRefreshBtn').addEventListener('click', () => {
            this._page = 0;
            this._renderEntries(true);
        });
        this.container.querySelector('#logbookLoadMore').addEventListener('click', () => {
            this._page++;
            this._renderEntries(false);
        });
    }

    // ── Identity ────────────────────────────────────────────────────────────

    _refreshIdentityBar() {
        const nameEl = this.container.querySelector('#identityName');
        const name   = getUsername();
        if (name) {
            nameEl.textContent   = name;
            nameEl.classList.remove('identity-anon');
        } else {
            nameEl.textContent = 'Anonymous';
            nameEl.classList.add('identity-anon');
        }
    }

    _prefillName() {
        const nameInput = this.container.querySelector('#logbookNameInput');
        if (nameInput) nameInput.value = getUsername() || '';
    }

    _showEdit() {
        const form  = this.container.querySelector('#identityEditForm');
        const input = this.container.querySelector('#identityInput');
        form.style.display = 'block';
        input.value = getUsername() || '';
        input.focus();
        input.select();
    }

    _hideEdit() {
        this.container.querySelector('#identityEditForm').style.display = 'none';
    }

    _saveIdentity() {
        const val = this.container.querySelector('#identityInput').value.trim();
        setUsername(val || null);
        this._hideEdit();
        this._refreshIdentityBar();
        this._prefillName();
    }

    // ── Form submit ─────────────────────────────────────────────────────────

    _submitEntry() {
        const nameInput = this.container.querySelector('#logbookNameInput');
        const msgArea   = this.container.querySelector('#logbookMessage');
        const message   = msgArea.value.trim();

        if (!message) {
            msgArea.focus();
            msgArea.classList.add('logbook-input-error');
            setTimeout(() => msgArea.classList.remove('logbook-input-error'), 800);
            return;
        }

        const nameOverride = nameInput.value.trim() || null;
        addLogbookEntry(message, nameOverride);

        // Reset form
        msgArea.value   = '';
        nameInput.value = getUsername() || '';
        this.container.querySelector('#logbookCharCount').textContent = '0';

        // Refresh UI
        this._refreshIdentityBar();
        this._page = 0;
        this._renderEntries(true);

        // Scroll to entries
        this.container.querySelector('#logbookEntries').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // ── Entries render ───────────────────────────────────────────────────────

    _renderEntries(reset) {
        const entries    = getLogbookEntries();
        const container  = this.container.querySelector('#logbookEntries');
        const countEl    = this.container.querySelector('#logbookEntryCount');
        const moreBtn    = this.container.querySelector('#logbookMore');

        countEl.textContent = entries.length
            ? `${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}`
            : '';

        const end     = (this._page + 1) * this._pageSize;
        const visible = entries.slice(0, end);

        if (reset) container.innerHTML = '';

        if (!entries.length) {
            container.innerHTML = `
                <div class="logbook-empty">
                    <span class="logbook-empty-icon">📜</span>
                    <p>No entries yet. Be the first to sign the logbook!</p>
                </div>`;
            moreBtn.style.display = 'none';
            return;
        }

        // Append only new entries when loading more
        const startIdx = reset ? 0 : this._page * this._pageSize;
        const newEntries = entries.slice(startIdx, end);

        newEntries.forEach((entry, i) => {
            const card = document.createElement('article');
            card.className = 'logbook-entry';
            card.style.animationDelay = `${i * 40}ms`;
            card.innerHTML = `
                <div class="logbook-entry-header">
                    <span class="logbook-entry-name">${this._escape(entry.name)}</span>
                    <span class="logbook-entry-date">${entry.date} at ${entry.time}</span>
                </div>
                <div class="logbook-entry-msg">${this._escape(entry.message)}</div>
            `;
            container.appendChild(card);
        });

        moreBtn.style.display = end < entries.length ? 'block' : 'none';

        // Pre-fill the name input with stored name
        this._prefillName();
    }

    _escape(str) {
        return String(str)
            .replace(/&/g,'&amp;')
            .replace(/</g,'&lt;')
            .replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;')
            .replace(/\n/g,'<br>');
    }
}
