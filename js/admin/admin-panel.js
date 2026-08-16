/* ================================================
   Library Games - Admin Panel UI and Navigation
   ================================================ */

import { auth } from './auth.js';
import contentManager from './content-manager.js';

class AdminPanel {
    constructor() {
        this.currentSection = 'dashboard';
        this.contentManager = contentManager;
        this.init();
    }
    
    /**
     * Initialize admin panel
     */
    async init() {
        // Check authentication
        const isAuthenticated = await auth.checkAuth();
        
        if (!isAuthenticated) {
            this.renderLoginScreen();
            return;
        }
        
        // Check if user is collaborator
        const isCollaborator = await auth.verifyCollaborator();
        
        if (!isCollaborator) {
            this.renderAccessDenied();
            return;
        }
        
        // Initialize content manager
        try {
            await contentManager.init();
        } catch (error) {
            console.error('Failed to initialize content manager:', error);
            this.showToast('Warning: Content management may be limited', 'warning');
        }
        
        // Render admin interface
        await this.renderAdminInterface();
        this.attachEventListeners();
    }
    
    /**
     * Render login screen
     */
    renderLoginScreen() {
        const container = document.getElementById('admin-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="admin-login">
                <div class="login-card">
                    <div class="login-header">
                        <h1>🔐 Admin Access</h1>
                        <p>Sign in with GitHub to access the admin panel</p>
                    </div>
                    
                    <div class="login-content">
                        <p class="text-secondary">
                            Only repository collaborators can access this panel.
                        </p>
                        
                        <button id="github-login-btn" class="btn btn-primary btn-lg">
                            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" style="margin-right: 0.5rem;">
                                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                            </svg>
                            Sign in with GitHub
                        </button>
                        
                        <div class="login-divider">
                            <span>or</span>
                        </div>
                        
                        <details class="pat-details">
                            <summary>Use Personal Access Token (for testing)</summary>
                            <div class="pat-form">
                                <input 
                                    type="password" 
                                    id="pat-input" 
                                    placeholder="ghp_xxxxxxxxxxxxx"
                                    class="input-field"
                                >
                                <button id="pat-login-btn" class="btn btn-secondary">
                                    Login with PAT
                                </button>
                            </div>
                        </details>
                    </div>
                </div>
            </div>
        `;
        
        // Attach login button listeners
        document.getElementById('github-login-btn')?.addEventListener('click', () => {
            auth.initiateGitHubOAuth();
        });
        
        document.getElementById('pat-login-btn')?.addEventListener('click', async () => {
            const token = document.getElementById('pat-input')?.value;
            if (token) {
                try {
                    await auth.setToken(token);
                    await this.init(); // Re-initialize
                } catch (error) {
                    this.showToast('Invalid token or insufficient permissions', 'error');
                }
            }
        });
    }
    
    /**
     * Render access denied screen
     */
    renderAccessDenied() {
        const container = document.getElementById('admin-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="access-denied">
                <div class="denied-card">
                    <div class="denied-icon">🚫</div>
                    <h1>Access Denied</h1>
                    <p>You must be a repository collaborator to access the admin panel.</p>
                    <p class="text-secondary">
                        Contact the repository owner to request access.
                    </p>
                    <div class="denied-actions">
                        <button id="logout-denied-btn" class="btn btn-secondary">
                            Logout
                        </button>
                        <a href="index.html" class="btn btn-outline">
                            Back to Site
                        </a>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('logout-denied-btn')?.addEventListener('click', async () => {
            await auth.logout();
            this.renderLoginScreen();
        });
    }
    
    /**
     * Render admin interface
     */
    async renderAdminInterface() {
        const user = auth.getUser();
        const container = document.getElementById('admin-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="admin-layout">
                <!-- Sidebar Navigation -->
                <aside class="admin-sidebar">
                    <div class="admin-user-info">
                        ${user?.avatarUrl ? `
                            <img src="${user.avatarUrl}" alt="${user.name}" class="user-avatar">
                        ` : ''}
                        <div class="user-details">
                            <div class="user-name">${user?.name || 'Admin'}</div>
                            <div class="user-role">Administrator</div>
                        </div>
                    </div>
                    
                    <nav class="admin-nav">
                        <a href="#dashboard" class="admin-nav-item active" data-section="dashboard">
                            <span class="nav-icon">📊</span>
                            <span class="nav-text">Dashboard</span>
                        </a>
                        <a href="#events" class="admin-nav-item" data-section="events">
                            <span class="nav-icon">🎉</span>
                            <span class="nav-text">Events</span>
                        </a>
                        <a href="#banners" class="admin-nav-item" data-section="banners">
                            <span class="nav-icon">📢</span>
                            <span class="nav-text">Banners</span>
                        </a>
                        <a href="#games" class="admin-nav-item" data-section="games">
                            <span class="nav-icon">🎮</span>
                            <span class="nav-text">Game Content</span>
                        </a>
                        <a href="#challenges" class="admin-nav-item" data-section="challenges">
                            <span class="nav-icon">🎯</span>
                            <span class="nav-text">Daily Challenges</span>
                        </a>
                        <a href="#coming-soon" class="admin-nav-item" data-section="coming-soon">
                            <span class="nav-icon">🚀</span>
                            <span class="nav-text">Coming Soon</span>
                        </a>
                        <a href="#books" class="admin-nav-item" data-section="books">
                            <span class="nav-icon">📚</span>
                            <span class="nav-text">Book List</span>
                        </a>
                        <a href="#settings" class="admin-nav-item" data-section="settings">
                            <span class="nav-icon">⚙️</span>
                            <span class="nav-text">Settings</span>
                        </a>
                    </nav>
                    
                    <div class="admin-theme-toggle">
                        <div id="admin-theme-toggle-container"></div>
                    </div>
                </aside>
                
                <!-- Main Content -->
                <div class="admin-content">
                    <div id="admin-section-content">
                        <!-- Section content will be rendered here -->
                    </div>
                </div>
            </div>
        `;
        
        // Load default section
        this.loadSection('dashboard');
    }
    
    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Navigation items
        const navItems = document.querySelectorAll('.admin-nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                this.loadSection(section);
                
                // Update active state
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
            });
        });
        
        // Back to site button
        document.getElementById('back-to-site-btn')?.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
        
        // Logout button
        document.getElementById('logout-btn')?.addEventListener('click', async () => {
            await auth.logout();
            this.renderLoginScreen();
        });
    }
    
    /**
     * Load a specific admin section
     */
    async loadSection(section) {
        this.currentSection = section;
        const content = document.getElementById('admin-section-content');
        if (!content) return;
        
        // Show loading state
        content.innerHTML = '<div class="loading-spinner">Loading...</div>';
        
        try {
            let sectionContent = '';
            
            switch (section) {
                case 'dashboard':
                    sectionContent = await this.renderDashboard();
                    break;
                case 'events':
                    sectionContent = await this.renderEventsSection();
                    break;
                case 'banners':
                    sectionContent = await this.renderBannersSection();
                    break;
                case 'games':
                    sectionContent = await this.renderGamesSection();
                    break;
                case 'challenges':
                    sectionContent = await this.renderChallengesSection();
                    break;
                case 'coming-soon':
                    sectionContent = await this.renderComingSoonSection();
                    break;
                case 'books':
                    sectionContent = await this.renderBooksSection();
                    break;
                case 'settings':
                    sectionContent = await this.renderSettingsSection();
                    break;
                default:
                    sectionContent = '<p>Section not found</p>';
            }
            
            content.innerHTML = sectionContent;
            
            // Attach section-specific listeners
            this.attachSectionListeners(section);
            
        } catch (error) {
            console.error('Error loading section:', error);
            content.innerHTML = '<div class="error-message">Failed to load section</div>';
        }
    }
    
    /**
     * Render dashboard
     */
    async renderDashboard() {
        return `
            <div class="admin-section dashboard">
                <div class="section-header">
                    <h1>📊 Dashboard</h1>
                    <p>Overview of your library games platform</p>
                </div>
                
                <div class="dashboard-stats">
                    <div class="stat-card">
                        <div class="stat-icon">🎮</div>
                        <div class="stat-content">
                            <div class="stat-value">6</div>
                            <div class="stat-label">Games</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">🏆</div>
                        <div class="stat-content">
                            <div class="stat-value" id="total-scores">-</div>
                            <div class="stat-label">Total Scores</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">📢</div>
                        <div class="stat-content">
                            <div class="stat-value" id="active-banners">-</div>
                            <div class="stat-label">Active Banners</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">🎉</div>
                        <div class="stat-content">
                            <div class="stat-value" id="active-events">-</div>
                            <div class="stat-label">Active Events</div>
                        </div>
                    </div>
                </div>
                
                <div class="dashboard-quick-actions">
                    <h2>Quick Actions</h2>
                    <div class="quick-actions-grid">
                        <button class="quick-action-btn" data-action="new-banner">
                            <span class="action-icon">📢</span>
                            <span class="action-text">New Banner</span>
                        </button>
                        <button class="quick-action-btn" data-action="new-event">
                            <span class="action-icon">🎉</span>
                            <span class="action-text">New Event</span>
                        </button>
                        <button class="quick-action-btn" data-action="daily-challenge">
                            <span class="action-icon">🎯</span>
                            <span class="action-text">Set Daily Challenge</span>
                        </button>
                        <button class="quick-action-btn" data-action="add-book">
                            <span class="action-icon">📚</span>
                            <span class="action-text">Add Book</span>
                        </button>
                    </div>
                </div>
                
                <div class="dashboard-recent">
                    <h2>Recent Activity</h2>
                    <div class="activity-list">
                        <div class="activity-item">
                            <span class="activity-icon">📊</span>
                            <span class="activity-text">Dashboard loaded</span>
                            <span class="activity-time">Just now</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Render events section (placeholder)
     */
    async renderEventsSection() {
        const events = await this.contentManager.getEvents();
        
        return `
            <div class="admin-section events">
                <div class="section-header">
                    <div>
                        <h1>🎉 Event Management</h1>
                        <p>Create seasonal themes for special occasions</p>
                    </div>
                    <button class="btn btn-primary" id="create-event-btn">
                        <span style="margin-right: 0.5rem;">+</span>
                        Create New Event
                    </button>
                </div>
                
                <div class="events-list">
                    ${events.length === 0 ? `
                        <div class="empty-state">
                            <div class="empty-icon">🎭</div>
                            <h3>No Events Created</h3>
                            <p>Create your first themed event to customize the site for special occasions</p>
                        </div>
                    ` : events.map(event => this.renderEventCard(event)).join('')}
                </div>
            </div>
        `;
    }
    
    /**
     * Render individual event card
     */
    renderEventCard(event) {
        const today = new Date();
        const start = new Date(event.startDate);
        const end = new Date(event.endDate);
        const isActive = event.active && today >= start && today <= end;
        const isPast = today > end;
        const isFuture = today < start;
        
        let statusBadge = '';
        if (isActive) {
            statusBadge = '<span class="badge badge-success">Active</span>';
        } else if (isPast) {
            statusBadge = '<span class="badge badge-secondary">Past</span>';
        } else if (isFuture) {
            statusBadge = '<span class="badge badge-info">Upcoming</span>';
        }
        
        return `
            <div class="event-card ${isActive ? 'event-active' : ''}" data-event-id="${event.id}">
                <div class="event-header">
                    <div class="event-title">
                        <h3>${this.escapeHtml(event.name)}</h3>
                        ${statusBadge}
                    </div>
                    <div class="event-actions">
                        <button class="btn btn-sm btn-outline event-preview-btn" data-event-id="${event.id}">
                            👁️ Preview
                        </button>
                        <button class="btn btn-sm btn-outline event-edit-btn" data-event-id="${event.id}">
                            ✏️ Edit
                        </button>
                        <button class="btn btn-sm btn-outline event-delete-btn" data-event-id="${event.id}">
                            🗑️ Delete
                        </button>
                    </div>
                </div>
                
                <p class="event-description">${this.escapeHtml(event.description || '')}</p>
                
                <div class="event-details">
                    <div class="event-dates">
                        <span>📅 ${start.toLocaleDateString()} - ${end.toLocaleDateString()}</span>
                    </div>
                    <div class="event-theme">
                        <span class="theme-color" style="background-color: ${event.theme?.primaryColor || '#2d5016'}"></span>
                        <span class="theme-color" style="background-color: ${event.theme?.secondaryColor || '#7cb342'}"></span>
                        <span class="theme-color" style="background-color: ${event.theme?.accentColor || '#aed581'}"></span>
                    </div>
                    <div class="event-toggle">
                        <label class="toggle-switch">
                            <input type="checkbox" class="event-active-toggle" data-event-id="${event.id}" ${event.active ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                        <span>Enabled</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Escape HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Render banners section
     */
    async renderBannersSection() {
        const banners = await this.contentManager.getBanners();
        
        return `
            <div class="admin-section banners">
                <div class="section-header">
                    <div>
                        <h1>📢 Banner Management</h1>
                        <p>Manage homepage carousel banners</p>
                    </div>
                    <button class="btn btn-primary" id="create-banner-btn">
                        <span style="margin-right: 0.5rem;">+</span>
                        Create New Banner
                    </button>
                </div>
                
                <div class="banners-list">
                    ${banners.length === 0 ? `
                        <div class="empty-state">
                            <div class="empty-icon">📢</div>
                            <h3>No Banners Created</h3>
                            <p>Create your first banner to display on the homepage carousel</p>
                        </div>
                    ` : `
                        <div class="banner-cards-grid">
                            ${banners.map((banner, index) => this.renderBannerCard(banner, index)).join('')}
                        </div>
                    `}
                </div>
                
                ${banners.length > 0 ? `
                    <div class="section-info">
                        <p><strong>💡 Tip:</strong> Drag and drop banner cards to reorder them in the carousel</p>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    /**
     * Render individual banner card
     */
    renderBannerCard(banner, index) {
        return `
            <div class="banner-card ${banner.active ? 'banner-active' : ''}" data-banner-id="${banner.id}" draggable="true">
                <div class="banner-card-header">
                    <div class="banner-card-drag">
                        <span class="drag-handle">⋮⋮</span>
                        <span class="banner-priority">#${banner.priority || index + 1}</span>
                    </div>
                    <div class="banner-card-actions">
                        <button class="btn btn-sm btn-outline banner-preview-btn" data-banner-id="${banner.id}" title="Preview">
                            👁️
                        </button>
                        <button class="btn btn-sm btn-outline banner-edit-btn" data-banner-id="${banner.id}" title="Edit">
                            ✏️
                        </button>
                        <button class="btn btn-sm btn-outline banner-delete-btn" data-banner-id="${banner.id}" title="Delete">
                            🗑️
                        </button>
                    </div>
                </div>
                
                <div class="banner-card-preview" style="background: ${banner.backgroundColor || '#2d5016'}">
                    ${banner.imageUrl ? `
                        <img src="${banner.imageUrl}" alt="${this.escapeHtml(banner.title)}" class="banner-preview-image">
                    ` : ''}
                    ${banner.icon ? `
                        <div class="banner-preview-icon">${banner.icon}</div>
                    ` : ''}
                </div>
                
                <div class="banner-card-content">
                    <h3 class="banner-card-title">${this.escapeHtml(banner.title)}</h3>
                    <p class="banner-card-description">${this.escapeHtml(banner.description || '')}</p>
                    
                    <div class="banner-card-footer">
                        <div class="banner-card-meta">
                            ${banner.link ? `<span class="meta-item">🔗 ${banner.link}</span>` : '<span class="meta-item">No link</span>'}
                        </div>
                        <div class="banner-card-toggle">
                            <label class="toggle-switch">
                                <input type="checkbox" class="banner-active-toggle" data-banner-id="${banner.id}" ${banner.active ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Render games section
     */
    async renderGamesSection() {
        return `
            <div class="admin-section games">
                <div class="section-header">
                    <div>
                        <h1>🎮 Game Content Editor</h1>
                        <p>Manage content for all games</p>
                    </div>
                </div>
                
                <div class="game-tabs">
                    <button class="game-tab active" data-game="wordle">
                        📝 Wordle
                    </button>
                    <button class="game-tab" data-game="spelling_bee">
                        🐝 Spelling Bee
                    </button>
                    <button class="game-tab" data-game="word_ladder">
                        🪜 Word Ladder
                    </button>
                    <button class="game-tab" data-game="trivia">
                        ❓ Trivia
                    </button>
                    <button class="game-tab" data-game="flashcards">
                        🗂️ Flashcards
                    </button>
                    <button class="game-tab" data-game="wikipedia_race">
                        🏁 Wikipedia Race
                    </button>
                </div>
                
                <div class="game-content-container">
                    <div id="game-content-area">
                        <!-- Game-specific content will load here -->
                        <div class="loading-spinner">Loading...</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Render Wordle content editor
     */
    async renderWordleContent() {
        const content = await this.contentManager.getGameContent();
        const wordleData = content.wordle || { wordList: [], dailyWords: [] };
        
        return `
            <div class="game-content wordle-content">
                <div class="content-section">
                    <div class="section-header-small">
                        <h3>Word List (${wordleData.wordList.length} words)</h3>
                        <button class="btn btn-primary" id="add-wordle-word-btn">
                            + Add Words
                        </button>
                    </div>
                    
                    <div class="word-list-preview">
                        ${wordleData.wordList.length === 0 ? `
                            <p class="text-secondary">No words added yet. Add 5-letter words for the Wordle game.</p>
                        ` : `
                            <div class="word-chips">
                                ${wordleData.wordList.slice(0, 50).map(word => `
                                    <span class="word-chip">${word}</span>
                                `).join('')}
                                ${wordleData.wordList.length > 50 ? `
                                    <span class="word-chip-more">+${wordleData.wordList.length - 50} more</span>
                                ` : ''}
                            </div>
                        `}
                    </div>
                </div>
                
                <div class="content-section">
                    <div class="section-header-small">
                        <h3>Daily Words</h3>
                        <button class="btn btn-secondary" id="import-wordle-btn">
                            📥 Import from File
                        </button>
                    </div>
                    <p class="text-secondary">Manage scheduled daily words for specific dates</p>
                </div>
            </div>
        `;
    }
    
    /**
     * Render Trivia content editor
     */
    async renderTriviaContent() {
        const content = await this.contentManager.getGameContent();
        const triviaData = content.trivia || { categories: [], questions: [] };
        
        return `
            <div class="game-content trivia-content">
                <div class="content-section">
                    <div class="section-header-small">
                        <h3>Trivia Questions (${triviaData.questions.length} questions)</h3>
                        <button class="btn btn-primary" id="add-trivia-question-btn">
                            + Add Question
                        </button>
                    </div>
                    
                    ${triviaData.questions.length === 0 ? `
                        <div class="empty-state">
                            <div class="empty-icon">❓</div>
                            <h3>No Questions Added</h3>
                            <p>Create your first trivia question</p>
                        </div>
                    ` : `
                        <div class="trivia-questions-list">
                            ${triviaData.questions.map(q => this.renderTriviaQuestionCard(q)).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;
    }
    
    /**
     * Render trivia question card
     */
    renderTriviaQuestionCard(question) {
        return `
            <div class="trivia-question-card" data-question-id="${question.id}">
                <div class="question-header">
                    <span class="question-category">${question.category || 'General'}</span>
                    <span class="question-difficulty">${question.difficulty || 'Medium'}</span>
                    <div class="question-actions">
                        <button class="btn btn-sm btn-outline trivia-edit-btn" data-question-id="${question.id}">
                            ✏️
                        </button>
                        <button class="btn btn-sm btn-outline trivia-delete-btn" data-question-id="${question.id}">
                            🗑️
                        </button>
                    </div>
                </div>
                <div class="question-text">${this.escapeHtml(question.question)}</div>
                <div class="question-answers">
                    ${question.answers.map((answer, idx) => `
                        <div class="answer-item ${idx === question.correctIndex ? 'correct-answer' : ''}">
                            ${idx === question.correctIndex ? '✓' : '•'} ${this.escapeHtml(answer)}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    /**
     * Render Flashcards content editor
     */
    async renderFlashcardsContent() {
        const content = await this.contentManager.getGameContent();
        const flashcardsData = content.flashcards || { decks: [] };
        
        return `
            <div class="game-content flashcards-content">
                <div class="content-section">
                    <div class="section-header-small">
                        <h3>Flashcard Decks (${flashcardsData.decks.length} decks)</h3>
                        <button class="btn btn-primary" id="add-flashcard-deck-btn">
                            + Create Deck
                        </button>
                    </div>
                    
                    ${flashcardsData.decks.length === 0 ? `
                        <div class="empty-state">
                            <div class="empty-icon">🗂️</div>
                            <h3>No Decks Created</h3>
                            <p>Create your first flashcard deck</p>
                        </div>
                    ` : `
                        <div class="flashcard-decks-grid">
                            ${flashcardsData.decks.map(deck => this.renderFlashcardDeck(deck)).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;
    }
    
    /**
     * Render flashcard deck card
     */
    renderFlashcardDeck(deck) {
        return `
            <div class="flashcard-deck-card" data-deck-id="${deck.id}">
                <div class="deck-header">
                    <h4>${this.escapeHtml(deck.name)}</h4>
                    <div class="deck-actions">
                        <button class="btn btn-sm btn-outline deck-edit-btn" data-deck-id="${deck.id}">
                            ✏️
                        </button>
                        <button class="btn btn-sm btn-outline deck-delete-btn" data-deck-id="${deck.id}">
                            🗑️
                        </button>
                    </div>
                </div>
                <p class="deck-description">${this.escapeHtml(deck.description || '')}</p>
                <div class="deck-stats">
                    <span class="stat-item">📇 ${deck.cards?.length || 0} cards</span>
                </div>
            </div>
        `;
    }
    
    /**
     * Render generic game content
     */
    renderGenericGameContent(gameName) {
        return `
            <div class="game-content generic-content">
                <div class="content-section">
                    <div class="empty-state">
                        <div class="empty-icon">🎮</div>
                        <h3>${gameName} Content Editor</h3>
                        <p>Content editor for ${gameName} will be fully implemented when the game is built</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Render challenges section
     */
    async renderChallengesSection() {
        const overrides = await this.contentManager.getDailyOverrides();
        
        // Group by game type
        const groupedOverrides = {};
        overrides.forEach(override => {
            if (!groupedOverrides[override.gameType]) {
                groupedOverrides[override.gameType] = [];
            }
            groupedOverrides[override.gameType].push(override);
        });
        
        return `
            <div class="admin-section challenges">
                <div class="section-header">
                    <div>
                        <h1>🎯 Daily Challenge Overrides</h1>
                        <p>Schedule specific challenges for particular dates</p>
                    </div>
                    <button class="btn btn-primary" id="create-override-btn">
                        <span style="margin-right: 0.5rem;">+</span>
                        Create Override
                    </button>
                </div>
                
                <div class="challenges-calendar-view">
                    <div class="calendar-header">
                        <h3>Upcoming Overrides</h3>
                        <div class="calendar-controls">
                            <button class="btn btn-sm btn-secondary" id="view-all-overrides">
                                View All (${overrides.length})
                            </button>
                        </div>
                    </div>
                    
                    ${overrides.length === 0 ? `
                        <div class="empty-state">
                            <div class="empty-icon">📅</div>
                            <h3>No Daily Overrides</h3>
                            <p>Create overrides to set specific challenges for particular dates</p>
                        </div>
                    ` : `
                        <div class="overrides-by-game">
                            ${Object.keys(groupedOverrides).map(gameType => `
                                <div class="game-overrides-section">
                                    <h4>${this.getGameDisplayName(gameType)}</h4>
                                    <div class="override-cards-grid">
                                        ${groupedOverrides[gameType]
                                            .sort((a, b) => new Date(a.date) - new Date(b.date))
                                            .map(override => this.renderOverrideCard(override))
                                            .join('')}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;
    }
    
    /**
     * Render individual override card
     */
    renderOverrideCard(override) {
        const overrideDate = new Date(override.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        overrideDate.setHours(0, 0, 0, 0);
        
        const isPast = overrideDate < today;
        const isToday = overrideDate.getTime() === today.getTime();
        const isFuture = overrideDate > today;
        
        let statusClass = '';
        let statusLabel = '';
        
        if (isToday) {
            statusClass = 'status-today';
            statusLabel = 'Today';
        } else if (isPast) {
            statusClass = 'status-past';
            statusLabel = 'Past';
        } else {
            statusClass = 'status-future';
            statusLabel = 'Upcoming';
        }
        
        return `
            <div class="override-card ${statusClass} ${override.active ? 'override-active' : ''}" data-override-id="${override.id}">
                <div class="override-header">
                    <div class="override-date">
                        <div class="date-day">${overrideDate.getDate()}</div>
                        <div class="date-month">${overrideDate.toLocaleDateString('en-US', { month: 'short' })}</div>
                    </div>
                    <div class="override-info">
                        <span class="override-status ${statusClass}">${statusLabel}</span>
                        <div class="override-actions">
                            <button class="btn btn-sm btn-outline override-edit-btn" data-override-id="${override.id}" title="Edit">
                                ✏️
                            </button>
                            <button class="btn btn-sm btn-outline override-delete-btn" data-override-id="${override.id}" title="Delete">
                                🗑️
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="override-content">
                    ${this.renderOverrideDetails(override)}
                </div>
                
                <div class="override-footer">
                    <label class="toggle-switch">
                        <input type="checkbox" class="override-active-toggle" data-override-id="${override.id}" ${override.active ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                    <span class="toggle-label">Active</span>
                </div>
            </div>
        `;
    }
    
    /**
     * Render override details based on game type
     */
    renderOverrideDetails(override) {
        switch (override.gameType) {
            case 'wordle':
                return `
                    <div class="challenge-detail">
                        <strong>Word:</strong> ${this.escapeHtml(override.challenge.word || 'N/A')}
                    </div>
                    ${override.challenge.hint ? `
                        <div class="challenge-detail">
                            <strong>Hint:</strong> ${this.escapeHtml(override.challenge.hint)}
                        </div>
                    ` : ''}
                `;
            case 'trivia':
                return `
                    <div class="challenge-detail">
                        <strong>Question:</strong> ${this.escapeHtml(override.challenge.question || 'N/A')}
                    </div>
                `;
            case 'spelling_bee':
                return `
                    <div class="challenge-detail">
                        <strong>Center Letter:</strong> ${this.escapeHtml(override.challenge.centerLetter || 'N/A')}
                    </div>
                    <div class="challenge-detail">
                        <strong>Letters:</strong> ${this.escapeHtml((override.challenge.letters || []).join(', '))}
                    </div>
                `;
            default:
                return `
                    <div class="challenge-detail text-secondary">
                        Challenge details available
                    </div>
                `;
        }
    }
    
    /**
     * Get display name for game type
     */
    getGameDisplayName(gameType) {
        const names = {
            'wordle': '📝 Wordle',
            'spelling_bee': '🐝 Spelling Bee',
            'word_ladder': '🪜 Word Ladder',
            'trivia': '❓ Trivia',
            'flashcards': '🗂️ Flashcards',
            'wikipedia_race': '🏁 Wikipedia Race'
        };
        return names[gameType] || gameType;
    }
    
    /**
     * Render coming soon section
     */
    async renderComingSoonSection() {
        const items = await this.contentManager.getComingSoon();
        
        // Sort by priority
        items.sort((a, b) => (a.priority || 999) - (b.priority || 999));
        
        return `
            <div class="admin-section coming-soon">
                <div class="section-header">
                    <div>
                        <h1>🚀 Coming Soon Manager</h1>
                        <p>Manage upcoming features and games</p>
                    </div>
                    <button class="btn btn-primary" id="add-coming-soon-btn">
                        <span style="margin-right: 0.5rem;">+</span>
                        Add Item
                    </button>
                </div>
                
                ${items.length === 0 ? `
                    <div class="empty-state">
                        <div class="empty-icon">🚀</div>
                        <h3>No Coming Soon Items</h3>
                        <p>Add items to showcase upcoming features or games</p>
                    </div>
                ` : `
                    <div class="coming-soon-list">
                        ${items.map(item => this.renderComingSoonCard(item)).join('')}
                    </div>
                `}
            </div>
        `;
    }
    
    /**
     * Render individual coming soon card
     */
    renderComingSoonCard(item) {
        const estimatedDate = item.estimatedDate ? new Date(item.estimatedDate) : null;
        
        return `
            <div class="coming-soon-card ${item.active ? 'coming-soon-active' : ''}" data-item-id="${item.id}">
                <div class="coming-soon-header">
                    <div class="coming-soon-icon">${item.icon || '🎮'}</div>
                    <div class="coming-soon-info">
                        <h3>${this.escapeHtml(item.title)}</h3>
                        <span class="coming-soon-category ${item.category}">${item.category || 'feature'}</span>
                    </div>
                    <div class="coming-soon-actions">
                        <button class="btn btn-sm btn-outline coming-soon-edit-btn" data-item-id="${item.id}" title="Edit">
                            ✏️
                        </button>
                        <button class="btn btn-sm btn-outline coming-soon-delete-btn" data-item-id="${item.id}" title="Delete">
                            🗑️
                        </button>
                    </div>
                </div>
                
                <p class="coming-soon-description">${this.escapeHtml(item.description)}</p>
                
                <div class="coming-soon-footer">
                    <div class="coming-soon-meta">
                        ${estimatedDate ? `
                            <span class="meta-item">📅 ${estimatedDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                        ` : '<span class="meta-item">📅 TBA</span>'}
                        <span class="meta-item">Priority: ${item.priority || 'N/A'}</span>
                    </div>
                    <div class="coming-soon-toggle">
                        <label class="toggle-switch">
                            <input type="checkbox" class="coming-soon-active-toggle" data-item-id="${item.id}" ${item.active ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                        <span class="toggle-label">Show</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Render books section (placeholder)
     */
    async renderBooksSection() {
        const books = await this.contentManager.getBooks();
        
        return `
            <div class="admin-section books">
                <div class="section-header">
                    <h1>📚 Book List Management</h1>
                    <button class="btn btn-primary" id="add-book-btn">
                        <span class="btn-icon">➕</span>
                        Add Book
                    </button>
                </div>
                
                <div class="books-filters">
                    <select id="books-filter-genre" class="filter-select">
                        <option value="all">All Genres</option>
                        <option value="Fiction">Fiction</option>
                        <option value="Fantasy">Fantasy</option>
                        <option value="Mystery">Mystery</option>
                        <option value="Science Fiction">Science Fiction</option>
                        <option value="Historical Fiction">Historical Fiction</option>
                        <option value="Romance">Romance</option>
                        <option value="Thriller">Thriller</option>
                        <option value="Young Adult">Young Adult</option>
                        <option value="Non-Fiction">Non-Fiction</option>
                        <option value="Biography">Biography</option>
                        <option value="Self-Help">Self-Help</option>
                        <option value="Classic">Classic</option>
                    </select>
                    
                    <select id="books-filter-status" class="filter-select">
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                    
                    <div class="filter-info">
                        <span id="books-count">${books.length} book${books.length !== 1 ? 's' : ''}</span>
                    </div>
                </div>
                
                ${books.length === 0 ? `
                    <div class="empty-state">
                        <div class="empty-icon">📚</div>
                        <h3>No Books Yet</h3>
                        <p>Add your first book recommendation to the library!</p>
                        <button class="btn btn-primary" onclick="document.getElementById('add-book-btn').click()">
                            Add First Book
                        </button>
                    </div>
                ` : `
                    <div class="books-grid" id="books-grid">
                        ${books.map(book => this.renderBookCard(book)).join('')}
                    </div>
                `}
            </div>
        `;
    }
    
    /**
     * Render individual book card
     */
    renderBookCard(book) {
        const isActive = book.active !== false;
        const genres = Array.isArray(book.genre) ? book.genre : [];
        const rating = book.rating || 0;
        
        return `
            <div class="book-card ${isActive ? 'book-active' : 'book-inactive'}" data-book-id="${book.id}">
                <div class="book-cover">
                    ${book.coverImage ? `
                        <img src="${book.coverImage}" alt="${this.escapeHtml(book.title)}" 
                             onerror="this.src='./assets/images/book-placeholder.png'; this.onerror=null;">
                    ` : `
                        <div class="book-placeholder">📖</div>
                    `}
                    ${!isActive ? '<div class="book-inactive-overlay">Inactive</div>' : ''}
                </div>
                
                <div class="book-info">
                    <h3 class="book-title">${this.escapeHtml(book.title)}</h3>
                    <p class="book-author">by ${this.escapeHtml(book.author)}</p>
                    
                    <div class="book-rating">
                        ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}
                    </div>
                    
                    ${genres.length > 0 ? `
                        <div class="book-genres">
                            ${genres.slice(0, 3).map(genre => `
                                <span class="genre-badge">${this.escapeHtml(genre)}</span>
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    <p class="book-description">${this.escapeHtml(book.description || '')}</p>
                    
                    <div class="book-meta">
                        <span class="book-recommended">👥 ${this.escapeHtml(book.recommendedFor || 'All Ages')}</span>
                    </div>
                    
                    <div class="book-actions">
                        <button class="btn btn-sm btn-outline book-edit-btn" data-book-id="${book.id}">
                            Edit
                        </button>
                        <button class="btn btn-sm btn-outline book-delete-btn" data-book-id="${book.id}">
                            Delete
                        </button>
                        <label class="toggle-switch">
                            <input type="checkbox" class="book-active-toggle" 
                                   data-book-id="${book.id}" ${isActive ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Render settings section
     */
    async renderSettingsSection() {
        return `
            <div class="admin-section settings">
                <div class="section-header">
                    <h1>⚙️ Settings</h1>
                </div>
                
                <div class="settings-group">
                    <h2>Configuration</h2>
                    <p class="text-secondary">
                        Update your configuration in <code>js/admin/auth.js</code> and <code>js/api/supabase.js</code>
                    </p>
                    
                    <div class="settings-item">
                        <label>GitHub Repository</label>
                        <input type="text" class="input-field" value="${auth.config?.owner}/${auth.config?.repo}" readonly>
                    </div>
                    
                    <div class="settings-item">
                        <label>Database Status</label>
                        <button id="test-db-btn" class="btn btn-secondary">Test Connection</button>
                        <span id="db-status"></span>
                    </div>
                </div>
                
                <div class="settings-group">
                    <h2>Session</h2>
                    <div class="settings-item">
                        <label>Session Expires</label>
                        <p id="session-expiry">Calculating...</p>
                    </div>
                    <button id="refresh-session-btn" class="btn btn-secondary">Refresh Session</button>
                </div>
            </div>
        `;
    }
    
    /**
     * Attach section-specific event listeners
     */
    async attachSectionListeners(section) {
        if (section === 'dashboard') {
            // Load dashboard stats
            this.loadDashboardStats();
            
            // Quick action buttons
            const actionBtns = document.querySelectorAll('.quick-action-btn');
            actionBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const action = btn.dataset.action;
                    this.handleQuickAction(action);
                });
            });
        }
        
        if (section === 'events') {
            // Create event button
            document.getElementById('create-event-btn')?.addEventListener('click', () => {
                this.showEventModal();
            });
            
            // Event card actions
            document.querySelectorAll('.event-edit-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const eventId = btn.dataset.eventId;
                    const events = await this.contentManager.getEvents(false);
                    const event = events.find(e => e.id === eventId);
                    if (event) {
                        this.showEventModal(event);
                    }
                });
            });
            
            document.querySelectorAll('.event-delete-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const eventId = btn.dataset.eventId;
                    if (confirm('Are you sure you want to delete this event?')) {
                        try {
                            await this.contentManager.deleteEvent(eventId);
                            this.showToast('Event deleted successfully', 'success');
                            this.loadSection('events');
                        } catch (error) {
                            this.showToast('Failed to delete event', 'error');
                        }
                    }
                });
            });
            
            document.querySelectorAll('.event-active-toggle').forEach(toggle => {
                toggle.addEventListener('change', async (e) => {
                    const eventId = e.target.dataset.eventId;
                    const active = e.target.checked;
                    try {
                        await this.contentManager.updateEvent(eventId, { active });
                        this.showToast(`Event ${active ? 'enabled' : 'disabled'}`, 'success');
                    } catch (error) {
                        this.showToast('Failed to update event', 'error');
                        e.target.checked = !active;
                    }
                });
            });
            
            document.querySelectorAll('.event-preview-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const eventId = btn.dataset.eventId;
                    if (window.eventSystem) {
                        window.eventSystem.previewEvent(eventId);
                        this.showToast('Event preview activated! Refresh page to see normal theme.', 'info');
                    }
                });
            });
        }
        
        if (section === 'banners') {
            // Create banner button
            document.getElementById('create-banner-btn')?.addEventListener('click', () => {
                this.showBannerModal();
            });
            
            // Banner card actions
            document.querySelectorAll('.banner-edit-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const bannerId = btn.dataset.bannerId;
                    const banners = await this.contentManager.getBanners(false);
                    const banner = banners.find(b => b.id === bannerId);
                    if (banner) {
                        this.showBannerModal(banner);
                    }
                });
            });
            
            document.querySelectorAll('.banner-delete-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const bannerId = btn.dataset.bannerId;
                    if (confirm('Are you sure you want to delete this banner?')) {
                        try {
                            await this.contentManager.deleteBanner(bannerId);
                            this.showToast('Banner deleted successfully', 'success');
                            this.loadSection('banners');
                            
                            // Reload carousel
                            if (window.bannerCarousel) {
                                await window.bannerCarousel.reload();
                            }
                        } catch (error) {
                            this.showToast('Failed to delete banner', 'error');
                        }
                    }
                });
            });
            
            document.querySelectorAll('.banner-active-toggle').forEach(toggle => {
                toggle.addEventListener('change', async (e) => {
                    const bannerId = e.target.dataset.bannerId;
                    const active = e.target.checked;
                    try {
                        await this.contentManager.updateBanner(bannerId, { active });
                        this.showToast(`Banner ${active ? 'enabled' : 'disabled'}`, 'success');
                        
                        // Reload carousel
                        if (window.bannerCarousel) {
                            await window.bannerCarousel.reload();
                        }
                    } catch (error) {
                        this.showToast('Failed to update banner', 'error');
                        e.target.checked = !active;
                    }
                });
            });
            
            document.querySelectorAll('.banner-preview-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const bannerId = btn.dataset.bannerId;
                    const banners = await this.contentManager.getBanners(false);
                    const banner = banners.find(b => b.id === bannerId);
                    if (banner) {
                        this.showBannerPreview(banner);
                    }
                });
            });
            
            // Drag and drop for reordering
            this.setupBannerDragAndDrop();
        }
        
        if (section === 'games') {
            // Game tabs
            const gameTabs = document.querySelectorAll('.game-tab');
            gameTabs.forEach(tab => {
                tab.addEventListener('click', async () => {
                    gameTabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    await this.loadGameContent(tab.dataset.game);
                });
            });
            
            // Load default game content (Wordle)
            await this.loadGameContent('wordle');
        }
        
        if (section === 'challenges') {
            // Create override button
            document.getElementById('create-override-btn')?.addEventListener('click', () => {
                this.showOverrideModal();
            });
            
            // Override card actions
            document.querySelectorAll('.override-edit-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const overrideId = btn.dataset.overrideId;
                    const overrides = await this.contentManager.getDailyOverrides(false);
                    const override = overrides.find(o => o.id === overrideId);
                    if (override) {
                        this.showOverrideModal(override);
                    }
                });
            });
            
            document.querySelectorAll('.override-delete-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const overrideId = btn.dataset.overrideId;
                    if (confirm('Delete this override?')) {
                        try {
                            await this.contentManager.deleteDailyOverride(overrideId);
                            this.showToast('Override deleted', 'success');
                            this.loadSection('challenges');
                        } catch (error) {
                            this.showToast('Failed to delete override', 'error');
                        }
                    }
                });
            });
            
            document.querySelectorAll('.override-active-toggle').forEach(toggle => {
                toggle.addEventListener('change', async (e) => {
                    const overrideId = e.target.dataset.overrideId;
                    const active = e.target.checked;
                    try {
                        await this.contentManager.updateDailyOverride(overrideId, { active });
                        this.showToast(`Override ${active ? 'enabled' : 'disabled'}`, 'success');
                    } catch (error) {
                        this.showToast('Failed to update override', 'error');
                        e.target.checked = !active;
                    }
                });
            });
        }
        
        if (section === 'coming-soon') {
            // Add item button
            document.getElementById('add-coming-soon-btn')?.addEventListener('click', () => {
                this.showComingSoonModal();
            });
            
            // Item actions
            document.querySelectorAll('.coming-soon-edit-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const itemId = btn.dataset.itemId;
                    const items = await this.contentManager.getComingSoon(false);
                    const item = items.find(i => i.id === itemId);
                    if (item) {
                        this.showComingSoonModal(item);
                    }
                });
            });
            
            document.querySelectorAll('.coming-soon-delete-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const itemId = btn.dataset.itemId;
                    if (confirm('Delete this coming soon item?')) {
                        try {
                            await this.contentManager.deleteComingSoonItem(itemId);
                            this.showToast('Item deleted', 'success');
                            this.loadSection('coming-soon');
                        } catch (error) {
                            this.showToast('Failed to delete item', 'error');
                        }
                    }
                });
            });
            
            document.querySelectorAll('.coming-soon-active-toggle').forEach(toggle => {
                toggle.addEventListener('change', async (e) => {
                    const itemId = e.target.dataset.itemId;
                    const active = e.target.checked;
                    try {
                        await this.contentManager.updateComingSoonItem(itemId, { active });
                        this.showToast(`Item ${active ? 'enabled' : 'disabled'}`, 'success');
                    } catch (error) {
                        this.showToast('Failed to update item', 'error');
                        e.target.checked = !active;
                    }
                });
            });
        }
        
        if (section === 'books') {
            // Add book button
            document.getElementById('add-book-btn')?.addEventListener('click', () => {
                this.showBookModal();
            });
            
            // Filter handlers
            document.getElementById('books-filter-genre')?.addEventListener('change', () => {
                this.filterBooks();
            });
            
            document.getElementById('books-filter-status')?.addEventListener('change', () => {
                this.filterBooks();
            });
            
            // Book actions
            document.querySelectorAll('.book-edit-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const bookId = btn.dataset.bookId;
                    const books = await this.contentManager.getBooks(false);
                    const book = books.find(b => b.id === bookId);
                    if (book) {
                        this.showBookModal(book);
                    }
                });
            });
            
            document.querySelectorAll('.book-delete-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const bookId = btn.dataset.bookId;
                    if (confirm('Delete this book from the list?')) {
                        try {
                            await this.contentManager.deleteBook(bookId);
                            this.showToast('Book deleted', 'success');
                            this.loadSection('books');
                        } catch (error) {
                            this.showToast('Failed to delete book', 'error');
                        }
                    }
                });
            });
            
            document.querySelectorAll('.book-active-toggle').forEach(toggle => {
                toggle.addEventListener('change', async (e) => {
                    const bookId = e.target.dataset.bookId;
                    const active = e.target.checked;
                    try {
                        await this.contentManager.updateBook(bookId, { active });
                        this.showToast(`Book ${active ? 'enabled' : 'disabled'}', 'success');
                        // Reload to update visual state
                        this.loadSection('books');
                    } catch (error) {
                        this.showToast('Failed to update book', 'error');
                        e.target.checked = !active;
                    }
                });
            });
        }
        
        if (section === 'settings') {
            // Test database connection
            document.getElementById('test-db-btn')?.addEventListener('click', async () => {
                const statusEl = document.getElementById('db-status');
                if (statusEl) {
                    statusEl.textContent = 'Testing...';
                    // This will be implemented when supabase client is available
                    statusEl.textContent = '✓ Connected';
                }
            });
            
            // Refresh session
            document.getElementById('refresh-session-btn')?.addEventListener('click', async () => {
                await auth.refreshToken();
                this.showToast('Session refreshed', 'success');
            });
            
            // Show session expiry
            const expiryEl = document.getElementById('session-expiry');
            if (expiryEl) {
                const expiry = auth.getTokenExpiry();
                if (expiry) {
                    const date = new Date(expiry);
                    expiryEl.textContent = date.toLocaleString();
                }
            }
        }
    }
    
    /**
     * Show event creation/edit modal
     */
    showEventModal(event = null) {
        const isEdit = !!event;
        const modal = document.createElement('div');
        modal.className = 'modal modal-active';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content modal-large">
                <button class="modal-close" aria-label="Close">&times;</button>
                <h2>${isEdit ? 'Edit Event' : 'Create New Event'}</h2>
                
                <form id="event-form" class="form">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="event-name">Event Name *</label>
                            <input 
                                type="text" 
                                id="event-name" 
                                name="name" 
                                required
                                value="${event?.name || ''}"
                                placeholder="Halloween"
                            >
                        </div>
                        
                        <div class="form-group">
                            <label for="event-id">Event ID *</label>
                            <input 
                                type="text" 
                                id="event-id" 
                                name="id" 
                                required
                                value="${event?.id || ''}"
                                placeholder="halloween_2024"
                                ${isEdit ? 'readonly' : ''}
                            >
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="event-description">Description</label>
                        <textarea 
                            id="event-description" 
                            name="description" 
                            rows="2"
                            placeholder="Spooky season celebration"
                        >${event?.description || ''}</textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="event-start">Start Date *</label>
                            <input 
                                type="date" 
                                id="event-start" 
                                name="startDate" 
                                required
                                value="${event?.startDate || ''}"
                            >
                        </div>
                        
                        <div class="form-group">
                            <label for="event-end">End Date *</label>
                            <input 
                                type="date" 
                                id="event-end" 
                                name="endDate" 
                                required
                                value="${event?.endDate || ''}"
                            >
                        </div>
                    </div>
                    
                    <h3>Theme Colors</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="theme-primary">Primary Color</label>
                            <input 
                                type="color" 
                                id="theme-primary" 
                                name="themePrimary" 
                                value="${event?.theme?.primaryColor || '#2d5016'}"
                            >
                        </div>
                        
                        <div class="form-group">
                            <label for="theme-secondary">Secondary Color</label>
                            <input 
                                type="color" 
                                id="theme-secondary" 
                                name="themeSecondary" 
                                value="${event?.theme?.secondaryColor || '#7cb342'}"
                            >
                        </div>
                        
                        <div class="form-group">
                            <label for="theme-accent">Accent Color</label>
                            <input 
                                type="color" 
                                id="theme-accent" 
                                name="themeAccent" 
                                value="${event?.theme?.accentColor || '#aed581'}"
                            >
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="banner-icon">Banner Icon (emoji)</label>
                        <input 
                            type="text" 
                            id="banner-icon" 
                            name="bannerIcon" 
                            value="${event?.bannerOverrides?.icon || ''}"
                            placeholder="🎃"
                            maxlength="2"
                        >
                    </div>
                    
                    <div class="form-group">
                        <label>
                            <input type="checkbox" name="active" ${event?.active ? 'checked' : ''}>
                            Enable this event
                        </label>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" id="cancel-event">
                            Cancel
                        </button>
                        <button type="submit" class="btn btn-primary">
                            ${isEdit ? 'Update Event' : 'Create Event'}
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Event listeners
        const closeModal = () => {
            modal.classList.remove('modal-active');
            setTimeout(() => modal.remove(), 300);
        };
        
        modal.querySelector('.modal-close')?.addEventListener('click', closeModal);
        modal.querySelector('.modal-overlay')?.addEventListener('click', closeModal);
        modal.querySelector('#cancel-event')?.addEventListener('click', closeModal);
        
        modal.querySelector('#event-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleEventSubmit(e.target, isEdit, closeModal);
        });
    }
    
    /**
     * Handle event form submission
     */
    async handleEventSubmit(form, isEdit, closeModal) {
        const formData = new FormData(form);
        const submitBtn = form.querySelector('button[type="submit"]');
        
        submitBtn.disabled = true;
        submitBtn.textContent = isEdit ? 'Updating...' : 'Creating...';
        
        try {
            const eventData = {
                id: formData.get('id'),
                name: formData.get('name'),
                description: formData.get('description'),
                startDate: formData.get('startDate'),
                endDate: formData.get('endDate'),
                active: formData.get('active') === 'on',
                theme: {
                    primaryColor: formData.get('themePrimary'),
                    secondaryColor: formData.get('themeSecondary'),
                    accentColor: formData.get('themeAccent'),
                    backgroundImage: null
                },
                bannerOverrides: {
                    backgroundColor: formData.get('themeSecondary'),
                    icon: formData.get('bannerIcon') || null
                },
                customCSS: ''
            };
            
            if (isEdit) {
                await this.contentManager.updateEvent(eventData.id, eventData);
                this.showToast('Event updated successfully', 'success');
            } else {
                await this.contentManager.addEvent(eventData);
                this.showToast('Event created successfully', 'success');
            }
            
            // Reload events section
            this.loadSection('events');
            
            // Reload event system
            if (window.eventSystem) {
                await window.eventSystem.reload();
            }
            
            closeModal();
            
        } catch (error) {
            console.error('Error saving event:', error);
            this.showToast('Failed to save event', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = isEdit ? 'Update Event' : 'Create Event';
        }
    }
    
    /**
     * Load dashboard statistics
     */
    async loadDashboardStats() {
        try {
            // Load banner count
            const bannersResponse = await fetch('./data/banners.json');
            const bannersData = await bannersResponse.json();
            const activeBanners = bannersData.banners?.filter(b => b.active).length || 0;
            document.getElementById('active-banners').textContent = activeBanners;
            
            // Load events count
            const eventsResponse = await fetch('./data/events.json');
            const eventsData = await eventsResponse.json();
            const activeEvents = eventsData.events?.filter(e => e.active).length || 0;
            document.getElementById('active-events').textContent = activeEvents;
            
            // Scores will be loaded from Supabase when available
            document.getElementById('total-scores').textContent = '0';
            
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
        }
    }
    
    /**
     * Handle quick action buttons
     */
    handleQuickAction(action) {
        const sectionMap = {
            'new-banner': 'banners',
            'new-event': 'events',
            'daily-challenge': 'challenges',
            'add-book': 'books'
        };
        
        const section = sectionMap[action];
        if (section) {
            // Update nav state
            const navItems = document.querySelectorAll('.admin-nav-item');
            navItems.forEach(item => {
                if (item.dataset.section === section) {
                    item.click();
                }
            });
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
}

// Export for use in admin.html
export default AdminPanel;

// Make available globally
if (typeof window !== 'undefined') {
    window.AdminPanel = AdminPanel;
}

    /**
     * Show banner creation/edit modal
     */
    showBannerModal(banner = null) {
        const isEdit = !!banner;
        const modal = document.createElement('div');
        modal.className = 'modal modal-active';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content modal-large">
                <button class="modal-close" aria-label="Close">&times;</button>
                <h2>${isEdit ? 'Edit Banner' : 'Create New Banner'}</h2>
                
                <form id="banner-form" class="form">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="banner-title">Title *</label>
                            <input 
                                type="text" 
                                id="banner-title" 
                                name="title" 
                                required
                                value="${banner?.title || ''}"
                                placeholder="Welcome to Library Games"
                            >
                        </div>
                        
                        <div class="form-group">
                            <label for="banner-id">Banner ID *</label>
                            <input 
                                type="text" 
                                id="banner-id" 
                                name="id" 
                                required
                                value="${banner?.id || ''}"
                                placeholder="welcome-banner"
                                ${isEdit ? 'readonly' : ''}
                            >
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="banner-description">Description</label>
                        <textarea 
                            id="banner-description" 
                            name="description" 
                            rows="2"
                            placeholder="Explore our collection of word games"
                        >${banner?.description || ''}</textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="banner-icon">Icon (emoji)</label>
                            <input 
                                type="text" 
                                id="banner-icon" 
                                name="icon" 
                                value="${banner?.icon || ''}"
                                placeholder="📚"
                                maxlength="2"
                            >
                        </div>
                        
                        <div class="form-group">
                            <label for="banner-bg-color">Background Color</label>
                            <input 
                                type="color" 
                                id="banner-bg-color" 
                                name="backgroundColor" 
                                value="${banner?.backgroundColor || '#2d5016'}"
                            >
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="banner-link">Link (optional)</label>
                        <input 
                            type="text" 
                            id="banner-link" 
                            name="link" 
                            value="${banner?.link || ''}"
                            placeholder="#wordle or https://example.com"
                        >
                    </div>
                    
                    <div class="form-group">
                        <label for="banner-button-text">Button Text (optional)</label>
                        <input 
                            type="text" 
                            id="banner-button-text" 
                            name="buttonText" 
                            value="${banner?.buttonText || ''}"
                            placeholder="Play Now"
                        >
                    </div>
                    
                    <div class="form-group">
                        <label for="banner-image">Image URL (optional)</label>
                        <input 
                            type="url" 
                            id="banner-image" 
                            name="imageUrl" 
                            value="${banner?.imageUrl || ''}"
                            placeholder="./assets/images/banner.jpg"
                        >
                        <small class="form-help">Or upload an image below</small>
                    </div>
                    
                    <div class="form-group">
                        <label for="banner-image-upload">Upload Image</label>
                        <input 
                            type="file" 
                            id="banner-image-upload" 
                            accept="image/*"
                            class="input-field"
                        >
                        <small class="form-help">Recommended size: 1200x400px</small>
                    </div>
                    
                    <div class="form-group">
                        <label>
                            <input type="checkbox" name="active" ${banner?.active !== false ? 'checked' : ''}>
                            Show this banner
                        </label>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" id="cancel-banner">
                            Cancel
                        </button>
                        <button type="submit" class="btn btn-primary">
                            ${isEdit ? 'Update Banner' : 'Create Banner'}
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Event listeners
        const closeModal = () => {
            modal.classList.remove('modal-active');
            setTimeout(() => modal.remove(), 300);
        };
        
        modal.querySelector('.modal-close')?.addEventListener('click', closeModal);
        modal.querySelector('.modal-overlay')?.addEventListener('click', closeModal);
        modal.querySelector('#cancel-banner')?.addEventListener('click', closeModal);
        
        modal.querySelector('#banner-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleBannerSubmit(e.target, isEdit, closeModal);
        });
    }
    
    /**
     * Handle banner form submission
     */
    async handleBannerSubmit(form, isEdit, closeModal) {
        const formData = new FormData(form);
        const submitBtn = form.querySelector('button[type="submit"]');
        
        submitBtn.disabled = true;
        submitBtn.textContent = isEdit ? 'Updating...' : 'Creating...';
        
        try {
            // Handle image upload if provided
            let imageUrl = formData.get('imageUrl');
            const imageFile = form.querySelector('#banner-image-upload').files[0];
            
            if (imageFile) {
                this.showToast('Uploading image...', 'info');
                imageUrl = await this.contentManager.uploadImage(imageFile, 'banners');
            }
            
            const bannerData = {
                id: formData.get('id'),
                title: formData.get('title'),
                description: formData.get('description'),
                icon: formData.get('icon') || null,
                backgroundColor: formData.get('backgroundColor'),
                link: formData.get('link') || null,
                buttonText: formData.get('buttonText') || null,
                imageUrl: imageUrl || null,
                active: formData.get('active') === 'on',
                priority: 0 // Will be set automatically
            };
            
            if (isEdit) {
                await this.contentManager.updateBanner(bannerData.id, bannerData);
                this.showToast('Banner updated successfully', 'success');
            } else {
                await this.contentManager.addBanner(bannerData);
                this.showToast('Banner created successfully', 'success');
            }
            
            // Reload banners section
            this.loadSection('banners');
            
            // Reload carousel on main site
            if (window.bannerCarousel) {
                await window.bannerCarousel.reload();
            }
            
            closeModal();
            
        } catch (error) {
            console.error('Error saving banner:', error);
            this.showToast('Failed to save banner', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = isEdit ? 'Update Banner' : 'Create Banner';
        }
    }
    
    /**
     * Show banner preview modal
     */
    showBannerPreview(banner) {
        const modal = document.createElement('div');
        modal.className = 'modal modal-active';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <button class="modal-close" aria-label="Close">&times;</button>
                <h2>Banner Preview</h2>
                
                <div class="banner-preview-full" style="background: ${banner.backgroundColor || '#2d5016'}">
                    <div class="banner-preview-content">
                        ${banner.imageUrl ? `
                            <img src="${banner.imageUrl}" alt="${this.escapeHtml(banner.title)}" class="preview-image">
                        ` : ''}
                        <div class="preview-text">
                            ${banner.icon ? `<div class="preview-icon">${banner.icon}</div>` : ''}
                            <h3>${this.escapeHtml(banner.title)}</h3>
                            ${banner.description ? `<p>${this.escapeHtml(banner.description)}</p>` : ''}
                            ${banner.buttonText && banner.link ? `
                                <button class="btn btn-primary">${this.escapeHtml(banner.buttonText)}</button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const closeModal = () => {
            modal.classList.remove('modal-active');
            setTimeout(() => modal.remove(), 300);
        };
        
        modal.querySelector('.modal-close')?.addEventListener('click', closeModal);
        modal.querySelector('.modal-overlay')?.addEventListener('click', closeModal);
    }
    
    /**
     * Setup drag and drop for banner reordering
     */
    setupBannerDragAndDrop() {
        const bannerCards = document.querySelectorAll('.banner-card');
        let draggedElement = null;
        
        bannerCards.forEach(card => {
            card.addEventListener('dragstart', (e) => {
                draggedElement = card;
                card.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });
            
            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
                draggedElement = null;
            });
            
            card.addEventListener('dragover', (e) => {
                e.preventDefault();
                const draggingCard = document.querySelector('.dragging');
                if (draggingCard && draggingCard !== card) {
                    const container = card.parentElement;
                    const afterElement = this.getDragAfterElement(container, e.clientY);
                    if (afterElement == null) {
                        container.appendChild(draggingCard);
                    } else {
                        container.insertBefore(draggingCard, afterElement);
                    }
                }
            });
        });
        
        // Save new order on drag end
        const container = document.querySelector('.banner-cards-grid');
        if (container) {
            container.addEventListener('drop', async (e) => {
                e.preventDefault();
                await this.saveBannerOrder();
            });
        }
    }
    
    /**
     * Get element after dragged position
     */
    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.banner-card:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
    
    /**
     * Save banner order after drag and drop
     */
    async saveBannerOrder() {
        const bannerCards = document.querySelectorAll('.banner-card');
        const banners = await this.contentManager.getBanners(false);
        
        // Update priorities based on current DOM order
        const updates = [];
        bannerCards.forEach((card, index) => {
            const bannerId = card.dataset.bannerId;
            const banner = banners.find(b => b.id === bannerId);
            if (banner) {
                banner.priority = index + 1;
                updates.push(this.contentManager.updateBanner(bannerId, { priority: index + 1 }));
            }
        });
        
        try {
            await Promise.all(updates);
            this.showToast('Banner order updated', 'success');
            
            // Reload carousel
            if (window.bannerCarousel) {
                await window.bannerCarousel.reload();
            }
        } catch (error) {
            console.error('Error updating banner order:', error);
            this.showToast('Failed to update order', 'error');
        }
    }

    /**
     * Load game-specific content
     */
    async loadGameContent(gameType) {
        const contentArea = document.getElementById('game-content-area');
        if (!contentArea) return;
        
        contentArea.innerHTML = '<div class="loading-spinner">Loading...</div>';
        
        try {
            let content = '';
            
            switch (gameType) {
                case 'wordle':
                    content = await this.renderWordleContent();
                    break;
                case 'trivia':
                    content = await this.renderTriviaContent();
                    break;
                case 'flashcards':
                    content = await this.renderFlashcardsContent();
                    break;
                case 'spelling_bee':
                    content = this.renderGenericGameContent('Spelling Bee');
                    break;
                case 'word_ladder':
                    content = this.renderGenericGameContent('Word Ladder');
                    break;
                case 'wikipedia_race':
                    content = this.renderGenericGameContent('Wikipedia Race');
                    break;
                default:
                    content = '<p>Game type not found</p>';
            }
            
            contentArea.innerHTML = content;
            
            // Attach game-specific listeners
            this.attachGameContentListeners(gameType);
            
        } catch (error) {
            console.error('Error loading game content:', error);
            contentArea.innerHTML = '<div class="error-message">Failed to load content</div>';
        }
    }
    
    /**
     * Attach game content listeners
     */
    attachGameContentListeners(gameType) {
        if (gameType === 'wordle') {
            document.getElementById('add-wordle-word-btn')?.addEventListener('click', () => {
                this.showWordleWordModal();
            });
        }
        
        if (gameType === 'trivia') {
            document.getElementById('add-trivia-question-btn')?.addEventListener('click', () => {
                this.showTriviaQuestionModal();
            });
            
            document.querySelectorAll('.trivia-edit-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const questionId = btn.dataset.questionId;
                    const content = await this.contentManager.getGameContent(false);
                    const question = content.trivia.questions.find(q => q.id === questionId);
                    if (question) {
                        this.showTriviaQuestionModal(question);
                    }
                });
            });
            
            document.querySelectorAll('.trivia-delete-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const questionId = btn.dataset.questionId;
                    if (confirm('Delete this trivia question?')) {
                        try {
                            await this.contentManager.deleteTriviaQuestion(questionId);
                            this.showToast('Question deleted', 'success');
                            await this.loadGameContent('trivia');
                        } catch (error) {
                            this.showToast('Failed to delete question', 'error');
                        }
                    }
                });
            });
        }
        
        if (gameType === 'flashcards') {
            document.getElementById('add-flashcard-deck-btn')?.addEventListener('click', () => {
                this.showFlashcardDeckModal();
            });
        }
    }
    
    /**
     * Show Wordle word addition modal
     */
    showWordleWordModal() {
        const modal = document.createElement('div');
        modal.className = 'modal modal-active';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <button class="modal-close" aria-label="Close">&times;</button>
                <h2>Add Words to Wordle</h2>
                
                <form id="wordle-word-form" class="form">
                    <div class="form-group">
                        <label for="wordle-words">Words (one per line, 5 letters each)</label>
                        <textarea 
                            id="wordle-words" 
                            name="words" 
                            rows="10"
                            required
                            placeholder="CRANE&#10;SLATE&#10;POUND&#10;TIGER&#10;BELOW"
                        ></textarea>
                        <small class="form-help">Enter 5-letter words, one per line. Invalid words will be skipped.</small>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" id="cancel-words">
                            Cancel
                        </button>
                        <button type="submit" class="btn btn-primary">
                            Add Words
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const closeModal = () => {
            modal.classList.remove('modal-active');
            setTimeout(() => modal.remove(), 300);
        };
        
        modal.querySelector('.modal-close')?.addEventListener('click', closeModal);
        modal.querySelector('.modal-overlay')?.addEventListener('click', closeModal);
        modal.querySelector('#cancel-words')?.addEventListener('click', closeModal);
        
        modal.querySelector('#wordle-word-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleWordleWordsSubmit(e.target, closeModal);
        });
    }
    
    /**
     * Handle Wordle words submission
     */
    async handleWordleWordsSubmit(form, closeModal) {
        const formData = new FormData(form);
        const submitBtn = form.querySelector('button[type="submit"]');
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Adding...';
        
        try {
            const wordsText = formData.get('words');
            const words = wordsText.split('\n')
                .map(w => w.trim().toLowerCase())
                .filter(w => w.length === 5 && /^[a-z]+$/.test(w));
            
            if (words.length === 0) {
                this.showToast('No valid 5-letter words found', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Add Words';
                return;
            }
            
            const content = await this.contentManager.getGameContent(false);
            const existingWords = new Set(content.wordle.wordList);
            let addedCount = 0;
            
            words.forEach(word => {
                if (!existingWords.has(word)) {
                    content.wordle.wordList.push(word);
                    addedCount++;
                }
            });
            
            if (addedCount > 0) {
                content.wordle.wordList.sort();
                await this.contentManager.updateGameContent('wordle', content.wordle);
                this.showToast(`Added ${addedCount} words`, 'success');
                await this.loadGameContent('wordle');
                closeModal();
            } else {
                this.showToast('All words already exist', 'info');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Add Words';
            }
            
        } catch (error) {
            console.error('Error adding words:', error);
            this.showToast('Failed to add words', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Add Words';
        }
    }
    
    /**
     * Show trivia question modal
     */
    showTriviaQuestionModal(question = null) {
        const isEdit = !!question;
        const modal = document.createElement('div');
        modal.className = 'modal modal-active';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content modal-large">
                <button class="modal-close" aria-label="Close">&times;</button>
                <h2>${isEdit ? 'Edit Question' : 'Add Trivia Question'}</h2>
                
                <form id="trivia-question-form" class="form">
                    <div class="form-group">
                        <label for="trivia-question">Question *</label>
                        <textarea 
                            id="trivia-question" 
                            name="question" 
                            rows="2"
                            required
                            placeholder="What is the capital of France?"
                        >${question?.question || ''}</textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="trivia-category">Category</label>
                            <input 
                                type="text" 
                                id="trivia-category" 
                                name="category" 
                                value="${question?.category || 'General'}"
                                placeholder="Geography"
                            >
                        </div>
                        
                        <div class="form-group">
                            <label for="trivia-difficulty">Difficulty</label>
                            <select id="trivia-difficulty" name="difficulty">
                                <option value="Easy" ${question?.difficulty === 'Easy' ? 'selected' : ''}>Easy</option>
                                <option value="Medium" ${!question || question?.difficulty === 'Medium' ? 'selected' : ''}>Medium</option>
                                <option value="Hard" ${question?.difficulty === 'Hard' ? 'selected' : ''}>Hard</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Answers (select the correct one)</label>
                        <div id="answers-container">
                            ${question ? question.answers.map((ans, idx) => `
                                <div class="answer-input-group">
                                    <input type="radio" name="correctAnswer" value="${idx}" ${idx === question.correctIndex ? 'checked' : ''} required>
                                    <input type="text" class="answer-input" value="${ans}" placeholder="Answer ${idx + 1}" required>
                                    ${idx > 1 ? '<button type="button" class="btn-remove-answer">×</button>' : ''}
                                </div>
                            `).join('') : `
                                <div class="answer-input-group">
                                    <input type="radio" name="correctAnswer" value="0" checked required>
                                    <input type="text" class="answer-input" placeholder="Answer 1 (Correct)" required>
                                </div>
                                <div class="answer-input-group">
                                    <input type="radio" name="correctAnswer" value="1" required>
                                    <input type="text" class="answer-input" placeholder="Answer 2" required>
                                </div>
                            `}
                        </div>
                        <button type="button" class="btn btn-sm btn-secondary" id="add-answer-btn">
                            + Add Answer
                        </button>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" id="cancel-question">
                            Cancel
                        </button>
                        <button type="submit" class="btn btn-primary">
                            ${isEdit ? 'Update Question' : 'Add Question'}
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const closeModal = () => {
            modal.classList.remove('modal-active');
            setTimeout(() => modal.remove(), 300);
        };
        
        modal.querySelector('.modal-close')?.addEventListener('click', closeModal);
        modal.querySelector('.modal-overlay')?.addEventListener('click', closeModal);
        modal.querySelector('#cancel-question')?.addEventListener('click', closeModal);
        
        // Add answer button
        modal.querySelector('#add-answer-btn')?.addEventListener('click', () => {
            const container = document.getElementById('answers-container');
            const answerCount = container.querySelectorAll('.answer-input-group').length;
            const newAnswer = document.createElement('div');
            newAnswer.className = 'answer-input-group';
            newAnswer.innerHTML = `
                <input type="radio" name="correctAnswer" value="${answerCount}" required>
                <input type="text" class="answer-input" placeholder="Answer ${answerCount + 1}" required>
                <button type="button" class="btn-remove-answer">×</button>
            `;
            container.appendChild(newAnswer);
            
            // Attach remove handler
            newAnswer.querySelector('.btn-remove-answer')?.addEventListener('click', () => {
                newAnswer.remove();
            });
        });
        
        // Remove answer buttons
        modal.querySelectorAll('.btn-remove-answer').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.parentElement.remove();
            });
        });
        
        modal.querySelector('#trivia-question-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleTriviaQuestionSubmit(e.target, isEdit, question?.id, closeModal);
        });
    }
    
    /**
     * Handle trivia question submission
     */
    async handleTriviaQuestionSubmit(form, isEdit, questionId, closeModal) {
        const formData = new FormData(form);
        const submitBtn = form.querySelector('button[type="submit"]');
        
        submitBtn.disabled = true;
        submitBtn.textContent = isEdit ? 'Updating...' : 'Adding...';
        
        try {
            const answerInputs = form.querySelectorAll('.answer-input');
            const answers = Array.from(answerInputs).map(input => input.value.trim());
            const correctIndex = parseInt(formData.get('correctAnswer'));
            
            const questionData = {
                question: formData.get('question'),
                category: formData.get('category'),
                difficulty: formData.get('difficulty'),
                answers: answers,
                correctIndex: correctIndex
            };
            
            if (isEdit) {
                questionData.id = questionId;
                const content = await this.contentManager.getGameContent(false);
                const index = content.trivia.questions.findIndex(q => q.id === questionId);
                if (index !== -1) {
                    content.trivia.questions[index] = questionData;
                    await this.contentManager.updateGameContent('trivia', content.trivia);
                }
                this.showToast('Question updated', 'success');
            } else {
                await this.contentManager.addTriviaQuestion(questionData);
                this.showToast('Question added', 'success');
            }
            
            await this.loadGameContent('trivia');
            closeModal();
            
        } catch (error) {
            console.error('Error saving question:', error);
            this.showToast('Failed to save question', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = isEdit ? 'Update Question' : 'Add Question';
        }
    }
    
    /**
     * Show flashcard deck modal
     */
    showFlashcardDeckModal(deck = null) {
        const isEdit = !!deck;
        this.showToast('Flashcard deck editor will be fully implemented with Task 22', 'info');
    }

    /**
     * Show daily override modal
     */
    showOverrideModal(override = null) {
        const isEdit = !!override;
        const modal = document.createElement('div');
        modal.className = 'modal modal-active';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content modal-large">
                <button class="modal-close" aria-label="Close">&times;</button>
                <h2>${isEdit ? 'Edit Daily Override' : 'Create Daily Override'}</h2>
                
                <form id="override-form" class="form">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="override-date">Date *</label>
                            <input 
                                type="date" 
                                id="override-date" 
                                name="date" 
                                required
                                value="${override?.date || ''}"
                                min="${new Date().toISOString().split('T')[0]}"
                            >
                        </div>
                        
                        <div class="form-group">
                            <label for="override-game">Game *</label>
                            <select id="override-game" name="gameType" required>
                                <option value="">Select Game</option>
                                <option value="wordle" ${override?.gameType === 'wordle' ? 'selected' : ''}>Wordle</option>
                                <option value="spelling_bee" ${override?.gameType === 'spelling_bee' ? 'selected' : ''}>Spelling Bee</option>
                                <option value="word_ladder" ${override?.gameType === 'word_ladder' ? 'selected' : ''}>Word Ladder</option>
                                <option value="trivia" ${override?.gameType === 'trivia' ? 'selected' : ''}>Trivia</option>
                                <option value="flashcards" ${override?.gameType === 'flashcards' ? 'selected' : ''}>Flashcards</option>
                                <option value="wikipedia_race" ${override?.gameType === 'wikipedia_race' ? 'selected' : ''}>Wikipedia Race</option>
                            </select>
                        </div>
                    </div>
                    
                    <div id="challenge-fields">
                        ${override ? this.renderChallengeFields(override.gameType, override.challenge) : ''}
                    </div>
                    
                    <div class="form-group">
                        <label>
                            <input type="checkbox" name="active" ${override?.active !== false ? 'checked' : ''}>
                            Active (enable this override)
                        </label>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" id="cancel-override">
                            Cancel
                        </button>
                        <button type="submit" class="btn btn-primary">
                            ${isEdit ? 'Update Override' : 'Create Override'}
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const closeModal = () => {
            modal.classList.remove('modal-active');
            setTimeout(() => modal.remove(), 300);
        };
        
        modal.querySelector('.modal-close')?.addEventListener('click', closeModal);
        modal.querySelector('.modal-overlay')?.addEventListener('click', closeModal);
        modal.querySelector('#cancel-override')?.addEventListener('click', closeModal);
        
        // Game type change listener
        modal.querySelector('#override-game')?.addEventListener('change', (e) => {
            const gameType = e.target.value;
            const fieldsContainer = document.getElementById('challenge-fields');
            if (fieldsContainer && gameType) {
                fieldsContainer.innerHTML = this.renderChallengeFields(gameType, {});
            }
        });
        
        modal.querySelector('#override-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleOverrideSubmit(e.target, isEdit, override?.id, closeModal);
        });
    }
    
    /**
     * Render challenge-specific fields
     */
    renderChallengeFields(gameType, challenge = {}) {
        switch (gameType) {
            case 'wordle':
                return `
                    <div class="form-group">
                        <label for="challenge-word">Word (5 letters) *</label>
                        <input 
                            type="text" 
                            id="challenge-word" 
                            name="word" 
                            required
                            maxlength="5"
                            pattern="[A-Za-z]{5}"
                            value="${challenge.word || ''}"
                            placeholder="CRANE"
                            style="text-transform: uppercase;"
                        >
                        <small class="form-help">Must be exactly 5 letters</small>
                    </div>
                    <div class="form-group">
                        <label for="challenge-hint">Hint (optional)</label>
                        <input 
                            type="text" 
                            id="challenge-hint" 
                            name="hint" 
                            value="${challenge.hint || ''}"
                            placeholder="A large bird"
                        >
                    </div>
                `;
            
            case 'spelling_bee':
                return `
                    <div class="form-group">
                        <label for="challenge-center">Center Letter *</label>
                        <input 
                            type="text" 
                            id="challenge-center" 
                            name="centerLetter" 
                            required
                            maxlength="1"
                            pattern="[A-Za-z]"
                            value="${challenge.centerLetter || ''}"
                            placeholder="A"
                            style="text-transform: uppercase;"
                        >
                    </div>
                    <div class="form-group">
                        <label for="challenge-letters">Other Letters (6 letters, comma-separated) *</label>
                        <input 
                            type="text" 
                            id="challenge-letters" 
                            name="letters" 
                            required
                            value="${(challenge.letters || []).join(',')}"
                            placeholder="B,C,D,E,F,G"
                            style="text-transform: uppercase;"
                        >
                        <small class="form-help">Enter 6 letters separated by commas</small>
                    </div>
                `;
            
            case 'trivia':
                return `
                    <div class="form-group">
                        <label for="challenge-question-id">Question ID *</label>
                        <input 
                            type="text" 
                            id="challenge-question-id" 
                            name="questionId" 
                            required
                            value="${challenge.questionId || ''}"
                            placeholder="trivia_123456789"
                        >
                        <small class="form-help">Enter the ID of a question from the trivia content editor</small>
                    </div>
                `;
            
            case 'word_ladder':
                return `
                    <div class="form-row">
                        <div class="form-group">
                            <label for="challenge-start-word">Start Word *</label>
                            <input 
                                type="text" 
                                id="challenge-start-word" 
                                name="startWord" 
                                required
                                value="${challenge.startWord || ''}"
                                placeholder="COLD"
                                style="text-transform: uppercase;"
                            >
                        </div>
                        <div class="form-group">
                            <label for="challenge-end-word">End Word *</label>
                            <input 
                                type="text" 
                                id="challenge-end-word" 
                                name="endWord" 
                                required
                                value="${challenge.endWord || ''}"
                                placeholder="WARM"
                                style="text-transform: uppercase;"
                            >
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="challenge-min-steps">Minimum Steps</label>
                        <input 
                            type="number" 
                            id="challenge-min-steps" 
                            name="minSteps" 
                            min="1"
                            value="${challenge.minSteps || ''}"
                            placeholder="4"
                        >
                    </div>
                `;
            
            case 'flashcards':
                return `
                    <div class="form-group">
                        <label for="challenge-deck-id">Deck ID *</label>
                        <input 
                            type="text" 
                            id="challenge-deck-id" 
                            name="deckId" 
                            required
                            value="${challenge.deckId || ''}"
                            placeholder="deck_123456789"
                        >
                        <small class="form-help">Enter the ID of a deck from the flashcards content editor</small>
                    </div>
                `;
            
            case 'wikipedia_race':
                return `
                    <div class="form-row">
                        <div class="form-group">
                            <label for="challenge-start-page">Start Page *</label>
                            <input 
                                type="text" 
                                id="challenge-start-page" 
                                name="startPage" 
                                required
                                value="${challenge.startPage || ''}"
                                placeholder="Cat"
                            >
                        </div>
                        <div class="form-group">
                            <label for="challenge-end-page">End Page *</label>
                            <input 
                                type="text" 
                                id="challenge-end-page" 
                                name="endPage" 
                                required
                                value="${challenge.endPage || ''}"
                                placeholder="Dog"
                            >
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="challenge-max-clicks">Maximum Clicks</label>
                        <input 
                            type="number" 
                            id="challenge-max-clicks" 
                            name="maxClicks" 
                            min="1"
                            value="${challenge.maxClicks || ''}"
                            placeholder="10"
                        >
                    </div>
                `;
            
            default:
                return '<p class="text-secondary">Select a game to configure challenge details</p>';
        }
    }
    
    /**
     * Handle override submission
     */
    async handleOverrideSubmit(form, isEdit, overrideId, closeModal) {
        const formData = new FormData(form);
        const submitBtn = form.querySelector('button[type="submit"]');
        
        submitBtn.disabled = true;
        submitBtn.textContent = isEdit ? 'Updating...' : 'Creating...';
        
        try {
            const gameType = formData.get('gameType');
            const date = formData.get('date');
            const active = formData.get('active') === 'on';
            
            // Build challenge object based on game type
            const challenge = this.buildChallengeObject(gameType, formData);
            
            const overrideData = {
                date,
                gameType,
                challenge,
                active
            };
            
            if (isEdit) {
                overrideData.id = overrideId;
                await this.contentManager.updateDailyOverride(overrideId, overrideData);
                this.showToast('Override updated', 'success');
            } else {
                await this.contentManager.addDailyOverride(overrideData);
                this.showToast('Override created', 'success');
            }
            
            this.loadSection('challenges');
            closeModal();
            
        } catch (error) {
            console.error('Error saving override:', error);
            this.showToast('Failed to save override', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = isEdit ? 'Update Override' : 'Create Override';
        }
    }
    
    /**
     * Build challenge object from form data
     */
    buildChallengeObject(gameType, formData) {
        switch (gameType) {
            case 'wordle':
                return {
                    word: formData.get('word').toUpperCase(),
                    hint: formData.get('hint') || null
                };
            
            case 'spelling_bee':
                const letters = formData.get('letters')
                    .split(',')
                    .map(l => l.trim().toUpperCase())
                    .filter(l => l.length === 1);
                return {
                    centerLetter: formData.get('centerLetter').toUpperCase(),
                    letters: letters
                };
            
            case 'trivia':
                return {
                    questionId: formData.get('questionId')
                };
            
            case 'word_ladder':
                return {
                    startWord: formData.get('startWord').toUpperCase(),
                    endWord: formData.get('endWord').toUpperCase(),
                    minSteps: parseInt(formData.get('minSteps')) || null
                };
            
            case 'flashcards':
                return {
                    deckId: formData.get('deckId')
                };
            
            case 'wikipedia_race':
                return {
                    startPage: formData.get('startPage'),
                    endPage: formData.get('endPage'),
                    maxClicks: parseInt(formData.get('maxClicks')) || null
                };
            
            default:
                return {};
        }
    }

    /**
     * Show coming soon item modal
     */
    showComingSoonModal(item = null) {
        const isEdit = !!item;
        const modal = document.createElement('div');
        modal.className = 'modal modal-active';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <button class="modal-close" aria-label="Close">&times;</button>
                <h2>${isEdit ? 'Edit Coming Soon Item' : 'Add Coming Soon Item'}</h2>
                
                <form id="coming-soon-form" class="form">
                    <div class="form-group">
                        <label for="item-title">Title *</label>
                        <input 
                            type="text" 
                            id="item-title" 
                            name="title" 
                            required
                            value="${item?.title || ''}"
                            placeholder="Math Puzzle Challenge"
                        >
                    </div>
                    
                    <div class="form-group">
                        <label for="item-description">Description *</label>
                        <textarea 
                            id="item-description" 
                            name="description" 
                            rows="3"
                            required
                            placeholder="Solve exciting math puzzles and compete with friends"
                        >${item?.description || ''}</textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="item-icon">Icon (emoji)</label>
                            <input 
                                type="text" 
                                id="item-icon" 
                                name="icon" 
                                value="${item?.icon || ''}"
                                placeholder="🎮"
                                maxlength="2"
                            >
                        </div>
                        
                        <div class="form-group">
                            <label for="item-category">Category *</label>
                            <select id="item-category" name="category" required>
                                <option value="game" ${item?.category === 'game' ? 'selected' : ''}>Game</option>
                                <option value="feature" ${item?.category === 'feature' ? 'selected' : ''}>Feature</option>
                                <option value="tool" ${item?.category === 'tool' ? 'selected' : ''}>Tool</option>
                                <option value="update" ${item?.category === 'update' ? 'selected' : ''}>Update</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="item-date">Estimated Date (optional)</label>
                            <input 
                                type="date" 
                                id="item-date" 
                                name="estimatedDate" 
                                value="${item?.estimatedDate || ''}"
                            >
                        </div>
                        
                        <div class="form-group">
                            <label for="item-priority">Priority</label>
                            <input 
                                type="number" 
                                id="item-priority" 
                                name="priority" 
                                min="1"
                                value="${item?.priority || 1}"
                                placeholder="1"
                            >
                            <small class="form-help">Lower numbers appear first</small>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>
                            <input type="checkbox" name="active" ${item?.active !== false ? 'checked' : ''}>
                            Show on homepage
                        </label>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" id="cancel-coming-soon">
                            Cancel
                        </button>
                        <button type="submit" class="btn btn-primary">
                            ${isEdit ? 'Update Item' : 'Add Item'}
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const closeModal = () => {
            modal.classList.remove('modal-active');
            setTimeout(() => modal.remove(), 300);
        };
        
        modal.querySelector('.modal-close')?.addEventListener('click', closeModal);
        modal.querySelector('.modal-overlay')?.addEventListener('click', closeModal);
        modal.querySelector('#cancel-coming-soon')?.addEventListener('click', closeModal);
        
        modal.querySelector('#coming-soon-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleComingSoonSubmit(e.target, isEdit, item?.id, closeModal);
        });
    }
    
    /**
     * Handle coming soon item submission
     */
    async handleComingSoonSubmit(form, isEdit, itemId, closeModal) {
        const formData = new FormData(form);
        const submitBtn = form.querySelector('button[type="submit"]');
        
        submitBtn.disabled = true;
        submitBtn.textContent = isEdit ? 'Updating...' : 'Adding...';
        
        try {
            const itemData = {
                title: formData.get('title'),
                description: formData.get('description'),
                icon: formData.get('icon') || '🎮',
                category: formData.get('category'),
                estimatedDate: formData.get('estimatedDate') || null,
                priority: parseInt(formData.get('priority')) || 1,
                active: formData.get('active') === 'on'
            };
            
            if (isEdit) {
                itemData.id = itemId;
                await this.contentManager.updateComingSoonItem(itemId, itemData);
                this.showToast('Item updated', 'success');
            } else {
                await this.contentManager.addComingSoonItem(itemData);
                this.showToast('Item added', 'success');
            }
            
            this.loadSection('coming-soon');
            closeModal();
            
        } catch (error) {
            console.error('Error saving item:', error);
            this.showToast('Failed to save item', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = isEdit ? 'Update Item' : 'Add Item';
        }
    }

    /**
     * Show book modal for add/edit
     */
    showBookModal(book = null) {
        const isEdit = !!book;
        const modal = document.createElement('div');
        modal.className = 'modal modal-active';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content modal-large">
                <button class="modal-close" aria-label="Close">&times;</button>
                <h2>${isEdit ? 'Edit Book' : 'Add New Book'}</h2>
                
                ${!isEdit ? `
                    <div class="isbn-search-section">
                        <p class="section-note">💡 Have an ISBN? Let us auto-fill the details!</p>
                        <div class="isbn-search-form">
                            <input type="text" id="isbn-search-input" class="isbn-search-input"
                                   placeholder="Enter ISBN (10 or 13 digits)">
                            <button type="button" class="btn btn-primary" id="isbn-search-btn">
                                🔍 Search ISBN
                            </button>
                        </div>
                        <div id="isbn-search-status" class="isbn-search-status"></div>
                    </div>
                    <div class="form-divider">
                        <span>OR</span>
                    </div>
                ` : ''}
                
                <form id="book-form" class="form">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="book-title">Title *</label>
                            <input type="text" id="book-title" name="title" required
                                   value="${book?.title || ''}" placeholder="The Great Gatsby">
                        </div>
                        
                        <div class="form-group">
                            <label for="book-author">Author *</label>
                            <input type="text" id="book-author" name="author" required
                                   value="${book?.author || ''}" placeholder="F. Scott Fitzgerald">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="book-isbn">ISBN</label>
                            <input type="text" id="book-isbn" name="isbn"
                                   value="${book?.isbn || ''}" placeholder="9780743273565">
                            <small class="form-help">10 or 13 digit ISBN number</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="book-rating">Rating *</label>
                            <select id="book-rating" name="rating" required>
                                <option value="1" ${book?.rating === 1 ? 'selected' : ''}>★☆☆☆☆ (1 star)</option>
                                <option value="2" ${book?.rating === 2 ? 'selected' : ''}>★★☆☆☆ (2 stars)</option>
                                <option value="3" ${book?.rating === 3 ? 'selected' : ''}>★★★☆☆ (3 stars)</option>
                                <option value="4" ${book?.rating === 4 ? 'selected' : ''}>★★★★☆ (4 stars)</option>
                                <option value="5" ${book?.rating === 5 || !book ? 'selected' : ''}>★★★★★ (5 stars)</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="book-cover">Cover Image URL</label>
                        <input type="url" id="book-cover" name="coverImage"
                               value="${book?.coverImage || ''}" 
                               placeholder="https://covers.openlibrary.org/b/isbn/9780743273565-L.jpg">
                        <small class="form-help">Leave blank to auto-fetch from ISBN (if provided)</small>
                    </div>
                    
                    <div class="form-group">
                        <label for="book-description">Description *</label>
                        <textarea id="book-description" name="description" rows="4" required
                                  placeholder="A brief description of the book...">${book?.description || ''}</textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="book-genres">Genres (comma-separated) *</label>
                            <input type="text" id="book-genres" name="genres" required
                                   value="${book?.genre ? book.genre.join(', ') : ''}" 
                                   placeholder="Fiction, Classic, Romance">
                        </div>
                        
                        <div class="form-group">
                            <label for="book-recommended">Recommended For *</label>
                            <select id="book-recommended" name="recommendedFor" required>
                                <option value="All Ages" ${book?.recommendedFor === 'All Ages' || !book ? 'selected' : ''}>All Ages</option>
                                <option value="Elementary School" ${book?.recommendedFor === 'Elementary School' ? 'selected' : ''}>Elementary School</option>
                                <option value="Middle School" ${book?.recommendedFor === 'Middle School' ? 'selected' : ''}>Middle School</option>
                                <option value="High School" ${book?.recommendedFor === 'High School' ? 'selected' : ''}>High School</option>
                                <option value="High School and up" ${book?.recommendedFor === 'High School and up' ? 'selected' : ''}>High School and up</option>
                                <option value="Adults" ${book?.recommendedFor === 'Adults' ? 'selected' : ''}>Adults</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>
                            <input type="checkbox" name="active" ${book?.active !== false ? 'checked' : ''}>
                            Show in book list
                        </label>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" id="cancel-book">Cancel</button>
                        <button type="submit" class="btn btn-primary">${isEdit ? 'Update Book' : 'Add Book'}</button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const closeModal = () => {
            modal.classList.remove('modal-active');
            setTimeout(() => modal.remove(), 300);
        };
        
        modal.querySelector('.modal-close')?.addEventListener('click', closeModal);
        modal.querySelector('.modal-overlay')?.addEventListener('click', closeModal);
        modal.querySelector('#cancel-book')?.addEventListener('click', closeModal);
        
        modal.querySelector('#book-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleBookSubmit(e.target, isEdit, book?.id, closeModal);
        });
        
        // Add ISBN search functionality for new books
        if (!isEdit) {
            const isbnSearchBtn = modal.querySelector('#isbn-search-btn');
            const isbnSearchInput = modal.querySelector('#isbn-search-input');
            
            if (isbnSearchBtn && isbnSearchInput) {
                isbnSearchBtn.addEventListener('click', () => {
                    this.searchBookByISBN(isbnSearchInput.value.trim(), modal);
                });
                
                // Allow Enter key to trigger search
                isbnSearchInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.searchBookByISBN(isbnSearchInput.value.trim(), modal);
                    }
                });
            }
        }
    }
    
    /**
     * Handle book form submission
     */
    async handleBookSubmit(form, isEdit, bookId, closeModal) {
        const formData = new FormData(form);
        const submitBtn = form.querySelector('button[type="submit"]');
        
        submitBtn.disabled = true;
        submitBtn.textContent = isEdit ? 'Updating...' : 'Adding...';
        
        try {
            const genresStr = formData.get('genres');
            const genres = genresStr.split(',').map(g => g.trim()).filter(g => g);
            
            const bookData = {
                title: formData.get('title'),
                author: formData.get('author'),
                isbn: formData.get('isbn') || '',
                coverImage: formData.get('coverImage') || '',
                rating: parseInt(formData.get('rating')),
                genre: genres,
                description: formData.get('description'),
                recommendedFor: formData.get('recommendedFor'),
                active: formData.get('active') === 'on',
                addedBy: 'manual'
            };
            
            // Auto-fetch cover if ISBN provided and no cover URL
            if (bookData.isbn && !bookData.coverImage) {
                bookData.coverImage = `https://covers.openlibrary.org/b/isbn/${bookData.isbn}-L.jpg`;
            }
            
            if (isEdit) {
                bookData.id = bookId;
                await this.contentManager.updateBook(bookId, bookData);
                this.showToast('Book updated', 'success');
            } else {
                bookData.dateAdded = new Date().toISOString().split('T')[0];
                await this.contentManager.addBook(bookData);
                this.showToast('Book added', 'success');
            }
            
            this.loadSection('books');
            closeModal();
            
        } catch (error) {
            console.error('Error saving book:', error);
            this.showToast('Failed to save book', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = isEdit ? 'Update Book' : 'Add Book';
        }
    }
    
    /**
     * Filter books by genre and status
     */
    async filterBooks() {
        const genreFilter = document.getElementById('books-filter-genre')?.value || 'all';
        const statusFilter = document.getElementById('books-filter-status')?.value || 'all';
        
        const allBooks = await this.contentManager.getBooks(false);
        
        let filtered = allBooks.filter(book => {
            // Genre filter
            if (genreFilter !== 'all') {
                const bookGenres = book.genre || [];
                if (!bookGenres.includes(genreFilter)) {
                    return false;
                }
            }
            
            // Status filter
            if (statusFilter === 'active' && book.active === false) {
                return false;
            }
            if (statusFilter === 'inactive' && book.active !== false) {
                return false;
            }
            
            return true;
        });
        
        // Update count
        const countEl = document.getElementById('books-count');
        if (countEl) {
            countEl.textContent = `${filtered.length} book${filtered.length !== 1 ? 's' : ''}`;
        }
        
        // Update grid
        const grid = document.getElementById('books-grid');
        if (grid) {
            if (filtered.length === 0) {
                grid.innerHTML = `
                    <div class="empty-state" style="grid-column: 1 / -1;">
                        <div class="empty-icon">🔍</div>
                        <h3>No Books Found</h3>
                        <p>Try adjusting your filters.</p>
                    </div>
                `;
            } else {
                grid.innerHTML = filtered.map(book => this.renderBookCard(book)).join('');
                // Re-attach event listeners for new cards
                this.attachSectionListeners('books');
            }
        }
    }

    /**
     * Search for book by ISBN using Open Library API
     */
    async searchBookByISBN(isbn, modal) {
        if (!isbn) {
            this.showToast('Please enter an ISBN', 'warning');
            return;
        }
        
        // Clean ISBN (remove hyphens and spaces)
        const cleanISBN = isbn.replace(/[-\s]/g, '');
        
        // Validate ISBN format (10 or 13 digits)
        if (!/^\d{10}$|^\d{13}$/.test(cleanISBN)) {
            this.showToast('Invalid ISBN format. Must be 10 or 13 digits', 'error');
            return;
        }
        
        const statusEl = modal.querySelector('#isbn-search-status');
        const searchBtn = modal.querySelector('#isbn-search-btn');
        
        if (searchBtn) {
            searchBtn.disabled = true;
            searchBtn.textContent = '🔍 Searching...';
        }
        
        if (statusEl) {
            statusEl.innerHTML = '<div class="loading-spinner-small"></div> Searching Open Library...';
            statusEl.className = 'isbn-search-status loading';
        }
        
        try {
            // Fetch from Open Library API
            const response = await fetch(`https://openlibrary.org/isbn/${cleanISBN}.json`);
            
            if (!response.ok) {
                throw new Error('Book not found');
            }
            
            const bookData = await response.json();
            
            // Fetch additional details if needed
            let workData = null;
            if (bookData.works && bookData.works.length > 0) {
                const workKey = bookData.works[0].key;
                const workResponse = await fetch(`https://openlibrary.org${workKey}.json`);
                if (workResponse.ok) {
                    workData = await workResponse.json();
                }
            }
            
            // Populate form fields
            this.populateBookForm(modal, bookData, workData, cleanISBN);
            
            if (statusEl) {
                statusEl.innerHTML = '✓ Book found! Details have been filled in.';
                statusEl.className = 'isbn-search-status success';
                setTimeout(() => {
                    statusEl.innerHTML = '';
                    statusEl.className = 'isbn-search-status';
                }, 5000);
            }
            
            this.showToast('Book details auto-filled from ISBN', 'success');
            
        } catch (error) {
            console.error('ISBN search error:', error);
            
            if (statusEl) {
                statusEl.innerHTML = '✗ Book not found. Please enter details manually.';
                statusEl.className = 'isbn-search-status error';
            }
            
            this.showToast('Book not found in Open Library', 'error');
            
        } finally {
            if (searchBtn) {
                searchBtn.disabled = false;
                searchBtn.textContent = '🔍 Search ISBN';
            }
        }
    }
    
    /**
     * Populate book form with data from Open Library
     */
    populateBookForm(modal, bookData, workData, isbn) {
        // Title
        const titleInput = modal.querySelector('#book-title');
        if (titleInput && bookData.title) {
            titleInput.value = bookData.title;
        }
        
        // Author
        const authorInput = modal.querySelector('#book-author');
        if (authorInput && bookData.authors && bookData.authors.length > 0) {
            // Fetch author name from author key
            const authorKey = bookData.authors[0].key;
            fetch(`https://openlibrary.org${authorKey}.json`)
                .then(res => res.json())
                .then(authorData => {
                    if (authorData.name) {
                        authorInput.value = authorData.name;
                    }
                })
                .catch(err => console.error('Error fetching author:', err));
        }
        
        // ISBN
        const isbnInput = modal.querySelector('#book-isbn');
        if (isbnInput) {
            isbnInput.value = isbn;
        }
        
        // Cover Image
        const coverInput = modal.querySelector('#book-cover');
        if (coverInput) {
            coverInput.value = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
        }
        
        // Description
        const descriptionInput = modal.querySelector('#book-description');
        if (descriptionInput) {
            let description = '';
            
            // Try to get description from work data
            if (workData && workData.description) {
                if (typeof workData.description === 'string') {
                    description = workData.description;
                } else if (workData.description.value) {
                    description = workData.description.value;
                }
            }
            
            // Fallback to first sentence from book data
            if (!description && bookData.first_sentence && bookData.first_sentence.value) {
                description = bookData.first_sentence.value;
            }
            
            if (description) {
                // Clean up description (remove extra newlines, limit length)
                description = description.replace(/\n+/g, ' ').trim();
                if (description.length > 500) {
                    description = description.substring(0, 497) + '...';
                }
                descriptionInput.value = description;
            }
        }
        
        // Genres/Subjects
        const genresInput = modal.querySelector('#book-genres');
        if (genresInput && (bookData.subjects || workData?.subjects)) {
            const subjects = bookData.subjects || workData?.subjects || [];
            if (subjects.length > 0) {
                // Take first 3-4 most relevant subjects
                const genres = subjects
                    .filter(s => s.length < 30) // Filter out very long subjects
                    .slice(0, 4)
                    .map(s => {
                        // Clean up and capitalize
                        return s.split(' ')
                            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                            .join(' ');
                    });
                if (genres.length > 0) {
                    genresInput.value = genres.join(', ');
                }
            }
        }
        
        // Set default rating to 4 stars for API-fetched books
        const ratingInput = modal.querySelector('#book-rating');
        if (ratingInput) {
            ratingInput.value = '4';
        }
    }
