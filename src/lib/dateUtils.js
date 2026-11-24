/**
 * UTC+8 date utilities for daily puzzles.
 * All games share the same daily rotation schedule (midnight UTC+8).
 */

// UTC+8 offset in milliseconds
const UTC8_OFFSET_MS = 8 * 60 * 60 * 1000

/** Get the current UTC+8 date as ISO string (YYYY-MM-DD) */
export function getTodayUTC8() {
  const now = new Date()
  const utc8 = new Date(now.getTime() + UTC8_OFFSET_MS)
  return utc8.toISOString().split('T')[0]
}

/** Get days since epoch anchor (2024-01-01 UTC+8) for daily puzzle indexing */
export function getDaysSinceAnchorUTC8(anchor = '2024-01-01') {
  const anchorDate = new Date(anchor + 'T00:00:00+08:00')
  const now = new Date()
  const utc8Now = new Date(now.getTime() + UTC8_OFFSET_MS)
  const diffMs = utc8Now.getTime() - anchorDate.getTime()
  return Math.floor(diffMs / 86400000)
}

/** Parse ISO date string to UTC+8 Date object */
export function parseUTC8Date(dateStr) {
  return new Date(dateStr + 'T00:00:00+08:00')
}

/** Check if a stored date string matches today in UTC+8 */
export function isTodayUTC8(dateStr) {
  return dateStr === getTodayUTC8()
}