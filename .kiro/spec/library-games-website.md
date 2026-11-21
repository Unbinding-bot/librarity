# Library Games Website - Educational Interactive Platform

## Overview
An interactive, educational library website for school students featuring word/trivia games, utility tools (dictionary, thesaurus, rhyme finder), book list management, admin panel for content management, event theming system, leaderboards, and banner carousel - all with a green, doodly library aesthetic and smooth animations.

**Target Deployment:** GitHub Pages (static site)  
**Primary Users:** Students (public access) + School Librarians (admin access)

---

## Requirements

### 1. Games Section

#### 1.1 Wordle
- **FR-G-W-001**: Implement 5-letter word guessing game with 6 attempts
- **FR-G-W-002**: Provide color-coded feedback (green=correct position, yellow=wrong position, gray=not in word)
- **FR-G-W-003**: Display on-screen keyboard showing letter states
- **FR-G-W-004**: Support Daily Challenge mode (one challenge per day, same for all users)
- **FR-G-W-005**: Support Random/Unlimited mode (endless gameplay)
- **FR-G-W-006**: Validate words against English dictionary word list
- **FR-G-W-007**: Display statistics (games played, win %, current streak)
- **FR-G-W-008**: Provide "Share Results" button to copy emoji grid to clipboard
- **FR-G-W-009**: Prevent multiple attempts at same daily challenge
- **FR-G-W-010**: Integrate with leaderboard (score = attempts used, lower is better)
- **FR-G-W-011**: Show victory animation with confetti effect on win
- **FR-G-W-012**: Animate tile flips when submitting guess

#### 1.2 Spelling Bee
- **FR-G-SB-001**: Implement hexagonal layout with 1 required center letter + 6 surrounding letters
- **FR-G-SB-002**: Classic mode: find 4+ letter words using available letters
- **FR-G-SB-003**: Simplified mode: 5 letters (1 center + 4 surrounding), find 3+ letter words
- **FR-G-SB-004**: Enforce center letter must be used in every valid word
- **FR-G-SB-005**: Allow letter reuse in words
- **FR-G-SB-006**: Award bonus points for pangrams (words using all 7 letters)
- **FR-G-SB-007**: Display found words list with point values
- **FR-G-SB-008**: Show progress bar with rank titles (Beginner → Amazing → Genius)
- **FR-G-SB-009**: Provide shuffle button to rearrange outer letters
- **FR-G-SB-010**: Provide hints button showing first letters of unfound words
- **FR-G-SB-011**: Support daily challenge and random modes
- **FR-G-SB-012**: Integrate with leaderboard (score = total points earned)
- **FR-G-SB-013**: Scoring: 4-letter word = 1pt, longer = 1pt per letter, pangram = +7 bonus

#### 1.3 Word Ladder
- **FR-G-WL-001**: Present start word and target word of same length
- **FR-G-WL-002**: Accept intermediate words changing exactly one letter at a time
- **FR-G-WL-003**: Validate each intermediate word is valid English word
- **FR-G-WL-004**: Display ladder showing progression of submitted words
- **FR-G-WL-005**: Provide hint button showing one valid next word
- **FR-G-WL-006**: Provide give-up button revealing optimal solution
- **FR-G-WL-007**: Support daily challenge and random modes
- **FR-G-WL-008**: Auto-generate random word pairs with verified solution paths
- **FR-G-WL-009**: Allow admin to manually add word pairs with difficulty ratings
- **FR-G-WL-010**: Classify difficulty (Easy: 3-4 steps, Medium: 5-6, Hard: 7+)
- **FR-G-WL-011**: Integrate with leaderboard (score = steps used, lower is better)
- **FR-G-WL-012**: Implement BFS algorithm for shortest path validation

#### 1.4 Trivia
- **FR-G-T-001**: Support multiple question formats: multiple choice (4 options)
- **FR-G-T-002**: Support true/false format
- **FR-G-T-003**: Support fill-in-the-blank format with multiple accepted answers
- **FR-G-T-004**: Support image-based questions
- **FR-G-T-005**: Support multiple correct answers format (checkboxes)
- **FR-G-T-006**: Provide theme selection (Science, English, Math, General Knowledge, History, etc.)
- **FR-G-T-007**: Provide difficulty selection (Easy, Medium, Hard, Mixed)
- **FR-G-T-008**: Display timer (30 seconds per question, optional)
- **FR-G-T-009**: Show answer feedback with explanation after submission
- **FR-G-T-010**: Track score and display progress indicator (question X of 10)
- **FR-G-T-011**: Daily challenge: fixed set of 10 questions
- **FR-G-T-012**: Random mode: endless questions from selected theme
- **FR-G-T-013**: Track answer streaks
- **FR-G-T-014**: Integrate with leaderboard (score = correct answers × 100 + time bonus)

#### 1.5 Flashcards
- **FR-G-F-001**: Display cards with front/back content
- **FR-G-F-002**: Implement 3D flip animation on card click
- **FR-G-F-003**: Support theme-based card sets (English, Math, Science, etc.)
- **FR-G-F-004**: Provide navigation controls (next, previous, arrow keys)
- **FR-G-F-005**: Display progress indicator (card X of Y)
- **FR-G-F-006**: Provide shuffle button to randomize card order
- **FR-G-F-007**: Provide restart button to return to first card
- **FR-G-F-008**: Support daily challenge (specific card set) and random modes
- **FR-G-F-009**: Persist last viewed card position in localStorage
- **FR-G-F-010**: No scoring/leaderboard (pure study tool)

#### 1.6 Wikipedia Race
- **FR-G-WR-001**: Start at article A, navigate to article B using only internal Wikipedia links
- **FR-G-WR-002**: Track click count (number of article navigations)
- **FR-G-WR-003**: Track time taken from start to completion
- **FR-G-WR-004**: Display breadcrumb trail showing visited articles
- **FR-G-WR-005**: Article selection mode: both custom (user enters both)
- **FR-G-WR-006**: Article selection mode: start custom, end random
- **FR-G-WR-007**: Article selection mode: start random, end custom
- **FR-G-WR-008**: Article selection mode: both random
- **FR-G-WR-009**: Fetch and display Wikipedia article content via API
- **FR-G-WR-010**: Make internal Wikipedia links clickable and track clicks
- **FR-G-WR-011**: Provide article search with autocomplete
- **FR-G-WR-012**: Display victory modal when target article reached
- **FR-G-WR-013**: Provide give-up button (show shortest path if computable)
- **FR-G-WR-014**: Support daily challenge mode with fixed article pair
- **FR-G-WR-015**: Integrate with leaderboard (score = clicks + time penalty)

### 2. Utility Tools Section

#### 2.1 Dictionary
- **FR-T-D-001**: Provide search input for word lookup
- **FR-T-D-002**: Display word definitions grouped by part of speech
- **FR-T-D-003**: Show phonetic pronunciation with audio playback
- **FR-T-D-004**: Display example sentences
- **FR-T-D-005**: Show related words via Datamuse API integration
- **FR-T-D-006**: Implement search history stored in localStorage
- **FR-T-D-007**: Provide autocomplete suggestions during typing
- **FR-T-D-008**: Handle "word not found" errors gracefully
- **FR-T-D-009**: Animate results with slide-in and stagger effects
- **FR-T-D-010**: Display "Word of the Day" feature on tool homepage
- **FR-T-D-011**: Use Free Dictionary API (https://dictionaryapi.dev/)

#### 2.2 Thesaurus
- **FR-T-TH-001**: Provide search input for synonym/antonym lookup
- **FR-T-TH-002**: Display results in tabs: Synonyms, Antonyms, Related Words
- **FR-T-TH-003**: Show word frequency indicators from Datamuse metadata
- **FR-T-TH-004**: Allow clicking word to search for its synonyms (chaining)
- **FR-T-TH-005**: Provide "Save to Favorites" feature using localStorage
- **FR-T-TH-006**: Track API call count and show warning near rate limit
- **FR-T-TH-007**: Use Datamuse API for word relationships

#### 2.3 Rhyme Finder
- **FR-T-RF-001**: Provide search input for rhyme lookup
- **FR-T-RF-002**: Categorize results: Perfect rhymes, Near rhymes, Consonant matches
- **FR-T-RF-003**: Display syllable count for each result
- **FR-T-RF-004**: Provide filter by syllable count
- **FR-T-RF-005**: Use Datamuse API for rhyme data

### 3. Book List Feature

#### 3.1 Manual Entry
- **FR-BL-M-001**: Display book grid with card layout
- **FR-BL-M-002**: Show cover image (or placeholder if none)
- **FR-BL-M-003**: Display title, author, and colored tag chips
- **FR-BL-M-004**: Implement expandable synopsis view (flip card animation)
- **FR-BL-M-005**: Provide manual entry form with fields: title (required), author, synopsis, tags, cover image URL/upload, ISBN
- **FR-BL-M-006**: Implement tag input with chip UI (comma-separated)
- **FR-BL-M-007**: Provide search by title/author functionality
- **FR-BL-M-008**: Provide filter by tags functionality
- **FR-BL-M-009**: Provide sort options (title, author, date added)
- **FR-BL-M-010**: Show edit/delete buttons to admin users only
- **FR-BL-M-011**: Store books in `data/books.json`

#### 3.2 Auto-Add from APIs
- **FR-BL-A-001**: Provide book search input with "Search Books" button
- **FR-BL-A-002**: Query both Google Books API and Open Library API
- **FR-BL-A-003**: Display merged results with source indicator
- **FR-BL-A-004**: Show cover thumbnail, title, author, synopsis preview for each result
- **FR-BL-A-005**: Provide "Add to Library" button on each result
- **FR-BL-A-006**: Pre-fill manual entry form with API data when "Add to Library" clicked
- **FR-BL-A-007**: Allow user to edit and add tags before final save
- **FR-BL-A-008**: Handle loading states and API errors gracefully
- **FR-BL-A-009**: Cache recent searches to respect API rate limits
- **FR-BL-A-010**: Deduplicate results from multiple sources

### 4. Admin Panel ("Master Page")

#### 4.1 Authentication
- **FR-A-AUTH-001**: Implement GitHub OAuth flow for admin login
- **FR-A-AUTH-002**: Verify logged-in user is repository collaborator
- **FR-A-AUTH-003**: Store access token in sessionStorage
- **FR-A-AUTH-004**: Protect admin routes with authentication middleware
- **FR-A-AUTH-005**: Display "Access Denied" message to non-collaborators
- **FR-A-AUTH-006**: Provide logout button that clears session
- **FR-A-AUTH-007**: Handle token expiration gracefully
- **FR-A-AUTH-008**: Show user's GitHub profile icon when authenticated

#### 4.2 Event Management
- **FR-A-EV-001**: Display list of all events from `data/events.json`
- **FR-A-EV-002**: Provide form to add new event (name, start date, end date, theme CSS, content overrides)
- **FR-A-EV-003**: Provide edit functionality for existing events
- **FR-A-EV-004**: Provide delete functionality with confirmation modal
- **FR-A-EV-005**: Provide toggle for active/inactive status
- **FR-A-EV-006**: Store event theme CSS file path
- **FR-A-EV-007**: Store content override paths for themed game data
- **FR-A-EV-008**: Commit changes to GitHub via API
- **FR-A-EV-009**: Provide theme CSS templates for common events (Halloween, Christmas, etc.)

#### 4.3 Banner Management
- **FR-A-BN-001**: Display all banners with preview thumbnails
- **FR-A-BN-002**: Provide banner upload (file or URL)
- **FR-A-BN-003**: Validate file size (max 2MB) and dimensions (recommend 1200×300px)
- **FR-A-BN-004**: Provide edit form for banner properties (link, alt text, order)
- **FR-A-BN-005**: Provide delete functionality with confirmation
- **FR-A-BN-006**: Implement drag-and-drop reordering
- **FR-A-BN-007**: Show optimization prompt if banner >500KB
- **FR-A-BN-008**: Store banner references in `data/banners.json`
- **FR-A-BN-009**: Store banner images in `assets/images/banners/`

#### 4.4 Game Content Editor
- **FR-A-GC-001**: Provide tabbed interface for each game type (Wordle, Spelling Bee, etc.)
- **FR-A-GC-002**: Wordle tab: add/remove 5-letter words with validation
- **FR-A-GC-003**: Wordle tab: bulk import words from file
- **FR-A-GC-004**: Spelling Bee tab: create puzzles with center + 6 letters, valid word list
- **FR-A-GC-005**: Word Ladder tab: add word pairs with difficulty rating
- **FR-A-GC-006**: Trivia tab: add questions with format selection, theme, difficulty, answers, explanation
- **FR-A-GC-007**: Trivia tab: support image upload for image-based questions
- **FR-A-GC-008**: Flashcards tab: create card sets with theme, add cards with front/back
- **FR-A-GC-009**: Implement inline validation (e.g., word length checks)
- **FR-A-GC-010**: Provide bulk CSV import functionality
- **FR-A-GC-011**: Provide search/filter for existing content
- **FR-A-GC-012**: Provide preview functionality before saving
- **FR-A-GC-013**: Implement undo/redo with in-memory change history
- **FR-A-GC-014**: Commit all changes to respective JSON files via GitHub API

#### 4.5 Daily Challenge Overrides
- **FR-A-DC-001**: Display calendar view showing today + upcoming 7 days + past 30 days
- **FR-A-DC-002**: Show auto-generated challenge preview for each day
- **FR-A-DC-003**: Allow admin to override any day's challenge per game
- **FR-A-DC-004**: Provide revert-to-auto-generated option
- **FR-A-DC-005**: Store overrides in `data/daily-overrides.json`
- **FR-A-DC-006**: Provide bulk override feature (apply to multiple days)
- **FR-A-DC-007**: Mark past days as read-only

#### 4.6 Coming Soon Manager
- **FR-A-CS-001**: Display list of coming soon items from `data/coming-soon.json`
- **FR-A-CS-002**: Provide form to add new item with display type selection (list, roadmap, teaser card)
- **FR-A-CS-003**: Support static list type (simple text list)
- **FR-A-CS-004**: Support roadmap type (cards with progress bars and status)
- **FR-A-CS-005**: Support teaser card type (animated cards with images)
- **FR-A-CS-006**: Provide edit functionality for all item properties
- **FR-A-CS-007**: Allow updating progress percentage for roadmap items
- **FR-A-CS-008**: Provide image upload for teaser card items
- **FR-A-CS-009**: Implement drag-and-drop reordering
- **FR-A-CS-010**: Provide archive/delete functionality
- **FR-A-CS-011**: Commit changes to GitHub

#### 4.7 GitHub API Integration
- **FR-A-GH-001**: Implement `getFileContent(path)` to fetch JSON files from repository
- **FR-A-GH-002**: Implement `commitFileChange(path, content, message)` to update files
- **FR-A-GH-003**: Handle base64 encoding/decoding for file content
- **FR-A-GH-004**: Retrieve and cache file SHA for updates (required by GitHub API)
- **FR-A-GH-005**: Validate JSON before committing
- **FR-A-GH-006**: Generate descriptive commit messages automatically
- **FR-A-GH-007**: Show commit progress UI with success/error feedback
- **FR-A-GH-008**: Handle merge conflicts (fetch latest, merge, retry)
- **FR-A-GH-009**: Respect API rate limits (5,000 requests/hour)

### 5. Event Theming System

- **FR-EV-001**: Check `data/events.json` on app initialization for active events
- **FR-EV-002**: Compare current date against event start/end dates
- **FR-EV-003**: Load active event's theme CSS file dynamically
- **FR-EV-004**: Override CSS variables for colors in theme CSS
- **FR-EV-005**: Apply theme-specific background images
- **FR-EV-006**: Load theme-specific game content from contentOverrides paths
- **FR-EV-007**: Display theme indicator icon in UI showing active event
- **FR-EV-008**: Provide theme preview in admin panel
- **FR-EV-009**: Revert to default green theme when no events active

### 6. Leaderboard System

#### 6.1 Backend (Supabase)
- **FR-LB-BE-001**: Create Supabase PostgreSQL database with leaderboards table
- **FR-LB-BE-002**: Store columns: id (UUID), game_type, game_mode, player_name, score, time_taken, created_at, date_played
- **FR-LB-BE-003**: Configure Row Level Security (RLS): public INSERT and SELECT
- **FR-LB-BE-004**: Create indexes on game_type, game_mode, created_at, date_played
- **FR-LB-BE-005**: Create daily_leaderboards view (today's scores)
- **FR-LB-BE-006**: Create weekly_leaderboards view (past 7 days)
- **FR-LB-BE-007**: Implement health_check RPC function for keep-alive
- **FR-LB-BE-008**: Set up GitHub Actions workflow to ping database daily
- **FR-LB-BE-009**: Store Supabase URL and anon key in repository secrets

#### 6.2 Frontend Integration
- **FR-LB-FE-001**: Implement `submitScore(gameType, gameMode, playerName, score, timeTaken)` function
- **FR-LB-FE-002**: Implement `getLeaderboard(gameType, gameMode, period, limit)` function
- **FR-LB-FE-003**: Implement `getPlayerRank(gameType, gameMode, score)` function
- **FR-LB-FE-004**: Default player name to "Anonymous" if not provided
- **FR-LB-FE-005**: Validate score data before submission

#### 6.3 UI Component
- **FR-LB-UI-001**: Display dropdown filters for game type, mode, and time period
- **FR-LB-UI-002**: Display table with columns: rank, player name, score, time
- **FR-LB-UI-003**: Provide "Submit Score" modal with optional username input
- **FR-LB-UI-004**: Implement pagination for large result sets
- **FR-LB-UI-005**: Re-fetch data when filters change
- **FR-LB-UI-006**: Animate rows with stagger effect using anime.js
- **FR-LB-UI-007**: Highlight user's submitted score
- **FR-LB-UI-008**: Show loading spinner during fetch
- **FR-LB-UI-009**: Convert table to cards on mobile screens
- **FR-LB-UI-010**: Support real-time updates via Supabase subscriptions (optional)

### 7. Banner Carousel System

- **FR-BC-001**: Fetch banner data from `data/banners.json`
- **FR-BC-002**: Display banners at 100% width, max-height 300px, object-fit cover
- **FR-BC-003**: Auto-rotate banners every 5 seconds
- **FR-BC-004**: Provide manual navigation (prev/next buttons)
- **FR-BC-005**: Display dot indicators showing banner count and current position
- **FR-BC-006**: Support swipe gestures for mobile (touch events)
- **FR-BC-007**: Implement CSS transitions for smooth sliding
- **FR-BC-008**: Provide dismiss button storing state in localStorage
- **FR-BC-009**: Implement lazy loading for banner images
- **FR-BC-010**: Make banners clickable linking to specified URL

### 8. Design & User Experience

#### 8.1 Visual Theme
- **FR-UX-VIS-001**: Use green color palette (primary: #2d5016, secondary: #7cb342, accent: #aed581)
- **FR-UX-VIS-002**: Implement doodly, cartoonish art style with hand-drawn aesthetics
- **FR-UX-VIS-003**: Use wood grain texture for UI elements (shelves, panels)
- **FR-UX-VIS-004**: Provide circular logo integration spot (user-provided)
- **FR-UX-VIS-005**: Implement sketched borders using SVG filters
- **FR-UX-VIS-006**: Use imperfect shapes for organic feel
- **FR-UX-VIS-007**: Use custom cursor (pointing hand illustration)

#### 8.2 Library Aesthetic
- **FR-UX-LIB-001**: Design homepage with bookshelf layout (multiple rows)
- **FR-UX-LIB-002**: Represent each game as book spine on shelf
- **FR-UX-LIB-003**: Display vertical text on book spines with game titles
- **FR-UX-LIB-004**: Color-code books by category (Games, Tools, Coming Soon)
- **FR-UX-LIB-005**: Organize shelves by category sections
- **FR-UX-LIB-006**: Add ambient dust particle effects (CSS animation)
- **FR-UX-LIB-007**: Implement soft spotlight sweep across shelves

#### 8.3 Animations
- **FR-UX-AN-001**: Books tilt forward on hover
- **FR-UX-AN-002**: Books slide out with shadow effect on hover
- **FR-UX-AN-003**: Book flies off shelf and expands to game on click
- **FR-UX-AN-004**: Game shrinks back to book and returns to shelf on back
- **FR-UX-AN-005**: Books appear one by one with stagger on shelf load
- **FR-UX-AN-006**: Implement page transitions with horizontal slide and parallax
- **FR-UX-AN-007**: Modal entry: scale and fade with slight bounce
- **FR-UX-AN-008**: Dropdown menus slide down with item stagger
- **FR-UX-AN-009**: Button ripple effects on click
- **FR-UX-AN-010**: Form input focus animations
- **FR-UX-AN-011**: Page fade-in on load
- **FR-UX-AN-012**: Smooth scroll behavior
- **FR-UX-AN-013**: Use anime.js for complex animations
- **FR-UX-AN-014**: Use CSS transitions for simple animations
- **FR-UX-AN-015**: Optimize animations for 60fps (transform, opacity, GPU acceleration)
- **FR-UX-AN-016**: Implement will-change for animated elements
- **FR-UX-AN-017**: Respect prefers-reduced-motion user preference

#### 8.4 Responsive Design
- **FR-UX-RESP-001**: Define breakpoints: smartwatch (0-320px), mobile (321-768px), tablet (769-1024px), desktop (1025-1920px), TV (1921px+)
- **FR-UX-RESP-002**: Smartwatch: minimal UI, single column, large tap targets
- **FR-UX-RESP-003**: Mobile: touch-optimized, gesture support, bottom navigation, card layouts
- **FR-UX-RESP-004**: Tablet: two-column layouts, hybrid touch/mouse
- **FR-UX-RESP-005**: Desktop: multi-column layouts, hover effects, keyboard shortcuts
- **FR-UX-RESP-006**: TV: extra large text, remote-friendly navigation (arrow keys)
- **FR-UX-RESP-007**: Convert bookshelf to grid of book covers on mobile
- **FR-UX-RESP-008**: Convert tables to stacked cards on mobile
- **FR-UX-RESP-009**: Admin panel sidebar becomes top tabs on mobile
- **FR-UX-RESP-010**: Support swipe gestures for carousel and flashcards
- **FR-UX-RESP-011**: Handle orientation changes (portrait/landscape)

### 9. Navigation & Global UI

#### 9.1 Navbar
- **FR-NAV-001**: Create sticky navbar with green theme and wood texture
- **FR-NAV-002**: Display school logo (circular) on left
- **FR-NAV-003**: Display navigation links: Home, Games, Tools, Books, Coming Soon
- **FR-NAV-004**: Display admin login button on right (or profile icon if logged in)
- **FR-NAV-005**: Mobile: implement hamburger menu with slide-out drawer
- **FR-NAV-006**: Support keyboard navigation (Tab, Enter)

#### 9.2 Footer
- **FR-FOOT-001**: Display quick links section
- **FR-FOOT-002**: Display contact info
- **FR-FOOT-003**: Display "Powered by [School Name] Library" credit
- **FR-FOOT-004**: Display social media icons (if applicable)

#### 9.3 Reusable Components
- **FR-COMP-001**: Create modal dialog component with backdrop blur
- **FR-COMP-002**: Create loading spinner with book opening animation
- **FR-COMP-003**: Create toast notification system (slide from top)
- **FR-COMP-004**: Create breadcrumb navigation component
- **FR-COMP-005**: Create back button with consistent behavior

### 10. Local Storage & State Management

- **FR-LS-001**: Implement `getGameState(gameType)` to retrieve saved progress
- **FR-LS-002**: Implement `saveGameState(gameType, state)` to persist progress
- **FR-LS-003**: Implement `getStatistics(gameType)` to retrieve game stats
- **FR-LS-004**: Implement `updateStatistics(gameType, stats)` to update stats
- **FR-LS-005**: Implement `getPreferences()` to retrieve user preferences
- **FR-LS-006**: Implement `setPreference(key, value)` to save preferences
- **FR-LS-007**: Store game states for in-progress games
- **FR-LS-008**: Store statistics (games played, win rate, streaks, best scores)
- **FR-LS-009**: Track daily challenge completion status
- **FR-LS-010**: Store user preferences (theme, sound effects, reduced motion)
- **FR-LS-011**: Store search history (limit to 50 items)
- **FR-LS-012**: Store favorite words/flashcard sets
- **FR-LS-013**: Store admin token in sessionStorage (not localStorage)
- **FR-LS-014**: Auto-cleanup old game states (>7 days)
- **FR-LS-015**: Auto-cleanup completed daily challenges after date passes
- **FR-LS-016**: Provide data export/import feature (JSON format)
- **FR-LS-017**: Display storage usage in settings panel

### 11. Daily Challenge System

- **FR-DC-001**: Use date as seed for deterministic random challenge generation
- **FR-DC-002**: Implement `getDailyChallenge(gameType, date)` function
- **FR-DC-003**: Check `data/daily-overrides.json` for manual overrides first
- **FR-DC-004**: Fall back to auto-generated challenge if no override exists
- **FR-DC-005**: Ensure same challenge for all users on same date (date-seed based)
- **FR-DC-006**: Support per-game override configuration
- **FR-DC-007**: Reset challenges at midnight local time

### 12. Routing & Navigation

- **FR-ROUTE-001**: Implement hash-based client-side routing (supports GitHub Pages)
- **FR-ROUTE-002**: Support routes: #/, #/games, #/games/:gameName, #/tools, #/tools/:toolName, #/books, #/coming-soon, #/admin
- **FR-ROUTE-003**: Implement route protection middleware for admin routes
- **FR-ROUTE-004**: Handle 404 (route not found) gracefully
- **FR-ROUTE-005**: Support browser back/forward navigation
- **FR-ROUTE-006**: Update page title based on current route

### 13. Accessibility

- **FR-ACC-001**: Support keyboard navigation throughout site
- **FR-ACC-002**: Add ARIA labels to interactive elements
- **FR-ACC-003**: Implement visible focus indicators
- **FR-ACC-004**: Provide screen reader text for icon-only buttons
- **FR-ACC-005**: Ensure sufficient color contrast (WCAG AA minimum)
- **FR-ACC-006**: Support keyboard shortcuts for games
- **FR-ACC-007**: Announce dynamic content changes to screen readers
- **FR-ACC-008**: Ensure all images have alt text

### 14. Performance & Optimization

- **FR-PERF-001**: Page load time < 3 seconds on 3G connection
- **FR-PERF-002**: First contentful paint < 1.5 seconds
- **FR-PERF-003**: Target Lighthouse score > 90 in all categories
- **FR-PERF-004**: Lazy load images using loading="lazy" attribute
- **FR-PERF-005**: Lazy load heavy animations
- **FR-PERF-006**: Cache API responses where appropriate
- **FR-PERF-007**: Minimize and compress CSS/JS for production (optional)
- **FR-PERF-008**: Use CDN for anime.js library
- **FR-PERF-009**: Implement service worker for offline functionality (optional PWA)

### 15. Error Handling & Edge Cases

- **FR-ERR-001**: Handle network offline scenarios gracefully
- **FR-ERR-002**: Handle API rate limit exceeded with user-friendly message
- **FR-ERR-003**: Handle invalid API responses
- **FR-ERR-004**: Validate extremely long usernames (max 50 chars)
- **FR-ERR-005**: Sanitize special characters in user inputs
- **FR-ERR-006**: Handle concurrent admin edits with conflict resolution
- **FR-ERR-007**: Handle localStorage quota exceeded
- **FR-ERR-008**: Provide graceful degradation for very old browsers
- **FR-ERR-009**: Display user-friendly error messages (no technical jargon)
- **FR-ERR-010**: Implement fallback UI for failed component loads

### 16. Content Requirements

- **FR-CONT-001**: Provide 2,000+ 5-letter words for Wordle
- **FR-CONT-002**: Provide 50+ pre-designed Spelling Bee puzzles
- **FR-CONT-003**: Provide 200+ Word Ladder pairs with verified paths
- **FR-CONT-004**: Provide 500+ trivia questions across all themes
- **FR-CONT-005**: Provide 10+ flashcard sets with 20+ cards each
- **FR-CONT-006**: Provide sample events (Halloween, Christmas) with theme CSS
- **FR-CONT-007**: Provide sample banners (3+ images)
- **FR-CONT-008**: Provide example coming soon items
- **FR-CONT-009**: Provide initial book list (10+ books)

### 17. Documentation & Deployment

- **FR-DOC-001**: Create comprehensive README.md with project overview
- **FR-DOC-002**: Document technology stack and dependencies
- **FR-DOC-003**: Provide local development instructions
- **FR-DOC-004**: Document admin panel access and usage
- **FR-DOC-005**: Create SETUP.md for initial configuration (OAuth, Supabase, GitHub Pages)
- **FR-DOC-006**: Document all API integrations and rate limits
- **FR-DOC-007**: Provide admin user guide (PDF or markdown)
- **FR-DOC-008**: Configure GitHub Pages deployment (main branch, root folder)
- **FR-DOC-009**: Add Open Graph meta tags for social sharing
- **FR-DOC-010**: Add favicon (book icon)
- **FR-DOC-011**: Add manifest.json for PWA support (optional)
- **FR-DOC-012**: Implement schema.org markup for SEO

---

## Non-Functional Requirements

### NFR-1: Compatibility
- Must work on Chrome, Firefox, Safari, Edge (latest versions)
- Must work on iOS Safari and Android Chrome
- Should provide graceful degradation for older browsers

### NFR-2: Security
- GitHub OAuth must validate repository collaborator status
- Supabase RLS policies must restrict data access appropriately
- Admin token must be stored in sessionStorage only (not localStorage)
- All user inputs must be sanitized to prevent XSS
- API keys must be stored in repository secrets (not committed to code)

### NFR-3: Scalability
- Site must handle 50+ concurrent users without performance degradation
- Supabase free tier limits: 500MB database, 2GB bandwidth, 50K monthly active users
- API rate limits must be respected and monitored

### NFR-4: Maintainability
- Code must be modular and organized by feature
- Each game must be independently editable
- Admin panel must allow content changes without code deployment
- Clear separation between data (JSON) and logic (JS)

### NFR-5: Usability
- Games must be intuitive and playable without instructions
- Admin panel must be usable by non-technical librarians
- Mobile experience must be equivalent to desktop (no missing features)
- Error messages must be clear and actionable

### NFR-6: Data Persistence
- Game progress must survive page refresh
- Statistics must persist indefinitely
- Daily challenge completion must be tracked accurately
- Admin changes must commit to GitHub reliably

---

## Out of Scope

The following are explicitly **not** included in this specification:

1. User account system with email/password authentication
2. Social features (comments, likes, friend systems)
3. Multiplayer or real-time competitive modes
4. Native mobile apps (iOS/Android)
5. Backend server infrastructure (purely static site)
6. Payment or premium features
7. Content moderation tools
8. Automated content generation (AI-generated questions, etc.)
9. Video or audio content beyond pronunciation audio
10. Third-party login providers beyond GitHub OAuth
11. Custom analytics dashboard (use external service if needed)
12. Automated testing suite (though manual testing is required)

---

## Constraints & Assumptions

### Constraints
- **C-1**: Must be deployable as static site on GitHub Pages (no server-side code)
- **C-2**: Must use free tier services (Supabase, GitHub, APIs)
- **C-3**: Must respect API rate limits (see Technical Specifications)
- **C-4**: Must work without build tools (vanilla JS) - build tools optional for development only
- **C-5**: Maximum file size for banner uploads: 2MB
- **C-6**: Supabase database must be kept active (7-day inactivity limit)

### Assumptions
- **A-1**: Users have modern browsers with JavaScript enabled
- **A-2**: School has GitHub account for repository hosting
- **A-3**: Admin users are comfortable with basic GitHub operations
- **A-4**: Site will be used primarily during school hours (not global 24/7)
- **A-5**: Internet connection available for API access (dictionary, books, etc.)
- **A-6**: School logo provided as PNG with transparent background
- **A-7**: Content (word lists, questions) will be curated by librarians

---

## Success Criteria

The project will be considered successful when:

1. ✅ All 6 games are fully functional with daily and random modes
2. ✅ All 3 utility tools (dictionary, thesaurus, rhyme finder) work correctly
3. ✅ Book list feature supports manual entry and API search
4. ✅ Admin panel allows complete content management without code changes
5. ✅ Leaderboards store and display scores accurately
6. ✅ Event theming system changes visual appearance and content
7. ✅ Site is fully responsive on all target devices (mobile to TV)
8. ✅ Animations run smoothly at 60fps on modern devices
9. ✅ Site achieves Lighthouse score > 90 in all categories
10. ✅ GitHub Pages deployment is successful and publicly accessible
11. ✅ Admin authentication restricts access to collaborators only
12. ✅ Documentation is complete and enables setup by following steps

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| API rate limits exceeded | Medium | High | Implement caching, request throttling, usage monitoring |
| Supabase database pauses | High | Medium | GitHub Actions keep-alive workflow, daily ping |
| GitHub OAuth complexity | Medium | High | Thorough testing, fallback admin password option if needed |
| Animation performance issues | Low | Medium | Performance profiling, lazy loading, reduced motion support |
| Browser compatibility issues | Medium | Medium | Cross-browser testing, polyfills, graceful degradation |
| Large JSON file performance | Low | Low | Pagination, lazy loading, file splitting if needed |
| Content management confusion | Medium | Low | Comprehensive admin guide, in-app tooltips |
| Security vulnerabilities | Low | High | Input sanitization, CSP headers, regular security reviews |

---

## Dependencies & Integrations

### External APIs
1. **Free Dictionary API** - Word definitions and pronunciations
2. **Datamuse API** - Synonyms, antonyms, rhymes, word relations
3. **Google Books API** - Book search and metadata
4. **Open Library API** - Alternative book data source
5. **Wikipedia API (MediaWiki)** - Article content for Wikipedia Race
6. **GitHub REST API** - Repository file management and authentication
7. **Supabase API** - Leaderboard database operations

### External Libraries
1. **anime.js** - Complex animation engine (via CDN)
2. **Supabase JS Client** - Database SDK (via CDN or npm)

### Services
1. **GitHub Pages** - Static site hosting
2. **GitHub OAuth** - Admin authentication
3. **Supabase** - PostgreSQL database hosting
4. **GitHub Actions** - Automated workflows (keep-alive)

---

## Technical Specifications Summary

### File Structure
```
library-game-website/
├── index.html
├── admin.html
├── css/
│   ├── main.css
│   ├── animations.css
│   ├── responsive.css
│   └── themes/ (halloween.css, christmas.css, default.css)
├── js/
│   ├── main.js
│   ├── router.js
│   ├── api/ (dictionary, datamuse, books, wikipedia, github, supabase)
│   ├── games/ (wordle, spelling-bee, word-ladder, trivia, flashcards, wikipedia-race)
│   ├── tools/ (dictionary, thesaurus, rhyme-finder)
│   ├── admin/ (auth, panel, event-manager, banner-manager, content-editor, github-commit)
│   ├── components/ (navbar, banner-carousel, leaderboard, coming-soon, theme-switcher)
│   └── utils/ (daily-challenge, local-storage, animations)
├── data/
│   ├── books.json
│   ├── events.json
│   ├── banners.json
│   ├── coming-soon.json
│   ├── daily-overrides.json
│   ├── games/ (wordle-words, spelling-bee-puzzles, word-ladder-pairs, trivia-questions, flashcards)
│   └── themes/ (event-content)
├── assets/
│   ├── images/ (banners, icons, backgrounds, logo)
│   └── sounds/
├── .github/workflows/ (supabase-keepalive.yml)
└── README.md, SETUP.md
```

### Database Schema (Supabase)
```sql
CREATE TABLE leaderboards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_type VARCHAR(50) NOT NULL,
  game_mode VARCHAR(20) NOT NULL,
  player_name VARCHAR(50) DEFAULT 'Anonymous',
  score INTEGER NOT NULL,
  time_taken INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  date_played DATE DEFAULT CURRENT_DATE
);

-- Indexes on: game_type, game_mode, created_at, date_played
-- Views: daily_leaderboards, weekly_leaderboards
```

### CSS Variables (Green Theme)
```css
:root {
  --primary-color: #2d5016;
  --secondary-color: #7cb342;
  --accent-color: #aed581;
  --background-color: #f5f5dc;
  --text-color: #1a1a1a;
  --wood-texture: url('../assets/images/wood-grain.png');
}
```

### API Rate Limits
- Free Dictionary API: No documented limit
- Datamuse API: 100,000 requests/day (free), key required after Jan 1, 2027
- Google Books API: 1,000 requests/day (no key), 10,000 with free API key
- Open Library API: 3 requests/second with User-Agent header
- Wikipedia API: No hard limit, be respectful (1-2 requests/second max)
- GitHub API: 5,000 requests/hour (authenticated)
- Supabase: Free tier limits above

---

## Next Steps

After requirements approval, the next phase will be:

1. **Design Phase**: Create high-level architecture diagrams, component relationships, data flow, and low-level technical design
2. **Task Breakdown**: Convert design into 30 discrete, testable implementation tasks
3. **Implementation**: Build features incrementally following task order
4. **Testing**: Comprehensive cross-browser, device, and edge case testing
5. **Deployment**: Configure GitHub Pages and document setup process

---

## Approval

This requirements document should be reviewed and approved by:
- [ ] Project Stakeholder (School Librarian)
- [ ] Technical Lead
- [ ] Design Lead (if applicable)

Once approved, proceed to Design phase.

---

**Document Version**: 1.0  
**Last Updated**: 2026-08-15  
**Author**: Kiro AI Development Environment
