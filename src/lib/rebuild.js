/**
 * Site rebuild trigger — asks the `trigger-rebuild` Supabase Edge
 * Function to re-run the GitHub Pages deploy workflow, which regenerates
 * the pre-rendered static pages (event link previews for Facebook/
 * Messenger) without pushing a commit.
 *
 * The GitHub token lives only on the edge function (server-side
 * secret); the browser sends its own Supabase session, which the
 * function verifies before dispatching. Callers must be signed in —
 * used exclusively by the Admin page.
 */

const FUNCTION_URL =
  'https://wiqwrrhlriyaqxrmitzo.supabase.co/functions/v1/trigger-rebuild'

/**
 * Ask the edge function to rebuild the site.
 * @param {import('@supabase/supabase-js').SupabaseClient} sb — the auth client (carries the session)
 * @returns {Promise<{ok: boolean, message: string}>}
 */
export async function triggerRebuild(sb) {
  if (!sb) return { ok: false, message: 'Supabase unavailable' }
  try {
    const { data: sessionData } = await sb.auth.getSession()
    const token = sessionData?.session?.access_token
    if (!token) return { ok: false, message: 'Not signed in' }

    const res = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
    const body = await res.json().catch(() => ({}))

    if (res.ok && body.ok) {
      return {
        ok: true,
        message: 'Rebuild started — previews refresh in ~2 minutes.',
      }
    }
    return {
      ok: false,
      message: body.error || `Rebuild failed (HTTP ${res.status})`,
    }
  } catch (err) {
    return {
      ok: false,
      message: err?.message || 'Could not reach the rebuild service',
    }
  }
}
