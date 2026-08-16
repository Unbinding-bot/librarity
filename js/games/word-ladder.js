// Word Ladder Game Implementation
import { showToast } from '../main.js';
import { getDisplayName } from '../components/visitor-logbook.js';
class WordLadderGame {
    constructor() {
        this.startWord = '';
        this.endWord = '';
        this.currentPath = [];
        this.minSteps = 0;
        this.hintsUsed = 0;
        this.startTime = null;
        this.mode = 'daily'; // 'daily' or 'random'
        this.wordList = [];
        this.solution = [];
        
        this.init();
    }

    async init() {
        await this.loadWordList();
        this.setupEventListeners();
        await this.startGame();
        
        // Hide loading screen
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }

    async loadWordList() {
        try {
            const response = await fetch('data/word-ladder-words.json');
            this.wordList = await response.json();
        } catch (error) {
            console.error('Error loading word list:', error);
            showToast('Error loading word list', 'error');
            // Fallback to basic word list
            this.wordList = ['COLD', 'CORD', 'CARD', 'WARD', 'WARM', 'WORD', 'WORK', 'PORK', 'PORT', 'SORT'];
        }
    }

    setupEventListeners() {
        // Mode buttons
        document.getElementById('dailyModeBtn').addEventListener('click', () => this.changeMode('daily'));
        document.getElementById('randomModeBtn').addEventListener('click', () => this.changeMode('random'));
        
        // Icon buttons
        document.getElementById('statsBtn').addEventListener('click', () => this.showStats());
        document.getElementById('helpBtn').addEventListener('click', () => this.showHelp());
        
        // Input and action buttons
        document.getElementById('submitBtn').addEventListener('click', () => this.submitWord());
        document.getElementById('hintBtn').addEventListener('click', () => this.getHint());
        document.getElementById('undoBtn').addEventListener('click', () => this.undoStep());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetPuzzle());
        
        // Input field
        const input = document.getElementById('wordInput');
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.submitWord();
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
        document.getElementById('shareResultBtn')?.addEventListener('click', () => this.shareResult());
        document.getElementById('newPuzzleBtn')?.addEventListener('click', () => this.startGame());
    }

    async startGame() {
        // Get puzzle based on mode
        if (this.mode === 'daily') {
            await this.loadDailyPuzzle();
        } else {
            this.generateRandomPuzzle();
        }
        
        // Solve puzzle to get minimum steps
        this.solution = this.solvePuzzle(this.startWord, this.endWord);
        this.minSteps = this.solution.length - 1;
        
        // Reset game state
        this.currentPath = [this.startWord];
        this.hintsUsed = 0;
        this.startTime = Date.now();
        
        // Update UI
        this.updateDisplay();
        this.renderLadder();
        this.clearInput();
        this.clearMessage();
        
        console.log('Puzzle:', this.startWord, '→', this.endWord, 'Min steps:', this.minSteps);
        console.log('Solution:', this.solution);
    }

    async loadDailyPuzzle() {
        try {
            // Check for daily override first
            const response = await fetch('data/daily-overrides.json');
            const overridesData = await response.json();
            const overrides = Array.isArray(overridesData) ? overridesData : [];
            const today = this.getTodayString();
            
            const override = overrides.find(o => 
                o.date === today && 
                o.gameId === 'word_ladder' && 
                o.active
            );
            
            if (override && override.startWord && override.endWord) {
                this.startWord = override.startWord.toUpperCase();
                this.endWord = override.endWord.toUpperCase();
                return;
            }
        } catch (error) {
            console.error('Error loading daily overrides:', error);
        }
        
        // Generate based on date seed
        const today = new Date();
        const start = new Date('2024-01-01');
        const daysSinceStart = Math.floor((today - start) / (1000 * 60 * 60 * 24));
        
        this.generatePuzzleFromSeed(daysSinceStart);
    }

    generatePuzzleFromSeed(seed) {
        // Predefined puzzles with known solutions
        const puzzles = [
            { start: 'COLD', end: 'WARM' },
            { start: 'HEAD', end: 'TAIL' },
            { start: 'WORD', end: 'PLAY' },
            { start: 'LOVE', end: 'HATE' },
            { start: 'FOUR', end: 'FIVE' },
            { start: 'SLOW', end: 'FAST' },
            { start: 'DARK', end: 'LITE' },
            { start: 'GOOD', end: 'EVIL' },
            { start: 'HARD', end: 'EASY' },
            { start: 'POOR', end: 'RICH' }
        ];
        
        const puzzle = puzzles[seed % puzzles.length];
        this.startWord = puzzle.start;
        this.endWord = puzzle.end;
    }

    generateRandomPuzzle() {
        // Filter words of same length
        const fourLetterWords = this.wordList.filter(w => w.length === 4);
        
        // Try to find a good puzzle
        let attempts = 0;
        let found = false;
        
        while (!found && attempts < 50) {
            const idx1 = Math.floor(Math.random() * fourLetterWords.length);
            const idx2 = Math.floor(Math.random() * fourLetterWords.length);
            
            if (idx1 !== idx2) {
                const word1 = fourLetterWords[idx1];
                const word2 = fourLetterWords[idx2];
                
                // Check if solvable
                const solution = this.solvePuzzle(word1, word2);
                if (solution.length > 2 && solution.length < 10) {
                    this.startWord = word1;
                    this.endWord = word2;
                    found = true;
                }
            }
            
            attempts++;
        }
        
        // Fallback
        if (!found) {
            this.startWord = 'COLD';
            this.endWord = 'WARM';
        }
    }

    // BFS to solve word ladder
    solvePuzzle(start, end) {
        if (start === end) return [start];
        
        const queue = [[start]];
        const visited = new Set([start]);
        
        while (queue.length > 0) {
            const path = queue.shift();
            const word = path[path.length - 1];
            
            // Get all valid neighbors
            const neighbors = this.getNeighbors(word);
            
            for (const neighbor of neighbors) {
                if (neighbor === end) {
                    return [...path, neighbor];
                }
                
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    queue.push([...path, neighbor]);
                }
            }
        }
        
        return []; // No solution found
    }

    getNeighbors(word) {
        const neighbors = [];
        const wordArray = word.split('');
        
        // Try changing each letter
        for (let i = 0; i < wordArray.length; i++) {
            const original = wordArray[i];
            
            // Try all letters
            for (let c = 65; c <= 90; c++) { // A-Z
                const letter = String.fromCharCode(c);
                if (letter !== original) {
                    wordArray[i] = letter;
                    const newWord = wordArray.join('');
                    
                    if (this.isValidWord(newWord)) {
                        neighbors.push(newWord);
                    }
                }
            }
            
            wordArray[i] = original;
        }
        
        return neighbors;
    }

    isValidWord(word) {
        return this.wordList.includes(word.toUpperCase());
    }

    submitWord() {
        const input = document.getElementById('wordInput');
        const word = input.value.toUpperCase().trim();
        
        if (!word) {
            this.showMessage('Please enter a word', 'error');
            return;
        }
        
        // Validate word
        if (word.length !== this.startWord.length) {
            this.showMessage('Word must be same length as start word', 'error');
            input.classList.add('error');
            setTimeout(() => input.classList.remove('error'), 500);
            return;
        }
        
        if (!this.isValidWord(word)) {
            this.showMessage('Not a valid word', 'error');
            input.classList.add('error');
            setTimeout(() => input.classList.remove('error'), 500);
            return;
        }
        
        // Check if already used
        if (this.currentPath.includes(word)) {
            this.showMessage('Word already used', 'error');
            return;
        }
        
        // Check if only one letter changed
        const lastWord = this.currentPath[this.currentPath.length - 1];
        if (!this.isOneLetterDiff(lastWord, word)) {
            this.showMessage('You can only change one letter at a time', 'error');
            input.classList.add('error');
            setTimeout(() => input.classList.remove('error'), 500);
            return;
        }
        
        // Valid move!
        this.currentPath.push(word);
        this.clearInput();
        this.clearMessage();
        this.updateDisplay();
        this.renderLadder();
        
        // Check if solved
        if (word === this.endWord) {
            this.handleWin();
        }
    }

    isOneLetterDiff(word1, word2) {
        if (word1.length !== word2.length) return false;
        
        let diffCount = 0;
        for (let i = 0; i < word1.length; i++) {
            if (word1[i] !== word2[i]) {
                diffCount++;
            }
        }
        
        return diffCount === 1;
    }

    getHint() {
        if (this.currentPath[this.currentPath.length - 1] === this.endWord) {
            this.showMessage('Puzzle already solved!', 'info');
            return;
        }
        
        // Find next step in solution path
        const currentWord = this.currentPath[this.currentPath.length - 1];
        
        // Resolve from current position
        const pathFromHere = this.solvePuzzle(currentWord, this.endWord);
        
        if (pathFromHere.length > 1) {
            const nextWord = pathFromHere[1];
            this.showMessage(`💡 Hint: Try a word starting with "${nextWord[0]}"`, 'hint');
            this.hintsUsed++;
            this.updateDisplay();
        } else {
            this.showMessage('No hint available', 'info');
        }
    }

    undoStep() {
        if (this.currentPath.length <= 1) {
            this.showMessage('Cannot undo start word', 'error');
            return;
        }
        
        this.currentPath.pop();
        this.clearInput();
        this.clearMessage();
        this.updateDisplay();
        this.renderLadder();
        showToast('Step removed', 'success');
    }

    resetPuzzle() {
        if (confirm('Reset the puzzle? This will clear your progress.')) {
            this.currentPath = [this.startWord];
            this.hintsUsed = 0;
            this.startTime = Date.now();
            this.clearInput();
            this.clearMessage();
            this.updateDisplay();
            this.renderLadder();
            showToast('Puzzle reset', 'success');
        }
    }

    handleWin() {
        const elapsedTime = Math.floor((Date.now() - this.startTime) / 1000);
        const steps = this.currentPath.length - 1;
        const extraSteps = steps - this.minSteps;
        
        // Determine rating
        let rating = '⭐⭐⭐';
        let message = 'Puzzle solved!';
        
        if (extraSteps === 0) {
            rating = '⭐⭐⭐⭐⭐';
            message = 'Perfect solution!';
        } else if (extraSteps <= 2) {
            rating = '⭐⭐⭐⭐';
            message = 'Great job!';
        } else if (extraSteps <= 5) {
            rating = '⭐⭐⭐';
            message = 'Good work!';
        } else {
            rating = '⭐⭐';
            message = 'Puzzle complete!';
        }
        
        // Update stats
        this.updateStats(steps, elapsedTime, extraSteps === 0);
        
        // Submit score to leaderboard (daily mode only)
        if (this.mode === 'daily') {
            this.submitScore(steps, elapsedTime);
        }
        
        // Show result modal
        this.showResult(rating, message, steps, elapsedTime);
    }

    showResult(rating, message, steps, elapsedTime) {
        document.getElementById('resultRating').textContent = rating;
        document.getElementById('resultMessage').textContent = message;
        document.getElementById('resultSteps').textContent = steps;
        document.getElementById('resultMinSteps').textContent = this.minSteps;
        document.getElementById('resultTime').textContent = this.formatTime(elapsedTime);
        document.getElementById('resultHints').textContent = this.hintsUsed;
        
        // Show path
        const ladder = document.getElementById('resultLadder');
        ladder.innerHTML = '';
        this.currentPath.forEach((word, index) => {
            const rung = document.createElement('div');
            rung.className = 'rung';
            if (index === 0) rung.classList.add('start');
            if (index === this.currentPath.length - 1) rung.classList.add('end');
            
            rung.innerHTML = `
                <span class="rung-number">Step ${index}:</span>
                <span class="rung-word">${word}</span>
            `;
            ladder.appendChild(rung);
        });
        
        this.showModal('resultModal');
    }

    shareResult() {
        const steps = this.currentPath.length - 1;
        const extraSteps = steps - this.minSteps;
        
        let text = `🪜 Word Ladder ${this.mode === 'daily' ? '(Daily)' : '(Random)'}\n\n`;
        text += `${this.startWord} ➜ ${this.endWord}\n`;
        text += `Steps: ${steps}/${this.minSteps}`;
        if (extraSteps > 0) text += ` (+${extraSteps})`;
        text += `\n`;
        if (this.hintsUsed > 0) text += `Hints: ${this.hintsUsed}\n`;
        text += `\nBy Unbinding`;
        
        navigator.clipboard.writeText(text).then(() => {
            showToast('Result copied to clipboard!', 'success');
        }).catch(() => {
            showToast('Failed to copy result', 'error');
        });
    }

    updateDisplay() {
        document.getElementById('startWord').textContent = this.startWord;
        document.getElementById('endWord').textContent = this.endWord;
        document.getElementById('minSteps').textContent = this.minSteps || '?';
        document.getElementById('currentSteps').textContent = this.currentPath.length - 1;
        document.getElementById('hintsUsed').textContent = this.hintsUsed;
    }

    renderLadder() {
        const ladder = document.getElementById('ladder');
        ladder.innerHTML = '';
        
        // Render current path
        this.currentPath.forEach((word, index) => {
            const rung = this.createRung(word, index, false);
            if (index === 0) rung.classList.add('start');
            if (index === this.currentPath.length - 1 && word !== this.endWord) {
                rung.classList.add('current');
            }
            if (word === this.endWord) rung.classList.add('end');
            ladder.appendChild(rung);
        });
        
        // Add placeholder if not solved
        if (this.currentPath[this.currentPath.length - 1] !== this.endWord) {
            const placeholder = this.createRung('...', this.currentPath.length, true);
            ladder.appendChild(placeholder);
            
            const endRung = this.createRung(this.endWord, '?', false);
            endRung.classList.add('end');
            ladder.appendChild(endRung);
        }
    }

    createRung(word, index, isPlaceholder) {
        const rung = document.createElement('div');
        rung.className = 'rung';
        if (isPlaceholder) rung.classList.add('placeholder');
        
        let diff = '';
        if (index > 0 && !isPlaceholder && word !== '...') {
            const prevWord = this.currentPath[index - 1];
            diff = this.getDifference(prevWord, word);
        }
        
        rung.innerHTML = `
            <span class="rung-number">Step ${index}:</span>
            <span class="rung-word">${word}</span>
            ${diff ? `<span class="rung-diff">${diff}</span>` : ''}
        `;
        
        return rung;
    }

    getDifference(word1, word2) {
        for (let i = 0; i < word1.length; i++) {
            if (word1[i] !== word2[i]) {
                return `${word1[i]} → ${word2[i]}`;
            }
        }
        return '';
    }

    clearInput() {
        document.getElementById('wordInput').value = '';
    }

    showMessage(text, type) {
        const display = document.getElementById('messageDisplay');
        display.textContent = text;
        display.className = `message-display ${type}`;
    }

    clearMessage() {
        const display = document.getElementById('messageDisplay');
        display.textContent = '';
        display.className = 'message-display';
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    changeMode(mode) {
        if (this.mode === mode) return;
        
        this.mode = mode;
        
        // Update UI
        document.getElementById('dailyModeBtn').classList.toggle('active', mode === 'daily');
        document.getElementById('randomModeBtn').classList.toggle('active', mode === 'random');
        
        // Start new game
        this.startGame();
        
        showToast(`Switched to ${mode === 'daily' ? 'Daily Challenge' : 'Random Puzzle'} mode`, 'success');
    }

    getTodayString() {
        const today = new Date();
        return today.toISOString().split('T')[0]; // YYYY-MM-DD
    }

    // Stats Management
    loadStats() {
        const defaultStats = {
            puzzlesSolved: 0,
            perfectSolves: 0,
            totalSteps: 0,
            totalTime: 0,
            bestTime: null,
            efficiency: { perfect: 0, good: 0, okay: 0, other: 0 }
        };
        
        const saved = localStorage.getItem('word_ladder_stats');
        return saved ? { ...defaultStats, ...JSON.parse(saved) } : defaultStats;
    }

    saveStats(stats) {
        localStorage.setItem('word_ladder_stats', JSON.stringify(stats));
    }

    updateStats(steps, time, isPerfect) {
        const stats = this.loadStats();
        
        stats.puzzlesSolved++;
        stats.totalSteps += steps;
        stats.totalTime += time;
        
        if (isPerfect) {
            stats.perfectSolves++;
            stats.efficiency.perfect++;
        } else {
            const extraSteps = steps - this.minSteps;
            if (extraSteps <= 2) {
                stats.efficiency.good++;
            } else if (extraSteps <= 5) {
                stats.efficiency.okay++;
            } else {
                stats.efficiency.other++;
            }
        }
        
        if (!stats.bestTime || time < stats.bestTime) {
            stats.bestTime = time;
        }
        
        this.saveStats(stats);
    }

    showStats() {
        const stats = this.loadStats();
        
        document.getElementById('statPuzzlesSolved').textContent = stats.puzzlesSolved;
        document.getElementById('statPerfectSolves').textContent = stats.perfectSolves;
        
        const avgSteps = stats.puzzlesSolved > 0 
            ? (stats.totalSteps / stats.puzzlesSolved).toFixed(1) 
            : 0;
        document.getElementById('statAvgSteps').textContent = avgSteps;
        
        const bestTime = stats.bestTime ? this.formatTime(stats.bestTime) : '--';
        document.getElementById('statBestTime').textContent = bestTime;
        
        // Efficiency chart
        const chart = document.getElementById('efficiencyChart');
        chart.innerHTML = '';
        
        const efficiencies = [
            { label: 'Perfect', count: stats.efficiency.perfect, color: '#4caf50' },
            { label: 'Good', count: stats.efficiency.good, color: '#8bc34a' },
            { label: 'Okay', count: stats.efficiency.okay, color: '#ffc107' },
            { label: 'Other', count: stats.efficiency.other, color: '#ff9800' }
        ];
        
        const maxCount = Math.max(...efficiencies.map(e => e.count), 1);
        
        efficiencies.forEach(eff => {
            const row = document.createElement('div');
            row.className = 'efficiency-bar';
            
            const label = document.createElement('div');
            label.className = 'efficiency-label';
            label.textContent = eff.label;
            
            const fill = document.createElement('div');
            fill.className = 'efficiency-fill';
            fill.style.width = `${(eff.count / maxCount) * 100}%`;
            fill.style.background = eff.color;
            fill.textContent = eff.count;
            
            row.appendChild(label);
            row.appendChild(fill);
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

    async submitScore(steps, time) {
        try {
            const username = getDisplayName();
            
            const { submitScore } = await import('../api/supabase.js');
            
            // Score: lower steps and time is better
            // Convert to higher-is-better: 10000 - (steps * 100 + time)
            const score = Math.max(0, 10000 - (steps * 100 + time));
            
            await submitScore({
                gameType: 'word_ladder',
                gameMode: this.mode,
                playerName: username,
                score: score,
                timeTaken: time
            });
            
            showToast(`Score submitted as "${username}"!`, 'success');
        } catch (error) {
            console.error('Error submitting score:', error);
        }
    }
}

// Initialize game when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new WordLadderGame());
} else {
    new WordLadderGame();
}

export default WordLadderGame;
