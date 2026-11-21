import React from 'react'
import './SkeletonLoader.css'

/**
 * Shimmer skeleton that mirrors the EventCard shape (media box + title/date/
 * description lines) so the featured strip and events grid don't look empty
 * while `fetchEvents` is loading.
 *
 * Renders a fragment of card elements so the caller can drop it straight into
 * the existing masonry grid (`.home__grid` / `.events-masonry`) — the cards
 * inherit the grid's column width and zoom rules exactly, no duplicate layout
 * code.
 *
 * `variant` picks a skeleton that matches the surrounding chrome:
 *   - "card"      (default) the EventCard shape, for the events grids
 *   - "table"     the leaderboard table (rank · player · game · mode ·
 *                 score · time · date)
 *   - "list"      the logbook entry cards (name + date, message lines)
 *   - "sidebar"   the home leaderboard sidebar rows
 */
export default function SkeletonLoader({ count = 3, variant = 'card' }) {
  if (variant === 'table') return <TableSkeleton count={count} />
  if (variant === 'list') return <ListSkeleton count={count} />
  if (variant === 'sidebar') return <SidebarSkeleton count={count} />

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-card__media" />
          <div className="skeleton-card__body">
            <span className="skeleton-line skeleton-line--title" />
            <span className="skeleton-line skeleton-line--date" />
            <span className="skeleton-line skeleton-line--desc" />
            <span className="skeleton-line skeleton-line--desc" />
          </div>
        </div>
      ))}
    </>
  )
}

/** Leaderboard table rows: rank · player · game · mode · score · time · date. */
function TableSkeleton({ count }) {
  return (
    <div className="skeleton-table">
      <div className="skeleton-table__head">
        {['#', 'Player', 'Game', 'Mode', 'Score', 'Time', 'Date'].map((h) => (
          <span key={h} className="skeleton-line skeleton-line--head" />
        ))}
      </div>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-table__row">
          <span className="skeleton-line skeleton-line--sm" />
          <span className="skeleton-line" style={{ width: '55%' }} />
          <span className="skeleton-line skeleton-line--sm" />
          <span className="skeleton-line skeleton-line--sm" />
          <span className="skeleton-line skeleton-line--sm" />
          <span className="skeleton-line skeleton-line--sm" />
          <span className="skeleton-line skeleton-line--sm" />
        </div>
      ))}
    </div>
  )
}

/** Logbook entries: name + date line, then a message block. */
function ListSkeleton({ count }) {
  return (
    <div className="skeleton-list">
      {Array.from({ length: count }).map((_, i) => (
        <article key={i} className="skeleton-list__entry">
          <div className="skeleton-list__header">
            <span className="skeleton-line skeleton-line--title" style={{ width: '35%' }} />
            <span className="skeleton-line skeleton-line--date" style={{ width: '25%' }} />
          </div>
          <span className="skeleton-line skeleton-line--desc" style={{ width: '90%' }} />
          <span className="skeleton-line skeleton-line--desc" style={{ width: '60%' }} />
        </article>
      ))}
    </div>
  )
}

/** Home sidebar: a vertical stack of rank · player · game · score rows. */
function SidebarSkeleton({ count }) {
  return (
    <div className="skeleton-sidebar">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-sidebar__row">
          <span className="skeleton-line skeleton-line--sm" style={{ width: '1.5rem' }} />
          <span className="skeleton-line" style={{ flex: 1, maxWidth: '60%' }} />
          <span className="skeleton-line skeleton-line--sm" style={{ width: '45%' }} />
          <span className="skeleton-line skeleton-line--sm" style={{ width: '3rem' }} />
        </div>
      ))}
    </div>
  )
}