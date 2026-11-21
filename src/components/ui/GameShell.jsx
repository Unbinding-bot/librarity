import React from 'react'
import { Link } from 'react-router-dom'
import './GameShell.css'

/**
 * GameShell — page wrapper for all games and tools.
 * Renders the game header (title / subtitle / controls), a back-to-games row,
 * and the theme toggle. Wraps children in a `.game-container`.
 */
export default function GameShell({ children, title, subtitle, controls, wide, accent, full }) {
  return (
    <div
      className={`game-container${wide ? ' game-container-wide' : ''}${full ? ' game-container-full' : ''}${accent ? ' game-accented' : ''}`}
      style={accent ? { '--game-accent': accent } : {}}
      data-full={full ? 'true' : undefined}
    >
      <div className="game-header">
        {title && <h1 className="game-title">{title}</h1>}
        {subtitle && <p className="game-subtitle">{subtitle}</p>}
        {controls && <div className="game-controls">{controls}</div>}
      </div>
      {children}
      <div className="game-back-row">
        <Link to="/games" className="btn btn-secondary">← Back to Games</Link>
      </div>
    </div>
  )
}

/**
 * Modal — reusable overlay dialog with backdrop-close.
 */
export function Modal({ title, onClose, children, wide }) {
  return (
    <div className="modal" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`modal-content${wide ? ' modal-large' : ''}`}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}