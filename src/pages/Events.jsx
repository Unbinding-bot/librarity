import React, { useEffect, useState } from 'react'
import EventCard from '../components/ui/EventCard'
import SkeletonLoader from '../components/ui/SkeletonLoader'
import { fetchEvents, eventStatus } from '../lib/events'

const PAST_PAGE_SIZE = 9

export default function Events() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [pastPage, setPastPage] = useState(0)

  useEffect(() => {
    let alive = true
    fetchEvents({}).then((data) => {
      if (!alive) return
      setEvents(data)
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [])

  // Split into buckets. Sort current by start_date ASC, past by end_date DESC.
  // TBD (no dates yet) ride along in Coming Soon — they're upcoming, just
  // undecided — appended after the dated ones so real dates surface first.
  const status = (e) => eventStatus(e.start_date, e.end_date).label
  const now = events
    .filter((e) => status(e) === 'Happening now')
    .sort((a, b) => (a.start_date > b.start_date ? 1 : -1))
  const coming = [
    ...events
      .filter((e) => status(e) === 'Coming soon')
      .sort((a, b) => (a.start_date > b.start_date ? 1 : -1)),
    ...events.filter((e) => status(e) === 'TBD'),
  ]
  const past = events
    .filter((e) => eventStatus(e.start_date, e.end_date).label === 'Past')
    .sort((a, b) => (a.end_date < b.end_date ? 1 : -1))

  const pastPages = Math.max(1, Math.ceil(past.length / PAST_PAGE_SIZE))
  const pastSlice = past.slice(pastPage * PAST_PAGE_SIZE, (pastPage + 1) * PAST_PAGE_SIZE)

  return (
    <section className="page" style={getPageStyles()}>
      <div style={getContainerStyles()}>
        <header style={getHeaderStyles()}>
          <h1 style={getTitleStyles()}>Events</h1>
          <p style={getSubtitleStyles()}>
            What's happening at the library this month
          </p>
        </header>

        {/* ===== Coming soon (TBD/undecided events live here too) ===== */}
        {(loading || coming.length > 0) && (
          <section className="section-band section-band-sky" style={getSectionStyles()}>
            <h2 style={getSectionTitleStyles()}>Coming Soon</h2>
            {loading ? (
              <div className="events-masonry" style={getGridStyles()}>
                <SkeletonLoader count={3} />
              </div>
            ) : (
              <div className="events-masonry" style={getGridStyles()}>
                {coming.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ===== Happening now ===== */}
        <>
          {(loading || coming.length > 0) && (
            <div className="events-divider" aria-hidden="true" />
          )}
          <section className="section-band section-band-green" style={getSectionStyles()}>
            <h2 style={getSectionTitleStyles()}>Happening Now</h2>
            {loading ? (
              <div className="events-masonry" style={getGridStyles()}>
                <SkeletonLoader count={3} />
              </div>
            ) : now.length === 0 ? (
              <p style={getEmptyStyles()}>Nothing running right now, check back soon!</p>
            ) : (
              <div className="events-masonry" style={getGridStyles()}>
                {now.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </section>
        </>

        {/* ===== Past events ===== */}
        {past.length > 0 && (
          <>
            <div className="events-divider" aria-hidden="true" />
            <section className="section-band section-band-lavender" style={getSectionStyles()}>
            <h2 style={getSectionTitleStyles()}>Past Events</h2>
            <div className="events-past-grid">
              {pastSlice.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
            {pastPages > 1 && (
              <div className="events-pagination">
                <button
                  className="btn btn--ghost"
                  disabled={pastPage === 0}
                  onClick={() => setPastPage(pastPage - 1)}
                >
                  ← Prev
                </button>
                <span className="events-pagination__info">
                  Page {pastPage + 1} of {pastPages}
                </span>
                <button
                  className="btn btn--ghost"
                  disabled={pastPage >= pastPages - 1}
                  onClick={() => setPastPage(pastPage + 1)}
                >
                  Next →
                </button>
              </div>
            )}
          </section>
          </>
        )}
      </div>
    </section>
  )
}

function getPageStyles() {
  return {
    maxWidth: 'var(--max-width, 1200px)',
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

function getHeaderStyles() {
  return {
    textAlign: 'center',
  }
}

function getTitleStyles() {
  return {
    margin: 0,
    fontSize: 'var(--typography-display, 2.5rem)',
    fontFamily: 'var(--font-display, system-ui, sans-serif)',
    fontWeight: 400,
    color: 'var(--color-text)',
  }
}

function getSubtitleStyles() {
  return {
    margin: 0,
    fontSize: 'var(--typography-h2, 1.5rem)',
    color: 'var(--color-text-muted, #757575)',
  }
}

function getSectionStyles() {
  return {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-6, 1.5rem)',
  }
}

function getSectionTitleStyles() {
  return {
    margin: '0 0 var(--space-6, 1.5rem) 0',
    fontSize: 'var(--typography-h1, 2rem)',
    fontFamily: 'var(--font-display, system-ui, sans-serif)',
  }
}

function getGridStyles() {
  return {
    display: 'block', /* masonry columns — see .events-masonry in CSS */
  }
}

function getEmptyStyles() {
  return {
    color: 'var(--color-text-muted, #757575)',
    fontSize: '0.95rem',
  }
}