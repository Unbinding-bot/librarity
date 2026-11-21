import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const GAMES = [
  { id: 'wordle', label: 'Wordle', desc: 'Guess the 5-letter word', path: '/wordle', icon: '🔤' },
  { id: 'spelling-bee', label: 'Spelling Bee', desc: 'Form words from the hive', path: '/spelling-bee', icon: '🐝' },
  { id: 'word-ladder', label: 'Word Ladder', desc: 'Transform one word to another', path: '/word-ladder', icon: '🪜' },
  { id: 'trivia', label: 'Trivia', desc: 'Test your knowledge', path: '/trivia', icon: '🎯' },
  { id: 'flashcards', label: 'Flashcards', desc: 'Study & memorise', path: '/flashcards', icon: '📇' },
  { id: 'wiki-race', label: 'Wikipedia Race', desc: 'Navigate between articles', path: '/wikipedia-race', icon: '🏁' },
]

export default function Games() {
  return (
    <motion.main
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ padding: '3rem 1rem', maxWidth: 1100, margin: '0 auto' }}
    >
      <h1 className="game-title font-handwritten" style={{ fontSize: '3rem', marginBottom: '0.5rem', color: 'var(--primary-color)', textAlign: 'center' }}>Games</h1>
      <p className="game-subtitle" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>Select a game to play!</p>

      <div className="menu-grid menu-grid-centered">
        {GAMES.map((game, i) => (
          <motion.div
            key={game.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, type: 'spring', stiffness: 120, damping: 16 }}
            whileHover={{ y: -6 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link to={game.path} className="menu-card">
              <div className="mc-img-wrap"><div className="mc-img-fallback">{game.icon}</div></div>
              <div className="mc-label">{game.label}</div>
              <div className="mc-desc">{game.desc}</div>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.main>
  )
}
