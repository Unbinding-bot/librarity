ICON PLACEHOLDERS
=================
Icons are split into two subfolders:

  ui-icons/       Small UI icons that replace emoji in buttons, navbar, game controls
  menu-cards/     Square card images (140x140px) used in the section menus

Each .txt file documents one placeholder. To replace it:
  1. Create your image as SVG or PNG
  2. Name it identically to the .txt file (e.g. icon-home.txt → icon-home.svg)
  3. Drop it in the same subfolder
  4. The .txt placeholder stays for documentation

SVG preferred (scales perfectly). PNG works too — use 2x resolution.

──────────────────────────────────────────────────────────────────
UI ICONS  (assets/images/icons/ui-icons/)
Small icons 16–32px — replace emoji in buttons and navigation
──────────────────────────────────────────────────────────────────
icon-admin.txt               ⚙️  20px   Admin nav / settings
icon-announcement.txt        📢  20px   Banners admin nav
icon-backspace.txt           ⌫   24px   Wordle keyboard backspace
icon-celebration.txt         🎉  28px   Game complete modal titles
icon-daily-calendar.txt      📅  18px   Daily mode button (all games)
icon-dictionary.txt          📖  48px   Dictionary tool card
icon-edit-pencil.txt         ✏️  16px   Edit / custom mode / change name
icon-events.txt              🎉  20px   Events admin nav
icon-eye-preview.txt         👁️  16px   Preview in admin cards
icon-flashcards.txt          📇  32px   Flashcards game heading/card
icon-help-question.txt       ❓  24px   Help / How to Play button
icon-hint-bulb.txt           💡  20px   Hint button
icon-home.txt                🏠  20px   Home nav link
icon-leaderboard.txt         🏆  20px   Leaderboard nav / Hall of Fame heading
icon-library-brand.txt       📚  32px   Navbar brand logo
icon-loading-hourglass.txt   ⏳  20px   Leaderboard loading indicator
icon-lock.txt                🔐  28px   Faculty / admin access lock
icon-logbook.txt             📖  20px   Logbook nav link
icon-medal-bronze.txt        🥉  20px   3rd place rank
icon-medal-gold.txt          🥇  20px   1st place rank
icon-medal-silver.txt        🥈  20px   2nd place rank
icon-moon.txt                🌙  20px   Theme toggle — dark mode
icon-music-note.txt          🎵  48px   Rhyme Finder tool card
icon-plus-add.txt            ➕  16px   Add / create buttons
icon-random-dice.txt         🎲  18px   Random mode button
icon-rating-easy.txt         😎  24px   Flashcard easy rating button
icon-rating-good.txt         😊  24px   Flashcard good rating button
icon-rating-hard.txt         😓  24px   Flashcard hard rating button
icon-refresh.txt             🔄  20px   Refresh / reset / new puzzle
icon-rocket.txt              🚀  20px   Coming Soon admin nav
icon-scroll.txt              📜  24px   Visitor Messages heading
icon-share-clipboard.txt     📋  20px   Share result button
icon-shuffle.txt             🔀  18px   Shuffle deck (flashcards)
icon-sign-logbook.txt        ✍️  20px   Sign the Logbook button
icon-spelling-bee.txt        🐝  32px   Spelling Bee game heading/card
icon-stats-chart.txt         📊  24px   Stats button (all games)
icon-sun.txt                 ☀️  20px   Theme toggle — light mode
icon-target.txt              🎯  18px   Random Custom / Trivia / Challenges
icon-tools.txt               🔧  20px   Tools nav link
icon-trash-delete.txt        🗑️  16px   Delete in admin cards
icon-trivia.txt              🎯  32px   Trivia game heading/card
icon-wiki-race.txt           🏁  32px   Wikipedia Race game heading/card
icon-word-ladder.txt         🪜  32px   Word Ladder game heading/card
icon-wordle.txt              🎮  32px   Wordle game heading/card

──────────────────────────────────────────────────────────────────
MENU CARD IMAGES  (assets/images/icons/menu-cards/)
Square illustrations 140x140px — shown as buttons in section menus
──────────────────────────────────────────────────────────────────
menu-wordle.txt              Games menu    → wordle.html
menu-spelling-bee.txt        Games menu    → spelling-bee.html
menu-word-ladder.txt         Games menu    → word-ladder.html
menu-trivia.txt              Games menu    → trivia.html
menu-flashcards.txt          Games menu    → flashcards.html
menu-wiki-race.txt           Games menu    → wikipedia-race.html
menu-dictionary.txt          Tools menu    → tools.html#dictionary
menu-thesaurus.txt           Tools menu    → tools.html#thesaurus
menu-rhyme-finder.txt        Tools menu    → tools.html#rhyme
menu-coming-book-list.txt    Coming Soon   (non-clickable)
menu-coming-crossword.txt    Coming Soon   (non-clickable)
menu-coming-word-search.txt  Coming Soon   (non-clickable)
placeholder-logbook.txt      Logbook menu  → leaderboard.html

──────────────────────────────────────────────────────────────────
HOW THE CODE RESOLVES ICONS
──────────────────────────────────────────────────────────────────
js/utils/icons.js handles ui-icons (emoji fallback → svg → png)

Menu card images are referenced directly in index.html with
an onerror fallback to an emoji if the image is missing.

Paths used in code:
  ui-icons:    assets/images/icons/ui-icons/icon-NAME.svg
  menu-cards:  assets/images/icons/menu-cards/menu-NAME.png
