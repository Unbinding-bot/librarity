// Wikipedia Race Game
import { showToast } from '../main.js';
import ModalSystem from '../components/modal-system.js';
import { getDisplayName } from '../components/visitor-logbook.js';
import { lockSubmitButtons, resetSubmitButtons } from '../utils/submit-lock.js';

// ── Built-in challenges (all titles verified as real Wikipedia articles) ─────
const CHALLENGES = [
    // Easy — short, obvious connections
    { start: 'Dog',             target: 'Piano',             difficulty: 'easy' },
    { start: 'Moon',            target: 'Coffee',            difficulty: 'easy' },
    { start: 'Cat',             target: 'Internet',          difficulty: 'easy' },
    { start: 'Apple',           target: 'Association football', difficulty: 'easy' },
    { start: 'Rain',            target: 'Library',           difficulty: 'easy' },
    { start: 'Sun',             target: 'Book',              difficulty: 'easy' },
    // Medium
    { start: 'Albert Einstein', target: 'Pizza',             difficulty: 'medium' },
    { start: 'Ancient Egypt',   target: 'Basketball',        difficulty: 'medium' },
    { start: 'Volcano',         target: 'Jazz',              difficulty: 'medium' },
    { start: 'Shark',           target: 'Democracy',         difficulty: 'medium' },
    { start: 'Chocolate',       target: 'Olympic Games',     difficulty: 'medium' },
    { start: 'Dinosaur',        target: 'Photography',       difficulty: 'medium' },
    { start: 'Ocean',           target: 'Radio',             difficulty: 'medium' },
    { start: 'Bicycle',         target: 'William Shakespeare', difficulty: 'medium' },
    // Hard
    { start: 'Leonardo da Vinci', target: 'Computer',        difficulty: 'hard' },
    { start: 'William Shakespeare', target: 'Antarctica',    difficulty: 'hard' },
    { start: 'Aristotle',       target: 'Baseball',          difficulty: 'hard' },
    { start: 'Genghis Khan',    target: 'Telephone',         difficulty: 'hard' },
    { start: 'Byzantine Empire', target: 'Cinema of the United States', difficulty: 'hard' },
    { start: 'Plato',           target: 'Steam engine',      difficulty: 'hard' },
    { start: 'Middle Ages',     target: 'Nuclear power',     difficulty: 'hard' },
    { start: 'Cleopatra',       target: 'Saxophone',         difficulty: 'hard' },
];

function getDailyChallenge() {
    const start = new Date('2024-01-01');
    const today = new Date();
    const day   = Math.floor((today - start) / 86400000);
    return CHALLENGES[day % CHALLENGES.length];
}

async function fetchRandomArticleTitle() {
    const url = 'https://en.wikipedia.org/w/api.php?' + new URLSearchParams({
        action:      'query',
        list:        'random',
        rnnamespace: '0',
        rnlimit:     '1',
        format:      'json',
        origin:      '*',
    });
    const res  = await fetch(url);
    const data = await res.json();
    return data.query.random[0].title;
}

class WikipediaRace {
    constructor() {
        this.currentChallenge = null;
        this.mode             = 'daily';
        this.path             = [];
        this.clickCount       = 0;
        this.hintsUsed        = 0;
        this.startTime        = null;
        this.timerInterval    = null;
        this.allLinks         = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        // Auto-switch away from daily if already played today
        if (this.mode === 'daily' && this.hasPlayedDaily()) {
            this.mode = 'random';
        }
        this.renderModeUI();
        this.hideLoading();
    }

    hideLoading() {
        const ls = document.getElementById('loadingScreen');
        if (ls) ls.style.display = 'none';
    }

    setupEventListeners() {
        document.querySelectorAll('.mode-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.mode = tab.dataset.mode;
                document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.renderModeUI();
            });
        });

        document.getElementById('startDailyBtn')?.addEventListener('click', () => this.launchDaily());
        document.getElementById('startRandomBtn')?.addEventListener('click', () => this.launchRandom());
        document.getElementById('startRandomCustomBtn')?.addEventListener('click', () => this.launchRandomCustom());
        document.getElementById('startCustomBtn')?.addEventListener('click', () => this.launchCustom());

        document.getElementById('challengesGrid').addEventListener('click', e => {
            const card = e.target.closest('.challenge-card[data-index]');
            if (card) this.startChallenge(CHALLENGES[+card.dataset.index]);
        });

        document.getElementById('helpBtn').addEventListener('click', () => ModalSystem.showModal('helpModal'));
        document.getElementById('statsBtn').addEventListener('click', () => this.showStats());

        document.getElementById('quitBtn').addEventListener('click', () => this.quitGame());
        document.getElementById('showLinksBtn').addEventListener('click', () => this.showLinks());
        document.getElementById('hintBtn').addEventListener('click', () => this.showHint());

        document.getElementById('shareResultBtn').addEventListener('click', () => this.shareResult());
        document.getElementById('submitScoreBtn')?.addEventListener('click', () => this.submitScoreManual());
        document.getElementById('playAgainBtn').addEventListener('click', () => this.reset());
        document.getElementById('resultClose')?.addEventListener('click', () => {
            this.reset();
        });

        // Action bar
        document.getElementById('actionBarShareBtn')?.addEventListener('click', () => this.shareResult());
        document.getElementById('actionBarPlayAgainBtn')?.addEventListener('click', () => {
            this.hideActionBar();
            this.reset();
        });
        document.getElementById('actionBarRestartBtn')?.addEventListener('click', () => {
            if (confirm('Start a new race? Progress will be lost.')) {
                this.hideActionBar();
                this.reset();
            }
        });

        document.getElementById('linkSearch').addEventListener('input', e => this.filterLinks(e.target.value));

        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => ModalSystem.closeModal(btn.dataset.modal));
        });
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', e => {
                if (e.target === modal) ModalSystem.closeModal(modal.id);
            });
        });
    }

    renderModeUI() {
        ['dailyPanel','randomPanel','randomCustomPanel','customPanel'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        if (this.mode === 'daily') {
            const panel = document.getElementById('dailyPanel');
            if (panel) panel.style.display = 'block';
            const dc = getDailyChallenge();
            const el = document.getElementById('dailyChallengeInfo');
            if (el) {
                const played = this.hasPlayedDaily();
                el.innerHTML = `
                    <div class="daily-route">
                        <span class="route-from">${this.escapeHtml(dc.start)}</span>
                        <span class="challenge-arrow">→</span>
                        <span class="route-to">${this.escapeHtml(dc.target)}</span>
                    </div>
                    <span class="challenge-difficulty ${dc.difficulty}">${dc.difficulty}</span>
                    ${played ? '<p class="already-played">✓ Already played today! Playing again in practice mode.</p>' : ''}
                `;
            }
        } else if (this.mode === 'random') {
            const panel = document.getElementById('randomPanel');
            if (panel) panel.style.display = 'block';
        } else if (this.mode === 'random-custom') {
            const panel = document.getElementById('randomCustomPanel');
            if (panel) panel.style.display = 'block';
        } else if (this.mode === 'custom') {
            const panel = document.getElementById('customPanel');
            if (panel) panel.style.display = 'block';
            this.renderChallenges();
        }
    }

    renderChallenges() {
        const grid    = document.getElementById('challengesGrid');
        const history = this.loadStatsData().history || [];
        grid.innerHTML = CHALLENGES.map((c, i) => {
            const done = history.some(h => h.start === c.start && h.target === c.target);
            return `
                <div class="challenge-card" data-index="${i}">
                    <div class="challenge-route">
                        <span class="route-from">${this.escapeHtml(c.start)}</span>
                        <span class="challenge-arrow">→</span>
                        <span class="route-to">${this.escapeHtml(c.target)}</span>
                    </div>
                    <div class="challenge-meta">
                        <span class="challenge-difficulty ${c.difficulty}">${c.difficulty}</span>
                        ${done ? '<span class="challenge-done">✓ Done</span>' : ''}
                    </div>
                </div>`;
        }).join('');
    }

    launchDaily() {
        if (this.hasPlayedDaily()) {
            showToast("You've already completed today's race! Come back tomorrow.", 'info');
            // Auto-switch to random tab
            this.mode = 'random';
            document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
            document.querySelector('.mode-tab[data-mode="random"]')?.classList.add('active');
            this.renderModeUI();
            return;
        }
        this.currentChallenge = { ...getDailyChallenge(), isDaily: true };
        this.startGame();
    }

    async launchRandom() {
        const btn = document.getElementById('startRandomBtn');
        btn.disabled = true;
        btn.textContent = '⏳ Finding articles…';
        try {
            const [start, target] = await Promise.all([fetchRandomArticleTitle(), fetchRandomArticleTitle()]);
            this.currentChallenge = { start, target, difficulty: 'random', isRandom: true };
            this.startGame();
        } catch {
            showToast('Could not fetch random articles. Check your connection.', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = '🎲 Start Random Race';
        }
    }

    async launchRandomCustom() {
        const startFixed = document.getElementById('rcStartFixed').checked;
        const inputVal   = document.getElementById('rcInput').value.trim();
        const btn        = document.getElementById('startRandomCustomBtn');
        if (!inputVal) { showToast('Please enter an article title', 'error'); return; }
        btn.disabled = true;
        btn.textContent = '⏳ Finding random article…';
        try {
            const randomTitle = await fetchRandomArticleTitle();
            const start  = startFixed ? inputVal    : randomTitle;
            const target = startFixed ? randomTitle : inputVal;
            this.currentChallenge = { start, target, difficulty: 'custom', isRandomCustom: true };
            this.startGame();
        } catch {
            showToast('Could not fetch a random article.', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = '🚀 Start Race';
        }
    }

    launchCustom() {
        const start  = document.getElementById('customStart').value.trim();
        const target = document.getElementById('customTarget').value.trim();
        if (!start || !target) { showToast('Please enter both articles', 'error'); return; }
        this.currentChallenge = { start, target, difficulty: 'custom' };
        this.startGame();
    }

    startChallenge(challenge) {
        this.currentChallenge = { ...challenge };
        this.startGame();
    }

    startGame() {
        this.path       = [this.currentChallenge.start];
        this.clickCount = 0;
        this.hintsUsed  = 0;
        this.startTime  = Date.now();
        this.allLinks   = [];

        document.getElementById('setupScreen').style.display   = 'none';
        document.getElementById('resultsScreen').style.display = 'none';
        document.getElementById('gameScreen').style.display    = 'block';

        document.getElementById('routeStart').textContent  = this.currentChallenge.start;
        document.getElementById('routeTarget').textContent = this.currentChallenge.target;
        document.getElementById('clickCount').textContent  = '0';
        document.getElementById('timerValue').textContent  = '0:00';
        document.getElementById('hintDisplay').style.display = 'none';

        this.startTimer();
        this.loadArticle(this.currentChallenge.start);
        this.updateBreadcrumb();
    }

    async loadArticle(title) {
        const content = document.getElementById('articleContent');
        const titleEl = document.getElementById('articleTitle');
        content.innerHTML = `<p class="loading-message">⏳ Loading <em>${this.escapeHtml(title)}</em>…</p>`;
        titleEl.textContent = 'Loading…';

        try {
            const parseUrl = 'https://en.wikipedia.org/w/api.php?' + new URLSearchParams({
                action:    'parse',
                page:      title,
                prop:      'text|links',
                redirects: '1',
                format:    'json',
                origin:    '*',
            });

            const res  = await fetch(parseUrl);
            const data = await res.json();
            if (data.error) throw new Error(data.error.info || 'Article not found');

            const parsed      = data.parse;
            const actualTitle = parsed.title;
            titleEl.textContent = actualTitle;

            this.allLinks = (parsed.links || [])
                .filter(l => l.ns === 0 && l.exists !== undefined)
                .map(l => l['*'])
                .filter(Boolean);

            const wrapper = document.createElement('div');
            wrapper.innerHTML = parsed.text['*'];

            // Remove noisy elements
            wrapper.querySelectorAll(
                '.mw-editsection,.navbox,.navbox-inner,.refbegin,.mw-references-wrap,' +
                '#toc,.hatnote,.ambox,.sistersitebox,.side-box,style,script'
            ).forEach(el => el.remove());

            // Strip inline color styles that break dark mode
            wrapper.querySelectorAll('[style]').forEach(el => {
                const cleaned = (el.getAttribute('style') || '')
                    .split(';')
                    .filter(s => {
                        const prop = s.split(':')[0].trim().toLowerCase();
                        return !['color','background','background-color','border-color'].includes(prop);
                    })
                    .join(';');
                cleaned.trim() ? el.setAttribute('style', cleaned) : el.removeAttribute('style');
            });

            // Strip bgcolor/color attributes
            wrapper.querySelectorAll('[bgcolor],[color]').forEach(el => {
                el.removeAttribute('bgcolor');
                el.removeAttribute('color');
            });

            // Make images responsive, remove cookie-triggering src
            wrapper.querySelectorAll('img').forEach(img => {
                img.style.maxWidth = '100%';
                img.style.height   = 'auto';
                img.setAttribute('crossorigin', 'anonymous');
                // Replace //upload.wikimedia.org paths with https
                const src = img.getAttribute('src') || '';
                if (src.startsWith('//')) img.setAttribute('src', 'https:' + src);
            });

            // Wrap tables for horizontal scroll
            wrapper.querySelectorAll('table').forEach(table => {
                const wrap = document.createElement('div');
                wrap.className = 'table-scroll-wrapper';
                table.parentNode.insertBefore(wrap, table);
                wrap.appendChild(table);
            });

            // Intercept links
            wrapper.querySelectorAll('a[href]').forEach(a => {
                const href = a.getAttribute('href') || '';
                if (href.startsWith('/wiki/') && !href.includes(':')) {
                    a.setAttribute('href', '#');
                    a.dataset.article = decodeURIComponent(href.slice(6).replace(/_/g, ' '));
                    a.classList.add('wiki-link');
                } else {
                    a.removeAttribute('href');
                    a.classList.add('wiki-link-disabled');
                }
            });

            content.innerHTML = '';
            content.appendChild(wrapper);

            const note = document.createElement('p');
            note.className = 'article-source-note';
            note.innerHTML = `<small>📖 <a href="https://en.wikipedia.org/wiki/${encodeURIComponent(actualTitle)}" target="_blank" rel="noopener noreferrer">View on Wikipedia: ${this.escapeHtml(actualTitle)}</a></small>`;
            content.appendChild(note);

            this.attachLinkListeners();

            // Check for completion — handle Wikipedia redirects gracefully
            // e.g. target "Shakespeare" should match actualTitle "William Shakespeare"
            const targetLow = this.currentChallenge.target.toLowerCase();
            const titleLow  = actualTitle.toLowerCase();
            const isMatch   = titleLow === targetLow
                           || titleLow.includes(targetLow)
                           || targetLow.includes(titleLow);

            if (isMatch) {
                // Update path to use the real resolved title
                if (this.path.length > 0 && this.path[this.path.length - 1].toLowerCase() !== titleLow) {
                    this.path[this.path.length - 1] = actualTitle;
                    this.updateBreadcrumb();
                }
                setTimeout(() => this.completeChallenge(), 300);
            }
        } catch (err) {
            console.error('Wikipedia fetch error:', err);
            content.innerHTML = `
                <div class="article-error">
                    <p>⚠️ Could not load <strong>${this.escapeHtml(title)}</strong>.</p>
                    <p class="error-detail">${this.escapeHtml(err.message)}</p>
                    <p>Check the spelling, or use the links panel to navigate.</p>
                </div>`;
            titleEl.textContent = 'Error';
        }
    }

    attachLinkListeners() {
        document.querySelectorAll('#articleContent a.wiki-link[data-article]').forEach(a => {
            a.addEventListener('click', e => {
                e.preventDefault();
                this.navigateToArticle(a.dataset.article);
            });
        });
    }

    escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    navigateToArticle(article) {
        this.clickCount++;
        this.path.push(article);
        document.getElementById('clickCount').textContent = this.clickCount;
        this.updateBreadcrumb();
        this.loadArticle(article);
    }

    updateBreadcrumb() {
        const trail = document.getElementById('breadcrumbTrail');
        trail.innerHTML = this.path.map((a, i) => `
            <span class="breadcrumb-item">${this.escapeHtml(a)}</span>
            ${i < this.path.length - 1 ? '<span class="breadcrumb-sep">→</span>' : ''}
        `).join('');
        trail.scrollLeft = trail.scrollWidth;
    }

    showLinks() {
        const list = document.getElementById('linksList');
        list.innerHTML = '';
        const links = this.allLinks.length
            ? this.allLinks
            : Array.from(document.querySelectorAll('#articleContent a.wiki-link[data-article]')).map(a => a.dataset.article);

        if (!links.length) {
            list.innerHTML = '<p class="empty-links">No links found on this page.</p>';
        } else {
            const target = this.currentChallenge.target.toLowerCase();
            [...new Set(links)].sort().forEach(title => {
                const item = document.createElement('div');
                item.className = 'link-item';
                item.textContent = title;
                if (title.toLowerCase() === target) item.classList.add('link-item-target');
                item.addEventListener('click', () => {
                    this.navigateToArticle(title);
                    ModalSystem.closeModal('linksModal');
                });
                list.appendChild(item);
            });
        }
        document.getElementById('linkSearch').value = '';
        ModalSystem.showModal('linksModal');
    }

    filterLinks(query) {
        document.querySelectorAll('#linksList .link-item').forEach(item => {
            item.style.display = item.textContent.toLowerCase().includes(query.toLowerCase()) ? '' : 'none';
        });
    }

    async showHint() {
        this.hintsUsed++;
        const display = document.getElementById('hintDisplay');
        display.textContent = '💡 Finding a hint…';
        display.style.display = 'block';
        try {
            const catUrl = 'https://en.wikipedia.org/w/api.php?' + new URLSearchParams({
                action: 'query', titles: this.currentChallenge.target,
                prop: 'categories', cllimit: '10', format: 'json', origin: '*',
            });
            const data  = await (await fetch(catUrl)).json();
            const cats  = (Object.values(data.query.pages)[0]?.categories || [])
                .map(c => c.title.replace('Category:', ''))
                .filter(c => !/stub|article|wikiproject/i.test(c));
            const hint  = cats.length
                ? `Try an article related to: <strong>${cats[Math.floor(Math.random() * Math.min(cats.length, 5))]}</strong>`
                : this.genericHint();
            display.innerHTML = `💡 Hint ${this.hintsUsed}: ${hint}`;
        } catch {
            display.textContent = `💡 Hint ${this.hintsUsed}: ${this.genericHint()}`;
        }
        clearTimeout(this._hintTimeout);
        this._hintTimeout = setTimeout(() => { display.style.display = 'none'; }, 8000);
    }

    genericHint() {
        const t = this.currentChallenge.target;
        return [
            `Think about broad categories "${t}" belongs to.`,
            'History, geography, and science articles connect almost everything.',
            'Look for a country or time-period article as a stepping stone.',
            `Who or what is "${t}" famously associated with?`,
            'Sports, food, and culture articles often surprise you.',
        ][this.hintsUsed % 5];
    }

    startTimer() {
        this.stopTimer();
        let sec = 0;
        this.timerInterval = setInterval(() => {
            sec++;
            document.getElementById('timerValue').textContent =
                `${Math.floor(sec/60)}:${(sec%60).toString().padStart(2,'0')}`;
        }, 1000);
    }

    stopTimer() { clearInterval(this.timerInterval); this.timerInterval = null; }

    formatTime(sec) {
        return `${Math.floor(sec/60)}:${(sec%60).toString().padStart(2,'0')}`;
    }

    getElapsed() { return Math.floor((Date.now() - this.startTime) / 1000); }

    completeChallenge() {
        this.stopTimer();
        const elapsed = this.getElapsed();
        const score   = Math.max(0, Math.round(1000 - this.clickCount * 10 - this.hintsUsed * 20 - elapsed * 0.1));

        document.getElementById('gameScreen').style.display   = 'none';
        document.getElementById('finalClicks').textContent    = this.clickCount;
        document.getElementById('finalTime').textContent      = this.formatTime(elapsed);
        document.getElementById('hintsUsed').textContent      = this.hintsUsed;
        document.getElementById('finalScore').textContent     = score;

        document.getElementById('pathDisplay').innerHTML = this.path.map((a, i) => `
            <div class="path-item ${a.toLowerCase() === this.currentChallenge.target.toLowerCase() ? 'path-item-target' : ''}">
                <span class="path-number">${i + 1}</span>
                <span class="path-article">${this.escapeHtml(a)}</span>
                ${i < this.path.length - 1 ? '<span class="path-arrow">↓</span>' : '<span class="path-flag">🏁</span>'}
            </div>`).join('');

        ModalSystem.showResult('resultsScreen');
        this.saveStats(elapsed, score);
        this.markDailyPlayed();
    }

    hasPlayedDaily() {
        return localStorage.getItem('wikiRaceDaily') === new Date().toISOString().slice(0, 10);
    }

    markDailyPlayed() {
        if (this.currentChallenge?.isDaily) {
            localStorage.setItem('wikiRaceDaily', new Date().toISOString().slice(0, 10));
        }
    }

    saveStats(time, score) {
        const s = this.loadStatsData();
        s.racesCompleted++;
        s.totalClicks   += this.clickCount;
        s.totalArticles += this.path.length;
        if (!s.bestTime  || time  < s.bestTime)  s.bestTime  = time;
        if (!s.bestScore || score > s.bestScore) s.bestScore = score;
        if (!s.history) s.history = [];
        s.history.unshift({
            start: this.currentChallenge.start, target: this.currentChallenge.target,
            clicks: this.clickCount, time, score, hints: this.hintsUsed,
            date: new Date().toLocaleDateString(),
        });
        if (s.history.length > 20) s.history.pop();
        localStorage.setItem('wikipediaRaceStats', JSON.stringify(s));
    }

    loadStatsData() {
        try {
            return JSON.parse(localStorage.getItem('wikipediaRaceStats') || 'null')
                || { racesCompleted: 0, totalClicks: 0, totalArticles: 0, bestTime: null, bestScore: null, history: [] };
        } catch {
            return { racesCompleted: 0, totalClicks: 0, totalArticles: 0, bestTime: null, bestScore: null, history: [] };
        }
    }

    showStats() {
        const s = this.loadStatsData();
        document.getElementById('statRacesCompleted').textContent = s.racesCompleted;
        document.getElementById('statAvgClicks').textContent      = s.racesCompleted > 0 ? Math.round(s.totalClicks / s.racesCompleted) : 0;
        document.getElementById('statBestTime').textContent       = s.bestTime  ? this.formatTime(s.bestTime)  : '-';
        document.getElementById('statTotalArticles').textContent  = s.totalArticles;
        document.getElementById('statBestScore').textContent      = s.bestScore ?? '-';
        const histEl = document.getElementById('challengeHistory');
        histEl.innerHTML = (s.history?.length)
            ? s.history.map(h => `
                <div class="history-item">
                    <div class="history-route">${this.escapeHtml(h.start)} → ${this.escapeHtml(h.target)}</div>
                    <div class="history-meta">
                        <span>🖱 ${h.clicks}</span><span>⏱ ${this.formatTime(h.time)}</span>
                        <span>⭐ ${h.score}</span><span class="history-date">${h.date}</span>
                    </div>
                </div>`).join('')
            : '<p class="empty-links">No races yet!</p>';
        ModalSystem.showModal('statsModal');
    }

    shareResult() {
        const text = [
            '🏁 Wikipedia Race', '',
            `${this.currentChallenge.start} → ${this.currentChallenge.target}`, '',
            `🖱 Clicks: ${this.clickCount}`,
            `⏱ Time: ${document.getElementById('finalTime').textContent}`,
            `💡 Hints: ${this.hintsUsed}`,
            `⭐ Score: ${document.getElementById('finalScore').textContent}`, '',
            `Path: ${this.path.join(' → ')}`, '',
            'By Unbinding',
        ].join('\n');
        navigator.clipboard?.writeText(text)
            .then(() => showToast('Score copied! 📋', 'success'))
            .catch(() => showToast('Could not copy', 'error'));
    }

    quitGame() {
        if (confirm('Quit the race? Progress will be lost.')) {
            this.stopTimer();
            this.reset();
        }
    }

    async submitScoreManual() {
        const { askForName } = await import('../components/visitor-logbook.js');
        const name = await askForName();
        if (!name) return;
        const score   = parseInt(document.getElementById('finalScore')?.textContent || '0');
        const elapsed = this.getElapsed();
        try {
            const { submitScore } = await import('../api/supabase.js');
            await submitScore({
                gameType: 'wikipedia_race',
                gameMode: this.currentChallenge?.isDaily ? 'daily' : 'random',
                playerName: name,
                score,
                timeTaken: elapsed,
            });
            showToast(`Score submitted as "${name}"! ✅`, 'success');
            lockSubmitButtons();
        } catch (err) {
            console.error('Score submit error:', err);
            showToast('Could not submit — saved locally only', 'error');
        }
        this.saveStats(elapsed, score);
    }

    reset() {
        this.stopTimer();
        ModalSystem.closeResult('resultsScreen');
        document.getElementById('gameScreen').style.display    = 'none';
        document.getElementById('resultsScreen').style.display = 'none';
        document.getElementById('setupScreen').style.display   = 'block';
        ['customStart','customTarget','rcInput'].forEach(id => {
            const el = document.getElementById(id); if (el) el.value = '';
        });
        this.currentChallenge = null;
        this.hideActionBar();
        resetSubmitButtons();
        this.renderModeUI();
    }

    showActionBar() {
        const bar   = document.getElementById('gameActionBar');
        const label = document.getElementById('gameActionBarLabel');
        if (bar && label && this.currentChallenge) {
            label.textContent = `${this.currentChallenge.start} → ${this.currentChallenge.target} · ${this.clickCount} clicks`;
            bar.style.display = 'flex';
        }
    }

    hideActionBar() {
        const bar = document.getElementById('gameActionBar');
        if (bar) bar.style.display = 'none';
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new WikipediaRace());
} else {
    new WikipediaRace();
}

export default WikipediaRace;
