/**
 * Dictionary Tool
 * Word lookup with definitions, phonetics, examples, and synonyms
 * Uses Free Dictionary API: https://dictionaryapi.dev/
 */

export class Dictionary {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.apiBase = 'https://api.dictionaryapi.dev/api/v2/entries/en';
        this.currentWord = null;
        this.searchHistory = this.loadHistory();
        
        if (!this.container) {
            console.error(`Dictionary container #${containerId} not found`);
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
            const history = localStorage.getItem('dictionary-history');
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
            localStorage.setItem('dictionary-history', JSON.stringify(this.searchHistory));
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
     * Render dictionary interface
     */
    render() {
        this.container.innerHTML = `
            <div class="dictionary-tool">
                <div class="dictionary-header">
                    <h2 class="dictionary-title">📖 Dictionary</h2>
                    <p class="dictionary-subtitle">Look up word definitions, pronunciations, and usage examples</p>
                </div>
                
                <div class="dictionary-search">
                    <form id="dictionary-form" class="search-form">
                        <div class="search-input-group">
                            <input 
                                type="text" 
                                id="dictionary-input" 
                                class="search-input" 
                                placeholder="Enter a word to look up..."
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
                    
                    <div id="dictionary-history" class="search-history">
                        <!-- History will be rendered here -->
                    </div>
                </div>
                
                <div id="dictionary-results" class="dictionary-results">
                    <div class="dictionary-welcome">
                        <div class="welcome-icon">📚</div>
                        <h3>Welcome to the Dictionary</h3>
                        <p>Enter a word above to see its definition, pronunciation, and usage examples.</p>
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
        const historyContainer = document.getElementById('dictionary-history');
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
                document.getElementById('dictionary-input').value = word;
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
        const form = document.getElementById('dictionary-form');
        const input = document.getElementById('dictionary-input');
        
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
            const response = await fetch(`${this.apiBase}/${encodeURIComponent(cleanWord)}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    this.showError(`No definition found for "${cleanWord}"`);
                } else {
                    this.showError('Failed to fetch definition. Please try again.');
                }
                return;
            }
            
            const data = await response.json();
            this.addToHistory(cleanWord);
            this.renderHistory();
            this.displayResults(data);
            
        } catch (error) {
            console.error('Dictionary API error:', error);
            this.showError('Failed to connect to dictionary service. Please check your internet connection.');
        }
    }

    /**
     * Display search results
     */
    displayResults(data) {
        const resultsContainer = document.getElementById('dictionary-results');
        if (!resultsContainer) return;
        
        const word = data[0]?.word || this.currentWord;
        let html = `<div class="dictionary-content">`;
        
        // Word header
        html += `<div class="word-header">`;
        html += `<h2 class="word-title">${this.escapeHtml(word)}</h2>`;
        
        // Phonetics
        const phonetics = this.extractPhonetics(data);
        if (phonetics.text || phonetics.audio) {
            html += `<div class="word-phonetics">`;
            if (phonetics.text) {
                html += `<span class="phonetic-text">${this.escapeHtml(phonetics.text)}</span>`;
            }
            if (phonetics.audio) {
                html += `
                    <button class="btn-audio" data-audio="${this.escapeHtml(phonetics.audio)}" title="Play pronunciation">
                        🔊
                    </button>
                `;
            }
            html += `</div>`;
        }
        html += `</div>`;
        
        // Meanings
        data.forEach((entry, entryIndex) => {
            entry.meanings?.forEach((meaning, meaningIndex) => {
                html += `<div class="meaning-section">`;
                html += `<h3 class="part-of-speech">${this.escapeHtml(meaning.partOfSpeech)}</h3>`;
                
                // Definitions
                if (meaning.definitions && meaning.definitions.length > 0) {
                    html += `<ol class="definitions-list">`;
                    meaning.definitions.forEach((def, defIndex) => {
                        html += `<li class="definition-item">`;
                        html += `<p class="definition-text">${this.escapeHtml(def.definition)}</p>`;
                        
                        // Example
                        if (def.example) {
                            html += `<p class="definition-example"><em>"${this.escapeHtml(def.example)}"</em></p>`;
                        }
                        
                        // Synonyms
                        if (def.synonyms && def.synonyms.length > 0) {
                            html += `<div class="definition-synonyms">`;
                            html += `<strong>Synonyms:</strong> `;
                            html += def.synonyms.slice(0, 5).map(syn => 
                                `<button class="synonym-link" data-word="${this.escapeHtml(syn)}">${this.escapeHtml(syn)}</button>`
                            ).join(', ');
                            if (def.synonyms.length > 5) {
                                html += ` <span class="more-synonyms">+${def.synonyms.length - 5} more</span>`;
                            }
                            html += `</div>`;
                        }
                        
                        // Antonyms
                        if (def.antonyms && def.antonyms.length > 0) {
                            html += `<div class="definition-antonyms">`;
                            html += `<strong>Antonyms:</strong> `;
                            html += def.antonyms.slice(0, 5).map(ant => 
                                `<button class="synonym-link" data-word="${this.escapeHtml(ant)}">${this.escapeHtml(ant)}</button>`
                            ).join(', ');
                            html += `</div>`;
                        }
                        
                        html += `</li>`;
                    });
                    html += `</ol>`;
                }
                
                html += `</div>`;
            });
        });
        
        // Source attribution
        html += `<div class="dictionary-footer">`;
        html += `<p class="source-attribution">Powered by <a href="https://dictionaryapi.dev/" target="_blank" rel="noopener">Free Dictionary API</a></p>`;
        html += `</div>`;
        
        html += `</div>`;
        
        resultsContainer.innerHTML = html;
        
        // Attach audio listeners
        resultsContainer.querySelectorAll('.btn-audio').forEach(btn => {
            btn.addEventListener('click', () => {
                this.playAudio(btn.dataset.audio);
            });
        });
        
        // Attach synonym click listeners
        resultsContainer.querySelectorAll('.synonym-link').forEach(btn => {
            btn.addEventListener('click', () => {
                const word = btn.dataset.word;
                document.getElementById('dictionary-input').value = word;
                this.searchWord(word);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });
    }

    /**
     * Extract phonetics from API response
     */
    extractPhonetics(data) {
        const phonetics = {
            text: null,
            audio: null
        };
        
        for (const entry of data) {
            if (entry.phonetics && entry.phonetics.length > 0) {
                for (const phonetic of entry.phonetics) {
                    if (!phonetics.text && phonetic.text) {
                        phonetics.text = phonetic.text;
                    }
                    if (!phonetics.audio && phonetic.audio) {
                        phonetics.audio = phonetic.audio;
                    }
                    if (phonetics.text && phonetics.audio) {
                        return phonetics;
                    }
                }
            }
        }
        
        return phonetics;
    }

    /**
     * Play pronunciation audio
     */
    playAudio(url) {
        if (!url) return;
        
        try {
            const audio = new Audio(url);
            audio.play().catch(error => {
                console.error('Failed to play audio:', error);
                this.showToast('Failed to play audio', 'error');
            });
        } catch (error) {
            console.error('Audio playback error:', error);
            this.showToast('Failed to play audio', 'error');
        }
    }

    /**
     * Show loading state
     */
    showLoading() {
        const resultsContainer = document.getElementById('dictionary-results');
        if (!resultsContainer) return;
        
        resultsContainer.innerHTML = `
            <div class="dictionary-loading">
                <div class="loading-spinner"></div>
                <p>Looking up "${this.escapeHtml(this.currentWord)}"...</p>
            </div>
        `;
    }

    /**
     * Show error message
     */
    showError(message) {
        const resultsContainer = document.getElementById('dictionary-results');
        if (!resultsContainer) return;
        
        resultsContainer.innerHTML = `
            <div class="dictionary-error">
                <div class="error-icon">❌</div>
                <h3>Word Not Found</h3>
                <p>${this.escapeHtml(message)}</p>
                <p class="error-hint">Try checking the spelling or try a different word.</p>
            </div>
        `;
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
        }
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

export default Dictionary;
