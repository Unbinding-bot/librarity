// Flashcards Game
import { showToast } from '../main.js';

class FlashcardsGame {
    constructor() {
        this.decks = [];
        this.customDecks = [];
        this.currentDeck = null;
        this.currentCardIndex = 0;
        this.isFlipped = false;
        this.studyStartTime = null;
        this.editingDeckId = null;
        
        this.init();
    }

    async init() {
        await this.loadDecks();
        this.loadCustomDecks();
        this.setupEventListeners();
        this.renderDecks();
        this.loadStats();
        this.hideLoading();
    }

    async loadDecks() {
        try {
            const response = await fetch('data/flashcard-decks.json');
            if (!response.ok) throw new Error('Failed to load decks');
            this.decks = await response.json();
        } catch (error) {
            console.error('Error loading decks:', error);
            showToast('Failed to load flashcard decks', 'error');
            this.decks = [];
        }
    }

    loadCustomDecks() {
        const stored = localStorage.getItem('customFlashcardDecks');
        this.customDecks = stored ? JSON.parse(stored) : [];
    }

    saveCustomDecks() {
        localStorage.setItem('customFlashcardDecks', JSON.stringify(this.customDecks));
    }

    setupEventListeners() {
        // Setup screen
        document.getElementById('createDeckBtn').addEventListener('click', () => this.openCreateDeckModal());
        document.getElementById('manageDeckBtn').addEventListener('click', () => this.openManageDecksModal());
        document.getElementById('helpBtn').addEventListener('click', () => this.showModal('helpModal'));
        document.getElementById('statsBtn').addEventListener('click', () => this.showStats());
        
        // Study screen
        document.getElementById('backBtn').addEventListener('click', () => this.exitStudy());
        document.getElementById('flashcard').addEventListener('click', () => this.flipCard());
        document.getElementById('hardBtn').addEventListener('click', () => this.rateCard('hard'));
        document.getElementById('goodBtn').addEventListener('click', () => this.rateCard('good'));
        document.getElementById('easyBtn').addEventListener('click', () => this.rateCard('easy'));
        document.getElementById('prevBtn').addEventListener('click', () => this.previousCard());
        document.getElementById('nextBtn').addEventListener('click', () => this.nextCard());
        document.getElementById('shuffleBtn').addEventListener('click', () => this.shuffleDeck());
        document.getElementById('resetProgressBtn').addEventListener('click', () => this.resetProgress());
        
        // Completion screen
        document.getElementById('studyAgainBtn').addEventListener('click', () => this.studyAgain());
        document.getElementById('chooseDeckBtn').addEventListener('click', () => this.exitStudy());
        
        // Create deck modal
        document.getElementById('addCardBtn').addEventListener('click', () => this.addCardEditor());
        document.getElementById('saveDeckBtn').addEventListener('click', () => this.saveDeck());
        document.getElementById('cancelDeckBtn').addEventListener('click', () => this.closeModal('createDeckModal'));
        
        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modalId = e.target.dataset.modal;
                this.closeModal(modalId);
            });
        });

        // Close modals on outside click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });
    }

    renderDecks() {
        const grid = document.getElementById('decksGrid');
        grid.innerHTML = '';
        
        // Render built-in decks
        this.decks.forEach(deck => {
            const card = this.createDeckCard(deck, false);
            grid.appendChild(card);
        });
        
        // Render custom decks
        this.customDecks.forEach(deck => {
            const card = this.createDeckCard(deck, true);
            grid.appendChild(card);
        });
        
        if (this.decks.length === 0 && this.customDecks.length === 0) {
            grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">No decks available. Create a custom deck to get started!</p>';
        }
    }

    createDeckCard(deck, isCustom) {
        const card = document.createElement('div');
        card.className = 'deck-card';
        card.innerHTML = `
            <div class="deck-icon">${deck.icon || '📇'}</div>
            <div class="deck-name">${deck.name}</div>
            <div class="deck-info">
                <span class="deck-category">${deck.category}</span>
                <span>${deck.cards.length} cards</span>
            </div>
        `;
        card.addEventListener('click', () => this.startStudying(deck, isCustom));
        return card;
    }

    startStudying(deck, isCustom = false) {
        this.currentDeck = { ...deck, isCustom };
        this.currentCardIndex = 0;
        this.studyStartTime = Date.now();
        
        // Initialize or load card progress
        const progressKey = `flashcard_progress_${deck.id || deck.name}`;
        const savedProgress = localStorage.getItem(progressKey);
        
        if (savedProgress) {
            this.currentDeck.cards = JSON.parse(savedProgress);
        } else {
            // Initialize new cards
            this.currentDeck.cards = this.currentDeck.cards.map(card => ({
                ...card,
                status: 'new', // new, learning, mastered
                reviewCount: 0,
                lastReviewed: null
            }));
        }
        
        // Show study screen
        document.getElementById('setupScreen').style.display = 'none';
        document.getElementById('studyScreen').style.display = 'block';
        
        this.updateStudyUI();
        this.displayCard();
    }

    displayCard() {
        const card = this.currentDeck.cards[this.currentCardIndex];
        const flashcard = document.getElementById('flashcard');
        
        flashcard.classList.remove('flipped');
        this.isFlipped = false;
        
        document.getElementById('cardFront').textContent = card.front;
        document.getElementById('cardBack').textContent = card.back;
        
        this.updateStudyUI();
    }

    updateStudyUI() {
        document.getElementById('deckTitle').textContent = this.currentDeck.name;
        document.getElementById('cardProgress').textContent = 
            `Card ${this.currentCardIndex + 1} of ${this.currentDeck.cards.length}`;
        
        // Update status badges
        const counts = this.currentDeck.cards.reduce((acc, card) => {
            acc[card.status] = (acc[card.status] || 0) + 1;
            return acc;
        }, {});
        
        document.getElementById('masteredCount').textContent = counts.mastered || 0;
        document.getElementById('learningCount').textContent = counts.learning || 0;
        document.getElementById('newCount').textContent = counts.new || 0;
    }

    flipCard() {
        const flashcard = document.getElementById('flashcard');
        flashcard.classList.toggle('flipped');
        this.isFlipped = !this.isFlipped;
    }

    rateCard(rating) {
        if (!this.isFlipped) {
            showToast('Flip the card first to see the answer', 'warning');
            return;
        }
        
        const card = this.currentDeck.cards[this.currentCardIndex];
        card.reviewCount++;
        card.lastReviewed = Date.now();
        
        // Update status based on rating
        if (rating === 'hard') {
            card.status = 'learning';
        } else if (rating === 'good') {
            card.status = card.status === 'new' ? 'learning' : 'mastered';
        } else if (rating === 'easy') {
            card.status = 'mastered';
        }
        
        // Save progress
        this.saveProgress();
        
        // Move to next card or show completion
        if (this.currentCardIndex < this.currentDeck.cards.length - 1) {
            this.currentCardIndex++;
            this.displayCard();
        } else {
            this.showCompletion();
        }
    }

    previousCard() {
        if (this.currentCardIndex > 0) {
            this.currentCardIndex--;
            this.displayCard();
        }
    }

    nextCard() {
        if (this.currentCardIndex < this.currentDeck.cards.length - 1) {
            this.currentCardIndex++;
            this.displayCard();
        }
    }

    shuffleDeck() {
        this.currentDeck.cards = this.shuffleArray(this.currentDeck.cards);
        this.currentCardIndex = 0;
        this.displayCard();
        showToast('Deck shuffled!', 'success');
    }

    resetProgress() {
        if (confirm('Reset progress for this deck? All review data will be lost.')) {
            this.currentDeck.cards = this.currentDeck.cards.map(card => ({
                ...card,
                status: 'new',
                reviewCount: 0,
                lastReviewed: null
            }));
            this.saveProgress();
            this.currentCardIndex = 0;
            this.displayCard();
            showToast('Progress reset!', 'success');
        }
    }

    saveProgress() {
        const progressKey = `flashcard_progress_${this.currentDeck.id || this.currentDeck.name}`;
        localStorage.setItem(progressKey, JSON.stringify(this.currentDeck.cards));
        
        // Update stats
        this.updateGlobalStats();
    }

    updateGlobalStats() {
        const stats = this.loadStatsData();
        const deckKey = this.currentDeck.id || this.currentDeck.name;
        
        if (!stats.decks[deckKey]) {
            stats.decks[deckKey] = {
                name: this.currentDeck.name,
                totalCards: this.currentDeck.cards.length,
                masteredCards: 0,
                sessions: 0
            };
        }
        
        stats.decks[deckKey].masteredCards = this.currentDeck.cards.filter(c => c.status === 'mastered').length;
        
        localStorage.setItem('flashcardStats', JSON.stringify(stats));
    }

    showCompletion() {
        document.getElementById('studyScreen').style.display = 'none';
        document.getElementById('completionScreen').style.display = 'block';
        
        const studyTime = Math.floor((Date.now() - this.studyStartTime) / 1000);
        const minutes = Math.floor(studyTime / 60);
        const seconds = studyTime % 60;
        
        const masteredCount = this.currentDeck.cards.filter(c => c.status === 'mastered').length;
        
        document.getElementById('totalReviewed').textContent = this.currentDeck.cards.length;
        document.getElementById('masteredCards').textContent = masteredCount;
        document.getElementById('studyTime').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // Update stats
        const stats = this.loadStatsData();
        stats.totalSessions++;
        stats.totalStudyTime += studyTime;
        const deckKey = this.currentDeck.id || this.currentDeck.name;
        if (stats.decks[deckKey]) {
            stats.decks[deckKey].sessions++;
        }
        localStorage.setItem('flashcardStats', JSON.stringify(stats));
    }

    studyAgain() {
        this.currentCardIndex = 0;
        this.studyStartTime = Date.now();
        document.getElementById('completionScreen').style.display = 'none';
        document.getElementById('studyScreen').style.display = 'block';
        this.displayCard();
    }

    exitStudy() {
        document.getElementById('studyScreen').style.display = 'none';
        document.getElementById('completionScreen').style.display = 'none';
        document.getElementById('setupScreen').style.display = 'block';
        this.currentDeck = null;
    }

    // Create/Edit Custom Decks
    openCreateDeckModal(deck = null) {
        this.editingDeckId = deck ? deck.id : null;
        const modal = document.getElementById('createDeckModal');
        const title = document.getElementById('modalTitle');
        
        title.textContent = deck ? 'Edit Deck' : 'Create New Deck';
        
        if (deck) {
            document.getElementById('deckName').value = deck.name;
            document.getElementById('deckCategory').value = deck.category;
            
            const container = document.getElementById('cardsContainer');
            container.innerHTML = '';
            deck.cards.forEach(card => {
                this.addCardEditor(card.front, card.back);
            });
        } else {
            document.getElementById('deckName').value = '';
            document.getElementById('deckCategory').value = 'vocabulary';
            document.getElementById('cardsContainer').innerHTML = '';
            this.addCardEditor();
        }
        
        this.showModal('createDeckModal');
    }

    addCardEditor(front = '', back = '') {
        const container = document.getElementById('cardsContainer');
        const cardNum = container.children.length + 1;
        
        const editor = document.createElement('div');
        editor.className = 'card-editor';
        editor.innerHTML = `
            <div class="card-editor-header">
                <span class="card-editor-title">Card ${cardNum}</span>
                <button class="remove-card-btn">Remove</button>
            </div>
            <div class="card-inputs">
                <textarea class="form-textarea card-front" placeholder="Front (Question)">${front}</textarea>
                <textarea class="form-textarea card-back" placeholder="Back (Answer)">${back}</textarea>
            </div>
        `;
        
        editor.querySelector('.remove-card-btn').addEventListener('click', () => {
            editor.remove();
            this.renumberCards();
        });
        
        container.appendChild(editor);
    }

    renumberCards() {
        const editors = document.querySelectorAll('.card-editor');
        editors.forEach((editor, index) => {
            editor.querySelector('.card-editor-title').textContent = `Card ${index + 1}`;
        });
    }

    saveDeck() {
        const name = document.getElementById('deckName').value.trim();
        const category = document.getElementById('deckCategory').value;
        
        if (!name) {
            showToast('Please enter a deck name', 'error');
            return;
        }
        
        const editors = document.querySelectorAll('.card-editor');
        if (editors.length === 0) {
            showToast('Please add at least one card', 'error');
            return;
        }
        
        const cards = [];
        let hasError = false;
        
        editors.forEach(editor => {
            const front = editor.querySelector('.card-front').value.trim();
            const back = editor.querySelector('.card-back').value.trim();
            
            if (!front || !back) {
                hasError = true;
                return;
            }
            
            cards.push({ front, back });
        });
        
        if (hasError) {
            showToast('All cards must have both front and back', 'error');
            return;
        }
        
        const deck = {
            id: this.editingDeckId || `custom_${Date.now()}`,
            name,
            category,
            icon: '📝',
            cards
        };
        
        if (this.editingDeckId) {
            const index = this.customDecks.findIndex(d => d.id === this.editingDeckId);
            if (index !== -1) {
                this.customDecks[index] = deck;
            }
        } else {
            this.customDecks.push(deck);
        }
        
        this.saveCustomDecks();
        this.renderDecks();
        this.closeModal('createDeckModal');
        showToast('Deck saved successfully!', 'success');
    }

    openManageDecksModal() {
        const list = document.getElementById('customDecksList');
        
        if (this.customDecks.length === 0) {
            list.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No custom decks yet. Create one to get started!</p>';
        } else {
            list.innerHTML = '';
            this.customDecks.forEach(deck => {
                const item = document.createElement('div');
                item.className = 'custom-deck-item';
                item.innerHTML = `
                    <div class="custom-deck-info">
                        <h4>${deck.name}</h4>
                        <p>${deck.cards.length} cards • ${deck.category}</p>
                    </div>
                    <div class="custom-deck-actions">
                        <button class="btn btn-sm btn-secondary edit-btn">Edit</button>
                        <button class="btn btn-sm btn-secondary delete-btn">Delete</button>
                    </div>
                `;
                
                item.querySelector('.edit-btn').addEventListener('click', () => {
                    this.closeModal('manageDecksModal');
                    this.openCreateDeckModal(deck);
                });
                
                item.querySelector('.delete-btn').addEventListener('click', () => {
                    if (confirm(`Delete deck "${deck.name}"?`)) {
                        this.customDecks = this.customDecks.filter(d => d.id !== deck.id);
                        this.saveCustomDecks();
                        this.openManageDecksModal();
                        this.renderDecks();
                        showToast('Deck deleted', 'success');
                    }
                });
                
                list.appendChild(item);
            });
        }
        
        this.showModal('manageDecksModal');
    }

    // Statistics
    loadStatsData() {
        const stats = localStorage.getItem('flashcardStats');
        return stats ? JSON.parse(stats) : {
            totalCards: 0,
            masteredCards: 0,
            totalSessions: 0,
            totalStudyTime: 0,
            decks: {}
        };
    }

    loadStats() {
        // Just load the data, don't display yet
        this.stats = this.loadStatsData();
    }

    showStats() {
        const stats = this.loadStatsData();
        
        // Calculate total cards across all decks
        const allDecks = [...this.decks, ...this.customDecks];
        const totalCards = allDecks.reduce((sum, deck) => sum + deck.cards.length, 0);
        
        let totalMastered = 0;
        Object.values(stats.decks).forEach(deck => {
            totalMastered += deck.masteredCards || 0;
        });
        
        const hours = Math.floor(stats.totalStudyTime / 3600);
        const minutes = Math.floor((stats.totalStudyTime % 3600) / 60);
        
        document.getElementById('statTotalCards').textContent = totalCards;
        document.getElementById('statMasteredCards').textContent = totalMastered;
        document.getElementById('statStudySessions').textContent = stats.totalSessions;
        document.getElementById('statTotalTime').textContent = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        
        // Display deck progress
        const deckStatsEl = document.getElementById('deckStats');
        deckStatsEl.innerHTML = '';
        
        if (Object.keys(stats.decks).length === 0) {
            deckStatsEl.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No study sessions yet.</p>';
        } else {
            Object.values(stats.decks).forEach(deck => {
                const progress = (deck.masteredCards / deck.totalCards * 100).toFixed(0);
                
                const statDiv = document.createElement('div');
                statDiv.className = 'deck-stat';
                statDiv.innerHTML = `
                    <span class="deck-stat-name">${deck.name}</span>
                    <div class="deck-stat-progress">
                        <div class="progress-bar-small">
                            <div class="progress-fill-small" style="width: ${progress}%"></div>
                        </div>
                        <span>${deck.masteredCards}/${deck.totalCards}</span>
                    </div>
                `;
                deckStatsEl.appendChild(statDiv);
            });
        }
        
        this.showModal('statsModal');
    }

    // Utilities
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    showModal(modalId) {
        document.getElementById(modalId).style.display = 'flex';
    }

    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    hideLoading() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }
}

// Initialize game when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new FlashcardsGame());
} else {
    new FlashcardsGame();
}

export default FlashcardsGame;
