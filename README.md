# Librarity

The library website for **Mandaue City Science National High School** — a Y2K /
neo-brutalist React app with mini-games, research tools, school events, and a
cloud leaderboard.

Built with React 19 + Vite + Supabase.

## Features

- **Games** — Wordle, Spelling Bee, Word Ladder, Trivia, Flashcards, and a
  Wikipedia Race, all playable in the browser.
- **Leaderboard** — scores submit to a Supabase `leaderboards` table; the
  leaderboard page shows best-per-player rankings.
- **Tools** — Dictionary, Thesaurus, and Rhyme Finder for research work.
- **Events** — current and past school-library events with pubmat images,
  badges ("Happening now" / "Coming soon"), and a detail page per event.
- **Admin panel** (`/admin`) — email/password login for managing events,
  leaderboard entries, and per-game name/description overrides + "coming
  soon" teaser cards (stored in a `site_items` table, layered over a
  code registry).

## Getting started

```bash
npm install
npm run dev
```

The dev server runs at `http://localhost:3000/librarity-react/` (base path is
set in `vite.config.js`).

Other scripts:

```bash
npm run build     # production build to dist/
npm run preview   # serve the production build locally
npm run lint      # eslint over src/
```

## Supabase setup

The app talks to a Supabase project for events, leaderboards, site item
overrides, and image storage. **Full setup SQL and step-by-step instructions
live in [`docs/supabase-setup.md`](docs/supabase-setup.md)** — it creates the
`events`, `leaderboards`, and `site_items` tables with RLS policies, the
`leaderboards_best` view, a validation trigger for score rows, and the public
`event-images` storage bucket.

Configuration lives in `src/lib/supabase.js` (URL + anon key). The anon key
is a *public* client key — Row Level Security policies are what protect the
data: everyone can read, only authenticated users can write. The admin
account is created in the Supabase dashboard (Auth → Add user).

To point the app at your own Supabase project, edit the `SUPABASE_URL` and
`SUPABASE_ANON_KEY` constants in `src/lib/supabase.js`, then run the setup SQL.

## Project structure

```
src/
├── components/ui/   # Button, Card, Navbar, Footer, GameShell, …
├── contexts/        # GameState, Theme, Toast providers
├── hooks/           # useAspect (image aspect-ratio helper)
├── lib/             # Supabase clients, data layers, games/tools registry
├── pages/           # Home, Games, Tools, Events, Leaderboard, Admin, …
│   ├── games/       # one component per game
│   └── tools/       # one component per tool
└── styles/          # tokens.css (design tokens) + index.css
```

Game/tool content (word lists, trivia questions, flashcard decks) ships as
JSON in `src/assets/`.

## Deployment notes

- The Vite `base` is `/librarity-react/` — if you deploy at a site root,
  change `base` in `vite.config.js` to `'/'` first.
- Set the same base path (or `/`) as the "Site URL" rewrite rule on your
  host so client-side routes like `/events/3` resolve to `index.html`.

## Credits

Made for the students of Mandaue City Science National High School.
