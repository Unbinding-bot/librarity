/* ================================================
   Library Games - Leaderboard UI Component
   Reusable leaderboard display with filters and submission
   ================================================ */

import { submitScore, getLeaderboard, getLeaderboardStats, subscribeToLeaderboard } from '../api/supabase.js';

class Leaderboard {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container #${containerId} not found`);
            return;
        }
        
        // Configuration
        this.config = {
            gameType: options.gameType || 'wordle',
            gameMode: options.gameMode || 'daily',
            showFilters: options.showFilters !== false, // Default true
            showSubmitButton: options.showSubmitButton !== false, // Default true
            entriesPerPage: options.entriesPerPage || 50,
            autoRefresh: options.autoRefresh !== false, // Default true
            staggerDelay: options.staggerDelay || 50, // ms between each row animation
            ...options
        };
        
        // State
        this.state = {
            currentPage: 0,
            filters: {
                gameType: this.config.gameType,
                gameMode: this.config.gameMode,
                period: 'all' // 'daily', 'weekly', 'all'
            },
            leaderboardData: [],
            stats: {},
            loading: false,
            subscription: null
        };
        
        this.init();
    }
    
    /**
     * Initialize leaderboard component
     */
    async init() {
        this.render();
        await this.loadLeaderboard();
        await this.loadStats();
        
        if (this.config.autoRefresh) {
            this.setupRealtimeSubscription();
        }
    }
    
    /**
     * Render leaderboard HTML structure
     */
    render() {
        this.container.innerHTML = `
            <div class="leaderboard-component">
                ${this.config.showFilters ? this.renderFilters() : ''}
                
                <div class="leaderboard-stats">
                    <!-- Stats will be injected here -->
                </div>
                
                <div class="leaderboard-table-container">
                    <div class="leaderboard-loading">
                        <div class="skeleton-loader"></div>
                    </div>
                    <table class="leaderboard-table">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Player</th>
                                <th>Score</th>
                                <th>Time</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- Rows will be injected here -->
                        </tbody>
                    </table>
                </div>
                
                <div class="leaderboard-pagination">
                    <!-- Pagination will be injected here -->
                </div>
                
                ${this.config.showSubmitButton ? this.renderSubmitButton() : ''}
            </div>
        `;
        
        this.attachEventListeners();
    }
    
    /**
     * Render filter controls
     */
    renderFilters() {
        return `
            <div class="leaderboard-filters">
                <div class="filter-group">
                    <label for="period-filter">Period:</label>
                    <select id="period-filter" class="filter-select">
                        <option value="daily">Today</option>
                        <option value="weekly">This Week</option>
                        <option value="all" selected>All Time</option>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label for="game-type-filter">Game:</label>
                    <select id="game-type-filter" class="filter-select">
                        <option value="wordle">Wordle</option>
                        <option value="spelling_bee">Spelling Bee</option>
                        <option value="word_ladder">Word Ladder</option>
                        <option value="trivia">Trivia</option>
                        <option value="flashcards">Flashcards</option>
                        <option value="wikipedia_race">Wikipedia Race</option>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label for="game-mode-filter">Mode:</label>
                    <select id="game-mode-filter" class="filter-select">
                        <option value="daily">Daily Challenge</option>
                        <option value="random">Random</option>
                    </select>
                </div>
                
                <button id="refresh-leaderboard" class="btn btn-secondary btn-icon" title="Refresh">
                    <span class="icon">🔄</span>
                </button>
            </div>
        `;
    }
    
    /**
     * Render submit button
     */
    renderSubmitButton() {
        return `
            <div class="leaderboard-actions">
                <button id="submit-score-btn" class="btn btn-primary">
                    Submit Your Score
                </button>
            </div>
        `;
    }
    
    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Filter changes
        if (this.config.showFilters) {
            const periodFilter = this.container.querySelector('#period-filter');
            const gameTypeFilter = this.container.querySelector('#game-type-filter');
            const gameModeFilter = this.container.querySelector('#game-mode-filter');
            const refreshBtn = this.container.querySelector('#refresh-leaderboard');
            
            if (periodFilter) {
                periodFilter.value = this.state.filters.period;
                periodFilter.addEventListener('change', (e) => {
                    this.state.filters.period = e.target.value;
                    this.state.currentPage = 0;
                    this.loadLeaderboard();
                });
            }
            
            if (gameTypeFilter) {
                gameTypeFilter.value = this.state.filters.gameType;
                gameTypeFilter.addEventListener('change', (e) => {
                    this.state.filters.gameType = e.target.value;
                    this.state.currentPage = 0;
                    this.loadLeaderboard();
                    this.loadStats();
                });
            }
            
            if (gameModeFilter) {
                gameModeFilter.value = this.state.filters.gameMode;
                gameModeFilter.addEventListener('change', (e) => {
                    this.state.filters.gameMode = e.target.value;
                    this.state.currentPage = 0;
                    this.loadLeaderboard();
                    this.loadStats();
                });
            }
            
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => {
                    this.loadLeaderboard();
                    this.loadStats();
                });
            }
        }
        
        // Submit score button
        if (this.config.showSubmitButton) {
            const submitBtn = this.container.querySelector('#submit-score-btn');
            if (submitBtn) {
                submitBtn.addEventListener('click', () => this.openSubmitModal());
            }
        }
    }
    
    /**
     * Load leaderboard data
     */
    async loadLeaderboard() {
        this.showLoading(true);
        
        try {
            const data = await getLeaderboard({
                gameType: this.state.filters.gameType,
                gameMode: this.state.filters.gameMode,
                period: this.state.filters.period,
                limit: this.config.entriesPerPage,
                offset: this.state.currentPage * this.config.entriesPerPage
            });
            
            this.state.leaderboardData = data;
            this.renderLeaderboardTable();
            this.renderPagination();
            
        } catch (error) {
            console.error('Error loading leaderboard:', error);
            this.showError('Failed to load leaderboard. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }
    
    /**
     * Load leaderboard statistics
     */
    async loadStats() {
        try {
            const stats = await getLeaderboardStats({
                gameType: this.state.filters.gameType,
                gameMode: this.state.filters.gameMode
            });
            
            this.state.stats = stats;
            this.renderStats();
            
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }
    
    /**
     * Render statistics
     */
    renderStats() {
        const statsContainer = this.container.querySelector('.leaderboard-stats');
        if (!statsContainer) return;
        
        const { totalEntries, todayEntries, topScore, topPlayer } = this.state.stats;
        
        statsContainer.innerHTML = `
            <div class="stat-card">
                <div class="stat-value">${totalEntries || 0}</div>
                <div class="stat-label">Total Entries</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${todayEntries || 0}</div>
                <div class="stat-label">Today's Entries</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${topScore || 0}</div>
                <div class="stat-label">Top Score</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${topPlayer || 'N/A'}</div>
                <div class="stat-label">Top Player</div>
            </div>
        `;
    }
    
    /**
     * Render leaderboard table with stagger animation
     */
    renderLeaderboardTable() {
        const tbody = this.container.querySelector('.leaderboard-table tbody');
        if (!tbody) return;
        
        if (this.state.leaderboardData.length === 0) {
            tbody.innerHTML = `
                <tr class="no-data">
                    <td colspan="5">No entries yet. Be the first to submit a score!</td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = '';
        
        this.state.leaderboardData.forEach((entry, index) => {
            const row = document.createElement('tr');
            row.className = 'leaderboard-row';
            row.style.animationDelay = `${index * this.config.staggerDelay}ms`;
            
            // Add medal for top 3
            let rankDisplay = entry.rank;
            if (entry.rank === 1) rankDisplay = '🥇';
            else if (entry.rank === 2) rankDisplay = '🥈';
            else if (entry.rank === 3) rankDisplay = '🥉';
            
            // Format time
            const timeDisplay = entry.time_taken 
                ? this.formatTime(entry.time_taken) 
                : '-';
            
            // Format date
            const dateDisplay = new Date(entry.date_played).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
            
            row.innerHTML = `
                <td class="rank-cell">${rankDisplay}</td>
                <td class="player-cell">${this.escapeHtml(entry.player_name)}</td>
                <td class="score-cell">${entry.score}</td>
                <td class="time-cell">${timeDisplay}</td>
                <td class="date-cell">${dateDisplay}</td>
            `;
            
            tbody.appendChild(row);
        });
    }
    
    /**
     * Render pagination controls
     */
    renderPagination() {
        const paginationContainer = this.container.querySelector('.leaderboard-pagination');
        if (!paginationContainer) return;
        
        const hasMore = this.state.leaderboardData.length === this.config.entriesPerPage;
        const hasPrevious = this.state.currentPage > 0;
        
        if (!hasMore && !hasPrevious) {
            paginationContainer.innerHTML = '';
            return;
        }
        
        paginationContainer.innerHTML = `
            <button id="prev-page" class="btn btn-secondary" ${!hasPrevious ? 'disabled' : ''}>
                ← Previous
            </button>
            <span class="page-info">Page ${this.state.currentPage + 1}</span>
            <button id="next-page" class="btn btn-secondary" ${!hasMore ? 'disabled' : ''}>
                Next →
            </button>
        `;
        
        // Attach pagination listeners
        const prevBtn = paginationContainer.querySelector('#prev-page');
        const nextBtn = paginationContainer.querySelector('#next-page');
        
        if (prevBtn && !prevBtn.disabled) {
            prevBtn.addEventListener('click', () => {
                this.state.currentPage--;
                this.loadLeaderboard();
                this.scrollToTop();
            });
        }
        
        if (nextBtn && !nextBtn.disabled) {
            nextBtn.addEventListener('click', () => {
                this.state.currentPage++;
                this.loadLeaderboard();
                this.scrollToTop();
            });
        }
    }
    
    /**
     * Open submit score modal
     */
    openSubmitModal() {
        const modal = document.createElement('div');
        modal.className = 'modal modal-active';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <button class="modal-close" aria-label="Close">&times;</button>
                <h2>Submit Your Score</h2>
                
                <form id="submit-score-form" class="form">
                    <div class="form-group">
                        <label for="player-name">Player Name</label>
                        <input 
                            type="text" 
                            id="player-name" 
                            name="playerName" 
                            placeholder="Enter your name (or stay Anonymous)"
                            maxlength="50"
                        >
                    </div>
                    
                    <div class="form-group">
                        <label for="score">Score *</label>
                        <input 
                            type="number" 
                            id="score" 
                            name="score" 
                            required
                            min="0"
                            placeholder="Enter your score"
                        >
                    </div>
                    
                    <div class="form-group">
                        <label for="time-taken">Time Taken (seconds)</label>
                        <input 
                            type="number" 
                            id="time-taken" 
                            name="timeTaken" 
                            min="0"
                            placeholder="Optional"
                        >
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" id="cancel-submit">
                            Cancel
                        </button>
                        <button type="submit" class="btn btn-primary">
                            Submit Score
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Focus first input
        setTimeout(() => {
            modal.querySelector('#player-name')?.focus();
        }, 100);
        
        // Event listeners
        const closeModal = () => {
            modal.classList.remove('modal-active');
            setTimeout(() => modal.remove(), 300);
        };
        
        modal.querySelector('.modal-close')?.addEventListener('click', closeModal);
        modal.querySelector('.modal-overlay')?.addEventListener('click', closeModal);
        modal.querySelector('#cancel-submit')?.addEventListener('click', closeModal);
        
        modal.querySelector('#submit-score-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleScoreSubmit(e.target, closeModal);
        });
    }
    
    /**
     * Handle score submission
     */
    async handleScoreSubmit(form, closeModal) {
        const formData = new FormData(form);
        const submitBtn = form.querySelector('button[type="submit"]');
        
        // Disable submit button
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
        
        try {
            const scoreData = {
                gameType: this.state.filters.gameType,
                gameMode: this.state.filters.gameMode,
                playerName: formData.get('playerName') || 'Anonymous',
                score: parseInt(formData.get('score')),
                timeTaken: formData.get('timeTaken') ? parseInt(formData.get('timeTaken')) : null
            };
            
            await submitScore(scoreData);
            
            // Show success message
            this.showToast('Score submitted successfully!', 'success');
            
            // Refresh leaderboard
            await this.loadLeaderboard();
            await this.loadStats();
            
            // Close modal
            closeModal();
            
        } catch (error) {
            console.error('Error submitting score:', error);
            this.showToast('Failed to submit score. Please try again.', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Score';
        }
    }
    
    /**
     * Setup real-time subscription
     */
    setupRealtimeSubscription() {
        if (this.state.subscription) {
            this.state.subscription.unsubscribe();
        }
        
        try {
            this.state.subscription = subscribeToLeaderboard({
                gameType: this.state.filters.gameType,
                gameMode: this.state.filters.gameMode,
                onInsert: (newEntry) => {
                    // Refresh leaderboard when new score is added
                    this.loadLeaderboard();
                    this.loadStats();
                    this.showToast('New score added to leaderboard!', 'info');
                }
            });
        } catch (error) {
            console.warn('Real-time updates not available:', error);
        }
    }
    
    /**
     * Show/hide loading state
     */
    showLoading(isLoading) {
        const loadingEl = this.container.querySelector('.leaderboard-loading');
        const tableEl = this.container.querySelector('.leaderboard-table');
        
        if (loadingEl && tableEl) {
            if (isLoading) {
                loadingEl.style.display = 'block';
                tableEl.style.opacity = '0.5';
            } else {
                loadingEl.style.display = 'none';
                tableEl.style.opacity = '1';
            }
        }
    }
    
    /**
     * Show error message
     */
    showError(message) {
        const tbody = this.container.querySelector('.leaderboard-table tbody');
        if (tbody) {
            tbody.innerHTML = `
                <tr class="error-message">
                    <td colspan="5">⚠️ ${message}</td>
                </tr>
            `;
        }
    }
    
    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            console.log(`[${type}] ${message}`);
        }
    }
    
    /**
     * Format time in seconds to readable format
     */
    formatTime(seconds) {
        if (seconds < 60) {
            return `${seconds}s`;
        } else if (seconds < 3600) {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins}m ${secs}s`;
        } else {
            const hours = Math.floor(seconds / 3600);
            const mins = Math.floor((seconds % 3600) / 60);
            return `${hours}h ${mins}m`;
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
     * Scroll to top of leaderboard
     */
    scrollToTop() {
        this.container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    /**
     * Update filters programmatically
     */
    updateFilters(filters) {
        this.state.filters = { ...this.state.filters, ...filters };
        this.state.currentPage = 0;
        
        // Update filter selects if they exist
        if (this.config.showFilters) {
            const periodFilter = this.container.querySelector('#period-filter');
            const gameTypeFilter = this.container.querySelector('#game-type-filter');
            const gameModeFilter = this.container.querySelector('#game-mode-filter');
            
            if (periodFilter && filters.period) periodFilter.value = filters.period;
            if (gameTypeFilter && filters.gameType) gameTypeFilter.value = filters.gameType;
            if (gameModeFilter && filters.gameMode) gameModeFilter.value = filters.gameMode;
        }
        
        this.loadLeaderboard();
        this.loadStats();
        
        // Update subscription
        if (this.config.autoRefresh) {
            this.setupRealtimeSubscription();
        }
    }
    
    /**
     * Destroy component and cleanup
     */
    destroy() {
        if (this.state.subscription) {
            this.state.subscription.unsubscribe();
        }
        this.container.innerHTML = '';
    }
}

// Export for use in other modules
export default Leaderboard;

// Make available globally
if (typeof window !== 'undefined') {
    window.Leaderboard = Leaderboard;
}
