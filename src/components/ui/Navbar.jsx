import React, { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useTheme } from '../../contexts/ThemeContext'

export default function Navbar() {
  const { theme, toggleTheme } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="navbar">
      <div className="navbar__container">
        <Link to="/" className="navbar__logo" onClick={() => setMenuOpen(false)}>
          Librarity
        </Link>
        <div className={`navbar__nav ${menuOpen ? 'navbar__nav--open' : ''}`}>
          <NavLink to="/" onClick={() => setMenuOpen(false)}>Home</NavLink>
          <NavLink to="/games" onClick={() => setMenuOpen(false)}>Games</NavLink>
          <NavLink to="/tools" onClick={() => setMenuOpen(false)}>Tools</NavLink>
          <NavLink to="/events" onClick={() => setMenuOpen(false)}>Events</NavLink>
          <NavLink to="/leaderboard" onClick={() => setMenuOpen(false)}>Leaderboard</NavLink>
          <NavLink to="/logbook" onClick={() => setMenuOpen(false)}>Logbook</NavLink>
        </div>
        <div className="navbar__actions">
          {/* Theme toggle hidden while dark mode is being reworked */}
          {false && (
            <button
              onClick={toggleTheme}
              className="theme-toggle"
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? 'Dark' : 'Light'}
            </button>
          )}
          <button
            className="navbar__toggle"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <span className="navbar__toggle-bar" />
            <span className="navbar__toggle-bar" />
            <span className="navbar__toggle-bar" />
          </button>
        </div>
      </div>
    </nav>
  )
}