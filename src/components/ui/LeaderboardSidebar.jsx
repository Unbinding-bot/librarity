import React, { useEffect, useState, useRef } from 'react'
import SkeletonLoader from './SkeletonLoader'
import { fetchTopLeaderboard, gameLabel } from '../../lib/events'

/** Static top-10 all-time leaderboard for the home sidebar.
 *  @param {{topOffset?: number}} props — when set, the sidebar locks at
 *  that y-position instead of the navbar bottom (used so the leaderboard
 *  can sit level with the start of the main column). */
export default function LeaderboardSidebar({ topOffset }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [pinned, setPinned] = useState(false)
  const asideRef = useRef(null)
  const originalTopRef = useRef(null)

  useEffect(() => {
    let alive = true
    fetchTopLeaderboard(10).then((data) => {
      if (alive) {
        setRows(data)
        setLoading(false)
      }
    })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    const aside = asideRef.current
    if (!aside) return

    // Record the sidebar's resting position in the document (its top when
    // scrolled back to the top). Once the user scrolls far enough that the
    // sidebar has locked into place, it stays there for the rest of the page.
    originalTopRef.current = aside.getBoundingClientRect().top + window.scrollY

    const onScroll = () => {
      const rect = aside.getBoundingClientRect()
      // "Pinned" = the sidebar has left its original resting position and
      // is now locked in place (either at the navbar bottom or at the
      // supplied topOffset, whichever is higher).
      const lockAt = typeof topOffset === 'number' ? topOffset : originalTopRef.current
      const pinnedNow = rect.top <= lockAt + 2
      setPinned(pinnedNow)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <aside
      ref={asideRef}
      className={`leaderboard-sidebar${pinned ? ' leaderboard-sidebar--pinned' : ''}`}
      style={{ top: typeof topOffset === 'number' ? topOffset : undefined }}
    >
      <h2 className="leaderboard-sidebar__title">Top 10 All Time</h2>
      {loading ? (
        <SkeletonLoader count={8} variant="sidebar" />
      ) : rows.length === 0 ? (
        <p className="leaderboard-sidebar__empty">No scores yet, be the first!</p>
      ) : (
        <ol className="leaderboard-sidebar__list">
          {rows.map((row, i) => {
            // Ties share a rank: the rank shown is the position of the
            // first row with this score, so two players on the same score
            // both show "1" (or "2") instead of 1 and 2.
            const rank = rows.findIndex((r) => r.score === row.score) + 1
            return (
              <li key={`${row.player_name}-${row.score}-${i}`} className="leaderboard-sidebar__row">
                <span className="leaderboard-sidebar__rank">{rank}</span>
                <span className="leaderboard-sidebar__player">{row.player_name}</span>
                <span className="leaderboard-sidebar__game">{gameLabel(row.game_type)}{row.game_mode && row.game_mode !== 'all' ? ` – ${row.game_mode}` : ''}</span>
                <span className="leaderboard-sidebar__score">{row.score}</span>
              </li>
            )
          })}
        </ol>
      )}
      <a href="/leaderboard" className="leaderboard-sidebar__link">
        Full leaderboard →
      </a>
    </aside>
  )
}