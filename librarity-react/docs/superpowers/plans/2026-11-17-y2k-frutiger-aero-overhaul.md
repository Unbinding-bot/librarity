# Y2K / Neo Frutiger Aero Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current earthy parchment/olive design with a cohesive Y2K + Neo Frutiger Aero design system (aqua, chrome, iridescent, glass, bubbles) across all 10 pages (Home, 6 games, 3 tools, indexes) while preserving all game/tool logic.

**Architecture:** Three-layer CSS token system (primitive → semantic → component) in `src/styles/tokens.css`, imported by `index.css`. Restyle existing React components in place — no new components, no logic changes. Remove the illustrated library view, hitboxes, and fallback panels entirely. Use CSS variables exclusively; no inline styles.

**Tech Stack:** React 19 + Vite, framer-motion (hero entrance only), animejs (available), existing CSS modules pattern. No new deps.

**Spec:** `docs/superpowers/specs/2026-11-17-y2k-frutiger-aero-overhaul-design.md`

---

## Global Constraints

- CSS variables only — no Tailwind, no CSS-in-JS, no hardcoded hex in components
- Light + dark themes via `[data-theme]` on `<html>`
- Responsive: 1440, 1024, 768, 390 — no horizontal overflow at 320
- Game/tool logic untouched — only presentational CSS/classes change
- One button pair (primary, ghost), one card style, one radius scale (bubble 24px)
- Real icons only (SVG in `src/assets/icons/`), no emoji in production UI
- Reduced motion: all transforms → 0ms
- WCAG AA contrast both themes
- GitHub OAuth faculty flow unchanged
- Framer-motion only for hero entrance stagger; rest is CSS transitions

---

## Review Focus

| Input / Condition | Expected Behavior | Test Pinned To |
|-------------------|-------------------|----------------|
| Viewport 320px | No horizontal scroll, tap targets ≥ 44px, sections stack | Task 3, Task 5 |
| `prefers-reduced-motion` | Hero entrance disabled, hover lifts disabled, transitions instant | Task 2, Task 4 |
| Dark theme toggle | All tokens swap, no flash, game boards readable | Task 1, Task 6 |
| Keyboard navigation | Focus ring visible on every interactive, skip link first | Task 2, Task 4 |
| Game logic unchanged | Wordle still plays, Dictionary still fetches, scores submit | Task 6, Task 7 |

---

### Task 1: Design Tokens (Primitive → Semantic → Component)

**Files:**
- Create: `src/styles/tokens.css`
- Modify: `src/styles/index.css` (add import)
- Test: Visual — dev server at 1440/390, both themes

**Interfaces:**
- Produces: All `--color-*`, `--space-*`, `--radius-*`, `--shadow-*`, `--font-*`, `--btn-*`, `--card-*`, `--input-*`, `--nav-*`, `--panel-*` variables consumed by every component CSS file

- [ ] **Step 1: Write token file**

Create `src/styles/tokens.css` with three-layer structure exactly as specified in the design doc (sections 5.1–5.3). Include both `[data-theme="light"]` and `[data-theme="dark"]` blocks.

- [ ] **Step 2: Wire into index.css**

```css
@import './tokens.css';
/* existing imports after */
```

- [ ] **Step 3: Verify tokens load**

Run dev server (`npm run dev`), open DevTools → Elements → `:root`, confirm `--color-primary` = `#00ACC1` (light) / `#22D3EE` (dark). Toggle theme via Navbar, confirm swap without flash.

- [ ] **Step 4: Commit**

```bash
git add src/styles/tokens.css src/styles/index.css
git commit -m "feat: add Y2K/Frutiger Aero design token system (primitive/semantic/component layers)"
```

---

### Task 2: Base Components (Button, Card, Input, Nav, Footer, GameShell)

**Files:**
- Modify: `src/components/ui/Navbar.jsx`, `src/components/ui/Footer.jsx`, `src/components/ui/GameShell.jsx`, `src/components/ui/Modal.jsx`, `src/components/ui/NamePrompt.jsx`
- Modify: `src/styles/react-app.css` (or create `src/styles/components.css` for shared component styles)
- Test: Storybook-style visual check at 1440/390, both themes, reduced motion

**Interfaces:**
- Consumes: All component-layer tokens from Task 1
- Produces: Restyled base components used by every page

- [ ] **Step 1: Restyle Button (Navbar theme toggle, GameShell actions, etc.)**

Apply token variables: `background: var(--btn-primary-bg)`, `color: var(--btn-primary-text)`, `border-radius: var(--btn-radius)`, `padding: var(--btn-padding-y) var(--btn-padding-x)`, `font: var(--btn-font-weight) var(--btn-font-size) var(--btn-font)`, `transition: var(--btn-transition)`. Hover: `background: var(--btn-primary-hover)`, `box-shadow: var(--btn-primary-shadow)`, `transform: translateY(-1px)`. Active: `transform: scale(0.98)`. Ghost variant: `background: var(--btn-ghost-bg)`, `border: 1px solid var(--btn-ghost-border)`, hover `background: var(--btn-ghost-hover-bg)`.

- [ ] **Step 2: Restyle Card (MenuCard, GameShell panels, stats cards)**

`background: var(--card-bg)`, `border: 1px solid var(--card-border)`, `border-radius: var(--card-radius)`, `padding: var(--card-padding)`, `box-shadow: var(--card-shadow)`. Hover: `transform: translateY(var(--card-hover-lift))`, `box-shadow: var(--card-hover-shadow)`, `border-color: var(--color-primary)`.

- [ ] **Step 3: Restyle Input (search boxes, Dictionary/Thesaurus/Rhyme inputs)**

`background: var(--input-bg)`, `border: 1px solid var(--input-border)`, `border-radius: var(--input-radius)`, `padding: var(--input-padding)`, `font: var(--input-font)`. Focus: `border-color: var(--input-border-focus)`, `outline: none`, `box-shadow: 0 0 0 3px var(--color-focus-alpha)` (add `--color-focus-alpha: rgba(0,172,193,0.2)` to semantic tokens).

- [ ] **Step 4: Restyle Navbar**

Height `--nav-height`, background `var(--nav-bg)`, backdrop-filter `var(--nav-backdrop)`, border-bottom `1px solid var(--nav-border)`. Logo uses `--font-display`. Theme toggle uses Button ghost variant. Links use `--color-text`, hover `--color-primary`.

- [ ] **Step 5: Restyle Footer**

Simple band, `background: var(--color-bg-elevated)`, `border-top: 1px solid var(--color-border)`, text `--color-text-muted`.

- [ ] **Step 6: Restyle GameShell / Modal / NamePrompt**

Panel tokens: `background: var(--panel-bg)`, `border: 1px solid var(--panel-border)`, `border-radius: var(--panel-radius)`, `padding: var(--panel-padding)`. Modal overlay: `backdrop-filter: blur(8px)`, `background: rgba(10,14,18,0.6)` (dark) / `rgba(255,255,255,0.8)` (light).

- [ ] **Step 7: Add reduced-motion media query**

In `tokens.css` or `components.css`:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 8: Verify**

Dev server → every page loads, buttons hover/press, cards lift, inputs focus, navbar sticky, footer sits at bottom. Toggle theme → no hardcoded colors remain. Toggle reduced motion → transitions instant.

- [ ] **Step 9: Commit**

```bash
git add src/components/ui/*.jsx src/styles/*.css
git commit -m "feat: restyle base components (Button, Card, Input, Nav, Footer, GameShell, Modal) with token system"
```

---

### Task 3: Home Page — Hero + Games Grid + Tools Grid + Footer

**Files:**
- Modify: `src/pages/Home.jsx` (full rewrite — remove illustrated view, hitboxes, fallback panels)
- Create: `src/styles/home.css` (page-specific styles only where tokens aren't enough)
- Test: Dev server at 1440/1024/768/390, both themes

**Interfaces:**
- Consumes: `Button`, `Card`, `Nav`, `Footer` from Task 2; tokens from Task 1
- Produces: New Home page at `/`

- [ ] **Step 1: Rewrite Home.jsx**

Structure per spec section 6.2:
```jsx
export default function Home() {
  return (
    <>
      <section className="hero" data-enter>
        <div className="hero-content">
          <h1>Word games & tools for students</h1>
          <p>6 games, 3 tools, 0 ads — all free, no login needed</p>
          <div className="hero-actions">
            <Button to="/games" variant="primary">Browse Games</Button>
            <Button to="/tools" variant="ghost">Open Tools</Button>
          </div>
        </div>
        <div className="hero-visual">
          {/* Live preview cards: Wordle grid animating, Dictionary typing demo */}
        </div>
      </section>
      <section id="games" className="section">
        <h2>Games</h2>
        <GameGrid items={GAMES} />
      </section>
      <section id="tools" className="section">
        <h2>Learning Tools</h2>
        <GameGrid items={TOOLS} />
      </section>
    </>
  )
}
```

Remove all illustrated-view state, hitbox rendering, fallback panels, `hitboxesData` import, `AnimatePresence` branching. Single render path.

- [ ] **Step 2: Hero entrance (CSS keyframes, not framer-motion)**

In `home.css`:
```css
.hero[data-enter] .hero-content > * { animation: hero-reveal 0.6s var(--ease-out) backwards; }
.hero[data-enter] .hero-content > *:nth-child(2) { animation-delay: 0.1s; }
.hero[data-enter] .hero-content > *:nth-child(3) { animation-delay: 0.2s; }
.hero[data-enter] .hero-visual { animation: hero-reveal 0.8s var(--ease-out) 0.15s backwards; }
@keyframes hero-reveal { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
```

- [ ] **Step 3: GameGrid component (inline or shared)**

Reusable grid: `display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-6);` at 1440; `repeat(2, 1fr)` at 1024; `1fr` at 768/390. Cards use `Card` styles from Task 2. Each card: icon (SVG), name, desc, Button.

- [ ] **Step 4: Hero visual — live preview cards**

Two glass cards side-by-side: left shows a Wordle grid with a winning animation (CSS keyframes flip), right shows Dictionary input typing "hello" with results appearing. Pure CSS/React, no external assets needed.

- [ ] **Step 5: Responsive verification**

DevTools device toolbar: 1440 (3-col), 1024 (2-col), 768 (1-col), 390 (1-col, buttons full-width). No horizontal overflow at 320. Hero fills first screen exactly (no second section peeking).

- [ ] **Step 6: Commit**

```bash
git add src/pages/Home.jsx src/styles/home.css
git commit -m "feat: rewrite Home page — hero, games grid, tools grid, no illustrated view"
```

---

### Task 4: Games Index (`/games`) & Tools Index (`/tools`)

**Files:**
- Modify: `src/pages/Games.jsx`, `src/pages/Tools.jsx`
- Reuse: `GameGrid` from Task 3 (extract to `src/components/ui/GameGrid.jsx` if not inline)
- Test: Dev server at all breakpoints

**Interfaces:**
- Consumes: `GameGrid`, `Button`, `Card`, tokens

- [ ] **Step 1: Restyle Games.jsx**

Simple page: `<section className="page"><h1>Games</h1><GameGrid items={GAMES} /></section>`. Page wrapper: `max-width: 1200px; margin: 0 auto; padding: var(--space-12) var(--space-6);`.

- [ ] **Step 2: Restyle Tools.jsx**

Same pattern with `TOOLS` data.

- [ ] **Step 3: Verify**

Both pages load, grids responsive, cards hover lift, buttons navigate to game/tool pages.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Games.jsx src/pages/Tools.jsx src/components/ui/GameGrid.jsx
git commit -m "feat: restyle Games and Tools index pages with shared GameGrid"
```

---

### Task 5: Game Pages (6) — Presentational Restyle Only

**Files:**
- Modify: `src/pages/games/Wordle.jsx`, `SpellingBee.jsx`, `WordLadder.jsx`, `Trivia.jsx`, `Flashcards.jsx`, `WikipediaRace.jsx`
- Modify/Create: `src/styles/games/*.css` (one per game, or consolidate)
- Test: Each game plays identically to before; visual only changed

**Interfaces:**
- Consumes: `GameShell`, `Button`, `Card`, `Modal`, tokens
- Produces: Restyled game UIs

**Per-game checklist (repeat for each):**

- [ ] **Step 1: Replace all hardcoded colors/classes with token variables**
- [ ] **Step 2: Tile/grid elements → glass cards with `--card-*` tokens**
- [ ] **Step 3: Keyboard buttons (Wordle) → pill buttons with `--btn-*` tokens, chrome/iridescent hover**
- [ ] **Step 4: Honeycomb cells (SpellingBee) → glass hexagons, aqua center glow**
- [ ] **Step 5: Progress rings/bars → aqua with iridescent glow**
- [ ] **Step 6: Article frame (WikipediaRace) → glass panel, breadcrumb as chrome pills**
- [ ] **Step 7: Animations preserved** (Wordle flip, SpellingBee pop, etc.) — use CSS keyframes, not framer-motion
- [ ] **Step 8: Stats/Modals/Share/NamePrompt → use restyled base components from Task 2**
- [ ] **Step 9: Verify game logic unchanged** — play one full round per game

- [ ] **Step 10: Commit (per game or batched)**

```bash
git add src/pages/games/*.jsx src/styles/games/*.css
git commit -m "feat: restyle [GameName] with Y2K/Frutiger Aero tokens"
```

---

### Task 6: Tool Pages (3) — Presentational Restyle Only

**Files:**
- Modify: `src/pages/tools/Dictionary.jsx`, `Thesaurus.jsx`, `RhymeFinder.jsx`
- Modify/Create: `src/styles/tools/*.css`
- Test: Each tool works identically; visual only changed

**Interfaces:**
- Consumes: `GameShell`, `Button`, `Card`, `Input`, tokens
- Produces: Restyled tool UIs

**Per-tool checklist:**

- [ ] **Dictionary:** Glass results panel, audio button with ripple, history as chips with `--card-*` tokens
- [ ] **Thesaurus:** Synonym/antonym/related as chip clouds — aqua (syn), iridescent pink (ant), cyan (related)
- [ ] **RhymeFinder:** Grouped by syllable, perfect rhymes get `--shadow-glow`, near rhymes muted
- [ ] **All:** Search input uses `--input-*` tokens, history chips use `--card-*` tokens
- [ ] **Verify:** Search "hello" in Dictionary, "happy" in Thesaurus, "cat" in RhymeFinder — results render, audio plays, history persists

- [ ] **Step 4: Commit**

```bash
git add src/pages/tools/*.jsx src/styles/tools/*.css
git commit -m "feat: restyle Dictionary, Thesaurus, RhymeFinder with tokens"
```

---

### Task 7: Remaining Pages (Leaderboard, ComingSoon, Faculty, Admin)

**Files:**
- Modify: `src/pages/Leaderboard.jsx`, `src/pages/ComingSoon.jsx` (Faculty, Admin exports), `src/styles/pages.css`
- Test: Pages load, no layout break

**Interfaces:**
- Consumes: Base components, tokens

- [ ] **Step 1: Leaderboard** — Glass table/cards, aqua rank badges
- [ ] **Step 2: ComingSoon** — Glass disabled cards, iridescent "soon" badges
- [ ] **Step 3: Faculty/Admin** — Minimal: centered glass panel, GitHub button primary
- [ ] **Step 4: Commit**

```bash
git add src/pages/*.jsx src/styles/pages.css
git commit -m "feat: restyle Leaderboard, ComingSoon, Faculty, Admin"
```

---

### Task 8: Consolidate & Clean Up Legacy CSS

**Files:**
- Delete: `src/styles/library-home.css`, `src/styles/entrance.css`, `src/styles/mobile.css`, `src/styles/game-ui-fixes.css`, `src/styles/responsive.css`, `src/styles/carousel.css`, `src/styles/icon-placeholders.css`, `src/styles/admin.css` (if unused), `src/styles/visitor-logbook.css` (if unused)
- Modify: `src/styles/index.css` (remove deleted imports)
- Test: Build passes, no missing styles, dev server clean

**Interfaces:**
- Consumes: All tokens, component styles
- Produces: Lean CSS bundle

- [ ] **Step 1: Audit imports in `index.css`** — keep only: `tokens.css`, `theme.css` (for ThemeContext compatibility), `main.css` (if it has globals), `react-app.css` (component styles), `animations.css` (keyframes), `home.css`, `games.css`, `tools.css`, `pages.css`, `wordle.css`, `spelling-bee.css`, `word-ladder.css`, `trivia.css`, `flashcards.css`, `wikipedia-race.css`, `dictionary.css`, `thesaurus.css`, `rhyme-finder.css`, `leaderboard.css`
- [ ] **Step 2: Delete unused files**
- [ ] **Step 3: Verify build** — `npm run build` succeeds, `npm run lint` clean (only context warnings)
- [ ] **Step 4: Commit**

```bash
git rm src/styles/library-home.css src/styles/entrance.css src/styles/mobile.css src/styles/game-ui-fixes.css src/styles/responsive.css src/styles/carousel.css src/styles/icon-placeholders.css src/styles/admin.css src/styles/visitor-logbook.css
git add src/styles/index.css
git commit -m "chore: remove legacy CSS files, consolidate to token-driven styles"
```

---

### Task 9: Browser Verification & Polish

**Files:** None (verification only)
**Test:** Full manual QA at 1440/1024/768/390, both themes, reduced motion

- [ ] **Step 1: Dev server at 1440** — Home hero fills screen, grids 3-col, all pages load, no console errors
- [ ] **Step 2: Dev server at 390** — No horizontal scroll, tap targets ≥ 44px, hero stacks, grids 1-col, buttons full-width, nav becomes hamburger (if not, note for follow-up)
- [ ] **Step 3: Theme toggle** — Light ↔ Dark instant, no flash, game boards readable in both
- [ ] **Step 4: Reduced motion** — Hero entrance disabled, hover lifts instant, all transitions < 1ms
- [ ] **Step 5: Play each game** — Wordle, SpellingBee, WordLadder, Trivia, Flashcards, WikipediaRace complete one round
- [ ] **Step 6: Use each tool** — Dictionary, Thesaurus, RhymeFinder return results, history works
- [ ] **Step 7: Performance** — `npm run build`, check gzipped CSS < 100KB, JS < 400KB
- [ ] **Step 8: Commit verification notes**

```bash
git commit --allow-empty -m "chore: browser verification complete — all breakpoints, themes, games, tools pass"
```

---

## Execution Recommendation

**Subagent-driven** — 9 tasks with clear interfaces between them (tokens → base components → pages). Each task's output is independently verifiable in the browser. A mistake in Task 1 (tokens) cascades to all; a mistake in Task 5 (one game) is isolated. Subagent review at each task catches token misuse early. Total context per task is small (~2-3 files).

---

## Self-Review Checklist

- [x] Spec coverage: Every spec section (tokens, pages, motion, icons, copy, a11y) has a task
- [x] Step scan: Each step = one action with checkable result; no "handle edge cases" vagueness
- [x] Type consistency: Token names match across Task 1 → Task 2 → Tasks 3-8
- [x] Review Focus: 5 failure modes pinned to owning tasks
- [x] Proportion: Plan ~400 lines, spec ~300 lines — appropriate detail level