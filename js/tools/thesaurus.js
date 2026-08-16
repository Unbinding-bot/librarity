/**
 * Thesaurus Tool
 * Find synonyms, antonyms, and related words
 * Uses Datamuse API: https://www.datamuse.com/api/
 */

export class Thesaurus {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.apiBase = 'https://api.datamuse.com/words';
        this.currentWord = null;
        this.searchHistory = this.loadHistory();
        
        if (!this.container) {
            console.error(`Thesaurus container #${containerId} not found`);
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
            const history = localStorage.getItem('thesaurus-history');
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
            localStorage.setItem('thesaurus-history', JSON.stringify(this.searchHistory));
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
     * Render thesaurus interface
     */
    render() {
        this.container.innerHTML = `
            <div class="thesaurus-tool">
                <div class="thesaurus-header">
                    <h2 class="thesaurus-title">📚 Thesaurus</h2>
                    <p class="thesaurus-subtitle">Find synonyms, antonyms, and related words</p>
                </div>
                
                <div class="thesaurus-search">
                    <form id="thesaurus-form" class="search-form">
                        <div class="search-input-group">
                            <input 
                                type="text" 
                                id="thesaurus-input" 
                                class="search-input" 
                                placeholder="Enter a word to find synonyms..."
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
                    
                    <div id="thesaurus-history" class="search-history">
                        <!-- History will be rendered here -->
                    </div>
                </div>
                
                <div id="thesaurus-results" class="thesaurus-results">
                    <div class="thesaurus-welcome">
                        <div class="welcome-icon">💭</div>
                        <h3>Welcome to the Thesaurus</h3>
                        <p>Enter a word above to discover synonyms, antonyms, and related words.</p>
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
        const historyContainer = document.getElementById('thesaurus-history');
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
                document.getElementById('thesaurus-input').value = word;
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
        const form = document.getElementById('thesaurus-form');
        const input = document.getElementById('thesaurus-input');
        
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
     * Search for a word
     */
    async searchWord(word) {
        const cleanWord = word.toLowerCase().trim();
        
        if (!cleanWord) return;
        
        this.currentWord = cleanWord;
        this.showLoading();
        
        try {
            // Fetch synonyms, antonyms, and related words in parallel
            const [synonyms, antonyms, related] = await Promise.all([
                this.fetchWords(`${this.apiBase}?rel_syn=${encodeURIComponent(cleanWord)}&max=50`),
                this.fetchWords(`${this.apiBase}?rel_ant=${encodeURIComponent(cleanWord)}&max=30`),
                this.fetchWords(`${this.apiBase}?ml=${encodeURIComponent(cleanWord)}&max=30`)
            ]);
            
            if (synonyms.length === 0 && antonyms.length === 0 && related.length === 0) {
                this.showError(`No results found for "${cleanWord}"`);
                return;
            }
            
            this.addToHistory(cleanWord);
            this.renderHistory();
            this.displayResults({ synonyms, antonyms, related });
            
        } catch (error) {
            console.error('Thesaurus API error:', error);
            this.showError('Failed to fetch results. Please check your internet connection.');
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
        const resultsContainer = document.getElementById('thesaurus-results');
        if (!resultsContainer) return;
        
        let html = `<div class="thesaurus-content">`;
        
        // Word header
        html += `<div class="word-header">`;
        html += `<h2 class="word-title">${this.escapeHtml(this.currentWord)}</h2>`;
        html += `</div>`;
        
        // Synonyms section
        if (data.synonyms && data.synonyms.length > 0) {
            html += `<div class="word-section synonyms-section">`;
            html += `<h3 class="section-title">✅ Synonyms</h3>`;
            html += `<div class="word-grid">`;
            data.synonyms.forEach(item => {
                const score = item.score || 0;
                html += `
                    <button class="word-chip" data-word="${this.escapeHtml(item.word)}" title="Score: ${score}">
                        ${this.escapeHtml(item.word)}
                    </button>
                `;
            });
            html += `</div>`;
            html += `</div>`;
        }
        
        // Antonyms section
        if (data.antonyms && data.antonyms.length > 0) {
            html += `<div class="word-section antonyms-section">`;
            html += `<h3 class="section-title">❌ Antonyms</h3>`;
            html += `<div class="word-grid">`;
            data.antonyms.forEach(item => {
                html += `
                    <button class="word-chip antonym-chip" data-word="${this.escapeHtml(item.word)}">
                        ${this.escapeHtml(item.word)}
                    </button>
                `;
            });
            html += `</div>`;
            html += `</div>`;
        }
        
        // Related words section
        if (data.related && data.related.length > 0) {
            html += `<div class="word-section related-section">`;
            html += `<h3 class="section-title">🔗 Related Words</h3>`;
            html += `<div class="word-grid">`;
            data.related.slice(0, 20).forEach(item => {
                html += `
                    <button class="word-chip related-chip" data-word="${this.escapeHtml(item.word)}">
                        ${this.escapeHtml(item.word)}
                    </button>
                `;
            });
            html += `</div>`;
            html += `</div>`;
        }
        
        // Footer
        html += `<div class="thesaurus-footer">`;
        html += `<p class="source-attribution">Powered by <a href="https://www.datamuse.com/api/" target="_blank" rel="noopener">Datamuse API</a></p>`;
        html += `</div>`;
        
        html += `</div>`;
        
        resultsContainer.innerHTML = html;
        
        // Attach word chip click listeners
        resultsContainer.querySelectorAll('.word-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                const word = btn.dataset.word;
                document.getElementById('thesaurus-input').value = word;
                this.searchWord(word);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });
    }

    /**
     * Show loading state
     */
    showLoading() {
        const resultsContainer = document.getElementById('thesaurus-results');
        if (!resultsContainer) return;
        
        resultsContainer.innerHTML = `
            <div class="thesaurus-loading">
                <div class="loading-spinner"></div>
                <p>Searching for "${this.escapeHtml(this.currentWord)}"...</p>
            </div>
        `;
    }

    /**
     * Show error message
     */
    showError(message) {
        const resultsContainer = document.getElementById('thesaurus-results');
        if (!resultsContainer) return;
        
        resultsContainer.innerHTML = `
            <div class="thesaurus-error">
                <div class="error-icon">❌</div>
                <h3>No Results Found</h3>
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

export default Thesaurus;
