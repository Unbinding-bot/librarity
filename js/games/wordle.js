// Wordle Game Implementation
import { showToast } from '../main.js';
import ModalSystem from '../components/modal-system.js';
import { getDisplayName } from '../components/visitor-logbook.js';
import { lockSubmitButtons, resetSubmitButtons } from '../utils/submit-lock.js';

class WordleGame {
    constructor() {
        this.word = '';
        this.guesses = [];
        this.currentGuess = '';
        this.currentRow = 0;
        this.gameOver = false;
        this.mode = 'daily'; // 'daily' or 'random'
        this.maxGuesses = 6;
        this.wordLength = 5;
        this.validWords = [];
        this.targetWords = [];
        this.keyboardState = {}; // Track letter states
        this.isRevealing = false; // Block input during tile reveal animation

        // Unlimited mode state (random mode across multiple rounds)
        this.unlimitedActive = false;
        this.unlimitedRound  = 0;
        this.unlimitedScore  = 0;
        this.unlimitedStreak = 0;
        
        this.init();
    }

    async init() {
        await this.loadWordLists();
        this.setupEventListeners();
        this.createBoard();
        this.loadStats();
        
        // Check if already played daily challenge today
        const stats = this.loadStats();
        const today = this.getTodayString();
        if (this.mode === 'daily' && stats.lastPlayedDaily === today) {
            // Auto-switch to random mode if already played today
            this.mode = 'random';
            document.getElementById('dailyModeBtn').classList.remove('active');
            document.getElementById('randomModeBtn').classList.add('active');
            document.getElementById('modeDisplay').textContent = 'Random Word';
        }
        
        await this.startGame();
        
        // Hide loading screen
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }

    async loadWordLists() {
        try {
            // Load valid 5-letter words for validation
            const validResponse = await fetch('data/wordle-valid.json');
            this.validWords = await validResponse.json();
            
            // Load target words (answers)
            const targetResponse = await fetch('data/wordle-targets.json');
            this.targetWords = await targetResponse.json();
        } catch (error) {
            console.error('Error loading word lists:', error);
            showToast('Error loading word lists', 'error');
            
            // Fallback to basic word lists
            this.validWords = ['AUDIO', 'RAISE', 'STARE', 'LATER', 'IRATE', 'TEARS', 'ALONE'];
            this.targetWords = [...this.validWords];
        }
    }

    setupEventListeners() {
        // Mode buttons
        document.getElementById('dailyModeBtn').addEventListener('click', () => this.changeMode('daily'));
        document.getElementById('randomModeBtn').addEventListener('click', () => this.changeMode('random'));
        
        // Icon buttons
        document.getElementById('statsBtn').addEventListener('click', () => this.showStats());
        document.getElementById('helpBtn').addEventListener('click', () => this.showHelp());
        
        // Keyboard clicks
        document.querySelectorAll('.key').forEach(key => {
            key.addEventListener('click', () => {
                const letter = key.getAttribute('data-key');
                this.handleInput(letter);
            });
        });
        
        // Physical keyboard
        document.addEventListener('keydown', (e) => {
            if (this.gameOver) return;
            
            if (e.key === 'Enter') {
                this.handleInput('Enter');
            } else if (e.key === 'Backspace') {
                this.handleInput('Backspace');
            } else if (e.key.match(/^[a-zA-Z]$/)) {
                this.handleInput(e.key.toUpperCase());
            }
        });
        
        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                const modalId = btn.getAttribute('data-modal');
                this.closeModal(modalId);
            });
        });
        
        // Click outside modal to close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });
        
        // Result buttons
        document.getElementById('shareBtn')?.addEventListener('click', () => this.shareResult());
        document.getElementById('playAgainBtn')?.addEventListener('click', () => this.playAgain());
        document.getElementById('submitScoreBtn')?.addEventListener('click', () => {
            // lastAttempts === null  → unlimited session ended
            // lastAttempts === number → single game (win or lose)
            // lastAttempts === undefined → game not finished yet, block
            if (this.lastAttempts !== undefined) {
                this.submitScore(this.lastAttempts);
            } else {
                showToast('Finish the game first!', 'error');
            }
        });
        document.getElementById('resultClose')?.addEventListener('click', () => {
            ModalSystem.closeResult('gameResult');
            this.showActionBar();
        });

        // Action bar buttons
        document.getElementById('actionBarShareBtn')?.addEventListener('click', () => this.shareResult());
        document.getElementById('actionBarPlayAgainBtn')?.addEventListener('click', () => {
            this.hideActionBar();
            this.playAgain();
        });
        document.getElementById('actionBarRestartBtn')?.addEventListener('click', () => {
            if (confirm('Restart the game? Current progress will be lost.')) {
                this.hideActionBar();
                this.startGame();
            }
        });

        // End unlimited session
        document.getElementById('endSessionBtn')?.addEventListener('click', () => {
            if (this.unlimitedActive) {
                this.endUnlimitedSession();
            }
        });
        
        // Toggle guess distribution
        document.getElementById('toggleDistribution')?.addEventListener('click', () => {
            const section = document.getElementById('guessDistributionSection');
            const button = document.getElementById('toggleDistribution');
            
            if (section.style.display === 'none') {
                section.style.display = 'block';
                button.textContent = 'Hide Guess Distribution ▲';
                
                // Scroll to show the distribution
                setTimeout(() => {
                    section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 100);
            } else {
                section.style.display = 'none';
                button.textContent = 'Show Guess Distribution ▼';
            }
        });
        
        // Toggle help examples
        document.getElementById('toggleExamples')?.addEventListener('click', () => {
            const section = document.getElementById('helpExamplesSection');
            const button = document.getElementById('toggleExamples');
            
            if (section.style.display === 'none') {
                section.style.display = 'block';
                button.textContent = 'Hide Examples ▲';
                
                // Scroll to show the examples
                setTimeout(() => {
                    section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 100);
            } else {
                section.style.display = 'none';
                button.textContent = 'Show Examples ▼';
            }
        });
    }

    createBoard() {
        const board = document.getElementById('gameBoard');
        board.innerHTML = '';
        
        for (let i = 0; i < this.maxGuesses; i++) {
            const row = document.createElement('div');
            row.className = 'board-row';
            row.setAttribute('data-row', i);
            
            for (let j = 0; j < this.wordLength; j++) {
                const tile = document.createElement('div');
                tile.className = 'tile';
                tile.setAttribute('data-row', i);
                tile.setAttribute('data-col', j);
                row.appendChild(tile);
            }
            
            board.appendChild(row);
        }
    }

    async startGame() {
        // Reset per-round state
        this.guesses = [];
        this.currentGuess = '';
        this.currentRow = 0;
        this.gameOver = false;
        this.keyboardState = {};
        this.isRevealing = false;

        // Only hide action bar and reset submit on fresh starts (not mid-session rounds)
        if (!this.unlimitedActive) {
            this.hideActionBar();
            resetSubmitButtons();
        }

        // Get word based on mode
        if (this.mode === 'daily') {
            this.word = await this.getDailyWord();
        } else {
            // Start or continue unlimited session
            if (!this.unlimitedActive) {
                this.unlimitedActive = true;
                this.unlimitedRound  = 0;
                this.unlimitedScore  = 0;
                this.unlimitedStreak = 0;
            }
            this.unlimitedRound++;
            this.word = this.getRandomWord();
            this.updateUnlimitedBar();
            document.getElementById('unlimitedBar').style.display = 'flex';
        }

        // Reset board
        this.createBoard();
        this.resetKeyboard();
        this.updateDisplay();

        // Hide result overlay
        document.getElementById('gameResult').style.display = 'none';
    }

    updateUnlimitedBar() {
        document.getElementById('unlimitedRound').textContent  = this.unlimitedRound;
        document.getElementById('unlimitedScore').textContent  = this.unlimitedScore;
        document.getElementById('unlimitedStreak').textContent = this.unlimitedStreak;
    }

    async getDailyWord() {
        // Check for daily override first
        try {
            const response = await fetch('data/daily-overrides.json');
            const data = await response.json();
            const overrides = data.overrides || data; // Handle both formats
            const today = this.getTodayString();
            
            const override = Array.isArray(overrides) ? overrides.find(o => 
                o.date === today && 
                (o.gameType === 'wordle' || o.gameId === 'wordle') && 
                o.active
            ) : null;
            
            if (override && (override.challenge?.word || override.customWord)) {
                return (override.challenge?.word || override.customWord).toUpperCase();
            }
        } catch (error) {
            console.error('Error loading daily overrides:', error);
        }
        
        // Use date-based seed for daily word
        const today = new Date();
        const start = new Date('2024-01-01');
        const daysSinceStart = Math.floor((today - start) / (1000 * 60 * 60 * 24));
        const index = daysSinceStart % this.targetWords.length;
        
        return this.targetWords[index].toUpperCase();
    }

    getRandomWord() {
        const randomIndex = Math.floor(Math.random() * this.targetWords.length);
        return this.targetWords[randomIndex].toUpperCase();
    }

    getTodayString() {
        const today = new Date();
        return today.toISOString().split('T')[0]; // YYYY-MM-DD
    }

    handleInput(key) {
        if (this.gameOver) return;
        if (this.isRevealing) return; // block input during tile reveal animation
        
        if (key === 'Enter') {
            this.submitGuess();
        } else if (key === 'Backspace') {
            this.currentGuess = this.currentGuess.slice(0, -1);
            this.updateCurrentRow();
        } else if (this.currentGuess.length < this.wordLength) {
            this.currentGuess += key;
            this.updateCurrentRow();
        }
    }

    updateCurrentRow() {
        const tiles = document.querySelectorAll(`[data-row="${this.currentRow}"] .tile`);
        
        tiles.forEach((tile, index) => {
            if (index < this.currentGuess.length) {
                tile.textContent = this.currentGuess[index];
                tile.classList.add('filled');
            } else {
                tile.textContent = '';
                tile.classList.remove('filled');
            }
        });
    }

    async submitGuess() {
        // Guard against any path that bypasses handleInput checks
        if (this.gameOver) return;
        if (this.isRevealing) return;

        if (this.currentGuess.length === 0) {
            showToast('Type a word first', 'error');
            return;
        }

        if (this.currentGuess.length !== this.wordLength) {
            this.shakeTiles();
            showToast('Not enough letters', 'error');
            return;
        }
        
        if (!this.isValidWord(this.currentGuess)) {
            this.shakeTiles();
            showToast('Not in word list', 'error');
            return;
        }
        
        // Add guess to list
        this.guesses.push(this.currentGuess);
        
        // Reveal tiles with animation
        this.isRevealing = true;
        await this.revealTiles();
        this.isRevealing = false;
        
        // Update keyboard
        this.updateKeyboard();
        
        // Check win/lose
        if (this.currentGuess === this.word) {
            this.gameOver = true;
            await this.handleWin();
        } else if (this.currentRow === this.maxGuesses - 1) {
            this.gameOver = true;
            await this.handleLose();
        } else {
            // Move to next row
            this.currentRow++;
            this.currentGuess = '';
        }
        
        this.updateDisplay();
    }

    isValidWord(word) {
        // Check if word is in valid words list (case-insensitive)
        return this.validWords.some(w => w.toUpperCase() === word.toUpperCase());
    }

    shakeTiles() {
        const tiles = document.querySelectorAll(`[data-row="${this.currentRow}"] .tile`);
        tiles.forEach(tile => {
            tile.classList.add('shake');
            setTimeout(() => tile.classList.remove('shake'), 500);
        });
    }

    async revealTiles() {
        const tiles = document.querySelectorAll(`[data-row="${this.currentRow}"] .tile`);
        const guess = this.currentGuess;
        const result = this.checkGuess(guess);
        
        // Animate tiles one by one
        for (let i = 0; i < tiles.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 200));
            
            const tile = tiles[i];
            tile.classList.add(result[i]);
            
            // Update keyboard state
            const letter = guess[i];
            const currentState = this.keyboardState[letter];
            
            // Priority: correct > present > absent
            if (result[i] === 'correct') {
                this.keyboardState[letter] = 'correct';
            } else if (result[i] === 'present' && currentState !== 'correct') {
                this.keyboardState[letter] = 'present';
            } else if (!currentState) {
                this.keyboardState[letter] = result[i];
            }
        }
    }

    checkGuess(guess) {
        const result = Array(this.wordLength).fill('absent');
        const wordLetters = this.word.split('');
        const guessLetters = guess.split('');
        
        // First pass: mark correct letters
        for (let i = 0; i < this.wordLength; i++) {
            if (guessLetters[i] === wordLetters[i]) {
                result[i] = 'correct';
                wordLetters[i] = null; // Mark as used
                guessLetters[i] = null;
            }
        }
        
        // Second pass: mark present letters
        for (let i = 0; i < this.wordLength; i++) {
            if (guessLetters[i] !== null) {
                const index = wordLetters.indexOf(guessLetters[i]);
                if (index !== -1) {
                    result[i] = 'present';
                    wordLetters[index] = null; // Mark as used
                }
            }
        }
        
        return result;
    }

    updateKeyboard() {
        Object.entries(this.keyboardState).forEach(([letter, state]) => {
            const key = document.querySelector(`.key[data-key="${letter}"]`);
            if (key) {
                key.classList.remove('correct', 'present', 'absent');
                key.classList.add(state);
            }
        });
    }

    resetKeyboard() {
        document.querySelectorAll('.key').forEach(key => {
            key.classList.remove('correct', 'present', 'absent');
        });
    }

    async handleWin() {
        // Animate winning tiles
        const tiles = document.querySelectorAll(`[data-row="${this.currentRow}"] .tile`);
        tiles.forEach((tile, index) => {
            setTimeout(() => { tile.classList.add('win'); }, index * 100);
        });

        const attempts = this.currentRow + 1;
        this.lastAttempts = attempts;
        this.updateStats(true, attempts);

        if (this.mode === 'daily') {
            await this.submitScore(attempts);
            setTimeout(() => { this.showResult(true, attempts); }, 1000);
        } else {
            // Unlimited session — add points and auto-continue
            const roundPoints = (7 - attempts) * 100; // 600 for 1-guess, 100 for 6-guess
            const streakBonus = this.unlimitedStreak * 50;
            const earned = roundPoints + streakBonus;

            this.unlimitedScore  += earned;
            this.unlimitedStreak++;
            this.updateUnlimitedBar();

            showToast(`+${earned} pts (${roundPoints} base + ${streakBonus} streak bonus)`, 'success');

            // Brief pause then auto-start next round
            setTimeout(() => {
                this.startGame();
            }, 1800);
        }
    }

    async handleLose() {
        this.updateStats(false, this.maxGuesses + 1);
        this.lastAttempts = this.maxGuesses + 1; // enable submit button after loss

        if (this.unlimitedActive) {
            this.unlimitedStreak = 0;
            this.updateUnlimitedBar();
            // End the session and show total score
            setTimeout(() => { this.endUnlimitedSession(); }, 600);
        } else {
            setTimeout(() => { this.showResult(false, this.maxGuesses + 1); }, 500);
        }
    }

    endUnlimitedSession() {
        this.gameOver = true;

        // Show the result overlay with session totals
        const titleEl   = document.getElementById('resultTitle');
        const messageEl = document.getElementById('resultMessage');
        const statsEl   = document.getElementById('resultStats');
        const sessionEl = document.getElementById('unlimitedSessionScore');
        const scoreVal  = document.getElementById('sessionScoreValue');
        const roundsVal = document.getElementById('sessionRoundsValue');

        titleEl.textContent   = this.unlimitedRound > 1 ? '🎉 Session Over!' : '😔 Unlucky!';
        messageEl.textContent = `The word was: ${this.word}`;

        if (sessionEl) {
            sessionEl.style.display = 'block';
            scoreVal.textContent    = this.unlimitedScore;
            roundsVal.textContent   = `${this.unlimitedRound - 1} word${this.unlimitedRound - 1 !== 1 ? 's' : ''} solved`;
        }

        // Standard stats row
        const stats = this.loadStats();
        statsEl.innerHTML = `
            <div class="result-stat">
                <div class="result-stat-value">${stats.gamesPlayed}</div>
                <div class="result-stat-label">Played</div>
            </div>
            <div class="result-stat">
                <div class="result-stat-value">${stats.winRate}%</div>
                <div class="result-stat-label">Win Rate</div>
            </div>
            <div class="result-stat">
                <div class="result-stat-value">${stats.currentStreak}</div>
                <div class="result-stat-label">Streak</div>
            </div>
        `;

        // Set the score for submission
        this.lastAttempts = null; // mark as unlimited session
        ModalSystem.showResult('gameResult');

        // Reset unlimited state
        this.unlimitedActive = false;
        document.getElementById('unlimitedBar').style.display = 'none';
    }

    showResult(won, attempts) {
        const resultDiv = document.getElementById('gameResult');
        const titleEl = document.getElementById('resultTitle');
        const messageEl = document.getElementById('resultMessage');
        const statsEl = document.getElementById('resultStats');
        
        if (won) {
            titleEl.textContent = '🎉 Congratulations!';
            messageEl.textContent = `You solved it in ${attempts} ${attempts === 1 ? 'try' : 'tries'}!`;
        } else {
            titleEl.textContent = '😔 Game Over';
            messageEl.textContent = `The word was: ${this.word}`;
        }
        
        // Show stats
        const stats = this.loadStats();
        statsEl.innerHTML = `
            <div class="result-stat">
                <div class="result-stat-value">${stats.gamesPlayed}</div>
                <div class="result-stat-label">Played</div>
            </div>
            <div class="result-stat">
                <div class="result-stat-value">${stats.winRate}%</div>
                <div class="result-stat-label">Win Rate</div>
            </div>
            <div class="result-stat">
                <div class="result-stat-value">${stats.currentStreak}</div>
                <div class="result-stat-label">Streak</div>
            </div>
        `;
        
        ModalSystem.showResult('gameResult');

        // Also prep the action bar label so it's ready when popup is closed
        const label = won
            ? `Word: ${this.word} — solved in ${attempts} ${attempts === 1 ? 'try' : 'tries'}`
            : `The word was: ${this.word}`;
        const bar = document.getElementById('gameActionBar');
        const barLabel = document.getElementById('gameActionBarLabel');
        if (bar && barLabel) barLabel.textContent = label;
    }

    showActionBar() {
        const bar = document.getElementById('gameActionBar');
        if (bar) bar.style.display = 'flex';
    }

    hideActionBar() {
        const bar = document.getElementById('gameActionBar');
        if (bar) bar.style.display = 'none';
    }

    shareResult() {
        const attempts = this.guesses.length;
        const won = this.gameOver && this.currentGuess === this.word;
        
        // Create emoji grid
        let text = `Wordle ${this.mode === 'daily' ? '(Daily)' : '(Random)'} ${won ? attempts : 'X'}/${this.maxGuesses}\n\n`;
        
        this.guesses.forEach(guess => {
            const result = this.checkGuess(guess);
            result.forEach(state => {
                if (state === 'correct') text += '🟩';
                else if (state === 'present') text += '🟨';
                else text += '⬜';
            });
            text += '\n';
        });
        
        text += '\nBy Unbinding';
        
        // Copy to clipboard
        navigator.clipboard.writeText(text).then(() => {
            showToast('Score copied! 📋', 'success');
        }).catch(() => {
            showToast('Failed to copy', 'error');
        });
    }

    playAgain() {
        ModalSystem.closeResult('gameResult');

        // End any in-progress unlimited session cleanly
        this.unlimitedActive = false;
        document.getElementById('unlimitedBar').style.display = 'none';

        if (this.mode === 'daily') {
            const stats = this.loadStats();
            const today = this.getTodayString();
            if (stats.lastPlayedDaily === today) {
                showToast('Switching to Random Word mode', 'info');
                this.changeMode('random');
                return;
            }
        }

        this.hideActionBar();
        resetSubmitButtons();
        this.startGame();
    }

    changeMode(mode) {
        if (this.mode === mode) return;

        // Reset unlimited session when switching modes
        this.unlimitedActive = false;
        this.unlimitedRound  = 0;
        this.unlimitedScore  = 0;
        this.unlimitedStreak = 0;
        document.getElementById('unlimitedBar').style.display = 'none';

        this.mode = mode;
        
        // Update UI
        document.getElementById('dailyModeBtn').classList.toggle('active', mode === 'daily');
        document.getElementById('randomModeBtn').classList.toggle('active', mode === 'random');
        document.getElementById('modeDisplay').textContent = mode === 'daily' ? 'Daily Challenge' : 'Random Word';
        
        // Start new game
        this.startGame();
        
        showToast(`Switched to ${mode === 'daily' ? 'Daily Challenge' : 'Random Word'} mode`, 'success');
    }

    updateDisplay() {
        document.getElementById('guessesDisplay').textContent = `${this.guesses.length}/${this.maxGuesses}`;
    }

    // Stats Management
    loadStats() {
        const defaultStats = {
            gamesPlayed: 0,
            gamesWon: 0,
            winRate: 0,
            currentStreak: 0,
            maxStreak: 0,
            guessDistribution: [0, 0, 0, 0, 0, 0],
            lastPlayedDaily: null,
            lastPlayedRandom: null
        };
        
        const saved = localStorage.getItem('wordle_stats');
        return saved ? { ...defaultStats, ...JSON.parse(saved) } : defaultStats;
    }

    saveStats(stats) {
        localStorage.setItem('wordle_stats', JSON.stringify(stats));
    }

    updateStats(won, attempts) {
        const stats = this.loadStats();
        
        stats.gamesPlayed++;
        
        if (won) {
            stats.gamesWon++;
            stats.currentStreak++;
            stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
            stats.guessDistribution[attempts - 1]++;
        } else {
            stats.currentStreak = 0;
        }
        
        stats.winRate = Math.round((stats.gamesWon / stats.gamesPlayed) * 100);
        
        // Update last played date
        const today = this.getTodayString();
        if (this.mode === 'daily') {
            stats.lastPlayedDaily = today;
        } else {
            stats.lastPlayedRandom = today;
        }
        
        this.saveStats(stats);
    }

    showStats() {
        const stats = this.loadStats();
        
        // Update stat values
        document.getElementById('statPlayed').textContent = stats.gamesPlayed;
        document.getElementById('statWinRate').textContent = `${stats.winRate}%`;
        document.getElementById('statCurrentStreak').textContent = stats.currentStreak;
        document.getElementById('statMaxStreak').textContent = stats.maxStreak;
        
        // Update distribution chart
        const chart = document.getElementById('distributionChart');
        const maxValue = Math.max(...stats.guessDistribution, 1);
        
        chart.innerHTML = '';
        stats.guessDistribution.forEach((count, index) => {
            const row = document.createElement('div');
            row.className = 'distribution-row';
            
            const label = document.createElement('div');
            label.className = 'distribution-label';
            label.textContent = index + 1;
            
            const bar = document.createElement('div');
            bar.className = 'distribution-bar';
            bar.style.width = `${(count / maxValue) * 100}%`;
            bar.textContent = count;
            
            row.appendChild(label);
            row.appendChild(bar);
            chart.appendChild(row);
        });
        
        this.showModal('statsModal');
    }

    showHelp() {
        ModalSystem.showModal('helpModal');
    }

    showModal(modalId) {
        ModalSystem.showModal(modalId);
    }

    closeModal(modalId) {
        ModalSystem.closeModal(modalId);
    }

    async submitScore(attempts) {
        try {
            const { askForName } = await import('../components/visitor-logbook.js');
            const username = await askForName();
            if (!username) return; // user cancelled

            const { submitScore } = await import('../api/supabase.js');

            // For unlimited session: submit the total session score
            // For daily/random: score based on guesses (max 600, min 50 even on loss)
            const score = (this.lastAttempts === null)
                ? this.unlimitedScore
                : Math.max(50, (7 - Math.min(attempts, 6)) * 100);

            await submitScore({
                gameType: 'wordle',
                gameMode: this.mode,
                playerName: username,
                score: score,
                timeTaken: null
            });

            showToast(`Score submitted as "${username}"! ✅`, 'success');
            lockSubmitButtons();
        } catch (error) {
            console.error('Error submitting score:', error);
        }
    }
}

// Initialize game when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new WordleGame());
} else {
    new WordleGame();
}

export default WordleGame;
