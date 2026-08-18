// Trivia Game
import { showToast } from '../main.js';
import { getDisplayName } from '../components/visitor-logbook.js';
import { lockSubmitButtons, resetSubmitButtons } from '../utils/submit-lock.js';

class TriviaGame {
    constructor() {
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.streak = 0;
        this.maxStreak = 0;
        this.correctCount = 0;
        this.answers = [];
        this.timer = 0;
        this.timerInterval = null;
        this.selectedCategory = 'all';
        this.selectedDifficulty = 'mixed';
        this.questionCount = 10;
        
        this.init();
    }

    async init() {
        await this.loadQuestions();
        this.setupEventListeners();
        this.loadStats();
        this.hideLoading();
    }

    async loadQuestions() {
        try {
            const response = await fetch('data/trivia-questions.json');
            if (!response.ok) throw new Error('Failed to load questions');
            this.allQuestions = await response.json();
        } catch (error) {
            console.error('Error loading questions:', error);
            showToast('Failed to load trivia questions', 'error');
            this.allQuestions = [];
        }
    }

    setupEventListeners() {
        // Setup screen
        document.getElementById('startBtn').addEventListener('click', () => this.startQuiz());
        document.getElementById('helpBtn').addEventListener('click', () => this.showModal('helpModal'));
        document.getElementById('statsBtn').addEventListener('click', () => this.showStats());
        
        // Game screen
        document.getElementById('quitBtn').addEventListener('click', () => this.quitQuiz());
        
        // Results screen
        document.getElementById('shareBtn').addEventListener('click', () => this.shareResult());
        document.getElementById('playAgainBtn').addEventListener('click', () => this.resetGame());
        document.getElementById('submitScoreBtn')?.addEventListener('click', () => this.submitScore());
        document.getElementById('resultsClose')?.addEventListener('click', () => {
            this.resetGame();
        });

        // Action bar buttons
        document.getElementById('actionBarShareBtn')?.addEventListener('click', () => this.shareResult());
        document.getElementById('actionBarPlayAgainBtn')?.addEventListener('click', () => {
            this.hideActionBar();
            this.resetGame();
        });
        document.getElementById('actionBarRestartBtn')?.addEventListener('click', () => {
            if (confirm('Start a new quiz? Current progress will be lost.')) {
                this.hideActionBar();
                this.resetGame();
            }
        });
        
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

        // Setup options
        document.getElementById('categorySelect').addEventListener('change', (e) => {
            this.selectedCategory = e.target.value;
        });
        
        document.getElementById('difficultySelect').addEventListener('change', (e) => {
            this.selectedDifficulty = e.target.value;
        });
        
        document.getElementById('questionCount').addEventListener('change', (e) => {
            this.questionCount = parseInt(e.target.value);
        });
    }

    startQuiz() {
        // Get options
        this.selectedCategory = document.getElementById('categorySelect').value;
        this.selectedDifficulty = document.getElementById('difficultySelect').value;
        this.questionCount = parseInt(document.getElementById('questionCount').value);

        // Filter questions
        let filteredQuestions = [...this.allQuestions];
        
        if (this.selectedCategory !== 'all') {
            filteredQuestions = filteredQuestions.filter(q => q.category === this.selectedCategory);
        }
        
        if (this.selectedDifficulty !== 'mixed') {
            filteredQuestions = filteredQuestions.filter(q => q.difficulty === this.selectedDifficulty);
        }

        // Check if we have enough questions
        if (filteredQuestions.length < this.questionCount) {
            showToast(`Not enough questions for selected filters (${filteredQuestions.length} available)`, 'error');
            return;
        }

        // Shuffle and select questions
        this.questions = this.shuffleArray(filteredQuestions).slice(0, this.questionCount);
        
        // Reset game state
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.streak = 0;
        this.maxStreak = 0;
        this.correctCount = 0;
        this.answers = [];
        this.timer = 0;
        
        // Show game screen
        document.getElementById('setupScreen').style.display = 'none';
        document.getElementById('gameScreen').style.display = 'block';
        
        // Start timer
        this.startTimer();
        
        // Display first question
        this.displayQuestion();
    }

    displayQuestion() {
        const question = this.questions[this.currentQuestionIndex];
        
        // Update progress
        const progress = ((this.currentQuestionIndex + 1) / this.questions.length) * 100;
        document.getElementById('progressFill').style.width = `${progress}%`;
        document.getElementById('progressText').textContent = `Question ${this.currentQuestionIndex + 1} of ${this.questions.length}`;
        
        // Update stats
        document.getElementById('scoreValue').textContent = this.score;
        document.getElementById('streakValue').textContent = this.streak;
        
        // Display question
        document.getElementById('questionCategory').textContent = this.formatCategory(question.category);
        const difficultyEl = document.getElementById('questionDifficulty');
        difficultyEl.textContent = question.difficulty.toUpperCase();
        difficultyEl.className = `question-difficulty ${question.difficulty}`;
        document.getElementById('questionText').textContent = question.question;
        
        // Display answers
        const answersGrid = document.getElementById('answersGrid');
        answersGrid.innerHTML = '';
        
        // Shuffle answers
        const shuffledAnswers = this.shuffleArray([...question.answers]);
        
        shuffledAnswers.forEach(answer => {
            const btn = document.createElement('button');
            btn.className = 'answer-btn';
            btn.textContent = answer;
            btn.addEventListener('click', () => this.selectAnswer(answer));
            answersGrid.appendChild(btn);
        });
    }

    selectAnswer(selectedAnswer) {
        const question = this.questions[this.currentQuestionIndex];
        const isCorrect = selectedAnswer === question.correct;
        
        // Disable all buttons
        const answerBtns = document.querySelectorAll('.answer-btn');
        answerBtns.forEach(btn => {
            btn.disabled = true;
            if (btn.textContent === question.correct) {
                btn.classList.add('correct');
            } else if (btn.textContent === selectedAnswer && !isCorrect) {
                btn.classList.add('incorrect');
            }
        });
        
        // Calculate score
        let points = 0;
        if (isCorrect) {
            // Base points by difficulty
            const basePoints = {
                'easy': 10,
                'medium': 20,
                'hard': 30
            };
            points = basePoints[question.difficulty];
            
            // Streak bonus
            const streakBonus = this.streak * 5;
            points += streakBonus;
            
            this.score += points;
            this.streak++;
            this.correctCount++;
            this.maxStreak = Math.max(this.maxStreak, this.streak);
            
            showToast(`Correct! +${points} points`, 'success');
        } else {
            this.streak = 0;
            showToast(`Incorrect. The answer was: ${question.correct}`, 'error');
        }
        
        // Store answer
        this.answers.push({
            question: question.question,
            category: question.category,
            difficulty: question.difficulty,
            userAnswer: selectedAnswer,
            correctAnswer: question.correct,
            isCorrect: isCorrect,
            points: points
        });
        
        // Move to next question after delay
        setTimeout(() => {
            this.currentQuestionIndex++;
            if (this.currentQuestionIndex < this.questions.length) {
                this.displayQuestion();
            } else {
                this.showResults();
            }
        }, 2000);
    }

    startTimer() {
        this.timer = 0;
        this.timerInterval = setInterval(() => {
            this.timer++;
            const minutes = Math.floor(this.timer / 60);
            const seconds = this.timer % 60;
            document.getElementById('timerValue').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    showResults() {
        this.stopTimer();
        
        // Hide game screen, show results
        document.getElementById('gameScreen').style.display = 'none';
        document.getElementById('resultsScreen').style.display = 'block';
        // Calculate grade
        const accuracy = (this.correctCount / this.questions.length) * 100;
        const grade = this.calculateGrade(accuracy);
        
        // Update results
        document.getElementById('resultsGrade').textContent = grade;
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('correctAnswers').textContent = `${this.correctCount}/${this.questions.length}`;
        
        const minutes = Math.floor(this.timer / 60);
        const seconds = this.timer % 60;
        document.getElementById('finalTime').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        document.getElementById('accuracy').textContent = `${accuracy.toFixed(0)}%`;
        
        // Title based on performance
        let title = 'Quiz Complete!';
        if (accuracy === 100) title = 'Perfect Score! 🎉';
        else if (accuracy >= 80) title = 'Excellent Work! 🌟';
        else if (accuracy >= 60) title = 'Good Job! 👍';
        else if (accuracy >= 40) title = 'Keep Practicing! 📚';
        else title = 'Try Again! 💪';
        document.getElementById('resultsTitle').textContent = title;
        
        // Show breakdown
        this.displayBreakdown();
        
        // Save stats
        this.saveStats();
        // Score submission is manual via the Submit Score button
    }

    displayBreakdown() {
        const breakdownEl = document.getElementById('resultsBreakdown');
        breakdownEl.innerHTML = '<h3 style="color: var(--text-primary); margin-bottom: 1rem;">Question Breakdown</h3>';
        
        this.answers.forEach((answer, index) => {
            const item = document.createElement('div');
            item.className = `breakdown-item ${answer.isCorrect ? 'correct' : 'incorrect'}`;
            
            item.innerHTML = `
                <div class="breakdown-question">
                    ${index + 1}. ${answer.question}
                </div>
                ${!answer.isCorrect ? `
                    <div class="breakdown-answer user-answer">
                        Your answer: ${answer.userAnswer}
                    </div>
                ` : ''}
                <div class="breakdown-answer correct-answer">
                    ${answer.isCorrect ? '✓ ' : ''}Correct answer: ${answer.correctAnswer}
                </div>
                ${answer.points > 0 ? `
                    <div class="breakdown-answer" style="color: var(--primary-color); font-weight: 600;">
                        +${answer.points} points
                    </div>
                ` : ''}
            `;
            
            breakdownEl.appendChild(item);
        });
    }

    calculateGrade(accuracy) {
        if (accuracy === 100) return 'A+';
        if (accuracy >= 93) return 'A';
        if (accuracy >= 90) return 'A-';
        if (accuracy >= 87) return 'B+';
        if (accuracy >= 83) return 'B';
        if (accuracy >= 80) return 'B-';
        if (accuracy >= 77) return 'C+';
        if (accuracy >= 73) return 'C';
        if (accuracy >= 70) return 'C-';
        if (accuracy >= 67) return 'D+';
        if (accuracy >= 63) return 'D';
        if (accuracy >= 60) return 'D-';
        return 'F';
    }

    async submitScore() {
        try {
            const { askForName } = await import('../components/visitor-logbook.js');
            const username = await askForName();
            if (!username) return;
            const { submitScore } = await import('../api/supabase.js');
            await submitScore({
                gameType: 'trivia',
                gameMode: this.selectedDifficulty === 'mixed' ? 'random' : this.selectedDifficulty,
                playerName: username,
                score: this.score,
                timeTaken: this.timer
            });
            showToast(`Score submitted as "${username}"! ✅`, 'success');
            lockSubmitButtons();
        } catch (error) {
            console.error('Error submitting score:', error);
        }
    }

    shareResult() {
        const accuracy = (this.correctCount / this.questions.length) * 100;
        const grade = this.calculateGrade(accuracy);
        
        const text = `🎯 Trivia Challenge\n\nScore: ${this.score}\nCorrect: ${this.correctCount}/${this.questions.length}\nGrade: ${grade}\nStreak: ${this.maxStreak}\n\nBy Unbinding`;
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                showToast('Score copied! 📋', 'success');
            }).catch(() => {
                showToast('Failed to copy result', 'error');
            });
        } else {
            showToast('Clipboard not supported', 'error');
        }
    }

    quitQuiz() {
        if (confirm('Are you sure you want to quit? Your progress will be lost.')) {
            this.stopTimer();
            this.resetGame();
        }
    }

    resetGame() {
        this.stopTimer();
        document.getElementById('gameScreen').style.display = 'none';
        document.getElementById('resultsScreen').style.display = 'none';
        document.getElementById('setupScreen').style.display = 'block';
        this.hideActionBar();
        resetSubmitButtons();
    }

    showActionBar() {
        const bar = document.getElementById('gameActionBar');
        const label = document.getElementById('gameActionBarLabel');
        if (bar && label) {
            const accuracy = this.answers.length > 0
                ? Math.round((this.correctCount / this.answers.length) * 100)
                : 0;
            label.textContent = `Score: ${this.score} · ${this.correctCount}/${this.answers.length} correct · ${accuracy}%`;
            bar.style.display = 'flex';
        }
    }

    hideActionBar() {
        const bar = document.getElementById('gameActionBar');
        if (bar) bar.style.display = 'none';
    }

    // Statistics
    loadStats() {
        const stats = localStorage.getItem('triviaStats');
        this.stats = stats ? JSON.parse(stats) : {
            quizzesPlayed: 0,
            totalQuestions: 0,
            totalCorrect: 0,
            maxStreak: 0,
            categoryStats: {}
        };
    }

    saveStats() {
        this.stats.quizzesPlayed++;
        this.stats.totalQuestions += this.questions.length;
        this.stats.totalCorrect += this.correctCount;
        this.stats.maxStreak = Math.max(this.stats.maxStreak, this.maxStreak);
        
        // Update category stats
        this.answers.forEach(answer => {
            const cat = answer.category;
            if (!this.stats.categoryStats[cat]) {
                this.stats.categoryStats[cat] = { correct: 0, total: 0 };
            }
            this.stats.categoryStats[cat].total++;
            if (answer.isCorrect) {
                this.stats.categoryStats[cat].correct++;
            }
        });
        
        localStorage.setItem('triviaStats', JSON.stringify(this.stats));
    }

    showStats() {
        this.loadStats();
        
        document.getElementById('statQuizzesPlayed').textContent = this.stats.quizzesPlayed;
        document.getElementById('statTotalQuestions').textContent = this.stats.totalQuestions;
        
        const accuracy = this.stats.totalQuestions > 0 
            ? ((this.stats.totalCorrect / this.stats.totalQuestions) * 100).toFixed(0)
            : 0;
        document.getElementById('statCorrectRate').textContent = `${accuracy}%`;
        document.getElementById('statMaxStreak').textContent = this.stats.maxStreak;
        
        // Display category stats
        const categoryStatsEl = document.getElementById('categoryStats');
        categoryStatsEl.innerHTML = '';
        
        if (Object.keys(this.stats.categoryStats).length === 0) {
            categoryStatsEl.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No statistics yet. Play a quiz to see your performance!</p>';
        } else {
            Object.entries(this.stats.categoryStats).forEach(([category, data]) => {
                const accuracy = ((data.correct / data.total) * 100).toFixed(0);
                
                const statDiv = document.createElement('div');
                statDiv.className = 'category-stat';
                statDiv.innerHTML = `
                    <span class="category-name">${this.formatCategory(category)}</span>
                    <span class="category-accuracy">${data.correct}/${data.total} (${accuracy}%)</span>
                `;
                categoryStatsEl.appendChild(statDiv);
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

    formatCategory(category) {
        const formatted = {
            'history': 'History',
            'science': 'Science',
            'literature': 'Literature',
            'geography': 'Geography',
            'arts': 'Arts & Culture',
            'general': 'General Knowledge'
        };
        return formatted[category] || category;
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
    document.addEventListener('DOMContentLoaded', () => new TriviaGame());
} else {
    new TriviaGame();
}

export default TriviaGame;
