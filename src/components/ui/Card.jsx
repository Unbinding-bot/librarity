import React from 'react'
import './Card.css'

export default function Card({ children, hoverable = true, ...props }) {
  const style = getCardStyles(hoverable)
  const className = hoverable ? 'card' : 'card'

  return (
    <div
      className={className}
      style={style}
      {...props}
    >
      {children}
    </div>
  )
}

function getCardStyles(hoverable) {
  const baseStyles = {
    background: 'var(--card-bg, rgba(255, 255, 255, 0.75))',
    border: '1px solid var(--card-border, rgba(0, 0, 0, 0.1))',
    borderRadius: 'var(--card-radius, 24px)',
    padding: 'var(--card-padding, 2rem)',
    boxShadow: 'var(--card-shadow, 0 4px 8px rgba(0, 0, 0, 0.12))',
    backdropFilter: 'blur(12px)',
    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
  }

  return baseStyles
}