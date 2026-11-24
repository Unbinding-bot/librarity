# Librarity Unlimited Mode — Master Plan

## Scope (in / out)
**In scope:** Unlimited mode (and mode switching Daily ↔ Random ↔ Unlimited) across 5 games:
- `src/pages/games/WordLadder.jsx`
- `src/pages/games/SpellingBee.jsx`
- `src/pages/games/WikipediaRace.jsx`
- `src/pages/games/Wordle.jsx`
- `src/pages/games/Trivia.jsx`

**Out of scope:** Daily/Random core puzzle logic (unless it leaks into unlimited), leaderboard/recordScore plumbing, OG/prerender, styling outside the shared timer/pause/result patterns.

---

## Shared Architecture (applies to every game)

**Scope note:** the timer/pause architecture below applies only to games with a **session clock** (WordLadder, SpellingBee, WikipediaRace). Games that lose via their own mechanic (Wordle = guesses, Trivia = hearts) do NOT get a timer bar or pause — see the per-game sections.

### State / ref mirrors (timer games only)
- `unlimitedPausedRef` (useRef false) — truth for async reads
- `unlimitedGameOverRef` (useRef false) — truth for async reads
- `unlimitedRoundRef` (useRef 0) — round counter truth
- `unlimitedStartTimeRef` (useRef null) — wall-clock start of session timer
- `pausedAtRef` (useRef null) — Date.now() when pause started
- `paused` (useState false) — mirror so UI re-renders on pause/resume
- `unlimitedRound` (useState 0) — bump to force timer interval re-arm
- `unlimitedElapsed` (useState 0)
- `unlimitedTimeLimit` (useState DEFAULT_SECONDS)
- `sessionScore` (useState 0)

### Timer bar — depletes DOWN, never counts UP
```jsx
width: `${Math.max(0, ((unlimitedTimeLimit - unlimitedElapsed) / unlimitedTimeLimit) * 100)}%`
```
NEVER: `(unlimitedElapsed / unlimitedTimeLimit) * 100` (counts up as time runs out).

### Timer effect deps — must include `[mode, paused, unlimitedRound]`
Effect must guard `mode !== 'unlimited' || unlimitedPausedRef.current || unlimitedGameOverRef.current` and re-arm when `paused` or `unlimitedRound` changes.

### Pause toggle — wall-clock freeze
On resume: `unlimitedStartTimeRef.current += Date.now() - pausedAtRef.current`. NEVER `setStartTime(now - elapsed*1000)`.
Pause **label** must read from `paused` state (not ref) so UI flips instantly.

### Pause overlay — fullscreen `.sb-pause-overlay` (z-index: 90) inside `.game-result` (z-index: 1100)
Blocks all input: submit handlers, navigation/link clicks, keyboard entry.

### resetUnlimitedState() — single source of truth
Call on every mode-exit AND unlimited restart path. Resets refs + state + bumps `unlimitedRound`.

### Z-index stack
- `.modal`: 1000
- `.game-result`: 1100
- `.name-prompt-modal`: 1150 (must sit above result overlays)
- `.toast-container`: 1200

---

## Per-Game Must-Haves

### WordLadder
- Start 3:00; each win costs 10s (min 20s)
- Action bar: **Give Up only** (End Session redundant — `giveUp()` calls `endUnlimitedSession()`)
- Invalid word: −5s session clock, input shakes red, toast `(N s penalty)` + `Time reduced` follow-up
- Result modal after timeout/loss shows **Play Again**
- `unlimitedStartTimeRef` declared (crash bug was missing ref)
- Time-out check uses `unlimitedElapsed`, not per-puzzle `timeSeconds`

### SpellingBee
- Shuffle: free, all modes (rearranges current letters)
- Refresh: unlimited-only, new letter set at −60s
- Pause blocks `submitWord` and `handleKey`
- Hexagon visible in unlimited/daily/random
- Time-out shows popup, not just toast

### WikipediaRace
- Start 10:00; each win +3 min
- Exact match win: `current === target` (NOT `includes()` — caused false positives)
- Win → toast only (`Race done! +N pts`), 2s auto-next race, **no popup on win**
- Pause blocks link navigation

### Wordle
- **NO timer bar, NO pause** — Wordle unlimited already loses by running out of guesses; a session clock would be a second, competing loss condition (user decision, 2026-11-24)
- Random mode isolated from unlimited scoring ("just one word, no streak")
- Loss popup shows the answer ("The word was: CASTE")
- `wordRef` / `answerRef` preserved through animation (not cleared before comparison)
- All unlimited session state (unlimitedRef object + mirrors) reset on every mode exit / restart path

### Trivia
- **NO timer bar, NO pause** — Trivia unlimited already loses via hearts (5 hearts, −1 per wrong, +1 per 5-correct wave); a session clock would be a second, competing loss condition (user decision, 2026-11-24)
- Hearts hitting 0 must END the session (finishGame) — no further questions, no duplicate "Session over!" toasts, no duplicate doSubmitScore
- No side effects inside setHearts updater (StrictMode double-invokes updaters)
- Mode exit resets hearts, wave counter, score, streak, difficulty state

---

## 15 Known Bugs (regressions to prevent)
1. Wordle always losing — wordRef cleared before comparison
2. Random mode incorrectly using unlimited scoring branch
3. Spelling Bee pause not blocking submissions
4. Timer-up showing toast only instead of popup
5. Shuffle/Refresh not separated
6. Timer bar fills UP instead of depleting
7. Wikipedia Race false-positive wins (substring match)
8. Pause button label never updates (ref-only toggle, no state mirror)
9. WordLadder crash on pause (unlimitedStartTimeRef never declared)
10. Stale timer after pause/resume (effect deps `[mode]` only)
11. No Play Again after unlimited loss (result modal gated on `result.rounds !== undefined`)
12. Duplicate Give Up + End Session buttons
13. `unlimitedGameOverRef` never reset on mode exit (stuck `true`)
14. Hidden hexagon in Spelling Bee unlimited
15. Timer interval re-arms with null start time (missing `unlimitedRound` dep)

---

## 7 Anti-Patterns
1. Never gate UI renders on `unlimitedGameOverRef.current` without resetting on mode exit
2. Never use `setStartTime(now - elapsed*1000)` for pause resume — use wall-clock shift
3. Never put pause label on a ref only — needs state mirror
4. Never use `includes()` for win detection — always `===`
5. Never gate Play Again on `result.rounds !== undefined`
6. Never duplicate Give Up and End Session when one calls the other
7. Never omit `paused` and `unlimitedRound` from timer effect deps

---

## Verification Checklist (live browser, per game)
- Build passes: `npm run build`
- Timer bar visible in unlimited, depletes downward
- Pause button flips Pause ↔ Resume instantly
- Pause overlay appears, blocks all game input
- Resume continues clock without losing time
- Invalid submissions shake + toast + deduct time (where applicable)
- Time-out/loss shows result modal with Play Again
- Win in unlimited shows toast only (no popup — except WordLadder modal pattern)
- Switching out of unlimited resets all state (no stuck gameOverRef / paused)
- Random mode does not use unlimited scoring (Wordle)
