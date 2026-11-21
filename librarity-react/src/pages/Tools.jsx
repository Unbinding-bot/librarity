import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const TOOLS = [
  { id: 'dictionary', label: 'Dictionary', desc: 'Look up word definitions, audio pronunciation, and examples.', path: '/tools/dictionary', icon: '📖' },
  { id: 'thesaurus', label: 'Thesaurus', desc: 'Find synonyms, antonyms, and related words to expand your vocabulary.', path: '/tools/thesaurus', icon: '📝' },
  { id: 'rhyme-finder', label: 'Rhyme Finder', desc: 'Discover rhyming words for poems, lyrics, and creative writing.', path: '/tools/rhyme-finder', icon: '🎵' },
]

export default function Tools() {
  return (
    <motion.main
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ padding: '3rem 1rem', maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}
    >
      <h1 className="game-title font-handwritten" style={{ fontSize: '3rem', marginBottom: '0.5rem', color: 'var(--primary-color)' }}>Learning Tools</h1>
      <p className="game-subtitle" style={{ marginBottom: '2.5rem' }}>Dictionary, Thesaurus &amp; Rhyme Finder</p>
      <div className="menu-grid menu-grid-centered">
        {TOOLS.map((tool, i) => (
          <motion.div
            key={tool.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, type: 'spring', stiffness: 120, damping: 16 }}
            whileHover={{ y: -6 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link to={tool.path} className="menu-card">
              <div className="mc-img-wrap"><div className="mc-img-fallback">{tool.icon}</div></div>
              <div className="mc-label">{tool.label}</div>
              <div className="mc-desc">{tool.desc}</div>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.main>
  )
}
