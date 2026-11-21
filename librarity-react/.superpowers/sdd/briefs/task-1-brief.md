# Task 1: Design Tokens (Primitive → Semantic → Component)

## Task Context
This is Task 1 of 9. It creates the three-layer CSS token system that every subsequent task consumes. No prior tasks exist.

## Requirements (from plan)
Create `src/styles/tokens.css` with exactly the three-layer structure specified in the design doc (sections 5.1–5.3):

### 5.1 Primitive Layer (raw values)
- Color primitives: aqua scale (50-900), cyan, iridescent shifts (1-4), chrome scale, glass values, dark scale, white/black
- Typography primitives: --font-display (Orbitron), --font-ui (Frutiger/Inter), --font-mono (JetBrains Mono)
- Spacing primitives: --space-1 through --space-20 (4px base)
- Radius primitives: --radius-sharp (0), --radius-soft (8px), --radius-round (16px), --radius-pill (9999px), --radius-bubble (24px)
- Shadow primitives: --shadow-xs through --shadow-xl, --shadow-glow, --shadow-glow-strong
- Transition primitives: --ease-out, --ease-spring, --duration-fast/normal/slow

### 5.2 Semantic Layer (purpose aliases)
- Light theme `[data-theme="light"]`: --color-bg (aqua-50), --color-bg-elevated (white), --color-bg-glass (glass-white), --color-border (aqua-200), --color-border-strong (aqua-300), --color-text (dark-900), --color-text-muted (dark-600), --color-text-inverse (white), --color-primary (aqua-500), --color-primary-hover (aqua-600), --color-primary-active (aqua-700), --color-accent (iridescent-1), --color-focus (aqua-500), --color-error (#EF4444), --color-success (#22C55E), --shadow-card (shadow-md), --shadow-card-hover (shadow-lg), --shadow-glow
- Dark theme `[data-theme="dark"]`: --color-bg (dark-900), --color-bg-elevated (dark-800), --color-bg-glass (rgba(17,24,31,0.8)), --color-border (dark-600), --color-border-strong (dark-500), --color-text (chrome-100), --color-text-muted (chrome-400), --color-text-inverse (dark-900), --color-primary (cyan-400), --color-primary-hover (cyan-500), --color-primary-active (aqua-400), --color-accent (iridescent-3), --color-focus (cyan-400), --color-error (#F87171), --color-success (#4ADE80), --shadow-card (0 4px 12px rgba(0,0,0,0.3)), --shadow-card-hover (0 8px 24px rgba(0,0,0,0.4)), --shadow-glow (0 0 24px rgba(0,229,255,0.35))

### 5.3 Component Layer (component-specific)
- Buttons: --btn-primary-bg, --btn-primary-text, --btn-primary-hover, --btn-primary-active, --btn-primary-shadow, --btn-ghost-bg, --btn-ghost-text, --btn-ghost-hover-bg, --btn-ghost-border, --btn-radius (pill), --btn-padding-x (space-6), --btn-padding-y (space-3), --btn-font (font-ui), --btn-font-weight (600), --btn-font-size (14px), --btn-transition
- Cards: --card-bg, --card-border, --card-radius (bubble), --card-padding (space-6), --card-shadow, --card-hover-shadow, --card-hover-lift (-2px), --card-transition
- Inputs: --input-bg, --input-border, --input-border-focus, --input-radius (soft), --input-padding, --input-font
- Nav: --nav-height (64px), --nav-bg, --nav-border, --nav-backdrop
- Panels: --panel-bg, --panel-border, --panel-radius (bubble), --panel-padding (space-8)

## Interfaces
- **Produces:** All CSS variables consumed by Tasks 2-9
- **Consumes:** Nothing (first task)

## Global Constraints (from plan)
- CSS variables only — no Tailwind, no CSS-in-JS, no hardcoded hex in components
- Light + dark themes via `[data-theme]` on `<html>`
- Framer-motion only for hero entrance stagger; rest is CSS transitions

## Implementation Notes
- Import Google Fonts: Orbitron, Frutiger (or Inter fallback), JetBrains Mono in index.html or via @import in tokens.css
- Add `--color-focus-alpha: rgba(0,172,193,0.2)` to semantic layer for input focus rings
- Include reduced-motion media query in tokens.css

## Deliverables
1. `src/styles/tokens.css` — complete three-layer token system
2. `src/styles/index.css` modified to `@import './tokens.css';` as first import

## Verification
- `npm run dev` → DevTools → `:root` shows `--color-primary: #00ACC1` (light) / `#22D3EE` (dark)
- Theme toggle in Navbar swaps tokens without flash
- Build passes (`npm run build`)
- Lint clean (`npm run lint` — only context warnings acceptable)

## Report
Write report to `.superpowers/sdd/reports/task-1-report.md` with:
- Commits made
- Test results (dev server verification)
- Any concerns or deviations