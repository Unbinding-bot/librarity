import React from 'react'
import { motion } from 'framer-motion'

const ITEMS = [
  { id: 'book-list', label: 'Book List', desc: 'Browse the library catalogue', icon: '📚' },
  { id: 'crossword', label: 'Crossword', desc: 'Fill in the blanks', icon: '✏️' },
  { id: 'word-search', label: 'Word Search', desc: 'Find words in the grid', icon: '🔍' },
  { id: 'math-puzzle', label: 'Math Puzzle Challenge', desc: 'Solve exciting math puzzles and compete with friends', icon: '🧮' },
]

export default function ComingSoon() {
  return (
    <motion.main initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      style={{ padding: '3rem 1rem', maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
      <h1 className="game-title font-handwritten" style={{ fontSize: '3rem', marginBottom: '0.5rem', color: 'var(--primary-color)' }}>✨ Coming Soon</h1>
      <p className="game-subtitle" style={{ marginBottom: '2.5rem' }}>Sneak peek at upcoming features arriving on these shelves!</p>
      <div className="menu-grid menu-grid-centered">
        {ITEMS.map((item, i) => (
          <motion.div
            key={item.id}
            className="menu-card menu-card-disabled"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            aria-disabled="true"
          >
            <div className="mc-img-wrap"><div className="mc-img-fallback">{item.icon}</div></div>
            <div className="mc-label">{item.label}</div>
            <div className="mc-desc">{item.desc}</div>
            <div className="mc-badge">Coming Soon</div>
          </motion.div>
        ))}
      </div>
    </motion.main>
  )
}

export function Faculty() {
  return (
    <motion.main initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      style={{ padding: '3rem 1rem', textAlign: 'center', maxWidth: 500, margin: '0 auto' }}>
      <h1 className="game-title font-handwritten" style={{ fontSize: '3rem', marginBottom: '0.5rem', color: 'var(--primary-color)' }}>🔐 Faculty Only</h1>
      <p className="game-subtitle" style={{ marginBottom: '2rem' }}>
        Staff &amp; admin access requires repository collaborator verification.
      </p>
      <a href="https://github.com/login/oauth/authorize?client_id=Ov23li6OxAocE3ahnCVS&scope=read:user%20repo" className="btn btn-primary">
        Login with GitHub
      </a>
    </motion.main>
  )
}

export function Admin() {
  return (
    <motion.main initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      style={{ padding: '3rem 1rem', textAlign: 'center' }}>
      <h1 className="game-title font-handwritten" style={{ fontSize: '3rem', marginBottom: '0.5rem', color: 'var(--primary-color)' }}>⚙️ Admin</h1>
      <p className="game-subtitle" style={{ marginBottom: '2rem' }}>
        Admin tools are available to repository collaborators after GitHub login.
      </p>
      <a href="https://github.com/login/oauth/authorize?client_id=Ov23li6OxAocE3ahnCVS&scope=read:user%20repo" className="btn btn-primary">
        Login with GitHub
      </a>
    </motion.main>
  )
}