/**
 * Site items data layer — admin-managed overrides + coming-soon entries
 * for the Games & Tools grids.
 *
 * The base catalog is the static gamesRegistry (code). The `site_items`
 * table (optional, set up via docs/supabase-setup.md) layers on top of it:
 *
 *   - A row whose `item_id` matches a registry id OVERRIDES that entry's
 *     name / description (everything else still comes from the registry).
 *   - A row with a registry `item_id` of `null` is a NEW entry — typically
 *     a "coming soon" teaser that has no page yet. It renders on its
 *     section's grid with a Coming soon badge and no link.
 *
 * Every function swallows Supabase errors and returns safe fallbacks so the
 * site renders the static registry cleanly before the table exists.
 *
 * Row shape:
 *   { id, section ('games'|'tools'), item_id (nullable), name,
 *     description, accent, position, created_at }
 */

import { getAnonClient, getAuthClient } from './supabase'

/** Fetch every site_items row. Returns [] when the table is missing. */
export async function fetchSiteItems() {
  const sb = getAnonClient()
  if (!sb) return []
  try {
    const { data, error } = await sb
      .from('site_items')
      .select('*')
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) throw error
    return data || []
  } catch (err) {
    console.warn('siteItems: fetch failed, using registry only:', err?.message || err)
    return []
  }
}

/** Admin write helpers — same shape as the events ones in Admin.jsx. */

export async function createSiteItem(payload) {
  const sb = getAuthClient()
  if (!sb) throw new Error('Supabase unavailable')
  const { data, error } = await sb.from('site_items').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function updateSiteItem(id, payload) {
  const sb = getAuthClient()
  if (!sb) throw new Error('Supabase unavailable')
  const { error } = await sb.from('site_items').update(payload).eq('id', id)
  if (error) throw error
}

export async function deleteSiteItem(id) {
  const sb = getAuthClient()
  if (!sb) throw new Error('Supabase unavailable')
  const { error } = await sb.from('site_items').delete().eq('id', id)
  if (error) throw error
}

/**
 * Merge the static registry with DB overrides + coming-soon rows.
 *
 * @param {Array} registry  GAMES or TOOLS from gamesRegistry
 * @param {Array} items     site_items rows (may be [])
 * @param {'games'|'tools'} section
 * @returns {Array} merged entries: { ...registryEntry, name, description,
 *   comingSoon, overrideId }
 *
 * Registry entries keep their original order (position stable), get any
 * override fields applied, and gain `comingSoon: false`. New DB-only rows
 * follow, in their stored position order, with `comingSoon: true`.
 */
export function mergeSiteItems(registry, items, section) {
  const rows = (items || []).filter((r) => r.section === section)
  const byId = new Map(rows.filter((r) => r.item_id).map((r) => [r.item_id, r]))
  const extras = rows.filter((r) => !r.item_id)

  const merged = registry.map((entry) => {
    const row = byId.get(entry.id)
    if (!row) return { ...entry, comingSoon: false, overrideId: null }
    return {
      ...entry,
      name: row.name || entry.name,
      description: row.description ?? entry.description,
      comingSoon: false,
      overrideId: row.id,
    }
  })

  const extraEntries = extras.map((row) => ({
    id: row.item_id || `site-${row.id}`,
    path: null, // no route exists for a coming-soon teaser
    accent: row.accent || 'card-accent-green',
    name: row.name || '',
    description: row.description || '',
    comingSoon: true,
    overrideId: row.id,
  }))

  return [...merged, ...extraEntries]
}
