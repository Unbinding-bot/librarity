import React, { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useTheme } from '../../contexts/ThemeContext'

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/games', label: 'Games' },
  { to: '/tools', label: 'Tools' },
  { to: '/leaderboard', label: '🏆 Leaderboard' },
  { to: '/coming-soon', label: 'Coming Soon' },
  { to: '/faculty', label: 'Faculty' },
]

export default function Navbar() {
  const { theme, toggleTheme } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-left">
          <Link to="/" className="nav-brand">
            <span className="brand-icon">📚</span>
            <span className="brand-text">School Library Games</span>
          </Link>
        </div>
        <button
          className="nav-mobile-toggle"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(o => !o)}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
        <div className={`nav-right ${menuOpen ? 'nav-right-open' : ''}`}>
          {LINKS.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </NavLink>
          ))}
          <button className="theme-toggle" aria-label="Toggle theme" onClick={toggleTheme}>
            <span className="theme-icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
          </button>
        </div>
      </div>
    </nav>
  )
}
