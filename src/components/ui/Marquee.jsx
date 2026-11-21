import React from 'react'
import { Link } from 'react-router-dom'

/**
 * Infinite-scroll marquee strip of clickable chips.
 *
 * The set is repeated COPIES times so the track is always much wider than
 * the viewport — even a 3-item tool set fills the screen at any width.
 * The animation translates by exactly one set's width, so the loop is
 * seamless: at the end of every step the track looks identical to the
 * start, with no empty gap ever visible. Paused on hover.
 * Adding a game/tool to the registry is enough — this component just
 * iterates the list.
 */
const COPIES = 8

export default function Marquee({ items, tone }) {
  if (!items || items.length === 0) return null

  const track = Array.from({ length: COPIES }, () => items).flat()

  return (
    <div className={`marquee marquee--${tone}`}>
      <div className="marquee__track" aria-hidden="true">
        {track.map((item, i) => (
          <Link
            key={`${item.id}-${i}`}
            to={item.path}
            className="marquee__chip"
          >
            {item.name}
          </Link>
        ))}
      </div>
    </div>
  )
}