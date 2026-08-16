/**
 * Rhyme Finder Tool
 * Find perfect rhymes, near rhymes, and homophones
 * Uses Datamuse API: https://www.datamuse.com/api/
 */

export class RhymeFinder {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.apiBase = 'https://api.datamuse.com/words';
        this.currentWord = null;
        this.searchHistory = this.loadHistory();
        
        if (!this.container) {
            console.error(`RhymeFinder container #${containerId} not found`);
            return;
        }
        
        this.render();
        this.attachEventListeners();
    }

    /**
     * Load search history from localStorage
     */
    loadHistory() {
        try {
            const history = localStorage.getItem('rhyme-history');
            return history ? JSON.parse(history) : [];
        } catch (error) {
            console.error('Failed to load history:', error);
            return [];
        }
    }

    /**
     * Save search history to localStorage
     */
    saveHistory() {
        try {
            localStorage.setItem('rhyme-history', JSON.stringify(this.searchHistory));
        } catch (error) {
            console.error('Failed to save history:', error);
        }
    }

    /**
     * Add word to search history
     */
    addToHistory(word) {
        const cleanWord = word.toLowerCase().trim();
        
        // Remove if already exists
        this.searchHistory = this.searchHistory.filter(w => w !== cleanWord);
        
        // Add to beginning
        this.searchHistory.unshift(cleanWord);
        
        // Keep only last 20 searches
        this.searchHistory = this.searchHistory.slice(0, 20);
        
        this.saveHistory();
    }

    /**
     * Clear search history
     */
    clearHistory() {
        this.searchHistory = [];
        this.saveHistory();
        this.renderHistory();
    }

    /**
     * Render rhyme finder interface
     */
    render() {
        this.container.innerHTML = `
            <div class="rhyme-tool">
                <div class="rhyme-header">
                    <h2 class="rhyme-title">🎵 Rhyme Finder</h2>
                    <p class="rhyme-subtitle">Find perfect rhymes, near rhymes, and sound-alike words</p>
                </div>
                
                <div class="rhyme-search">
                    <form id="rhyme-form" class="search-form">
                        <div class="search-input-group">
                            <input 
                                type="text" 
                                id="rhyme-input" 
                                class="search-input" 
                                placeholder="Enter a word to find rhymes..."
                                autocomplete="off"
                                spellcheck="false"
                                required
                            >
                            <button type="submit" class="btn btn-primary search-btn">
                                <span class="search-icon">🔍</span>
                                <span class="search-text">Search</span>
                            </button>
                        </div>
                    </form>
                    
                    <div id="rhyme-history" class="search-history">
                        <!-- History will be rendered here -->
                    </div>
                </div>
                
                <div id="rhyme-results" class="rhyme-results">
                    <div class="rhyme-welcome">
                        <div class="welcome-icon">🎤</div>
                        <h3>Welcome to the Rhyme Finder</h3>
                        <p>Enter a word above to discover rhyming words for poetry, lyrics, or creative writing.</p>
                    </div>
                </div>
            </div>
        `;
        
        this.renderHistory();
    }

    /**
     * Render search history
     */
    renderHistory() {
        const historyContainer = document.getElementById('rhyme-history');
        if (!historyContainer) return;
        
        if (this.searchHistory.length === 0) {
            historyContainer.innerHTML = '';
            return;
        }
        
        const historyHtml = `
            <div class="history-header">
                <span class="history-title">Recent Searches</span>
                <button id="clear-history-btn" class="btn-link" title="Clear history">Clear</button>
            </div>
            <div class="history-items">
                ${this.searchHistory.slice(0, 10).map(word => `
                    <button class="history-item" data-word="${this.escapeHtml(word)}">
                        ${this.escapeHtml(word)}
                    </button>
                `).join('')}
            </div>
        `;
        
        historyContainer.innerHTML = historyHtml;
        
        // Attach history click listeners
        historyContainer.querySelectorAll('.history-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const word = btn.dataset.word;
                document.getElementById('rhyme-input').value = word;
                this.searchWord(word);
            });
        });
        
        historyContainer.querySelector('#clear-history-btn')?.addEventListener('click', () => {
            if (confirm('Clear all search history?')) {
                this.clearHistory();
            }
        });
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        const form = document.getElementById('rhyme-form');
        const input = document.getElementById('rhyme-input');
        
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const word = input.value.trim();
                if (word) {
                    this.searchWord(word);
                }
            });
        }
    }

    /**
     * Search for rhymes
     */
    async searchWord(word) {
        const cleanWord = word.toLowerCase().trim();
        
        if (!cleanWord) return;
        
        this.currentWord = cleanWord;
        this.showLoading();
        
        try {
            // Fetch perfect rhymes, near rhymes, and homophones in parallel
            const [perfectRhymes, nearRhymes, homophones] = await Promise.all([
                this.fetchWords(`${this.apiBase}?rel_rhy=${encodeURIComponent(cleanWord)}&max=100`),
                this.fetchWords(`${this.apiBase}?rel_nry=${encodeURIComponent(cleanWord)}&max=50`),
                this.fetchWords(`${this.apiBase}?rel_hom=${encodeURIComponent(cleanWord)}&max=30`)
            ]);
            
            if (perfectRhymes.length === 0 && nearRhymes.length === 0 && homophones.length === 0) {
                this.showError(`No rhymes found for "${cleanWord}"`);
                return;
            }
            
            this.addToHistory(cleanWord);
            this.renderHistory();
            this.displayResults({ perfectRhymes, nearRhymes, homophones });
            
        } catch (error) {
            console.error('Rhyme API error:', error);
            this.showError('Failed to fetch rhymes. Please check your internet connection.');
        }
    }

    /**
     * Fetch words from API
     */
    async fetchWords(url) {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }
        
        return await response.json();
    }

    /**
     * Display search results
     */
    displayResults(data) {
        const resultsContainer = document.getElementById('rhyme-results');
        if (!resultsContainer) return;
        
        let html = `<div class="rhyme-content">`;
        
        // Word header
        html += `<div class="word-header">`;
        html += `<h2 class="word-title">${this.escapeHtml(this.currentWord)}</h2>`;
        html += `<p class="word-subtitle">Words that rhyme with "${this.escapeHtml(this.currentWord)}"</p>`;
        html += `</div>`;
        
        // Perfect rhymes section
        if (data.perfectRhymes && data.perfectRhymes.length > 0) {
            html += `<div class="word-section perfect-rhymes-section">`;
            html += `<h3 class="section-title">🎯 Perfect Rhymes <span class="count">(${data.perfectRhymes.length})</span></h3>`;
            html += `<p class="section-description">Words with identical ending sounds</p>`;
            html += `<div class="word-grid">`;
            
            // Group by syllable count if available
            const grouped = this.groupBySyllables(data.perfectRhymes);
            Object.keys(grouped).sort((a, b) => a - b).forEach(syllables => {
                grouped[syllables].forEach(item => {
                    const score = item.score || 0;
                    const numSyllables = item.numSyllables || '';
                    html += `
                        <button class="word-chip perfect-chip" data-word="${this.escapeHtml(item.word)}" 
                                title="Syllables: ${numSyllables}, Score: ${score}">
                            ${this.escapeHtml(item.word)}
                            ${numSyllables ? `<span class="syllable-count">${numSyllables}</span>` : ''}
                        </button>
                    `;
                });
            });
            
            html += `</div>`;
            html += `</div>`;
        }
        
        // Near rhymes section
        if (data.nearRhymes && data.nearRhymes.length > 0) {
            html += `<div class="word-section near-rhymes-section">`;
            html += `<h3 class="section-title">🎼 Near Rhymes <span class="count">(${data.nearRhymes.length})</span></h3>`;
            html += `<p class="section-description">Words with similar but not identical sounds</p>`;
            html += `<div class="word-grid">`;
            data.nearRhymes.forEach(item => {
                html += `
                    <button class="word-chip near-chip" data-word="${this.escapeHtml(item.word)}">
                        ${this.escapeHtml(item.word)}
                    </button>
                `;
            });
            html += `</div>`;
            html += `</div>`;
        }
        
        // Homophones section
        if (data.homophones && data.homophones.length > 0) {
            html += `<div class="word-section homophones-section">`;
            html += `<h3 class="section-title">🔊 Homophones <span class="count">(${data.homophones.length})</span></h3>`;
            html += `<p class="section-description">Words that sound exactly the same</p>`;
            html += `<div class="word-grid">`;
            data.homophones.forEach(item => {
                html += `
                    <button class="word-chip homophone-chip" data-word="${this.escapeHtml(item.word)}">
                        ${this.escapeHtml(item.word)}
                    </button>
                `;
            });
            html += `</div>`;
            html += `</div>`;
        }
        
        // Footer
        html += `<div class="rhyme-footer">`;
        html += `<p class="source-attribution">Powered by <a href="https://www.datamuse.com/api/" target="_blank" rel="noopener">Datamuse API</a></p>`;
        html += `</div>`;
        
        html += `</div>`;
        
        resultsContainer.innerHTML = html;
        
        // Attach word chip click listeners
        resultsContainer.querySelectorAll('.word-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                const word = btn.dataset.word;
                document.getElementById('rhyme-input').value = word;
                this.searchWord(word);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });
    }

    /**
     * Group words by syllable count
     */
    groupBySyllables(words) {
        const grouped = {};
        words.forEach(word => {
            const syllables = word.numSyllables || 'unknown';
            if (!grouped[syllables]) {
                grouped[syllables] = [];
            }
            grouped[syllables].push(word);
        });
        return grouped;
    }

    /**
     * Show loading state
     */
    showLoading() {
        const resultsContainer = document.getElementById('rhyme-results');
        if (!resultsContainer) return;
        
        resultsContainer.innerHTML = `
            <div class="rhyme-loading">
                <div class="loading-spinner"></div>
                <p>Finding rhymes for "${this.escapeHtml(this.currentWord)}"...</p>
            </div>
        `;
    }

    /**
     * Show error message
     */
    showError(message) {
        const resultsContainer = document.getElementById('rhyme-results');
        if (!resultsContainer) return;
        
        resultsContainer.innerHTML = `
            <div class="rhyme-error">
                <div class="error-icon">❌</div>
                <h3>No Rhymes Found</h3>
                <p>${this.escapeHtml(message)}</p>
                <p class="error-hint">Try a different word or check the spelling.</p>
            </div>
        `;
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Destroy component
     */
    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

export default RhymeFinder;
