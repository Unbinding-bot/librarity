import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { TOOLS } from '../lib/gamesRegistry'
import { fetchSiteItems, mergeSiteItems } from '../lib/siteItems'

export default function Tools() {
  const [items, setItems] = useState(() => TOOLS.map((t) => ({ ...t, comingSoon: false })))

  useEffect(() => {
    let alive = true
    fetchSiteItems().then((rows) => {
      if (alive) setItems(mergeSiteItems(TOOLS, rows, 'tools'))
    })
    return () => { alive = false }
  }, [])

  return (
    <section className="page" style={getPageStyles()}>
      <div style={getContainerStyles()}>
        <h1 style={getTitleStyles()}>Tools</h1>
        <div style={getGridStyles()}>
          {items.map((tool) => {
            const inner = (
              <Card hoverable={!tool.comingSoon}>
                <h3 style={getGameTitleStyles()}>{tool.name}</h3>
                <p style={getGameDescriptionStyles()}>{tool.description}</p>
                {tool.comingSoon ? (
                  <span style={getComingSoonStyles()}>Coming soon</span>
                ) : (
                  <Button variant="primary" style={getGameButtonStyles()}>
                    Use
                  </Button>
                )}
              </Card>
            )
            return tool.comingSoon ? (
              <div key={tool.id} style={getCardLinkStyles()}>
                {inner}
              </div>
            ) : (
              <Link key={tool.id} to={tool.path} style={getCardLinkStyles()}>
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
