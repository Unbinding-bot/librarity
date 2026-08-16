/**
 * theme-toggle.js
 * Drop this as a <script> on any game page.
 * Reads/writes localStorage key "theme", sets data-theme on <html>,
 * and keeps the navbar toggle button in sync.
 * No imports needed — plain vanilla JS, runs immediately.
 */

(function () {
    // ── Helpers ──────────────────────────────────────────────────────────────

    function getStored() {
        try { return localStorage.getItem('theme'); } catch { return null; }
    }

    function store(theme) {
        try { localStorage.setItem('theme', theme); } catch {}
    }

    function prefersDark() {
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    function apply(theme) {
        document.documentElement.setAttribute('data-theme', theme);

        // Update every toggle button on the page (navbar may have one, floating has another)
        document.querySelectorAll('.theme-toggle').forEach(btn => {
            const icon = btn.querySelector('.theme-icon');
            if (icon) {
                icon.textContent = theme === 'dark' ? '🌙' : '☀️';
            } else {
                btn.textContent = theme === 'dark' ? '🌙' : '☀️';
            }
            btn.setAttribute('aria-label', theme === 'dark' ? 'Dark mode' : 'Light mode');
            btn.setAttribute('title',      theme === 'dark' ? 'Dark mode' : 'Light mode');
        });
    }

    function toggle() {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        store(next);
        apply(next);
    }

    // ── Init ─────────────────────────────────────────────────────────────────

    // Apply theme immediately (before paint) to avoid flash
    const initial = getStored() || (prefersDark() ? 'dark' : 'light');
    apply(initial);

    // Wire up all .theme-toggle buttons as soon as DOM is ready
    function wireButtons() {
        document.querySelectorAll('.theme-toggle').forEach(btn => {
            // Remove any existing listener to avoid duplicates
            btn.removeEventListener('click', toggle);
            btn.addEventListener('click', toggle);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', wireButtons);
    } else {
        wireButtons();
    }

    // Re-apply icon state after DOMContentLoaded (buttons may have been
    // rendered with a hardcoded 🌙 in HTML; we correct them here)
    document.addEventListener('DOMContentLoaded', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        apply(current);
        wireButtons();
    });

    // Expose globally so game scripts can call window.toggleTheme() if needed
    window.toggleTheme = toggle;
    window.applyTheme  = apply;
})();
