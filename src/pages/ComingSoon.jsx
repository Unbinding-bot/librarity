import React from 'react'
import { useLocation, Link } from 'react-router-dom'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'

const CONTENT = {
  leaderboard: {
    title: 'Leaderboard',
    description: 'View top scores across all games',
  },
  faculty: {
    title: 'Faculty',
    description: 'Information about library faculty staff',
  },
  admin: {
    title: 'Admin',
    description: 'Admin panel for library management',
  },
  wordle: {
    title: 'Wordle',
    description: 'Guess the 5-letter word in 6 tries',
  },
  'spelling-bee': {
    title: 'Spelling Bee',
    description: 'Spell words to save the honeycomb',
  },
  'word-ladder': {
    title: 'Word Ladder',
    description: 'Transform words letter by letter',
  },
  trivia: {
    title: 'Trivia',
    description: 'Test your general knowledge',
  },
  flashcards: {
    title: 'Flashcards',
    description: 'Master any topic with flashcards',
  },
  'wikipedia-race': {
    title: 'Wikipedia Race',
    description: 'Race to Wikipedia articles',
  },
  dictionary: {
    title: 'Dictionary',
    description: 'Define words with audio pronunciation',
  },
  thesaurus: {
    title: 'Thesaurus',
    description: 'Find synonyms, antonyms, and related words',
  },
  'rhyme-finder': {
    title: 'Rhyme Finder',
    description: 'Find rhymes, near rhymes, and homophones',
  },
}

export default function ComingSoon() {
  const location = useLocation()
  const path = location.pathname.substring(1) // remove leading /
  const content = CONTENT[path] || CONTENT['admin']

  return (
    <section className="page" style={getPageStyles()}>
      <div style={getContainerStyles()}>
        <Card>
          <h1 style={getTitleStyles()}>{content.title}</h1>
          <p style={getDescriptionStyles()}>{content.description}</p>
          <Link to="/" style={getLinkStyles()}>
            <Button variant="primary">Go Home</Button>
          </Link>
        </Card>
      </div>
    </section>
  )
}

function getPageStyles() {
  return {
    maxWidth: 'var(--max-width, 1200px)',
    margin: '0 auto',
    padding: 'var(--space-12, 3rem) var(--space-6, 1.5rem)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 'calc(100vh - var(--nav-height, 64px))',
  }
}

function getContainerStyles() {
  return {
    width: '100%',
    maxWidth: '600px',
  }
}

function getTitleStyles() {
  return {
    margin: '0 0 var(--space-4, 1rem) 0',
    fontSize: 'var(--typography-display, 2.5rem)',
    fontFamily: 'var(--font-display, system-ui, sans-serif)',
    fontWeight: 800,
    textAlign: 'center',
  }
}

function getDescriptionStyles() {
  return {
    margin: '0 0 var(--space-8, 4rem) 0',
    fontSize: 'var(--typography-h2, 1.5rem)',
    color: 'var(--color-text-muted, #757575)',
    textAlign: 'center',
  }
}

function getLinkStyles() {
  return {
    display: 'flex',
    justifyContent: 'center',
  }
}