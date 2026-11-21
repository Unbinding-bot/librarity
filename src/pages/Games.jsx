import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { GAMES } from '../lib/gamesRegistry'
import { fetchSiteItems, mergeSiteItems } from '../lib/siteItems'

export default function Games() {
  const [items, setItems] = useState(() => GAMES.map((g) => ({ ...g, comingSoon: false })))

  useEffect(() => {
    let alive = true
    fetchSiteItems().then((rows) => {
      if (alive) setItems(mergeSiteItems(GAMES, rows, 'games'))
    })
    return () => { alive = false }
  }, [])

  return (
    <section className="page" style={getPageStyles()}>
      <div style={getContainerStyles()}>
        <h1 style={getTitleStyles()}>Games</h1>
        <div style={getGridStyles()}>
          {items.map((game) => {
            const inner = (
              <Card hoverable={!game.comingSoon}>
                <h3 style={getGameTitleStyles()}>{game.name}</h3>
                <p style={getGameDescriptionStyles()}>{game.description}</p>
                {game.comingSoon ? (
                  <span style={getComingSoonStyles()}>Coming soon</span>
                ) : (
                  <Button variant="primary" style={getGameButtonStyles()}>
                    Play
                  </Button>
                )}
              </Card>
            )
            return game.comingSoon ? (
              <div key={game.id} style={getCardLinkStyles()}>
                {inner}
              </div>
            ) : (
              <Link key={game.id} to={`/${game.id}`} style={getCardLinkStyles()}>
                {inner}
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function getPageStyles() {
  return {
    width: 'min(100%, var(--max-width, 1200px))',
    margin: '0 auto',
    padding: 'var(--space-12, 3rem) var(--space-3, 1.5rem)',
  }
}

function getContainerStyles() {
  return {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-12, 3rem)',
  }
}

function getTitleStyles() {
  return {
    margin: 0,
    fontSize: 'var(--typography-display, 2.5rem)',
    fontFamily: 'var(--font-display, system-ui, sans-serif)',
    fontWeight: 800,
  }
}

function getGridStyles() {
  return {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 'var(--space-6, 1.5rem)',
  }
}

function getCardLinkStyles() {
  return {
    textDecoration: 'none',
    color: 'inherit',
  }
}

function getGameTitleStyles() {
  return {
    margin: '0 0 var(--space-2, 0.5rem) 0',
    fontSize: 'var(--typography-h2, 1.5rem)',
  }
}

function getGameDescriptionStyles() {
  return {
    margin: '0 0 var(--space-4, 1rem) 0',
    color: 'var(--color-text-muted, #757575)',
  }
}

function getGameButtonStyles() {
  return {
    marginTop: 'auto',
  }
}

function getComingSoonStyles() {
  return {
    marginTop: 'auto',
    display: 'inline-block',
    alignSelf: 'flex-start',
    fontSize: '0.75rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    padding: '0.3rem 0.7rem',
    border: '2px solid var(--color-border, #000000)',
    background: 'var(--band-yellow, #FFD23F)',
    color: 'var(--text-on-accent, var(--nb-black))',
  }
}
