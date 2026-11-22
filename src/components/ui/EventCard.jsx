import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import Card from './Card'
import { useAspectParam } from '../../hooks/useAspect'
import { formatEventDateRange, eventStatus } from '../../lib/events'
import { renderMarkdown } from '../../lib/markdown'

const STATUS_TONE = {
  green: 'event-card__badge--green',
  yellow: 'event-card__badge--yellow',
  muted: 'event-card__badge--muted',
}

const FALLBACK_RATIO = '16 / 9'

/** Normalize a stored "W:H" (or W/H, WxH) into CSS "W / H", or null. */
function storedToCss(raw) {
  if (!raw) return null
  const m = String(raw).trim().match(/^(\d{1,5})\s*[:/x]\s*(\d{1,5})$/)
  if (!m) return null
  const w = parseInt(m[1], 10)
  const h = parseInt(m[2], 10)
  if (!w || !h) return null
  return `${w} / ${h}`
}

/**
 * A single event card for the home featured strip and the events grid.
 *
 * Media box ratio priority:
 *   1. dev `?ar=W:H` query param (preview any shape)
 *   2. the event's stored `image_ratio` (set in the admin form)
 *   3. the loaded image's natural dimensions
 *   4. 16:9 fallback
 * The grid is masonry, so boxes of different heights pack naturally.
 *
 * On the home featured strip the `home` flag shrinks the card to a compact
 * preview while keeping the exact same aspect ratio as the /events card —
 * so a 4:5 poster is still 4:5, just smaller.
 */
export default function EventCard({ event, index, home = false }) {
  const status = eventStatus(event.start_date, event.end_date)
  const dateStr = formatEventDateRange(event.start_date, event.end_date)
  const devRatio = useAspectParam()
  const [natural, setNatural] = useState(null) // "w / h" once measured

  // Same ratio for home and /events — only the size differs.
  const ratio = devRatio || storedToCss(event.image_ratio) || natural || FALLBACK_RATIO

  const onImgLoad = (e) => {
    const img = e.currentTarget
    if (img.naturalWidth && img.naturalHeight) {
      setNatural(`${img.naturalWidth} / ${img.naturalHeight}`)
    }
  }

  return (
    <Link to={`/events/${event.id}`} className="event-card__link">
      <Card hoverable className="event-card">
        {event.image_url ? (
          <div className="event-card__media" style={{ aspectRatio: ratio }}>
            <img
              src={event.image_url}
              alt={event.title}
              loading="lazy"
              onLoad={onImgLoad}
            />
          </div>
        ) : (
          <div
            className="event-card__media event-card__media--placeholder"
            style={{ aspectRatio: ratio }}
          />
        )}
        <div className="event-card__body">
          <span className={`event-card__badge ${STATUS_TONE[status.tone]}`}>
            {status.label}
          </span>
          <h3 className="event-card__title">{event.title}</h3>
          <p className="event-card__date">{dateStr}</p>
          {/* Markdown-enabled description (sanitized in renderMarkdown) */}
          <div
            className="event-card__desc md-body"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(event.description) }}
          />
          <span className="event-card__more">Read more →</span>
        </div>
      </Card>
    </Link>
  )
}
