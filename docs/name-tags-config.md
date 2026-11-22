---
name: name-tags-config
description: "Name tag system for leaderboard/logbook — #/claire, #/bernz, #/ownz"
metadata:
  type: reference
---

# Name Tag System Configuration

When users add `#/<tag>` to their name in the leaderboard or logbook, styling is applied.

## Supported Tags

| Tag | Effect |
|-----|--------|
| `#/claire` | Text color: rose (Claire's special pink, `#FF4FA0`) |
| `#/bernz` | Text color: green (`#88D498`) |
| `#/ownz` | Prefix with 👾 symbol, text color: green |
| `#/owner` | Prefix with ⚡ symbol, text color: owner green (striped style) |
| `#/pink` | Text color: pink (`#FF6B6B`) |
| `#/green` | Text color: green (`#88D498`) |
| `#/sky` | Text color: sky blue (`#74B9FF`) |
| `#/yellow` | Text color: yellow (`#FFD23F`) |
| `#/orange` | Text color: orange (`#FFA552`) |
| `#/lavender` | Text color: lavender (`#B8A9FA`) |
| `#/rose` | Text color: rose — the special pink (`#FF4FA0`) |

Unknown tags (e.g. a typo like `#/brnz`) are ignored — the name displays
normally, nothing breaks.

## Adding New Tags

Open `src/lib/nameTags.js` and add ONE line to `NAME_TAGS` at the top:

```js
export const NAME_TAGS = {
  claire: { color: 'rose' },
  bernz: { color: 'green' },
  ownz: { symbol: '👾', color: 'green' },
  owner: { symbol: '⚡', color: 'owner' },
  // plain color tags — anyone can use these
  pink: { color: 'pink' },
  green: { color: 'green' },
  sky: { color: 'sky' },
  yellow: { color: 'yellow' },
  orange: { color: 'orange' },
  lavender: { color: 'lavender' },
  rose: { color: 'rose' },
  // Add your new tag here:
  // rian: { color: 'sky' },          // colored name
  // boss: { symbol: '👑', color: 'yellow' },  // symbol + color
}
```

- `{ color: '<name>' }` — recolors the name
- `{ symbol: '<emoji>', color: '<name>' }` — puts an emoji before the name
  (add `color` if you want the name colored too; symbol-only is fine)
- `{ aliasOf: '<tag>' }` — shorthand for an existing tag

## Available Color Names

- `pink` → `#FF6B6B`
- `green` → `#88D498`
- `sky` → `#74B9FF`
- `yellow` → `#FFD23F`
- `orange` → `#FFA552`
- `lavender` → `#B8A9FA`
- `rose` → `#FF4FA0` (the special pink — Claire's)
- `owner` → `#88D498` (special green, striped)

## How It Works

1. User enters name like `Unbinding#/bernz#/ownz`
2. The tag parser extracts all `#/<tag>` patterns (case-insensitive)
3. Multiple tags combine: the last color-bearing tag wins for color, and
   every symbol-bearing tag adds its symbol (💎 wins as the only one used)
4. The symbol is prepended to the displayed name; the `#/tag` text itself
   is never shown
5. Names are stored in the database/localStorage exactly as typed — the
   tags are only stripped at display time, so adding a tag definition later
   retroactively styles everyone who already used it

## Files Affected

- `src/lib/nameTags.js` — tag definitions and parsing logic
- `src/pages/Leaderboard.jsx` — apply tags to player names
- `src/pages/VisitorLogbook.jsx` — apply tags to entry names
- `src/styles/index.css` — tag-specific styles