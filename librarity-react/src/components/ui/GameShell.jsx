import React from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../../contexts/ThemeContext'

/**
 * Shared shell for every game/tool page: title, subtitle, optional controls,
 * and a back link. Content renders inside a centered column.
 */
export default function GameShell({ title, subtitle, controls, children, wide = false }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <main className={`game-container${wide ? ' game-container-wide' : ''}`}>
      <div className="game-header">
        <h1 className="game-title">{title}</h1>
        {subtitle && <p className="game-subtitle">{subtitle}</p>}
        {controls && <div className="game-controls">{controls}</div>}
      </div>
      {children}
      <div className="game-back-row">
        <Link to="/games" className="btn btn-ghost game-back-btn">← Back to Games</Link>
        <button className="btn btn-ghost game-back-btn" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
        </button>
      </div>
    </main>
  )
}

/** Generic modal used by all games (help / stats / custom dialogs). */
export function Modal({ title, onClose, children, wide = false }) {
  return (
    <div
      className="modal"
      style={{ display: 'flex' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
    >
      <div className={`modal-content${wide ? ' modal-large' : ' modal-medium'}`}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}
