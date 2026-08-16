# 🚀 Deployment Guide

Complete guide for deploying the School Library Games website to GitHub Pages.

## Prerequisites

- GitHub account
- Git installed locally
- Repository with collaborator access
- Supabase account (for leaderboards)

## Step 1: Repository Setup

### 1.1 Create GitHub Repository
```bash
# Create a new repository on GitHub
# Name: library-games (or your preferred name)
# Visibility: Public (required for GitHub Pages)
```

### 1.2 Clone Repository
```bash
git clone https://github.com/YOUR_USERNAME/library-games.git
cd library-games
```

### 1.3 Add Project Files
```bash
# Copy all project files to the repository
# Ensure these files are present:
- index.html
- All game HTML files
- css/ directory
- js/ directory
- data/ directory
- assets/ directory (if you have images)
```

## Step 2: Supabase Setup

### 2.1 Create Supabase Project
1. Go to [https://supabase.com](https://supabase.com)
2. Click "New Project"
3. Enter project details
4. Wait for database to be created

### 2.2 Run Database Schema
1. Go to SQL Editor in Supabase dashboard
2. Copy contents of `database-schema.sql`
3. Execute the SQL script
4. Verify tables are created:
   - `leaderboard_wordle`
   - `leaderboard_spelling_bee`
   - `leaderboard_word_ladder`
   - `leaderboard_trivia`

### 2.3 Get API Credentials
1. Go to Project Settings → API
2. Copy `Project URL`
3. Copy `anon public` key
4. Save these for later

## Step 3: GitHub OAuth Setup

### 3.1 Create OAuth App
1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in details:
   - **Application name**: Library Games Admin
   - **Homepage URL**: `https://YOUR_USERNAME.github.io/library-games/`
   - **Authorization callback URL**: `https://YOUR_USERNAME.github.io/library-games/admin.html`
4. Click "Register application"
5. Copy `Client ID`
6. Generate and copy `Client Secret`

### 3.2 Configure OAuth in Code
1. Open `js/admin/auth.js`
2. Update the OAuth configuration:
```javascript
const CLIENT_ID = 'your_github_client_id';
const REDIRECT_URI = 'https://YOUR_USERNAME.github.io/library-games/admin.html';
```

## Step 4: Configure Application

### 4.1 Update Supabase Config
1. Open `js/api/supabase.js`
2. Update configuration:
```javascript
const SUPABASE_URL = 'your_supabase_project_url';
const SUPABASE_ANON_KEY = 'your_supabase_anon_key';
```

### 4.2 Update Repository Info
1. Open `js/admin/github-api.js`
2. Update repository details:
```javascript
const REPO_OWNER = 'YOUR_USERNAME';
const REPO_NAME = 'library-games';
```

### 4.3 Test Locally (Optional)
```bash
# Install a local server (if you don't have one)
npm install -g http-server

# Run server
http-server . -p 8000

# Open browser to http://localhost:8000
```

## Step 5: Deploy to GitHub Pages

### 5.1 Commit and Push
```bash
git add .
git commit -m "Initial deployment"
git push origin main
```

### 5.2 Enable GitHub Pages
1. Go to repository Settings
2. Scroll to "Pages" section
3. Source: Deploy from a branch
4. Branch: `main` → `/root`
5. Click "Save"

### 5.3 Wait for Deployment
- GitHub will build and deploy your site
- Usually takes 1-3 minutes
- Site will be available at: `https://YOUR_USERNAME.github.io/library-games/`

## Step 6: Verify Deployment

### 6.1 Test All Games
- [ ] Wordle loads and plays
- [ ] Spelling Bee loads and plays
- [ ] Word Ladder loads and plays
- [ ] Trivia loads and plays
- [ ] Flashcards loads and plays
- [ ] Wikipedia Race loads and plays

### 6.2 Test Tools
- [ ] Dictionary works
- [ ] Thesaurus works
- [ ] Rhyme Finder works

### 6.3 Test Features
- [ ] Theme toggle works
- [ ] Leaderboards load
- [ ] Scores can be submitted
- [ ] Statistics save correctly

### 6.4 Test Admin Panel
- [ ] Can access admin.html
- [ ] GitHub OAuth login works
- [ ] Can view/edit events
- [ ] Can manage banners
- [ ] Can edit game content

## Step 7: Setup Supabase Keepalive (Optional)

Supabase free tier databases pause after inactivity. Keep them active:

### 7.1 Enable GitHub Action
The `.github/workflows/supabase-keepalive.yml` file is already configured.

### 7.2 Add Secrets
1. Go to repository Settings → Secrets and variables → Actions
2. Add new repository secrets:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_KEY`: Your Supabase anon key

### 7.3 Verify Workflow
- Go to Actions tab
- Check if "Supabase Keepalive" workflow is running
- It should run every 6 hours

## Step 8: Custom Domain (Optional)

### 8.1 Purchase Domain
- Buy a domain from any registrar (Namecheap, GoDaddy, etc.)

### 8.2 Configure DNS
Add DNS records:
```
Type: A
Host: @
Value: 185.199.108.153
Value: 185.199.109.153
Value: 185.199.110.153
Value: 185.199.111.153

Type: CNAME
Host: www
Value: YOUR_USERNAME.github.io
```

### 8.3 Configure GitHub Pages
1. Go to repository Settings → Pages
2. Custom domain: `yourdomain.com`
3. Click "Save"
4. Wait for DNS check (can take up to 24 hours)
5. Enable "Enforce HTTPS"

## Troubleshooting

### Site Not Loading
- Check GitHub Pages settings
- Verify deployment status in Actions tab
- Clear browser cache
- Check browser console for errors

### OAuth Not Working
- Verify callback URL matches exactly
- Check CLIENT_ID in code
- Ensure you're accessing via HTTPS

### Leaderboard Not Working
- Check Supabase credentials
- Verify database tables exist
- Check browser console for API errors
- Test Supabase connection in dashboard

### Games Not Loading Data
- Verify all JSON files are present in `data/` directory
- Check file paths are correct
- Ensure JSON is valid (use JSONLint)

### Theme Not Saving
- Check LocalStorage is enabled
- Test in incognito mode
- Verify theme.js is loading

## Maintenance

### Daily Tasks
- Monitor leaderboards for inappropriate content
- Check for error reports

### Weekly Tasks
- Review game statistics
- Update events if needed
- Check for broken links

### Monthly Tasks
- Update game content
- Add new questions/words
- Review and update book list
- Backup database

### As Needed
- Create seasonal events
- Add new games
- Update design/styling

## Security Best Practices

### Never Commit These
- API keys (use environment variables)
- OAuth secrets
- Database passwords
- Admin credentials

### Always Do These
- Keep dependencies updated
- Use HTTPS only
- Validate user input
- Sanitize displayed content
- Rate limit API calls
- Monitor for abuse

## Support

### Getting Help
- Check browser console for errors
- Review GitHub Issues
- Test in different browsers
- Check network tab for failed requests

### Common Issues
1. **404 errors**: Check file paths and case sensitivity
2. **CORS errors**: Ensure APIs allow your domain
3. **OAuth redirect**: Verify exact URL match
4. **Database errors**: Check Supabase logs

## Updating Content

### Game Content
1. Go to admin panel
2. Click "Game Content Editor"
3. Select game
4. Edit content
5. Save (commits to GitHub)

### Events
1. Go to admin panel
2. Click "Manage Events"
3. Create/edit events
4. Set dates and themes
5. Save

### Daily Challenges
1. Go to admin panel
2. Click "Daily Overrides"
3. Select date and game
4. Enter custom content
5. Save

## Performance Optimization

### Already Implemented
- Minified CSS/JS
- Lazy loading images
- Efficient animations
- Cached API responses
- LocalStorage for preferences

### Additional Improvements
- Enable Cloudflare (free CDN)
- Compress images
- Use WebP format
- Implement Service Worker
- Add resource hints

## Analytics (Optional)

### Google Analytics
Add to `index.html`:
```html
<!-- Global site tag (gtag.js) - Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

## Backup Strategy

### Automated Backups
- GitHub automatically backs up code
- Supabase has automatic backups (paid plans)

### Manual Backups
1. Export Supabase database regularly
2. Download repository as ZIP
3. Save configuration files separately

## Scaling

### If Traffic Grows
- Upgrade Supabase plan
- Use Cloudflare for DDoS protection
- Consider dedicated hosting
- Implement caching strategies
- Use CDN for assets

## Legal

### Required Pages
- Privacy Policy (if collecting data)
- Terms of Service
- Cookie Policy (if using cookies)
- COPPA compliance (for school use)

### Disclaimers
- Educational use only
- No warranty provided
- Content subject to change

## Success Metrics

Track these to measure success:
- Daily active users
- Games played per session
- Leaderboard participation rate
- Tool usage statistics
- Average session duration
- Return visit rate

## Launch Checklist

Before announcing to users:
- [ ] All games tested and working
- [ ] Tools tested and working
- [ ] Leaderboards functional
- [ ] Admin panel secured
- [ ] Mobile responsive verified
- [ ] Cross-browser tested (Chrome, Firefox, Safari, Edge)
- [ ] Performance tested (Google PageSpeed)
- [ ] Accessibility checked
- [ ] Documentation complete
- [ ] Backup strategy in place
- [ ] Monitoring setup
- [ ] Support process defined

---

## Congratulations! 🎉

Your School Library Games website is now deployed and ready for students to enjoy!

For questions or issues, refer to the project documentation or contact your development team.

**Happy Gaming!** 📚🎮
