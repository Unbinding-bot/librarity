/**
 * Submit lock utility
 * Call lockSubmitButtons() after a successful score submission.
 * All buttons with class .submit-score-btn or id submitScoreBtn are locked.
 */
export function lockSubmitButtons() {
    const selectors = [
        '#submitScoreBtn',
        '#actionBarSubmitBtn',
        '.submit-score-btn',
    ];
    selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(btn => {
            btn.textContent = '✅ Submitted';
            btn.disabled = true;
            btn.style.opacity = '0.6';
            btn.style.cursor = 'default';
        });
    });
}

/**
 * Reset submit buttons (call when a new game starts)
 */
export function resetSubmitButtons(label = '🏆 Submit Score') {
    const selectors = [
        '#submitScoreBtn',
        '#actionBarSubmitBtn',
        '.submit-score-btn',
    ];
    selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(btn => {
            btn.textContent = label;
            btn.disabled = false;
            btn.style.opacity = '';
            btn.style.cursor = '';
        });
    });
}
