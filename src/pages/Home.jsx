import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import EventCard from '../components/ui/EventCard'
import SkeletonLoader from '../components/ui/SkeletonLoader'
import Marquee from '../components/ui/Marquee'
import LeaderboardSidebar from '../components/ui/LeaderboardSidebar'
import { GAMES, TOOLS } from '../lib/gamesRegistry'
import { fetchEvents, eventStatus } from '../lib/events'

const FEATURED_COUNT = 6

export default function Home() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

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

  // Up to 6 featured events. Current events first (soonest first — the fetch
  // already orders by start_date ASC), then coming-soon ones to fill any
  // remaining slots. Six or more current events leave no room for coming-soon.
  // TBD (undecided date) events count as coming soon — just undecided — and
  // come after the dated ones.
  const current = events
    .filter((e) => eventStatus(e.start_date, e.end_date).label === 'Happening now')
    .sort((a, b) => (a.start_date > b.start_date ? 1 : -1))
  const comingSoon = [
    ...events
      .filter((e) => eventStatus(e.start_date, e.end_date).label === 'Coming soon')
      .sort((a, b) => (a.start_date > b.start_date ? 1 : -1)),
    ...events.filter((e) => eventStatus(e.start_date, e.end_date).label === 'TBD'),
  ]
  const featured = [
    ...current.slice(0, FEATURED_COUNT),
    ...comingSoon.slice(0, Math.max(0, FEATURED_COUNT - current.length)),
  ].slice(0, FEATURED_COUNT)

  return (
    <div className="home-page">
      <div className="home__container">
        <div className="home__layout">
          {/* ===== Main column — the title lives inside it so the
               leaderboard can start at the very top beside it ===== */}
          <main className="home__main">
            <header className="home__header">
              <h1 className="home__title">Librarity</h1>
              <p className="home__subtitle">
                The library website for Mandaue City Science National High School, run by the Ordo Librorum officers
              </p>
            </header>

            {/* Featured events — skeleton while loading, hidden entirely when
                the table is empty (no empty-state chrome on the home page). */}
            {loading ? (
              <section className="section-band section-band-green">
                <div className="home__section-head">
                  <h2 className="home__section-title">Featured Events</h2>
                  <Link to="/events" className="home__see-all">
                    See all events →
                  </Link>
                </div>
                <div className="home__grid">
                  <SkeletonLoader count={FEATURED_COUNT} />
                </div>
              </section>
            ) : featured.length > 0 && (
              <section className="section-band section-band-green">
                <div className="home__section-head">
                  <h2 className="home__section-title">Featured Events</h2>
                  <Link to="/events" className="home__see-all">
                    See all events →
                  </Link>
                </div>
                <div className="home__grid">
                  {featured.map((event, i) => (
                    <EventCard key={event.id} event={event} index={i} home />
                  ))}
                </div>
              </section>
            )}

            </main>

          {/* ===== Sidebar — starts at the very top, level with the title,
               and pins under the navbar as you scroll ===== */}
          <aside className="home__sidebar">
            <LeaderboardSidebar />
          </aside>
        </div>
      </div>

      {/* Full-width marquee strips — natural full-width children of
          home-page, so they reach edge to edge with no negative-margin
          hacks (and never trip horizontal overflow). */}
      <div className="home__marquee-band">
        <div className="home__marquee-head">
          <span>Games</span>
        </div>
        <Marquee items={GAMES} tone="games" />
      </div>

      <div className="home__marquee-band">
        <div className="home__marquee-head">
          <span>Tools</span>
        </div>
        <Marquee items={TOOLS} tone="tools" />
      </div>
    </div>
  )
}
