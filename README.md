# 📚 School Library Games

An interactive educational website for school libraries. Features word games, trivia, study tools, and a visitor logbook — all with a hand-drawn library aesthetic.

---

## Games

| Game | Description |
|------|-------------|
| **Wordle** | Guess the 5-letter word in 6 tries. Daily challenge + unlimited random mode. |
| **Spelling Bee** | Form words from 7 letters. Every word must use the center letter. |
| **Word Ladder** | Transform one word into another by changing one letter at a time. |
| **Trivia** | Multiple-choice quiz across various topics and difficulty levels. |
| **Flashcards** | Create and study decks with spaced-repetition difficulty ratings. |
| **Wikipedia Race** | Navigate from one Wikipedia article to another using only links. |

## Tools

- **Dictionary** — word definitions via the Free Dictionary API
- **Thesaurus** — synonyms and antonyms via the Datamuse API
- **Rhyme Finder** — rhyming words via the Datamuse API

## Other Features

- **Visitor Logbook** — sign in, leave a message, view the leaderboard (open book layout)
- **Illustrated Homepage** — hand-drawn library background with clickable hitbox areas
- **Dark / Light Mode** — persistent theme toggle on all pages except the illustrated homepage
- **Admin Panel** — GitHub OAuth login for repository collaborators; manage events, banners, game content, and daily challenges
- **Daily Challenges** — date-seeded daily word/puzzle for Wordle and Spelling Bee

---

## Tech Stack

- **Frontend** — HTML5, CSS3, vanilla JavaScript (ES modules)
- **Animation** — anime.js
- **Database / Auth** — Supabase (PostgreSQL) for leaderboards
- **APIs** — Free Dictionary, Datamuse, Google Books, Open Library, Wikipedia, GitHub REST
- **Deployment** — GitHub Pages (static site, no build step)

---

## Project Structure

```
/
├── index.html              # Library homepage (illustrated + fallback)
├── entrance.html           # Visitor sign-in page
├── wordle.html             # Wordle game
├── spelling-bee.html       # Spelling Bee game
├── word-ladder.html        # Word Ladder game
├── trivia.html             # Trivia game
├── flashcards.html         # Flashcards
├── wikipedia-race.html     # Wikipedia Race
├── tools.html              # Dictionary / Thesaurus / Rhyme Finder
├── leaderboard.html        # Visitor Logbook + Leaderboard
├── admin.html              # Admin panel (GitHub OAuth)
├── faculty-door.html       # Faculty password gate
│
├── css/                    # Stylesheets
│   ├── main.css            # Global styles + CSS variables
│   ├── theme.css           # Light / dark mode variables
│   ├── game-ui-fixes.css   # Modal system + centered overlays
│   ├── library-home.css    # Homepage illustrated + fallback layout
│   ├── visitor-logbook.css # Open book leaderboard / logbook page
│   └── [game].css          # Per-game styles
│
├── js/
│   ├── main.js             # App bootstrap + router setup
│   ├── router.js           # Hash-based client-side router
│   ├── theme/
│   │   ├── theme-toggle.js # Drop-in theme toggle (used on game pages)
│   │   └── theme-system.js # Full ThemeSystem class (used on index)
│   ├── games/              # One file per game
│   ├── api/
│   │   └── supabase.js     # Leaderboard read/write
│   ├── components/
│   │   ├── modal-system.js       # Centralized modal open/close
│   │   ├── visitor-logbook.js    # Username + logbook localStorage
│   │   ├── banner-carousel.js
│   │   └── leaderboard.js
│   ├── events/
│   │   └── event-system.js # Seasonal event theming
│   └── utils/
│       └── icons.js        # Icon resolver (SVG → PNG → emoji fallback)
│
├── data/
│   ├── hitboxes.json       # Clickable areas for the library illustration
│   ├── daily-overrides.json
│   ├── events.json
│   ├── banners.json
│   ├── wordle-targets.json # 2,315 Wordle answer words
│   ├── wordle-valid.json   # 12,972 valid Wordle guesses
│   └── spelling-bee-words.json  # 24,461 words (4+ letters)
│
├── assets/
│   ├── images/
│   │   ├── backgrounds/    # library.png — the illustrated homepage image
│   │   └── icons/
│   │       ├── ui-icons/   # Small emoji-replacement icons (SVG/PNG)
│   │       └── menu-cards/ # 140×140 section menu card images (PNG)
│   └── sounds/             # Optional game sounds
│
├── scripts/                # Utility scripts (not served)
│   ├── hitbox_tool.py      # GUI tool to draw hitboxes on library.png
│   ├── update_wordle_json.py
│   ├── update_spelling_bee_json.py
│   └── update_game_words.bat
│
├── docs/                   # Developer documentation
│   ├── SETUP.md            # API keys + Supabase configuration
│   ├── DEPLOYMENT.md       # GitHub Pages deployment steps
│   ├── FINAL_CHECKLIST.md  # Pre-launch checklist
│   └── ...
│
└── database-schema.sql     # Supabase table definitions
```

---

## Setup

See **[docs/SETUP.md](docs/SETUP.md)** for full instructions. Quick summary:

### 1. Clone & open
```bash
git clone https://github.com/your-org/library-games.git
cd library-games
# Open index.html in a browser or use Live Server
```

### 2. Configure Supabase (leaderboards)
1. Create a project at [supabase.com](https://supabase.com)
2. Run `database-schema.sql` in the SQL editor
3. Copy your project URL and anon key into `js/api/supabase.js`

### 3. Configure GitHub OAuth (admin panel)
1. Create a GitHub OAuth App at github.com → Settings → Developer settings
2. Set the callback URL to your GitHub Pages URL
3. Add the client ID/secret to your repo secrets

### 4. Add the library illustration (optional)
Place a 3840×2160 PNG at `assets/images/backgrounds/library.png`.  
Then run the hitbox tool to map clickable areas:
```bash
pip install pillow
python scripts/hitbox_tool.py
# Draw boxes over each section, press S to save
```

### 5. Add word lists (already included in `data/`)
If you need to regenerate from source:
```bash
python scripts/update_wordle_json.py
python scripts/update_spelling_bee_json.py
```

---

## Adding Icons

Icon placeholders are in `assets/images/icons/`:

- **`ui-icons/`** — small emoji-replacement icons (navbar, buttons). Drop a same-named `.svg` or `.png` to replace.
- **`menu-cards/`** — 140×140px card images for the section menus. Drop a same-named `.png` to replace.

See `assets/images/icons/README.txt` for the full list.

---

## Deployment

The site is a fully static site — no build step required.

```bash
# GitHub Pages: just push to main
git push origin main
```

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for custom domain and GitHub Actions setup.

---

## Browser Support

Chrome, Firefox, Safari, Edge (latest). Mobile browsers supported.

---

## License

By Unbinding
