// Supabase Edge Function: trigger-rebuild
//
// Re-runs the GitHub Pages deploy workflow so the pre-rendered static
// pages (including one per event, used for Facebook/Messenger link
// previews) are regenerated without pushing a commit.
//
// Why an edge function: dispatching a GitHub workflow requires a token
// with Actions write access. That token must never ship in the frontend
// bundle (anyone could read it from the public JS), so it lives here as
// a server-side secret. The browser only sends its Supabase session
// token; this function verifies it belongs to a signed-in user (the
// admin) before touching GitHub.
//
// Setup (one-time, see docs/supabase-setup.md §7):
//   npx supabase functions deploy trigger-rebuild --project-ref wiqwrrhlriyaqxrmitzo
//   npx supabase secrets set GH_TOKEN=github_pat_... --project-ref wiqwrrhlriyaqxrmitzo

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const GH_WORKFLOW_URL =
  'https://api.github.com/repos/Unbinding-bot/librarity/actions/workflows/deploy-pages.yml/dispatches'

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  // ── Verify the caller is a signed-in Supabase user (the admin) ──
  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    return json({ error: 'Missing Authorization header — sign in first' }, 401)
  }

  const { createClient } = await import('npm:@supabase/supabase-js@2')
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(authHeader.slice(7))
  if (userError || !user) {
    return json({ error: 'Unauthorized — sign in as the admin first' }, 401)
  }

  // ── Dispatch the GitHub Pages workflow ──
  const ghToken = Deno.env.get('GH_TOKEN')
  if (!ghToken) {
    return json(
      {
        error:
          'GH_TOKEN secret is not set on this function. See docs/supabase-setup.md §7.',
      },
      500
    )
  }

  const res = await fetch(GH_WORKFLOW_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ghToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'librarity-trigger-rebuild',
    },
    body: JSON.stringify({ ref: 'main' }),
  })

  // GitHub returns 204 No Content on a successful dispatch.
  if (res.status === 204) {
    return json({ ok: true }, 200)
  }

  const detail = (await res.text()).slice(0, 300)
  return json(
    {
      error: `GitHub responded ${res.status}`,
      detail,
      hint:
        res.status === 403 || res.status === 404
          ? 'Check that the GH_TOKEN is a fine-grained PAT with Actions: Read and write on the librarity repo.'
          : undefined,
    },
    502
  )
})
