# Librarity Unlimited Mode — PRD & Build Plan State

Master plan: @unlimited-plan.md
Progress tracker: @progress.txt
Started: 2026-11-24 (Ralph loop) · Completed: 2026-11-25

## Agreed 6-step plan — status

| # | Step | Status |
|---|------|--------|
| 1 | Audit all 5 games against Master Plan's 15 known bugs | ✅ complete |
| 2 | Fix shared architecture (ref/state mirrors, resetUnlimitedState, wall-clock pause math) | ✅ complete |
| 3 | Scope decision (user, 2026-11-24): Wordle & Trivia get NO timer/pause — they lose via own mechanics (guesses / hearts) | ✅ applied |
| 4 | UI polish: depleting timer bars, pause overlays blocking all input, single Give Up button, Play Again after session end | ✅ complete |
| 5 | `npm run build` passes (18 pages prerendered) | ✅ PASS |
| 6 | Live browser verification, all 5 games, zero regressions | ✅ PASS |

## Additional fixes applied (2026-11-25)

| Fix | Description |
|-----|-------------|
| WordLadder timer reset | Each round now restarts fresh at new limit (180→170→160), bar resets to 100% — implemented by clearing `unlimitedStartTimeRef.current` before bumping `unlimitedRound` state |
| In-game replay buttons | All 5 games now show a "Play Again" button in the action bar after the unlimited session ends (modal closed) |
| WikipediaRace exact match win | Fixed stale ref bug in `navigateToArticle` — now uses clicked title directly |
| UTC+8 daily rotation | All 4 daily games (WordLadder, SpellingBee, WikipediaRace, Wordle) now use UTC+8 midnight for daily puzzle rotation — implemented via `src/lib/dateUtils.js` with `getTodayUTC8()` and `getDaysSinceAnchorUTC8()`; daily→Random fallback consistent across all games |

## Verification results

| Game | Script | Result |
|------|--------|--------|
| WordLadder | test_wl_fixes.py | 12/12 PASS |
| SpellingBee | test_sb_timer.py | 1/1 PASS |
| WikipediaRace | test_wl_fixes.py + test_wr_falsewin.py | 12/12 + substring-false-positive blocked PASS (exact-match win bug fixed) |
| Wordle | test_wordle_session.py | PASS (loss popup shows answer, Play Again fresh session, no timer/pause) |
| Trivia | test_trivia_session.py | PASS (hearts-0 ends session, no timer/pause) |

## Remaining (manual / user decision)

- [ ] Commit staged changes (blocked pending user permission — repo policy: no commits to main without permission)
- [ ] Push / deploy (user-driven)
