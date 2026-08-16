# 🔧 Setup Guide - Library Games Website

Complete step-by-step instructions for configuring and deploying your Library Games website.

## Table of Contents
1. [GitHub OAuth Setup](#1-github-oauth-setup)
2. [Supabase Database Setup](#2-supabase-database-setup)
3. [Repository Configuration](#3-repository-configuration)
4. [GitHub Pages Deployment](#4-github-pages-deployment)
5. [Admin Access Configuration](#5-admin-access-configuration)
6. [Optional API Keys](#6-optional-api-keys)
7. [Testing](#7-testing)

---

## 1. GitHub OAuth Setup

### Why OAuth?
GitHub OAuth allows admin authentication so only repository collaborators can access the admin panel.

### Steps:

#### A. Create GitHub OAuth App

1. Go to [GitHub Settings > Developer settings > OAuth Apps](https://github.com/settings/developers)
2. Click **"New OAuth App"**
3. Fill in the details:
   - **Application name**: Library Games Admin
   - **Homepage URL**: `https://YOUR-USERNAME.github.io/library-games/`
   - **Authorization callback URL**: `https://YOUR-USERNAME.github.io/library-games/admin.html#/admin/callback`
4. Click **"Register application"**
5. Note down your **Client ID** (you'll need this)
6. Click **"Generate a new client secret"**
7. **IMPORTANT**: Copy the client secret immediately (it won't be shown again)

#### B. Configure Authentication

**Option 1: Using Personal Access Token (Quickest for Testing)**

For testing purposes, you can use a GitHub Personal Access Token:

1. Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Click **"Generate new token (classic)"**
3. Give it a name: "Library Games Admin"
4. Select scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `read:user` (Read user profile data)
5. Click **"Generate token"**
6. Copy the token (starts with `ghp_`)
7. When logging into admin panel, paste this token when prompted

**Option 2: Using OAuth Flow (Production)**

For production use, you need a backend proxy to exchange the OAuth code for a token (keeps the client secret secure).

You have several options:

**A. Serverless Function (Recommended)**

Deploy a serverless function on Vercel, Netlify, or Cloudflare Workers:

```javascript
// Example serverless function (Vercel/Netlify)
export default async function handler(req, res) {
  const { code } = req.body;
  
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code: code
    })
  });
  
  const data = await response.json();
  res.json({ access_token: data.access_token });
}
```

**B. GitHub App (Advanced)**

Convert to a GitHub App for more security:
1. Create a GitHub App instead of OAuth App
2. Use installation tokens
3. No client secret needed in frontend

#### C. Update Configuration

Edit `js/admin/auth.js`:

```javascript
this.config = {
    clientId: 'YOUR_CLIENT_ID_HERE',
    redirectUri: 'https://YOUR-USERNAME.github.io/library-games/admin.html#/admin/callback',
    scope: 'read:user repo',
    authEndpoint: 'https://github.com/login/oauth/authorize',
    
    // Repository info
    owner: 'YOUR-GITHUB-USERNAME',
    repo: 'library-games', // or your repo name
};
```

---

## 2. Supabase Database Setup

### Why Supabase?
Supabase provides a free PostgreSQL database for storing leaderboards with real-time capabilities.

### Steps:

#### A. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up / Login
3. Click **"New project"**
4. Fill in details:
   - **Name**: library-games
   - **Database Password**: (generate strong password - save it!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free
5. Click **"Create new project"**
6. Wait for project to initialize (~2 minutes)

#### B. Create Database Schema

**EASY METHOD**: Use the provided SQL file:

1. In Supabase dashboard, go to **"SQL Editor"**
2. Click **"New query"**
3. Copy the entire contents of `database-schema.sql` from this repository
4. Paste into SQL Editor
5. Click **"Run"**
6. Verify success message

The schema includes:
- ✅ `leaderboards` table with all necessary columns
- ✅ Indexes for fast queries
- ✅ Views for daily, weekly, and all-time leaderboards
- ✅ Row Level Security (RLS) policies (public read/insert)
- ✅ Functions: `health_check()`, `get_player_rank()`, `get_leaderboard_stats()`
- ✅ Triggers for data validation
- ✅ Comments and documentation

**MANUAL METHOD** (if you prefer step-by-step):

<details>
<summary>Click to expand manual SQL commands</summary>

```sql
-- Create leaderboards table
CREATE TABLE leaderboards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_type VARCHAR(50) NOT NULL,
  game_mode VARCHAR(20) NOT NULL,
  player_name VARCHAR(50) DEFAULT 'Anonymous',
  score INTEGER NOT NULL,
  time_taken INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  date_played DATE DEFAULT CURRENT_DATE
);

-- Create indexes
CREATE INDEX idx_game_type ON leaderboards(game_type);
CREATE INDEX idx_game_mode ON leaderboards(game_mode);
CREATE INDEX idx_created_at ON leaderboards(created_at DESC);
CREATE INDEX idx_date_played ON leaderboards(date_played DESC);

-- Enable RLS
ALTER TABLE leaderboards ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public insert" ON leaderboards
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public select" ON leaderboards
  FOR SELECT USING (true);

-- Create health check function
CREATE OR REPLACE FUNCTION health_check()
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
  RETURN 'OK';
END;
$$;
```

</details>

#### C. Get API Credentials

1. Go to **Settings** > **API**
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGc...` (long string)
3. Update `js/api/supabase.js`:

```javascript
const SUPABASE_CONFIG = {
    url: 'https://xxxxx.supabase.co',  // Your project URL
    anonKey: 'eyJhbGc...',  // Your anon key
};
```

**IMPORTANT**: The anon key is safe to expose in frontend code (it's public). RLS policies control data access.

---

## 3. Repository Configuration

### A. Add Repository Secrets

For GitHub Actions (keeps database alive):

1. Go to your repository on GitHub
2. Click **Settings** > **Secrets and variables** > **Actions**
3. Click **"New repository secret"**
4. Add these secrets:

| Name | Value |
|------|-------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Your Supabase anon key |

### B. Create Keep-Alive Workflow

**EASY METHOD**: The workflow file is already created at `.github/workflows/supabase-keepalive.yml`

Just need to:
1. Ensure repository secrets are added (see step A above)
2. Commit and push the workflow file (if not already)
3. Go to **Actions** tab and verify workflow exists
4. (Optional) Click **"Run workflow"** to test manually

The workflow will:
- ✅ Run daily at 12:00 UTC
- ✅ Call the `health_check()` function
- ✅ Query the leaderboards table
- ✅ Keep your database active (prevents auto-pause on free tier)

<details>
<summary>Click to see workflow details</summary>

The workflow pings your Supabase database daily to prevent it from pausing due to inactivity (Supabase free tier pauses after 7 days of no activity).

Location: `.github/workflows/supabase-keepalive.yml`

What it does:
1. Calls the `health_check()` RPC function
2. Queries the leaderboards table to check count
3. Reports success or failure

To manually trigger:
- Go to **Actions** tab > **Keep Supabase Active** > **Run workflow**

</details>

---

## 4. GitHub Pages Deployment

### A. Configure GitHub Pages

1. Go to repository **Settings** > **Pages**
2. Under "Build and deployment":
   - **Source**: Deploy from a branch
   - **Branch**: `main` (or `master`)
   - **Folder**: `/ (root)`
3. Click **Save**
4. Wait ~1 minute for deployment
5. Your site will be available at: `https://YOUR-USERNAME.github.io/REPO-NAME/`

### B. Include Supabase CDN

The Supabase client library is loaded via CDN. Verify `index.html` includes:

```html
<!-- Add before closing </body> tag -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script type="module" src="js/api/supabase.js"></script>
```

**Already included**: The CDN script is already in `index.html`, so no action needed!

---

## 5. Admin Access Configuration

### Add Collaborators

Only GitHub repository collaborators can access the admin panel.

1. Go to repository **Settings** > **Collaborators**
2. Click **"Add people"**
3. Enter GitHub username of person to grant admin access
4. Send invitation
5. They must accept the invitation

### Test Admin Access

1. Visit `https://YOUR-USERNAME.github.io/REPO-NAME/admin.html`
2. Click "Login with GitHub"
3. Authorize the application
4. You should see the admin dashboard

---

## 6. Optional API Keys

### Datamuse API (Required after Jan 1, 2027)

1. Visit [Datamuse API](https://www.datamuse.com/api/)
2. Fill out their feedback form to request an API key
3. Add key to `js/api/datamuse.js`

### Google Books API (Optional - Higher Limits)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project
3. Enable "Books API"
4. Go to **Credentials** > **Create Credentials** > **API Key**
5. Restrict key to "Books API" only
6. Add key to `js/api/books.js`

---

## 7. Testing

### Test Checklist

- [ ] Homepage loads correctly
- [ ] Navigation works (all links)
- [ ] Admin login redirects to GitHub
- [ ] After login, admin panel appears
- [ ] Non-collaborators see "Access Denied"
- [ ] Can logout successfully
- [ ] Leaderboard test submission works
- [ ] API calls succeed (dictionary, books, etc.)
- [ ] Mobile responsive (test on phone)
- [ ] Animations run smoothly

### Troubleshooting

**"OAuth not configured" error:**
- Make sure OAuth app is created
- Verify `clientId` in `auth.js` matches your GitHub OAuth app
- Check redirect URI matches exactly

**"Failed to fetch user info" error:**
- Token may be invalid
- Check GitHub API rate limits
- Verify token has correct scopes

**"Access denied" for collaborator:**
- User must accept invitation
- Check repository owner/name in `auth.js`
- Verify user is actually a collaborator (Settings > Collaborators)

**Supabase errors:**
- Check URL and anon key are correct
- Verify RLS policies are enabled
- Check browser console for specific errors

**GitHub Pages not updating:**
- Check Actions tab for deployment status
- May need to force refresh (Ctrl+F5)
- Can take 1-2 minutes to propagate

---

## 🎉 You're Done!

Your Library Games website should now be:
- ✅ Deployed on GitHub Pages
- ✅ Admin panel secured with GitHub OAuth
- ✅ Database configured for leaderboards
- ✅ Keep-alive workflow preventing database pause

### Next Steps

1. Add your school logo: `assets/images/logo.png`
2. Create first event in admin panel
3. Upload banner images
4. Add game content (words, questions, etc.)
5. Share site with students!

---

## Need Help?

- Check GitHub Issues
- Review console logs (F12 in browser)
- Verify all configuration values
- Test with Personal Access Token first

**Happy Gaming! 📚🎮**
