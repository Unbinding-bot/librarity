// Spelling Bee Game Implementation
import { showToast } from '../main.js';
import { getDisplayName } from '../components/visitor-logbook.js';
class SpellingBeeGame {
    constructor() {
        this.centerLetter = '';
        this.outerLetters = [];
        this.allLetters = [];
        this.currentInput = '';
        this.foundWords = new Set();
        this.validWords = new Set();
        this.pangrams = new Set();
        this.score = 0;
        this.maxScore = 0;
        this.mode = 'daily'; // 'daily' or 'random'
        
        // Rank thresholds (percentage of max score)
        this.ranks = [
            { name: 'Beginner', percent: 0 },
            { name: 'Good Start', percent: 2 },
            { name: 'Moving Up', percent: 5 },
            { name: 'Good', percent: 8 },
            { name: 'Solid', percent: 15 },
            { name: 'Nice', percent: 25 },
            { name: 'Great', percent: 40 },
            { name: 'Amazing', percent: 50 },
            { name: 'Genius', percent: 70 },
            { name: 'Queen Bee', percent: 100 }
        ];
        
        this.init();
    }

    async init() {
        await this.loadWordList();
        this.setupEventListeners();
        
        // Check if already played daily puzzle today
        const stats = this.loadStats();
        const today = this.getTodayString();
        if (this.mode === 'daily' && stats.lastPlayedDaily === today) {
            // Auto-switch to random mode if already played today
            this.mode = 'random';
            document.getElementById('dailyModeBtn').classList.remove('active');
            document.getElementById('randomModeBtn').classList.add('active');
        }
        
        await this.startGame();
        
        // Hide loading screen
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }

    async loadWordList() {
        try {
            // Load dictionary of valid words
            const response = await fetch('data/spelling-bee-words.json');
            const words = await response.json();
            this.wordList = words;
        } catch (error) {
            console.error('Error loading word list:', error);
            showToast('Error loading word list', 'error');
            // Fallback to basic word list
            this.wordList = ['BOOK', 'READ', 'GAME', 'PLAY', 'WORD', 'TEXT', 'PAGE', 'DESK'];
        }
    }

    setupEventListeners() {
        // Mode buttons
        document.getElementById('dailyModeBtn').addEventListener('click', () => this.changeMode('daily'));
        document.getElementById('randomModeBtn').addEventListener('click', () => this.changeMode('random'));
        
        // Icon buttons
        document.getElementById('statsBtn').addEventListener('click', () => this.showStats());
        document.getElementById('helpBtn').addEventListener('click', () => this.showHelp());
        
        // Input buttons
        document.getElementById('deleteBtn').addEventListener('click', () => this.deleteLetter());
        document.getElementById('shuffleBtn').addEventListener('click', () => this.shuffleLetters());
        document.getElementById('enterBtn').addEventListener('click', () => this.submitWord());
        
        // Physical keyboard
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.submitWord();
            } else if (e.key === 'Backspace') {
                this.deleteLetter();
            } else if (e.key === ' ') {
                e.preventDefault();
                this.shuffleLetters();
            } else if (e.key.match(/^[a-zA-Z]$/)) {
                const letter = e.key.toUpperCase();
                if (this.allLetters.includes(letter)) {
                    this.addLetter(letter);
                }
            }
        });
        
        // Word list toggle
        document.getElementById('toggleWordList').addEventListener('click', () => {
            const content = document.getElementById('wordListContent');
            const toggle = document.getElementById('toggleWordList');
            content.classList.toggle('collapsed');
            toggle.classList.toggle('open');
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
        document.getElementById('shareResultBtn')?.addEventListener('click', () => this.shareResult());
        document.getElementById('playAgainBtn')?.addEventListener('click', () => {
            // Check if daily mode and already played today
            if (this.mode === 'daily') {
                const stats = this.loadStats();
                const today = this.getTodayString();
                
                if (stats.lastPlayedDaily === today) {
                    // Auto-switch to random mode
                    showToast('Switching to Random Puzzle mode', 'info');
                    this.changeMode('random');
                    return;
                }
            }
            this.startGame();
        });
        
        // Toggle rank distribution
        document.getElementById('toggleRankDistribution')?.addEventListener('click', () => {
            const section = document.getElementById('rankDistributionSection');
            const button = document.getElementById('toggleRankDistribution');
            
            if (section.style.display === 'none') {
                section.style.display = 'block';
                button.textContent = 'Hide Best Ranks ▲';
                
                // Scroll to show the distribution
                setTimeout(() => {
                    section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 100);
            } else {
                section.style.display = 'none';
                button.textContent = 'Show Best Ranks ▼';
            }
        });
    }

    async startGame() {
        // Get puzzle based on mode
        if (this.mode === 'daily') {
            await this.loadDailyPuzzle();
        } else {
            this.generateRandomPuzzle();
        }
        
        // Reset game state
        this.currentInput = '';
        this.foundWords.clear();
        this.score = 0;
        
        // Calculate valid words and max score
        this.calculateValidWords();
        
        // Render UI
        this.renderHoneycomb();
        this.updateDisplay();
        this.updateProgress();
        this.updateWordList();
        
        console.log('Puzzle started:', this.centerLetter, this.outerLetters);
        console.log('Valid words:', this.validWords.size, 'Pangrams:', this.pangrams.size, 'Max score:', this.maxScore);
    }

    async loadDailyPuzzle() {
        try {
            // Check for daily override first
            const response = await fetch('data/daily-overrides.json');
            const data = await response.json();
            const overrides = data.overrides || data; // Handle both formats
            const today = this.getTodayString();
            
            const override = Array.isArray(overrides) ? overrides.find(o => 
                o.date === today && 
                (o.gameType === 'spelling_bee' || o.gameId === 'spelling_bee') && 
                o.active
            ) : null;
            
            if (override && override.challenge?.centerLetter && override.challenge?.outerLetters) {
                this.centerLetter = override.challenge.centerLetter.toUpperCase();
                this.outerLetters = override.challenge.outerLetters.toUpperCase().split('').slice(0, 6);
                this.allLetters = [this.centerLetter, ...this.outerLetters];
                return;
            } else if (override && override.centerLetter && override.outerLetters) {
                this.centerLetter = override.centerLetter.toUpperCase();
                this.outerLetters = override.outerLetters.toUpperCase().split('').slice(0, 6);
                this.allLetters = [this.centerLetter, ...this.outerLetters];
                return;
            }
        } catch (error) {
            console.error('Error loading daily overrides:', error);
        }
        
        // Generate based on date seed
        const today = new Date();
        const start = new Date('2024-01-01');
        const daysSinceStart = Math.floor((today - start) / (1000 * 60 * 60 * 24));
        
        // Use seed to select letters
        const seed = daysSinceStart;
        this.generatePuzzleFromSeed(seed);
    }

    generatePuzzleFromSeed(seed) {
        // Common letter combinations that work well
        const puzzles = [
            { center: 'E', outer: ['R', 'A', 'T', 'I', 'N', 'G'] },
            { center: 'A', outer: ['R', 'E', 'T', 'I', 'N', 'G'] },
            { center: 'T', outer: ['R', 'E', 'A', 'I', 'N', 'G'] },
            { center: 'I', outer: ['R', 'E', 'A', 'T', 'N', 'G'] },
            { center: 'O', outer: ['R', 'A', 'T', 'I', 'N', 'G'] },
            { center: 'R', outer: ['E', 'A', 'T', 'I', 'N', 'G'] },
            { center: 'S', outer: ['E', 'A', 'R', 'T', 'I', 'N'] },
            { center: 'L', outer: ['E', 'A', 'R', 'T', 'I', 'N'] },
            { center: 'D', outer: ['E', 'A', 'R', 'T', 'I', 'N'] },
            { center: 'C', outer: ['E', 'A', 'R', 'T', 'I', 'N'] },
        ];
        
        const puzzle = puzzles[seed % puzzles.length];
        this.centerLetter = puzzle.center;
        this.outerLetters = puzzle.outer;
        this.allLetters = [this.centerLetter, ...this.outerLetters];
    }

    generateRandomPuzzle() {
        // Generate random puzzle
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const letters = [];
        
        // Select 7 random unique letters
        while (letters.length < 7) {
            const letter = alphabet[Math.floor(Math.random() * alphabet.length)];
            if (!letters.includes(letter)) {
                letters.push(letter);
            }
        }
        
        this.centerLetter = letters[0];
        this.outerLetters = letters.slice(1);
        this.allLetters = letters;
    }

    calculateValidWords() {
        this.validWords.clear();
        this.pangrams.clear();
        this.maxScore = 0;
        
        // Check each word in dictionary
        this.wordList.forEach(word => {
            const upperWord = word.toUpperCase();
            
            // Must be at least 4 letters
            if (upperWord.length < 4) return;
            
            // Must contain center letter
            if (!upperWord.includes(this.centerLetter)) return;
            
            // Must only use available letters
            const wordLetters = upperWord.split('');
            const isValid = wordLetters.every(letter => this.allLetters.includes(letter));
            
            if (isValid) {
                this.validWords.add(upperWord);
                
                // Check if pangram (uses all 7 letters)
                const uniqueLetters = [...new Set(wordLetters)];
                if (uniqueLetters.length === 7) {
                    this.pangrams.add(upperWord);
                }
                
                // Calculate score
                const wordScore = this.calculateWordScore(upperWord);
                this.maxScore += wordScore;
            }
        });
    }

    calculateWordScore(word) {
        // 4-letter words: 1 point
        // Longer words: 1 point per letter
        // Pangrams: +7 bonus points
        let score = word.length === 4 ? 1 : word.length;
        
        // Pangram bonus
        const uniqueLetters = [...new Set(word.split(''))];
        if (uniqueLetters.length === 7) {
            score += 7;
        }
        
        return score;
    }

    renderHoneycomb() {
        const container = document.getElementById('honeycomb');
        container.innerHTML = '';
        
        // Arrange letters in honeycomb pattern
        // Row 1: 2 letters
        // Row 2: 3 letters (with center)
        // Row 3: 2 letters
        
        const arrangement = [
            [this.outerLetters[0], this.outerLetters[1]],
            [this.outerLetters[2], this.centerLetter, this.outerLetters[3]],
            [this.outerLetters[4], this.outerLetters[5]]
        ];
        
        arrangement.forEach(row => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'honeycomb-row';
            
            row.forEach(letter => {
                const cell = document.createElement('div');
                cell.className = 'hex-cell';
                if (letter === this.centerLetter) {
                    cell.classList.add('center');
                }
                
                cell.innerHTML = `
                    <div class="hex-shape">
                        <div class="hex-letter">${letter}</div>
                    </div>
                `;
                
                cell.addEventListener('click', () => this.addLetter(letter));
                
                rowDiv.appendChild(cell);
            });
            
            container.appendChild(rowDiv);
        });
    }

    addLetter(letter) {
        this.currentInput += letter;
        this.updateDisplay();
        
        // Animate hex cell
        const cells = document.querySelectorAll('.hex-cell');
        cells.forEach(cell => {
            if (cell.textContent.includes(letter)) {
                cell.classList.add('clicked');
                setTimeout(() => cell.classList.remove('clicked'), 300);
            }
        });
    }

    deleteLetter() {
        if (this.currentInput.length > 0) {
            this.currentInput = this.currentInput.slice(0, -1);
            this.updateDisplay();
        }
    }

    shuffleLetters() {
        // Shuffle outer letters (keep center in place)
        const shuffled = [...this.outerLetters];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        this.outerLetters = shuffled;
        this.allLetters = [this.centerLetter, ...this.outerLetters];
        this.renderHoneycomb();
        
        // Animate shuffle
        showToast('Letters shuffled!', 'info');
    }

    submitWord() {
        const word = this.currentInput.toUpperCase();
        
        // Validation
        if (word.length < 4) {
            showToast('Too short! Words must be at least 4 letters.', 'error');
            this.shakeInput();
            return;
        }
        
        if (!word.includes(this.centerLetter)) {
            showToast(`Must include center letter: ${this.centerLetter}`, 'error');
            this.shakeInput();
            return;
        }
        
        if (this.foundWords.has(word)) {
            showToast('Already found!', 'error');
            this.shakeInput();
            return;
        }
        
        if (!this.validWords.has(word)) {
            showToast('Not in word list', 'error');
            this.shakeInput();
            return;
        }
        
        // Valid word!
        this.foundWords.add(word);
        const wordScore = this.calculateWordScore(word);
        this.score += wordScore;
        
        // Check if pangram
        if (this.pangrams.has(word)) {
            showToast(`🎉 PANGRAM! +${wordScore} points!`, 'success');
        } else {
            showToast(`+${wordScore} point${wordScore > 1 ? 's' : ''}!`, 'success');
        }
        
        // Clear input
        this.currentInput = '';
        this.updateDisplay();
        this.updateProgress();
        this.updateWordList();
        
        // Check if Queen Bee
        if (this.foundWords.size === this.validWords.size) {
            setTimeout(() => this.showResult(), 1000);
        }
    }

    shakeInput() {
        const display = document.getElementById('inputDisplay');
        display.style.animation = 'shake 0.5s ease-in-out';
        setTimeout(() => {
            display.style.animation = '';
        }, 500);
    }

    updateDisplay() {
        document.getElementById('inputDisplay').textContent = this.currentInput || '\u00A0';
        document.getElementById('scoreValue').textContent = this.score;
        document.getElementById('wordsFoundValue').textContent = this.foundWords.size;
        
        // Count pangrams found
        const pangramsFound = Array.from(this.foundWords).filter(w => this.pangrams.has(w)).length;
        document.getElementById('pangramsValue').textContent = pangramsFound;
    }

    updateProgress() {
        const percent = this.maxScore > 0 ? (this.score / this.maxScore) * 100 : 0;
        
        // Update progress bar
        const fill = document.getElementById('progressFill');
        fill.style.width = `${Math.min(percent, 100)}%`;
        
        // Update rank
        let currentRank = this.ranks[0];
        for (const rank of this.ranks) {
            if (percent >= rank.percent) {
                currentRank = rank;
            }
        }
        
        document.getElementById('currentRank').textContent = currentRank.name;
        document.getElementById('progressPercent').textContent = `${Math.round(percent)}%`;
        
        // Create markers
        const markers = document.getElementById('progressMarkers');
        markers.innerHTML = '';
        this.ranks.forEach(rank => {
            if (rank.percent > 0 && rank.percent < 100) {
                const marker = document.createElement('div');
                marker.className = 'progress-marker';
                marker.style.left = `${rank.percent}%`;
                markers.appendChild(marker);
            }
        });
    }

    updateWordList() {
        const empty = document.getElementById('wordListEmpty');
        const grid = document.getElementById('wordListGrid');
        const count = document.getElementById('wordCount');
        
        count.textContent = this.foundWords.size;
        
        if (this.foundWords.size === 0) {
            empty.style.display = 'block';
            grid.style.display = 'none';
        } else {
            empty.style.display = 'none';
            grid.style.display = 'grid';
            
            // Sort words alphabetically
            const sortedWords = Array.from(this.foundWords).sort();
            
            grid.innerHTML = '';
            sortedWords.forEach(word => {
                const chip = document.createElement('div');
                chip.className = 'word-chip';
                if (this.pangrams.has(word)) {
                    chip.classList.add('pangram');
                }
                chip.textContent = word;
                grid.appendChild(chip);
            });
        }
    }

    changeMode(mode) {
        if (this.mode === mode) return;
        
        this.mode = mode;
        
        // Update UI
        document.getElementById('dailyModeBtn').classList.toggle('active', mode === 'daily');
        document.getElementById('randomModeBtn').classList.toggle('active', mode === 'random');
        
        // Start new game
        this.startGame();
        
        showToast(`Switched to ${mode === 'daily' ? 'Daily Puzzle' : 'Random Puzzle'} mode`, 'success');
    }

    getTodayString() {
        const today = new Date();
        return today.toISOString().split('T')[0]; // YYYY-MM-DD
    }

    showResult() {
        const percent = this.maxScore > 0 ? (this.score / this.maxScore) * 100 : 0;
        
        // Determine rank
        let finalRank = this.ranks[0];
        for (const rank of this.ranks) {
            if (percent >= rank.percent) {
                finalRank = rank;
            }
        }
        
        // Update result modal
        document.getElementById('resultRank').textContent = finalRank.name;
        document.getElementById('resultScore').textContent = this.score;
        document.getElementById('resultWords').textContent = this.foundWords.size;
        
        const pangramsFound = Array.from(this.foundWords).filter(w => this.pangrams.has(w)).length;
        document.getElementById('resultPangrams').textContent = pangramsFound;
        document.getElementById('resultPercent').textContent = `${Math.round(percent)}%`;
        
        // Update stats
        this.updateStats(finalRank.name);
        
        // Submit score to leaderboard (daily mode only)
        if (this.mode === 'daily') {
            this.submitScore();
        }
        
        this.showModal('resultModal');
    }

    shareResult() {
        const percent = this.maxScore > 0 ? (this.score / this.maxScore) * 100 : 0;
        let finalRank = this.ranks[0];
        for (const rank of this.ranks) {
            if (percent >= rank.percent) {
                finalRank = rank;
            }
        }
        
        const pangramsFound = Array.from(this.foundWords).filter(w => this.pangrams.has(w)).length;
        
        let text = `🐝 Spelling Bee ${this.mode === 'daily' ? '(Daily)' : '(Random)'}\n\n`;
        text += `Rank: ${finalRank.name}\n`;
        text += `Score: ${this.score}/${this.maxScore}\n`;
        text += `Words: ${this.foundWords.size}/${this.validWords.size}\n`;
        text += `Pangrams: ${pangramsFound}/${this.pangrams.size}\n\n`;
        text += `By Unbinding`;
        
        navigator.clipboard.writeText(text).then(() => {
            showToast('Result copied to clipboard!', 'success');
        }).catch(() => {
            showToast('Failed to copy result', 'error');
        });
    }

    // Stats Management
    loadStats() {
        const defaultStats = {
            puzzlesPlayed: 0,
            queenBees: 0,
            totalWordsFound: 0,
            totalScore: 0,
            rankCounts: {},
            lastPlayedDaily: null,
            lastPlayedRandom: null
        };
        
        const saved = localStorage.getItem('spelling_bee_stats');
        return saved ? { ...defaultStats, ...JSON.parse(saved) } : defaultStats;
    }

    saveStats(stats) {
        localStorage.setItem('spelling_bee_stats', JSON.stringify(stats));
    }

    updateStats(rank) {
        const stats = this.loadStats();
        
        stats.puzzlesPlayed++;
        stats.totalWordsFound += this.foundWords.size;
        stats.totalScore += this.score;
        
        if (rank === 'Queen Bee') {
            stats.queenBees++;
        }
        
        // Track rank counts
        if (!stats.rankCounts[rank]) {
            stats.rankCounts[rank] = 0;
        }
        stats.rankCounts[rank]++;
        
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
        document.getElementById('statPuzzlesPlayed').textContent = stats.puzzlesPlayed;
        document.getElementById('statQueenBees').textContent = stats.queenBees;
        document.getElementById('statTotalWords').textContent = stats.totalWordsFound;
        
        const avgScore = stats.puzzlesPlayed > 0 
            ? Math.round(stats.totalScore / stats.puzzlesPlayed) 
            : 0;
        document.getElementById('statAvgScore').textContent = avgScore;
        
        // Update rank distribution
        const chart = document.getElementById('rankDistribution');
        chart.innerHTML = '';
        
        const maxCount = Math.max(...Object.values(stats.rankCounts), 1);
        
        this.ranks.forEach(rank => {
            const count = stats.rankCounts[rank.name] || 0;
            const percent = (count / maxCount) * 100;
            
            const row = document.createElement('div');
            row.className = 'rank-bar';
            
            const label = document.createElement('div');
            label.className = 'rank-bar-label';
            label.textContent = rank.name;
            
            const bar = document.createElement('div');
            bar.className = 'rank-bar-fill';
            bar.style.width = `${Math.max(percent, 10)}%`;
            bar.textContent = count;
            
            row.appendChild(label);
            row.appendChild(bar);
            chart.appendChild(row);
        });
        
        this.showModal('statsModal');
    }

    showHelp() {
        this.showModal('helpModal');
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            modal.style.animation = 'fadeIn 0.3s ease-in';
            
            // Auto-scroll to top of modal after it opens
            setTimeout(() => {
                const modalBody = modal.querySelector('.modal-body');
                if (modalBody) {
                    modalBody.scrollTop = 0;
                }
                // Scroll modal into view
                modal.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    async submitScore() {
        try {
            const username = getDisplayName();
            
            const { submitScore } = await import('../api/supabase.js');
            
            await submitScore({
                gameType: 'spelling_bee',
                gameMode: this.mode,
                playerName: username,
                score: this.score,
                timeTaken: null
            });
            
            showToast(`Score submitted as "${username}"!`, 'success');
        } catch (error) {
            console.error('Error submitting score:', error);
        }
    }
}

// Initialize game when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new SpellingBeeGame());
} else {
    new SpellingBeeGame();
}

export default SpellingBeeGame;
