import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchEvent, eventStatus, formatEventDateRange } from '../lib/events'
import { useAspectParam } from '../hooks/useAspect'
import { renderMarkdown } from '../lib/markdown'

const STATUS_TONE = {
  green: 'event-card__badge--green',
  yellow: 'event-card__badge--yellow',
  muted: 'event-card__badge--muted',
}

export default function EventDetail() {
  const { id } = useParams()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const devRatio = useAspectParam()

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetchEvent(id).then((data) => {
      if (!alive) return
      setEvent(data)
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [id])

  if (loading) {
    return (
      <section className="page" style={getPageStyles()}>
        <p style={getMutedStyles()}>Loading…</p>
      </section>
    )
  }

  if (!event) {
    return (
      <section className="page" style={getPageStyles()}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={getTitleStyles()}>Event not found</h1>
          <p style={getMutedStyles()}>
            This event may have been removed, or the link is wrong.
          </p>
          <Link to="/events" className="btn btn--ghost" style={{ marginTop: '1.5rem' }}>
            ← Back to events
          </Link>
        </div>
      </section>
    )
  }

  const status = eventStatus(event.start_date, event.end_date)
  const dateStr = formatEventDateRange(event.start_date, event.end_date)

  return (
    <section className="page" style={getPageStyles()}>
      <div className="event-detail">
        <Link to="/events" className="event-detail__back">← All events</Link>

        <div className="event-detail__card">
          {event.image_url ? (
            <div
              className="event-detail__media"
              style={devRatio ? { aspectRatio: devRatio } : undefined}
            >
              <img src={event.image_url} alt={event.title} />
            </div>
          ) : (
            <div
              className="event-detail__media event-detail__media--placeholder"
              style={devRatio ? { aspectRatio: devRatio } : undefined}
            />
          )}

          <div className="event-detail__body">
            <span className={`event-card__badge ${STATUS_TONE[status.tone]}`}>
              {status.label}
            </span>
            <h1 className="event-detail__title">{event.title}</h1>
            <p className="event-detail__date">{dateStr}</p>
            {event.description && (
              <div
                className="event-detail__desc md-body"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(event.description) }}
              />
            )}
          </div>
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

function getTitleStyles() {
  return {
    margin: 0,
    fontSize: 'var(--typography-display, 2.5rem)',
    fontFamily: 'var(--font-display, system-ui, sans-serif)',
    fontWeight: 400,
  }
}

function getMutedStyles() {
  return {
    color: 'var(--color-text-muted, #757575)',
    fontSize: '0.95rem',
    marginTop: '0.75rem',
  }
}