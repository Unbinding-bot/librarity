import React from 'react'

export default function Footer() {
  return (
    <footer className="footer" style={getFooterStyles()}>
      <div className="footer__container">
        <p style={getFooterTextStyles()}>
          © {new Date().getFullYear()} Librarity, Ordo Librorum Collection.
        </p>
        <p style={getFooterSmallStyles()}>
          Mandaue City Science National High School, run by the Ordo Librorum officers
        </p>
      </div>
    </footer>
  )
}

function getFooterStyles() {
  return {
    background: 'var(--color-bg-elevated, var(--gray-100))',
    borderTop: '3px solid var(--color-border, #000000)',
    padding: 'var(--space-4, 2rem)',
    marginTop: 'auto',
  }
}

function getFooterTextStyles() {
  return {
    margin: 0,
    color: 'var(--color-text-muted, var(--gray-600))',
    fontSize: 'var(--typography-small, 0.875rem)',
  }
}

function getFooterSmallStyles() {
  return {
    margin: 0,
    color: 'var(--color-text-muted, var(--gray-600))',
    fontSize: 'var(--typography-label, 0.75rem)',
    marginTop: 'var(--space-1, 0.5rem)',
  }
}
