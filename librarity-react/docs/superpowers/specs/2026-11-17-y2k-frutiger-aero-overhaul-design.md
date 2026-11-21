# Librarity Y2K / Neo Frutiger Aero Overhaul — Design Spec

**Date:** 2026-11-17  
**Status:** Approved — proceeding to implementation  
**Branch:** `feat/y2k-frutiger-redesign` (to create)

---

## 1. Intent & Why

Librarity is a **library games website for students** — word games, trivia, learning tools.  
Current state: a vanilla-JS-to-React port with an illustrated-library homepage that only works on 16:9 screens, ~18 fragmented CSS files, earthy parchment/olive palette that doesn't match the Y2K/Neo Frutiger Aero brief.

**Goal:** One cohesive, professional site that feels made for students — friendly, clean, slightly nostalgic (Y2K chrome/iridescence + Frutiger Aero glass/bubbles/aqua), not templated. Every page shows real UI (game screens, tool outputs) not placeholder cards.

**Success =** A student lands on `/` and immediately understands: "This is a library of word games and tools I can play right now." No hunt for hitboxes. No 16:9 gate.

---

## 2. Goals / Non-Goals / Anti-Goals

| Goals | Non-Goals | Anti-Goals |
|-------|-----------|------------|
| One design-token system (primitive → semantic → component) | Rewrite game logic | Generic purple/blue AI gradients |
| Y2K + Frutiger Aero aesthetic (chrome, iridescent, glass, aqua, rounded) | Backend changes | Cookie-cutter centered card grids |
| Remove illustrated view + hitboxes + fallback panels | Touch Supabase schema | Scroll-jack, parallax, timed carousels |
| All 10 pages (Home, 6 games, 3 tools) restyled | Change routing | Stock illustrations passed as product |
| Clean React components (no inline styles, no `dangerouslySetInnerHTML` where avoidable) | Add new games | Violet/lavender in our design |
| Accessible: focus rings, contrast, reduced motion | | Two box depths max, one button pair, one card style |

---

## 3. Constraints

- **React 19 + Vite** (already scaffolded)
- **CSS variables only** — no Tailwind (not in project). Tokens live in `src/styles/tokens.css` and are imported by `index.css`.
- **No new dependencies** beyond what's installed (framer-motion, animejs, @supabase/supabase-js). The aesthetic is pure CSS/JS.
- **Game logic untouched** — only their presentational components/CSS change.
- **GitHub OAuth faculty flow** stays as-is (per user).
- **Responsive:** 1440, 1024, 768, 390. No horizontal overflow at 320.
- **Performance:** No layout shift, < 100KB CSS gzipped, < 4 live WebGL contexts.

---

## 4. Approaches Considered

| Approach | Trade-off | Verdict |
|----------|-----------|---------|
| **Full sweep (B)** — tokens + all pages | Most work, but only way to feel like one site | ✅ **Picked** |
| Landing only (A) | Faster, but games/tools would clash | ❌ |
| Design system only (C) | Clean foundation, but no visible change | ❌ |
| Keep illustrated view + restyle | Preserves gimmick, but 16:9 gate is anti-student | ❌ |

---

## 5. Design System (Tokens)

### 5.1 Primitive Layer (raw values)

```css
/* Color primitives — Y2K / Frutiger Aero */
--color-aqua-50:   #E0F7FA;
--color-aqua-100:  #B2EBF2;
--color-aqua-200:  #80DEEA;
--color-aqua-300:  #4DD0E1;
--color-aqua-400:  #26C6DA;
--color-aqua-500:  #00ACC1;    /* primary aqua */
--color-aqua-600:  #0097A7;
--color-aqua-700:  #00838F;
--color-aqua-800:  #006064;
--color-aqua-900:  #004D40;

--color-cyan-400:  #22D3EE;
--color-cyan-500:  #06B6D4;

--color-iridescent-1: #FF6EC7;  /* pink shift */
--color-iridescent-2: #7C4DFF;  /* deep violet shift */
--color-iridescent-3: #00E5FF;  /* cyan shift */
--color-iridescent-4: #A855F7;  /* purple shift */

--color-chrome-100:  #F5F5F5;
--color-chrome-200:  #E0E0E0;
--color-chrome-300:  #BDBDBD;
--color-chrome-400:  #9E9E9E;
--color-chrome-500:  #757575;

--color-glass-white:   rgba(255,255,255,0.7);
--color-glass-border:  rgba(255,255,255,0.3);
--color-glass-highlight: rgba(255,255,255,0.5);

--color-dark-900:  #0A0E12;
--color-dark-800:  #11181F;
--color-dark-700:  #1A222E;
--color-dark-600:  #253040;

--color-white:     #FFFFFF;
--color-black:     #000000;

/* Typography primitives */
--font-display: 'Orbitron', 'Segoe UI', system-ui, sans-serif;
--font-ui:      'Frutiger', 'Inter', 'Segoe UI', system-ui, sans-serif;
--font-mono:    'JetBrains Mono', 'Fira Code', ui-monospace, monospace;

/* Spacing primitives (4px base) */
--space-1:  4px;
--space-2:  8px;
--space-3:  12px;
--space-4:  16px;
--space-5:  20px;
--space-6:  24px;
--space-8:  32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
--space-20: 80px;

/* Radius primitives */
--radius-sharp:  0;
--radius-soft:   8px;
--radius-round:  16px;
--radius-pill:   9999px;
--radius-bubble: 24px;

/* Shadow primitives */
--shadow-xs:  0 1px 2px rgba(0,0,0,0.05);
--shadow-sm:  0 2px 4px rgba(0,0,0,0.06);
--shadow-md:  0 4px 12px rgba(0,0,0,0.08);
--shadow-lg:  0 8px 24px rgba(0,0,0,0.1);
--shadow-xl:  0 16px 48px rgba(0,0,0,0.12);
--shadow-glow: 0 0 24px rgba(0,172,193,0.35);
--shadow-glow-strong: 0 0 48px rgba(0,172,193,0.5);

/* Transition primitives */
--ease-out: cubic-bezier(0.25, 0.1, 0.25, 1);
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
--duration-fast: 150ms;
--duration-normal: 250ms;
--duration-slow: 400ms;
```

### 5.2 Semantic Layer (purpose aliases)

```css
/* Light theme (default) */
[data-theme="light"] {
  --color-bg:              var(--color-aqua-50);
  --color-bg-elevated:     var(--color-white);
  --color-bg-glass:        var(--color-glass-white);
  --color-border:          var(--color-aqua-200);
  --color-border-strong:   var(--color-aqua-300);
  --color-text:            var(--color-dark-900);
  --color-text-muted:      var(--color-dark-600);
  --color-text-inverse:    var(--color-white);
  --color-primary:         var(--color-aqua-500);
  --color-primary-hover:   var(--color-aqua-600);
  --color-primary-active:  var(--color-aqua-700);
  --color-accent:          var(--color-iridescent-1);
  --color-focus:           var(--color-aqua-500);
  --color-error:           #EF4444;
  --color-success:         #22C55E;
  --shadow-card:           var(--shadow-md);
  --shadow-card-hover:     var(--shadow-lg);
  --shadow-glow:           var(--shadow-glow);
}

/* Dark theme */
[data-theme="dark"] {
  --color-bg:              var(--color-dark-900);
  --color-bg-elevated:     var(--color-dark-800);
  --color-bg-glass:        rgba(17, 24, 31, 0.8);
  --color-border:          var(--color-dark-600);
  --color-border-strong:   var(--color-dark-500);
  --color-text:            var(--color-chrome-100);
  --color-text-muted:      var(--color-chrome-400);
  --color-text-inverse:    var(--color-dark-900);
  --color-primary:         var(--color-cyan-400);
  --color-primary-hover:   var(--color-cyan-500);
  --color-primary-active:  var(--color-aqua-400);
  --color-accent:          var(--color-iridescent-3);
  --color-focus:           var(--color-cyan-400);
  --color-error:           #F87171;
  --color-success:         #4ADE80;
  --shadow-card:           0 4px 12px rgba(0,0,0,0.3);
  --shadow-card-hover:     0 8px 24px rgba(0,0,0,0.4);
  --shadow-glow:           0 0 24px rgba(0,229,255,0.35);
}
```

### 5.3 Component Layer (component-specific)

```css
/* Buttons — one pair: primary + ghost */
--btn-primary-bg:          var(--color-primary);
--btn-primary-text:        var(--color-white);
--btn-primary-hover:       var(--color-primary-hover);
--btn-primary-active:      var(--color-primary-active);
--btn-primary-shadow:      var(--shadow-glow);
--btn-ghost-bg:            transparent;
--btn-ghost-text:          var(--color-text);
--btn-ghost-hover-bg:      var(--color-bg-glass);
--btn-ghost-border:        var(--color-border);
--btn-radius:              var(--radius-pill);
--btn-padding-x:           var(--space-6);
--btn-padding-y:           var(--space-3);
--btn-font:                var(--font-ui);
--btn-font-weight:         600;
--btn-font-size:           14px;
--btn-transition:          transform var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out);

/* Cards — one style */
--card-bg:                 var(--color-bg-elevated);
--card-border:             var(--color-border);
--card-radius:             var(--radius-bubble);
--card-padding:            var(--space-6);
--card-shadow:             var(--shadow-card);
--card-hover-shadow:       var(--shadow-card-hover);
--card-hover-lift:         -2px;
--card-transition:         transform var(--duration-normal) var(--ease-spring), box-shadow var(--duration-normal) var(--ease-out), border-color var(--duration-fast) var(--ease-out);

/* Inputs */
--input-bg:                var(--color-bg);
--input-border:            var(--color-border);
--input-border-focus:      var(--color-focus);
--input-radius:            var(--radius-soft);
--input-padding:           var(--space-3) var(--space-4);
--input-font:              var(--font-ui);

/* Nav */
--nav-height:              64px;
--nav-bg:                  var(--color-bg-glass);
--nav-border:              var(--color-border);
--nav-backdrop:            blur(16px) saturate(180%);

/* GameShell / panels */
--panel-bg:                var(--color-bg-elevated);
--panel-border:            var(--color-border);
--panel-radius:            var(--radius-bubble);
--panel-padding:           var(--space-8);
```

---

## 6. Page Structure & Component Hierarchy

### 6.1 Global Layout

```
App
├── ThemeProvider
├── ToastProvider
├── GameStateProvider
├── Router
│   ├── Layout (persistent)
│   │   ├── Nav (logo, theme toggle, user avatar)
│   │   ├── Main (page content)
│   │   └── Footer (simple, credits)
│   └── Pages
│       ├── Home
│       ├── Games (index)
│       ├── Tools (index)
│       ├── Leaderboard
│       ├── ComingSoon
│       ├── Faculty
│       ├── Admin
│       ├── games/Wordle
│       ├── games/SpellingBee
│       ├── games/WordLadder
│       ├── games/Trivia
│       ├── games/Flashcards
│       ├── games/WikipediaRace
│       ├── tools/Dictionary
│       ├── tools/Thesaurus
│       └── tools/RhymeFinder
```

### 6.2 Home Page (one section per screen)

| Screen | Section | Visual | Moment |
|--------|---------|--------|--------|
| 1 | Hero | Glassmorphism card stack showing live game previews (Wordle grid animating, Dictionary typing) | **Hero entrance** (fade + slide up, stagger cards) |
| 2 | Games index | 3-column grid of game cards (real screenshots/thumbnails) | **Dealt moment:** type-led "Play your first game in 3 clicks" |
| 3 | Tools index | 2-column grid of tool cards (live Dictionary search demo) | — |
| 4 | Footer/CTA | Simple band: "Built by students, for students" + GitHub link | — |

**No illustrated library image. No hitboxes. No fallback panels.**

### 6.3 Games Index (`/games`) & Tools Index (`/tools`)

- Same card grid component, different data
- Cards show: icon, name, one-line desc, "Play" / "Open" button
- Hover: card lifts 2px, border glows aqua, thumbnail zooms 1.02x
- Click → routes to game/tool page

### 6.4 Game/Tool Pages (each gets its own restyle)

**Pattern:** `GameShell` wrapper → header (title, back link, theme) → main game area → optional footer (stats, share)

| Page | Key Restyle |
|------|-------------|
| Wordle | Glass tile grid, iridescent flip animation, chrome keyboard |
| SpellingBee | Hex honeycomb with glass cells, aqua center highlight |
| WordLadder | Clean stepper, glass rungs, progress ring |
| Trivia | Glass question card, aqua progress bar, iridescent answer reveal |
| Flashcards | Glass card flip, aqua confidence buttons |
| WikipediaRace | Glass article frame, breadcrumb trail as chrome pills |
| Dictionary | Glass results, audio button with ripple, history as chips |
| Thesaurus | Synonym/antonym/related as aqua/iridescent chip clouds |
| RhymeFinder | Grouped by syllable, perfect rhymes get glow |

---

## 7. Motion & Micro-Interactions (taste-skill rules)

- **Hero entrance:** Once on load, `data-enter` on hero section, stagger cards 80ms
- **Hover:** Linked cards lift 2px (`--card-hover-lift`), border glows, thumbnail zoom 1.02x, 250ms spring
- **Buttons:** Press = scale 0.98, release = spring back; hover = glow
- **Focus:** 2px aqua ring, offset 2px, never hidden
- **One dealt moment** on Home (type-led), one on Games index (photo-led: game screenshot)
- **No scroll-linked animation** except the dealt moment inside its section
- **Reduced motion:** All transforms → 0ms, opacity only

---

## 8. Iconography

- **Real icons only:** Game logos (Wordle uses official NYT Wordle mark), tool icons (Dictionary = dictionaryapi.dev favicon, Thesaurus/Rhyme = Datamuse favicon), GitHub Octocat for faculty
- **No emoji** in production UI (emoji only in dev/placeholder)
- **SVG icons** stored in `src/assets/icons/` and inlined

---

## 9. Copy Rules (copy-voice)

- **H1:** Names the category + buyer: "Word games & tools for students"
- **First screen:** One hard fact ("6 games, 3 tools, 0 ads")
- **Buttons:** Verb + object ("Play Wordle", "Open Dictionary", "View Leaderboard")
- **Headings:** Noun in every heading
- **No slop:** No "discover", "unlock", "seamless", "elevate", "delve"

---

## 10. Accessibility

- WCAG AA contrast (tested in both themes)
- Focus visible on every interactive element
- Skip link in Nav
- `lang="en"` on `<html>`
- Reduced motion respected
- Tap targets ≥ 44px at 390px viewport

---

## 11. Implementation Order

1. **Tokens** → `src/styles/tokens.css` + import in `index.css`
2. **Base components** → `Button`, `Card`, `Input`, `Nav`, `Footer`, `GameShell` (restyled)
3. **Layout wrapper** → persistent Nav + Main + Footer
4. **Home page** → hero + games grid + tools grid + footer
5. **Games/Tools index pages** → card grids
6. **Each game page** (6) — restyle presentational layer only
7. **Each tool page** (3) — restyle presentational layer only
8. **Leaderboard, ComingSoon, Faculty, Admin** — minimal restyle
9. **Browser verification** → dev server at 1440/1024/768/390, check overflow, contrast, motion

---

## 12. What's Left to Builder

- Exact Frutiger/Orbitron font loading (Google Fonts or self-hosted)
- Stand-in screenshots for game cards (capture from current build)
- Whether to keep `framer-motion` for hero entrance or use CSS `@keyframes` (CSS preferred for weight)
- Final polish of iridescent gradient parameters (taste-skill will deal the exact palette)

---

## 13. Approval

**Approved by user** — proceeding to `superpowers:writing-plans`.