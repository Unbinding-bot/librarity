import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { motion, AnimatePresence } from 'framer-motion'
import hitboxesData from '../assets/hitboxes.json'

// Menu item data (defined in both views for consistency)
const MENU_ITEMS = {
  games: [
    { id: 'wordle', label: 'Wordle', desc: 'Guess the 5-letter word', to: '/wordle', icon: '🔤' },
    { id: 'spelling-bee', label: 'Spelling Bee', desc: 'Form words from the hive', to: '/spelling-bee', icon: '🐝' },
    { id: 'word-ladder', label: 'Word Ladder', desc: 'Transform one word to another', to: '/word-ladder', icon: '🪜' },
    { id: 'trivia', label: 'Trivia', desc: 'Test your knowledge', to: '/trivia', icon: '🎯' },
    { id: 'flashcards', label: 'Flashcards', desc: 'Study & memorise', to: '/flashcards', icon: '📇' },
    { id: 'wiki-race', label: 'Wikipedia Race', desc: 'Navigate between articles', to: '/wikipedia-race', icon: '🏁' },
  ],
  tools: [
    { id: 'dictionary', label: 'Dictionary', desc: 'Look up word definitions', to: '/tools/dictionary', icon: '📖' },
    { id: 'thesaurus', label: 'Thesaurus', desc: 'Find synonyms & antonyms', to: '/tools/thesaurus', icon: '📝' },
    { id: 'rhyme-finder', label: 'Rhyme Finder', desc: 'Discover rhyming words', to: '/tools/rhyme-finder', icon: '🎵' },
  ],
  comingSoon: [
    { id: 'book-list', label: 'Book List', desc: 'Browse the library catalogue', to: '/coming-soon', icon: '📚' },
    { id: 'crossword', label: 'Crossword', desc: 'Fill in the blanks', to: '/coming-soon', icon: '✏️' },
    { id: 'word-search', label: 'Word Search', desc: 'Find words in the grid', to: '/coming-soon', icon: '🔍' },
  ],
  logbook: [
    { id: 'logbook', label: 'Open Logbook', desc: 'Sign in & leave a message', to: '/logbook', icon: '📖' },
  ],
  faculty: [] // Special handling - link to external auth
}

// Check if screen is approximately 16:9 (like the original)
function is169Screen(width, height) {
  const ratio = width / height;
  return width >= 900 && ratio >= 1.6 && ratio <= 1.95;
}

// Menu card component for section menus
function MenuCard({ item, onClick, disabled = false }) {
  const content = (
    <>
      <div className="mc-img-wrap">
        <div className="mc-img-fallback">{item.icon}</div>
      </div>
      <div className="mc-label">{item.label}</div>
      <div className="mc-desc">{item.desc}</div>
      {disabled && <div className="mc-badge">Coming Soon</div>}
    </>
  )

  if (disabled) {
    return (
      <div className="menu-card menu-card-disabled" onClick={onClick} aria-disabled="true">
        {content}
      </div>
    )
  }

  return (
    <Link to={item.to} className="menu-card" onClick={onClick}>
      {content}
    </Link>
  )
}

// Section menu panel
function SectionMenu({ name, title, subtitle, items, onClose, disabled = false }) {
  if (!items || items.length === 0) {
    return (
      <div className="section-menu section-menu-single">
        <button className="menu-back-btn" onClick={() => onClose(name)}>← Back to Library</button>
        <h1 className="menu-title">{title}</h1>
        <p className="menu-subtitle">{subtitle}</p>
      </div>
    )
  }

  return (
    <div className="section-menu">
      <button className="menu-back-btn" onClick={() => onClose(name)}>← Back to Library</button>
      <h1 className="menu-title">{title}</h1>
      <p className="menu-subtitle">{subtitle}</p>
      <motion.div
        className="menu-grid"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
        }}
      >
        {items.map(item => (
          <MenuCard
            key={item.id}
            item={item}
            onClick={() => !disabled && onClose(name)}
            disabled={disabled}
          />
        ))}
      </motion.div>
    </div>
  )
}

// Faculty login panel
function FacultyPanel({ onClose }) {
  return (
    <div className="section-menu section-menu-faculty">
      <button className="menu-back-btn" onClick={() => onClose('faculty')}>← Back to Library</button>
      <h1 className="menu-title">🔐 Faculty Only</h1>
      <p className="menu-subtitle">Staff &amp; admin access</p>
      <div className="faculty-login-panel">
        <div className="faculty-login-section">
          <h3>GitHub Login</h3>
          <Link to="/admin" className="faculty-btn faculty-btn-github">Login with GitHub</Link>
          <p className="faculty-note">Requires repository collaborator access</p>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const { theme } = useTheme()
  const navigate = useNavigate()

  // State for menu transitions
  const [activeMenu, setActiveMenu] = useState(null)
  const [showIllustratedViews, setShowIllustratedViews] = useState(true)
  const [imageLoaded, setImageLoaded] = useState(false)

  // Refs for DOM elements
  const _illustratedViewRef = useRef(null)
  const bgImgRef = useRef(null)
  const hitboxLayerRef = useRef(null)

  // Check screen dimensions for 16:9
  const _is169 = useMemo(() => {
    if (typeof window === 'undefined') return false
    return is169Screen(window.innerWidth, window.innerHeight)
  }, [])

  // Update view type based on screen dimensions
  useEffect(() => {
    const checkView = () => {
      const isDesktop169 = is169Screen(window.innerWidth, window.innerHeight)
      setShowIllustratedViews(isDesktop169 && imageLoaded)
    }

    checkView()
    window.addEventListener('resize', checkView)
    return () => window.removeEventListener('resize', checkView)
  }, [imageLoaded])

  // Handle library image load
  const handleImageLoad = useCallback(() => {
    setImageLoaded(true)
    // After image loads, check if we should show illustrated view
    setTimeout(() => {
      if (is169Screen(window.innerWidth, window.innerHeight)) {
        setShowIllustratedViews(true)
      }
    }, 100)
  }, [])

  // Open a section - chooses appropriate view
  const openSection = useCallback((name) => {
    setActiveMenu(name)
  }, [])

  // Close current menu, return to library
  const closeMenu = useCallback(() => {
    setActiveMenu(null)
  }, [])

  // Navigate to link directly (for tools/games)
  const _handleDirectLink = useCallback((to) => {
    if (activeMenu) {
      closeMenu()
    }
    navigate(to)
  }, [activeMenu, closeMenu, navigate])

  // Build the CSS cursor for hitboxes based on section
  const getCursor = (sectionName) => {
    const cursors = {
      games: 'url("assets/images/cursors/cursor-book.cur"), pointer',
      tools: 'url("assets/images/cursors/cursor-wrench.cur"), pointer',
      logbook: 'url("assets/images/cursors/cursor-quill.cur"), pointer',
      faculty: 'url("assets/images/cursors/cursor-lock.cur"), pointer',
      'coming-soon': 'url("assets/images/cursors/cursor-star.cur"), pointer',
    }
    return cursors[sectionName] || 'pointer'
  }

  // Render hitboxes for illustrated view
  const renderHitboxes = () => {
    if (!showIllustratedViews) return null

    const hitboxes = hitboxesData.hitboxes || [
      { name: 'games', x: 10, y: 25, w: 20, h: 50 },
      { name: 'tools', x: 33, y: 25, w: 20, h: 50 },
      { name: 'logbook', x: 56, y: 25, w: 18, h: 50 },
      { name: 'faculty', x: 76, y: 25, w: 12, h: 50 },
      { name: 'coming-soon', x: 45, y: 70, w: 12, h: 20 },
    ]

    return hitboxes.map(hitbox => (
      <div
        key={hitbox.name}
        className="hitbox"
        style={{
          left: `${hitbox.x}%`,
          top: `${hitbox.y}%`,
          width: `${hitbox.w}%`,
          height: `${hitbox.h}%`,
          cursor: getCursor(hitbox.name),
          animationDelay: `${Math.random() * 0.5}s`,
        }}
        onClick={() => openSection(hitbox.name)}
        onMouseEnter={(e) => e.currentTarget.classList.add('hitbox-hover')}
        onMouseLeave={(e) => e.currentTarget.classList.remove('hitbox-hover')}
      />
    ))
  }

  // Transition overlay for menu transitions
  const [overlayClass, setOverlayClass] = useState('')

  const _handleOpenMenu = (name) => {
    setOverlayClass('overlay-fade-in')
    setTimeout(() => {
      openSection(name)
      setOverlayClass(prev => prev + ' overlay-fade-out')
    }, 350)
  }

  const _handleCloseMenu = () => {
    setOverlayClass('overlay-fade-in')
    setTimeout(() => {
      closeMenu()
      setOverlayClass(prev => {
        const next = prev.replace('overlay-fade-in', '') + ' overlay-fade-out'
        return next
      })
    }, 250)
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        if (activeMenu) {
          e.preventDefault()
          closeMenu()
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [activeMenu, closeMenu])

  // Animation variants
  const _menuVariants = {
    hidden: { opacity: 0, y: 16, pointerEvents: 'none' },
    visible: { opacity: 1, y: 0, pointerEvents: 'auto', transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] } },
  }

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  }

  return (
    <div className="home-page">
      {/* Illustrated View (16:9 screens) */}
      <AnimatePresence>
        {showIllustratedViews && (
          <motion.div
            key="illustrated"
            className="illustrated-view"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="library-bg">
              <img
                ref={bgImgRef}
                src="assets/images/backgrounds/library.png"
                alt="School Library"
                onLoad={handleImageLoad}
                draggable={false}
              />
              <div ref={hitboxLayerRef} className="hitbox-layer" aria-hidden="true">
                {renderHitboxes()}
              </div>
            </div>

            <motion.div
              className={`transition-overlay ${overlayClass}`}
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            />

            {/* Section Menus */}
            {activeMenu === 'games' && (
              <SectionMenu
                name="games"
                title="🎮 Games"
                subtitle="Pick a game to play"
                items={MENU_ITEMS.games}
                onClose={closeMenu}
              />
            )}

            {activeMenu === 'tools' && (
              <SectionMenu
                name="tools"
                title="🔧 Learning Tools"
                subtitle="Dictionary, Thesaurus &amp; more"
                items={MENU_ITEMS.tools}
                onClose={closeMenu}
              />
            )}

            {activeMenu === 'logbook' && (
              <SectionMenu
                name="logbook"
                title="📖 Visitor Logbook"
                subtitle="Sign in, leave a message, check the leaderboard"
                items={MENU_ITEMS.logbook}
                onClose={closeMenu}
              />
            )}

            {activeMenu === 'coming-soon' && (
              <SectionMenu
                name="coming-soon"
                title="✨ Coming Soon"
                subtitle="Sneak peek at what's being added"
                items={MENU_ITEMS.comingSoon}
                onClose={closeMenu}
                disabled
              />
            )}

            {activeMenu === 'faculty' && (
              <FacultyPanel onOpenLogbook={() => openSection('logbook')} onOpenGame={openSection} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fallback View (non-16:9 or mobile) */}
      <AnimatePresence>
        {!showIllustratedViews && (
          <motion.div
            key="fallback"
            className="fallback-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Landing screen */}
            <div className="fb-landing">
              <header className="fb-header">
                <div className="fb-brand">
                  <span className="fb-brand-icon">📚</span>
                  <span className="fb-brand-text">School Library Games</span>
                </div>
                <button
                  className="theme-toggle"
                  aria-label="Toggle theme"
                  onClick={() => theme === 'dark' ? null : theme}
                >
                  <span className="theme-icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
                </button>
              </header>

              <main className="fb-main">
                <h1 className="fb-title">Welcome to the Library</h1>
                <p className="fb-subtitle">What are you here for today?</p>

                <div className="fb-section-grid">
                  <button className="fb-section-card" onClick={() => openSection('games')}>
                    <span className="fb-sc-icon">🎮</span>
                    <span className="fb-sc-label">Games</span>
                    <span className="fb-sc-desc">Wordle, Spelling Bee, Trivia &amp; more</span>
                  </button>

                  <button className="fb-section-card" onClick={() => openSection('tools')}>
                    <span className="fb-sc-icon">🔧</span>
                    <span className="fb-sc-label">Learning Tools</span>
                    <span className="fb-sc-desc">Dictionary, Thesaurus &amp; Rhymes</span>
                  </button>

                  <button className="fb-section-card" onClick={() => openSection('logbook')}>
                    <span className="fb-sc-icon">📖</span>
                    <span className="fb-sc-label">Visitor Logbook</span>
                    <span className="fb-sc-desc">Sign in &amp; check the leaderboard</span>
                  </button>

                  <button className="fb-section-card" onClick={() => openSection('coming-soon')}>
                    <span className="fb-sc-icon">🚀</span>
                    <span className="fb-sc-label">Coming Soon</span>
                    <span className="fb-sc-desc">Sneak peek at upcoming features</span>
                  </button>

                  <button className="fb-section-card fb-section-card-faculty" onClick={() => openSection('faculty')}>
                    <span className="fb-sc-icon">🔐</span>
                    <span className="fb-sc-label">Faculty Only</span>
                    <span className="fb-sc-desc">Staff &amp; admin access</span>
                  </button>
                </div>
              </main>
            </div>

            {/* Panel for section content */}
            <AnimatePresence>
              {activeMenu && activeMenu !== 'faculty' && (
                <motion.div
                  className="fb-panel"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  style={{ display: 'block', opacity: 1, transform: 'translateY(0)' }}
                >
                  <div className="fb-panel-inner">
                    {activeMenu && MENU_ITEMS[activeMenu] && (
                      <div className="menu-grid">{MENU_ITEMS[activeMenu].map(item => {
                        const isComingSoon = activeMenu === 'coming-soon'
                        return (
                          <MenuCard
                            key={item.id}
                            item={item}
                            disabled={isComingSoon}
                            onClick={() => closeMenu()}
                          />
                        )
                      })}</div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Faculty panel */}
            <AnimatePresence>
              {activeMenu === 'faculty' && (
                <motion.div
                  className="fb-panel"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  style={{ display: 'block', opacity: 1, transform: 'translateY(0)' }}
                >
                  <div className="fb-panel-inner">
                    <div className="faculty-login-panel">
                      <div className="faculty-login-section">
                        <h3>GitHub Login</h3>
                        <Link to="/admin" className="faculty-btn faculty-btn-github">Login with GitHub</Link>
                        <p className="faculty-note">Requires repository collaborator access</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}