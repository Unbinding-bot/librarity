# Supabase Setup — Events Feature

Run these steps in your Supabase dashboard (https://supabase.com/dashboard → project
`wiqwrrhlriyaqxrmitzo`). The app code is already built to work with this schema —
until you run it, every events route renders gracefully empty (no errors).

---

## 1. Create the `events` table

SQL Editor → New query → paste → **Run**:

```sql
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  image_url text not null default '',
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now()
);

-- readable by everyone (the site is public)
create policy "events are public"
  on events for select
  using (true);

-- only signed-in admins can write
create policy "admins can insert events"
  on events for insert
  with check (auth.role() = 'authenticated');

create policy "admins can update events"
  on events for update
  using (auth.role() = 'authenticated');

create policy "admins can delete events"
  on events for delete
  using (auth.role() = 'authenticated');
```

### 1b. Add the `image_ratio` and `image_size` columns (already-created tables)

If you created the `events` table before these columns existed, run this once in the
SQL Editor — it's safe to re-run:

```sql
alter table events add column if not exists image_ratio text;
alter table events add column if not exists image_size text;
```

- `image_ratio` — the pubmat's own aspect ratio, e.g. `"1080:520"`. Set by the
  admin form (auto-detected from the image). When null, the site detects the ratio
  from the loaded image itself.
- `image_size` — the pubmat's display size, e.g. `"1080x520"`. Set by the admin form's
  size picker (actual / 2 smaller / 2 bigger). When null, the site uses the image's
  natural size.

**Until you run this, the admin edit form will show empty for the image fields**
(Supabase returns rows without the columns, so the values are undefined). The site
still renders fine — it falls back to auto-detection.

## 2. Create the `event-images` storage bucket

Storage → **New bucket**:
- Name: `event-images`
- Public bucket: **ON** (so pubmat URLs are directly viewable)

Then in the bucket's **Policies** tab, add:
- SELECT (read): allow for `anon`, `authenticated` (public bucket usually has this by default)
- INSERT: allow for `authenticated` only
- DELETE/UPDATE: allow for `authenticated` only

If the UI offers "give users access to upload only when they are logged in", that preset
is exactly right.

## 3. Enable email auth + create the admin account

Authentication → Providers → **Email**: enable (it's on by default).

Then create the librarian's account. Easiest: **Authentication → Users → Add user**:
- Email: the librarian's email
- Password: something strong
- Auto-confirm user: **ON**

(The admin page's login form signs in with exactly this email + password.
No email verification flow needed.)

## 4. Verify

- Table Editor → `events` should exist with 0 rows.
- Storage → `event-images` bucket should exist and be public.
- Then open the site → `/admin`, log in, and add a test event. It should appear on
  the home page (if today is within its dates) and on the `/events` tab.

---

## 5. Create the `site_items` table (Games/Tools overrides)

SQL Editor → New query → paste → **Run**:

```sql
create table if not exists site_items (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section in ('games', 'tools')),
  item_id text, -- nullable: null = new "coming soon" entry, matches GAMES/TOOLS.id for override
  name text,
  description text,
  accent text default 'card-accent-green',
  position integer not null default 0,
  created_at timestamptz not null default now()
);

-- All items are public (the site is public)
create policy "site_items are public"
  on site_items for select
  using (true);

-- only signed-in admins can write
create policy "admins can insert site_items"
  on site_items for insert
  with check (auth.role() = 'authenticated');

create policy "admins can update site_items"
  on site_items for update
  using (auth.role() = 'authenticated');

create policy "admins can delete site_items"
  on site_items for delete
  using (auth.role() = 'authenticated');
```

`position` already has `not null default 0` in the create statement — no extra
ALTER needed.

### How it works:
- **`item_id` matches a registry id** (e.g., `'wordle'`, `'dictionary'`) → **OVERRIDE** that entry's `name`/`description`
- **`item_id` is `null`** → **NEW "coming soon" entry** with no route yet, renders with no link
- `position` controls ordering (lower numbers first)
- `section` must be `'games'` or `'tools'`

The `src/lib/siteItems.js` module handles merging registry entries with database overrides.

---

## Troubleshooting

**"Could not fetch events" in console** → the table doesn't exist yet; run step 1.
**Uploads fail with 403** → the storage INSERT policy (step 2) is missing or the
user isn't authenticated.
**Login says "Invalid login credentials"** → the user from step 3 doesn't exist or
the email isn't confirmed (set auto-confirm ON).
**Site items show as "coming soon" but you want them live** → make sure `item_id`
matches a registry entry (check `GAMES[].id` or `TOOLS[].id` in `src/lib/gamesRegistry.js`).

---

## 6. Fix the `game_mode` whitelist (Trivia + Flashcards scores currently rejected)

The `leaderboards` table has a trigger that validates `game_mode` against a
whitelist of only `daily` and `random`. Trivia submits `all`/`easy`/`medium`/
`hard` and Flashcards submits `unlimited` — those inserts fail with
"Invalid game_mode" and the score silently falls back to the player's local
storage (never reaches the leaderboard).

SQL Editor → New query → paste → **Run** (safe to re-run):

```sql
-- Find the trigger's function name, then widen its whitelist to include
-- the modes the games submit. Replace validate_game_mode below with the
-- actual function name if it differs.
```

Easier, one-shot approach — replace the strict check with a format check
(any 1–30 chars of letters/digits/underscore/hyphen):

```sql
create or replace function public.validate_leaderboard_row()
returns trigger
language plpgsql
as $$
begin
  if new.game_mode !~ '^[A-Za-z0-9_-]{1,30}$' then
    raise exception 'Invalid game_mode: %', new.game_mode;
  end if;
  if new.game_type !~ '^[A-Za-z0-9_-]{1,40}$' then
    raise exception 'Invalid game_type: %', new.game_type;
  end if;
  return new;
end;
$$;
```

If the original trigger uses a different function name, first run:

```sql
select tgname, proname
from pg_trigger t join pg_proc p on p.oid = t.tgfoid
where tgrelid = 'public.leaderboards'::regclass and not tgisinternal;
```

…and `create or replace function <that name> ...` instead, keeping the same
signature. After running, Trivia's "Mixed/Easy/Medium/Hard" and Flashcards'
"unlimited" submissions store normally.

**Verify**: play one round of Trivia, submit a score — it should appear on
/leaderboard under Trivia without the "saved locally" console warning.
