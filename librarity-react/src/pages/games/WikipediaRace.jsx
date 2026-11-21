import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useToast } from '../../contexts/ToastContext'
import { useGameState } from '../../contexts/GameStateContext'
import GameShell, { Modal, StatsGrid } from '../../components/ui/GameShell'
import NamePrompt from '../../components/ui/NamePrompt'

// Built-in challenges (all titles verified as real Wikipedia articles)
const CHALLENGES = [
  // Easy — short, obvious connections
  { start: 'Dog', target: 'Piano', difficulty: 'easy' },
  { start: 'Moon', target: 'Coffee', difficulty: 'easy' },
  { start: 'Cat', target: 'Internet', difficulty: 'easy' },
  { start: 'Apple', target: 'Association football', difficulty: 'easy' },
  { start: 'Rain', target: 'Library', difficulty: 'easy' },
  { start: 'Sun', target: 'Book', difficulty: 'easy' },
  // Medium
  { start: 'Albert Einstein', target: 'Pizza', difficulty: 'medium' },
  { start: 'Ancient Egypt', target: 'Basketball', difficulty: 'medium' },
  { start: 'Volcano', target: 'Jazz', difficulty: 'medium' },
  { start: 'Shark', target: 'Democracy', difficulty: 'medium' },
  { start: 'Chocolate', target: 'Olympic Games', difficulty: 'medium' },
  { start: 'Dinosaur', target: 'Photography', difficulty: 'medium' },
  { start: 'Ocean', target: 'Radio', difficulty: 'medium' },
  { start: 'Bicycle', target: 'William Shakespeare', difficulty: 'medium' },
  // Hard
  { start: 'Leonardo da Vinci', target: 'Computer', difficulty: 'hard' },
  { start: 'William Shakespeare', target: 'Antarctica', difficulty: 'hard' },
  { start: 'Aristotle', target: 'Baseball', difficulty: 'hard' },
  { start: 'Genghis Khan', target: 'Telephone', difficulty: 'hard' },
  { start: 'Byzantine Empire', target: 'Cinema of the United States', difficulty: 'hard' },
  { start: 'Plato', target: 'Steam engine', difficulty: 'hard' },
  { start: 'Middle Ages', target: 'Nuclear power', difficulty: 'hard' },
  { start: 'Cleopatra', target: 'Saxophone', difficulty: 'hard' },
]

const TODAY_STR = new Date().toISOString().split('T')[0]

function getDailyChallenge() {
  const start = new Date('2024-01-01')
  const today = new Date()
  const day = Math.floor((today - start) / 86400000)
  return CHALLENGES[day % CHALLENGES.length]
}

async function fetchRandomArticleTitle() {
  const url = 'https://en.wikipedia.org/w/api.php?' + new URLSearchParams({
    action: 'query',
    list: 'random',
    rnnamespace: '0',
    rnlimit: '1',
    format: 'json',
    origin: '*',
  })
  const res = await fetch(url)
  const data = await res.json()
  return data.query.random[0].title
}

const DEFAULT_STATS = {
  racesCompleted: 0,
  totalClicks: 0,
  totalArticles: 0,
  bestTime: null,
  bestScore: null,
  history: [],
}

function loadStatsData() {
  try {
    const saved = localStorage.getItem('wikipediaRaceStats')
    return saved ? { ...DEFAULT_STATS, ...JSON.parse(saved) } : { ...DEFAULT_STATS }
  } catch {
    return { ...DEFAULT_STATS }
  }
}

function saveStatsData(stats) {
  try {
    localStorage.setItem('wikipediaRaceStats', JSON.stringify(stats))
  } catch { /* ignore */ }
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export default function WikipediaRace() {
  const { showToast } = useToast()
  const { recordScore } = useGameState()

  // Memoize showToast to prevent react(purity) issues
  const toastRef = useRef(showToast)
  useEffect(() => { toastRef.current = showToast }, [showToast])

  const hasPlayedDaily = useCallback(() => {
    try {
      return localStorage.getItem('wikiRaceDaily') === TODAY_STR
    } catch {
      return false
    }
  }, [])

  const markDailyPlayed = useCallback(() => {
    try {
      localStorage.setItem('wikiRaceDaily', TODAY_STR)
    } catch { /* ignore */ }
  }, [])

  // Game configuration & screen state
  const [mode, setMode] = useState(() => (hasPlayedDaily() ? 'random' : 'daily')) // 'daily' | 'random' | 'random-custom' | 'custom'
  const [screen, setScreen] = useState('setup') // 'setup' | 'game' | 'results'
  const [currentChallenge, setCurrentChallenge] = useState(null)

  // Active game state
  const [path, setPath] = useState([])
  const [clickCount, setClickCount] = useState(0)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [timer, setTimer] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [allLinks, setAllLinks] = useState([])
  const [articleTitle, setArticleTitle] = useState('')
  const [articleHtml, setArticleHtml] = useState('')
  const [articleError, setArticleError] = useState(null)
  const [loadingArticle, setLoadingArticle] = useState(false)
  const [hintDisplay, setHintDisplay] = useState(null)

  // Form state
  const [rcFixed, setRcFixed] = useState('start')
  const [rcInput, setRcInput] = useState('')
  const [customStart, setCustomStart] = useState('')
  const [customTarget, setCustomTarget] = useState('')
  const [linkSearch, setLinkSearch] = useState('')
  const [isFindingRandom, setIsFindingRandom] = useState(false)

  // Modals & UI overlays
  const [showHelp, setShowHelp] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showLinksModal, setShowLinksModal] = useState(false)
  const [namePrompt, setNamePrompt] = useState(null)
  const [actionBar, setActionBar] = useState(null)
  const [stats, setStats] = useState(() => loadStatsData())

  // References
  const startTimeRef = useRef(0)
  const hintTimeoutRef = useRef(null)
  const articleContentRef = useRef(null)

  const askForName = useCallback(() => {
    return new Promise((resolve) => setNamePrompt({ resolve }))
  }, [])

  // Timer interval
  useEffect(() => {
    if (screen !== 'game') return undefined
    const interval = setInterval(() => {
      setTimer(t => t + 1)
      setElapsedSeconds(e => e + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [screen])

  // Cleanup hint timeout on unmount
  useEffect(() => {
    return () => {
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current)
    }
  }, [])

  /** Load a Wikipedia article via API and strip unwanted markup. */
  const fetchAndProcessArticle = useCallback(async (title) => {
    setLoadingArticle(true)
    setArticleError(null)
    setArticleTitle('Loading…')

    try {
      const parseUrl = 'https://en.wikipedia.org/w/api.php?' + new URLSearchParams({
        action: 'parse',
        page: title,
        prop: 'text|links',
        redirects: '1',
        format: 'json',
        origin: '*',
      })

      const res = await fetch(parseUrl)
      const data = await res.json()
      if (data.error) throw new Error(data.error.info || 'Article not found')

      const parsed = data.parse
      const actualTitle = parsed.title
      setArticleTitle(actualTitle)

      const extractedLinks = (parsed.links || [])
        .filter(l => l.ns === 0 && l.exists !== undefined)
        .map(l => l['*'])
        .filter(Boolean)
      setAllLinks(extractedLinks)

      const wrapper = document.createElement('div')
      wrapper.innerHTML = parsed.text['*']

      // Remove noisy elements
      wrapper.querySelectorAll(
        '.mw-editsection,.navbox,.navbox-inner,.refbegin,.mw-references-wrap,' +
        '#toc,.hatnote,.ambox,.sistersitebox,.side-box,style,script'
      ).forEach(el => el.remove())

      // Strip inline color styles that break dark mode
      wrapper.querySelectorAll('[style]').forEach(el => {
        const cleaned = (el.getAttribute('style') || '')
          .split(';')
          .filter(s => {
            const prop = s.split(':')[0].trim().toLowerCase()
            return !['color', 'background', 'background-color', 'border-color'].includes(prop)
          })
          .join(';')
        if (cleaned.trim()) {
          el.setAttribute('style', cleaned)
        } else {
          el.removeAttribute('style')
        }
      })

      // Strip bgcolor/color attributes
      wrapper.querySelectorAll('[bgcolor],[color]').forEach(el => {
        el.removeAttribute('bgcolor')
        el.removeAttribute('color')
      })

      // Make images responsive
      wrapper.querySelectorAll('img').forEach(img => {
        img.style.maxWidth = '100%'
        img.style.height = 'auto'
        img.setAttribute('crossorigin', 'anonymous')
        const src = img.getAttribute('src') || ''
        if (src.startsWith('//')) img.setAttribute('src', 'https:' + src)
      })

      // Wrap tables for horizontal scroll
      wrapper.querySelectorAll('table').forEach(table => {
        const wrap = document.createElement('div')
        wrap.className = 'table-scroll-wrapper'
        table.parentNode.insertBefore(wrap, table)
        wrap.appendChild(table)
      })

      // Intercept links
      wrapper.querySelectorAll('a[href]').forEach(a => {
        const href = a.getAttribute('href') || ''
        if (href.startsWith('/wiki/') && !href.includes(':')) {
          a.setAttribute('href', '#')
          a.dataset.article = decodeURIComponent(href.slice(6).replace(/_/g, ' '))
          a.classList.add('wiki-link')
        } else {
          a.removeAttribute('href')
          a.classList.add('wiki-link-disabled')
        }
      })

      setArticleHtml(wrapper.innerHTML)
      setLoadingArticle(false)

      // Return details for completion check
      return { actualTitle }
    } catch (err) {
      console.error('Wikipedia fetch error:', err)
      setArticleError(err.message || 'Could not load article')
      setArticleTitle('Error')
      setLoadingArticle(false)
      return null
    }
  }, [])

  /** Complete challenge: calculate final score, update stats, show results screen. */
  const handleCompleteChallenge = useCallback((finalPath, clicks, hints, elapsed, challengeObj) => {
    const score = Math.max(0, Math.round(1000 - clicks * 10 - hints * 20 - elapsed * 0.1))

    // Save stats
    const s = loadStatsData()
    s.racesCompleted += 1
    s.totalClicks += clicks
    s.totalArticles += finalPath.length
    if (!s.bestTime || elapsed < s.bestTime) s.bestTime = elapsed
    if (!s.bestScore || score > s.bestScore) s.bestScore = score
    if (!s.history) s.history = []
    s.history.unshift({
      start: challengeObj.start,
      target: challengeObj.target,
      clicks,
      time: elapsed,
      score,
      hints,
      date: new Date().toLocaleDateString(),
    })
    if (s.history.length > 20) s.history.pop()
    saveStatsData(s)
    setStats(s)

    if (challengeObj.isDaily) {
      markDailyPlayed()
    }

    setScreen('results')
  }, [markDailyPlayed])

  /** Start a race with a given challenge configuration. */
  const startGame = useCallback(async (challenge) => {
    setCurrentChallenge(challenge)
    setPath([challenge.start])
    setClickCount(0)
    setHintsUsed(0)
    setTimer(0)
    setElapsedSeconds(0)
    setAllLinks([])
    setHintDisplay(null)
    setActionBar(null)
    startTimeRef.current = Date.now()

    setScreen('game')

    const res = await fetchAndProcessArticle(challenge.start)
    if (res?.actualTitle) {
      const targetLow = challenge.target.toLowerCase()
      const titleLow = res.actualTitle.toLowerCase()
      if (titleLow === targetLow || titleLow.includes(targetLow) || targetLow.includes(titleLow)) {
        handleCompleteChallenge([res.actualTitle], 0, 0, 0, challenge)
      }
    }
  }, [fetchAndProcessArticle, handleCompleteChallenge])

  const launchDaily = () => {
    if (hasPlayedDaily()) {
      toastRef.current?.("You've already completed today's race! Come back tomorrow.", 'info')
      setMode('random')
      return
    }
    const dc = getDailyChallenge()
    startGame({ ...dc, isDaily: true })
  }

  const launchRandom = async () => {
    setIsFindingRandom(true)
    try {
      const [start, target] = await Promise.all([fetchRandomArticleTitle(), fetchRandomArticleTitle()])
      startGame({ start, target, difficulty: 'random', isRandom: true })
    } catch {
      toastRef.current?.('Could not fetch random articles. Check your connection.', 'error')
    } finally {
      setIsFindingRandom(false)
    }
  }

  const launchRandomCustom = async () => {
    const val = rcInput.trim()
    if (!val) {
      toastRef.current?.('Please enter an article title', 'error')
      return
    }
    setIsFindingRandom(true)
    try {
      const randomTitle = await fetchRandomArticleTitle()
      const start = rcFixed === 'start' ? val : randomTitle
      const target = rcFixed === 'start' ? randomTitle : val
      startGame({ start, target, difficulty: 'custom', isRandomCustom: true })
    } catch {
      toastRef.current?.('Could not fetch a random article.', 'error')
    } finally {
      setIsFindingRandom(false)
    }
  }

  const launchCustom = () => {
    const s = customStart.trim()
    const t = customTarget.trim()
    if (!s || !t) {
      toastRef.current?.('Please enter both articles', 'error')
      return
    }
    startGame({ start: s, target: t, difficulty: 'custom' })
  }

  const navigateToArticle = async (article) => {
    if (!currentChallenge) return
    const nextClickCount = clickCount + 1
    const nextPath = [...path, article]

    setClickCount(nextClickCount)
    setPath(nextPath)

    const res = await fetchAndProcessArticle(article)
    const actualTitle = res?.actualTitle || article

    // Match check
    const targetLow = currentChallenge.target.toLowerCase()
    const titleLow = actualTitle.toLowerCase()
    const isMatch = titleLow === targetLow || titleLow.includes(targetLow) || targetLow.includes(titleLow)

    if (isMatch) {
      const finalPath = [...nextPath.slice(0, -1), actualTitle]
      setPath(finalPath)
      const elapsed = elapsedSeconds || 0
      setTimeout(() => {
        handleCompleteChallenge(finalPath, nextClickCount, hintsUsed, elapsed, currentChallenge)
      }, 300)
    }
  }

  // Handle delegated link clicks inside article container
  const handleArticleContainerClick = (e) => {
    const link = e.target.closest('a.wiki-link[data-article]')
    if (link) {
      e.preventDefault()
      const targetArticle = link.dataset.article
      if (targetArticle) {
        navigateToArticle(targetArticle)
      }
    }
  }

  const genericHint = (hintsCount) => {
    const target = currentChallenge?.target || 'the article'
    const hints = [
      `Think about broad categories "${target}" belongs to.`,
      'History, geography, and science articles connect almost everything.',
      'Look for a country or time-period article as a stepping stone.',
      `Who or what is "${target}" famously associated with?`,
      'Sports, food, and culture articles often surprise you.',
    ]
    return hints[hintsCount % 5]
  }

  const getHint = async () => {
    if (!currentChallenge) return
    const nextHintsCount = hintsUsed + 1
    setHintsUsed(nextHintsCount)
    setHintDisplay('💡 Finding a hint…')

    try {
      const catUrl = 'https://en.wikipedia.org/w/api.php?' + new URLSearchParams({
        action: 'query',
        titles: currentChallenge.target,
        prop: 'categories',
        cllimit: '10',
        format: 'json',
        origin: '*',
      })
      const data = await (await fetch(catUrl)).json()
      const cats = (Object.values(data.query?.pages || {})[0]?.categories || [])
        .map(c => c.title.replace('Category:', ''))
        .filter(c => !/stub|article|wikiproject/i.test(c))

      const hintText = cats.length
        ? `Try an article related to: ${cats[Math.floor(Math.random() * Math.min(cats.length, 5))]}`
        : genericHint(nextHintsCount)

      setHintDisplay(`💡 Hint ${nextHintsCount}: ${hintText}`)
    } catch {
      setHintDisplay(`💡 Hint ${nextHintsCount}: ${genericHint(nextHintsCount)}`)
    }

    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current)
    hintTimeoutRef.current = setTimeout(() => setHintDisplay(null), 8000)
  }

  const shareResult = () => {
    if (!currentChallenge) return
    const elapsed = elapsedSeconds || timer
    const score = Math.max(0, Math.round(1000 - clickCount * 10 - hintsUsed * 20 - elapsed * 0.1))

    const text = [
      '🏁 Wikipedia Race', '',
      `${currentChallenge.start} → ${currentChallenge.target}`, '',
      `🖱 Clicks: ${clickCount}`,
      `⏱ Time: ${formatTime(elapsed)}`,
      `💡 Hints: ${hintsUsed}`,
      `⭐ Score: ${score}`, '',
      `Path: ${path.join(' → ')}`, '',
      'By Unbinding',
    ].join('\n')

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => toastRef.current?.('Score copied! 📋', 'success'))
        .catch(() => toastRef.current?.('Could not copy', 'error'))
    } else {
      toastRef.current?.('Clipboard not supported', 'error')
    }
  }

  const submitScoreManual = async () => {
    try {
      const username = await askForName()
      if (!username) return

      const elapsed = elapsedSeconds || timer
      const score = Math.max(0, Math.round(1000 - clickCount * 10 - hintsUsed * 20 - elapsed * 0.1))

      await recordScore({
        gameType: 'wikipedia_race',
        gameMode: currentChallenge?.isDaily ? 'daily' : 'random',
        playerName: username,
        score,
        timeTaken: elapsed,
      })

      toastRef.current?.(`Score submitted as "${username}"! ✅`, 'success')
    } catch (err) {
      console.error('Score submit error:', err)
      toastRef.current?.('Could not submit — saved locally only', 'error')
    }
  }

  const resetGame = () => {
    setScreen('setup')
    setCurrentChallenge(null)
    setPath([])
    setClickCount(0)
    setHintsUsed(0)
    setTimer(0)
    setActionBar(null)
    setRcInput('')
    setCustomStart('')
    setCustomTarget('')
  }

  const closeToActionBar = () => {
    if (currentChallenge) {
      setActionBar(`${currentChallenge.start} → ${currentChallenge.target} · ${clickCount} clicks`)
    }
    setScreen('setup')
  }

  const quitGame = () => {
    if (window.confirm('Quit the race? Progress will be lost.')) {
      resetGame()
    }
  }

  // Filtered links for links modal
  const filteredLinks = useMemo(() => {
    if (!allLinks.length) return []
    const unique = [...new Set(allLinks)].sort()
    if (!linkSearch.trim()) return unique
    const q = linkSearch.toLowerCase()
    return unique.filter(l => l.toLowerCase().includes(q))
  }, [allLinks, linkSearch])

  // Derived score calculation
  const currentScore = Math.max(0, Math.round(1000 - clickCount * 10 - hintsUsed * 20 - elapsedSeconds * 0.1))
  const dailyChallenge = useMemo(() => getDailyChallenge(), [])

  return (
    <GameShell
      title="Wikipedia Race"
      subtitle="Navigate from one Wikipedia article to another using only links!"
      maxWidth={1000}
    >
      {/* Setup Screen */}
      {screen === 'setup' && (
        <div className="setup-screen">
          <div className="mode-tabs">
            <button
              className={`mode-tab ${mode === 'daily' ? 'active' : ''}`}
              onClick={() => setMode('daily')}
            >
              📅 Daily
            </button>
            <button
              className={`mode-tab ${mode === 'random' ? 'active' : ''}`}
              onClick={() => setMode('random')}
            >
              🎲 Random
            </button>
            <button
              className={`mode-tab ${mode === 'random-custom' ? 'active' : ''}`}
              onClick={() => setMode('random-custom')}
            >
              🎯 Random Custom
            </button>
            <button
              className={`mode-tab ${mode === 'custom' ? 'active' : ''}`}
              onClick={() => setMode('custom')}
            >
              ✏️ Custom
            </button>
          </div>

          {/* Daily panel */}
          {mode === 'daily' && (
            <div className="mode-panel">
              <h2>Today's Challenge</h2>
              <div className="daily-info">
                <div className="daily-route">
                  <span className="route-from">{dailyChallenge.start}</span>
                  <span className="challenge-arrow">→</span>
                  <span className="route-to">{dailyChallenge.target}</span>
                </div>
                <span className={`challenge-difficulty ${dailyChallenge.difficulty}`}>
                  {dailyChallenge.difficulty}
                </span>
                {hasPlayedDaily() && (
                  <p className="already-played">✓ Already played today! Playing again in practice mode.</p>
                )}
              </div>
              <button className="btn btn-primary btn-lg" onClick={launchDaily}>
                ▶ Start Daily Challenge
              </button>
            </div>
          )}

          {/* Random panel */}
          {mode === 'random' && (
            <div className="mode-panel">
              <h2>Random Race</h2>
              <p className="mode-desc">Both start and target articles are randomly chosen from Wikipedia.</p>
              <button
                className="btn btn-primary btn-lg"
                disabled={isFindingRandom}
                onClick={launchRandom}
              >
                {isFindingRandom ? '⏳ Finding articles…' : '🎲 Start Random Race'}
              </button>
            </div>
          )}

          {/* Random Custom panel */}
          {mode === 'random-custom' && (
            <div className="mode-panel">
              <h2>Random Custom</h2>
              <p className="mode-desc">You pick one article — the other is randomly chosen.</p>
              <div className="rc-form">
                <label className="rc-toggle">
                  <input
                    type="radio"
                    name="rcFixed"
                    value="start"
                    checked={rcFixed === 'start'}
                    onChange={() => setRcFixed('start')}
                  />
                  <span>I pick the <strong>start</strong>, random target</span>
                </label>
                <label className="rc-toggle">
                  <input
                    type="radio"
                    name="rcFixed"
                    value="target"
                    checked={rcFixed === 'target'}
                    onChange={() => setRcFixed('target')}
                  />
                  <span>I pick the <strong>target</strong>, random start</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter article title…"
                  value={rcInput}
                  onChange={e => setRcInput(e.target.value)}
                />
                <button
                  className="btn btn-primary"
                  disabled={isFindingRandom}
                  onClick={launchRandomCustom}
                >
                  {isFindingRandom ? '⏳ Finding random article…' : '🚀 Start Race'}
                </button>
              </div>
            </div>
          )}

          {/* Custom panel */}
          {mode === 'custom' && (
            <div className="mode-panel">
              <h2>Custom Challenge</h2>
              <div className="custom-challenge-form">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Start article (e.g., Albert Einstein)"
                  value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Target article (e.g., Pizza)"
                  value={customTarget}
                  onChange={e => setCustomTarget(e.target.value)}
                />
                <button className="btn btn-primary" onClick={launchCustom}>
                  ▶ Start Race
                </button>
              </div>

              <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Or pick a preset challenge</h3>
              <div className="challenges-grid">
                {CHALLENGES.map((ch, i) => {
                  const done = (stats.history || []).some(
                    h => h.start === ch.start && h.target === ch.target
                  )
                  return (
                    <div
                      className="challenge-card"
                      key={i}
                      onClick={() => startGame({ ...ch })}
                    >
                      <div className="challenge-route">
                        <span className="route-from">{ch.start}</span>
                        <span className="challenge-arrow">→</span>
                        <span className="route-to">{ch.target}</span>
                      </div>
                      <div className="challenge-meta">
                        <span className={`challenge-difficulty ${ch.difficulty}`}>{ch.difficulty}</span>
                        {done && <span className="challenge-done">✓ Done</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="setup-actions">
            <button className="btn btn-secondary" onClick={() => setShowHelp(true)}>❓ How to Play</button>
            <button className="btn btn-secondary" onClick={() => setShowStats(true)}>📊 Statistics</button>
          </div>
        </div>
      )}

      {/* Game Screen */}
      {screen === 'game' && currentChallenge && (
        <div className="game-screen">
          <div className="game-header">
            <button className="btn btn-sm btn-secondary" onClick={quitGame}>← Quit</button>
            <div className="challenge-info">
              <div className="route-display">
                <span className="route-label">From:</span>
                <span className="route-start">{currentChallenge.start}</span>
                <span className="route-arrow">→</span>
                <span className="route-label">To:</span>
                <span className="route-target">{currentChallenge.target}</span>
              </div>
            </div>
            <div className="game-stats">
              <div className="stat-item">
                <span className="stat-label">Clicks:</span>
                <span className="stat-value">{clickCount}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Time:</span>
                <span className="stat-value">{formatTime(timer)}</span>
              </div>
            </div>
          </div>

          <div className="breadcrumb-trail">
            {path.map((item, i) => (
              <React.Fragment key={i}>
                <span className="breadcrumb-item">{item}</span>
                {i < path.length - 1 && <span className="breadcrumb-separator">→</span>}
              </React.Fragment>
            ))}
          </div>

          <div className="wikipedia-container">
            <div className="article-header">
              <h2>{articleTitle}</h2>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowLinksModal(true)}>
                📋 Show Links
              </button>
            </div>

            {loadingArticle ? (
              <p className="loading-message">⏳ Loading article…</p>
            ) : articleError ? (
              <div className="article-error">
                <p>⚠️ Could not load <strong>{path[path.length - 1]}</strong>.</p>
                <p className="error-detail">{articleError}</p>
                <p>Check the spelling, or use the links panel to navigate.</p>
              </div>
            ) : (
              <div className="article-wrapper">
                <div
                  ref={articleContentRef}
                  className="article-content"
                  onClick={handleArticleContainerClick}
                  dangerouslySetInnerHTML={{ __html: articleHtml }}
                />
                <p className="article-source-note">
                  <small>
                    📖{' '}
                    <a
                      href={`https://en.wikipedia.org/wiki/${encodeURIComponent(articleTitle)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View on Wikipedia: {articleTitle}
                    </a>
                  </small>
                </p>
              </div>
            )}
          </div>

          <div className="hints-panel">
            <button className="btn btn-sm btn-secondary" onClick={getHint}>💡 Get Hint</button>
            {hintDisplay && <div className="hint-display">{hintDisplay}</div>}
          </div>
        </div>
      )}

      {/* Results Screen */}
      {screen === 'results' && currentChallenge && (
        <div className="results-screen">
          <div className="results-content">
            <h2 className="results-title">🎉 Challenge Complete!</h2>

            <div className="results-stats">
              <div className="result-stat">
                <div className="result-stat-value">{clickCount}</div>
                <div className="result-stat-label">Total Clicks</div>
              </div>
              <div className="result-stat">
                <div className="result-stat-value">{formatTime(timer)}</div>
                <div className="result-stat-label">Time Taken</div>
              </div>
              <div className="result-stat">
                <div className="result-stat-value">{hintsUsed}</div>
                <div className="result-stat-label">Hints Used</div>
              </div>
              <div className="result-stat">
                <div className="result-stat-value">{currentScore}</div>
                <div className="result-stat-label">Score</div>
              </div>
            </div>

            <div className="path-visualization">
              <h3>Your Path</h3>
              <div className="path-display">
                {path.map((art, i) => {
                  const isTarget = art.toLowerCase() === currentChallenge.target.toLowerCase()
                  return (
                    <div className={`path-item ${isTarget ? 'path-item-target' : ''}`} key={i}>
                      <span className="path-number">{i + 1}</span>
                      <span className="path-article">{art}</span>
                      {i < path.length - 1 ? (
                        <span className="path-arrow">↓</span>
                      ) : (
                        <span className="path-flag">🏁</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="results-actions">
              <button className="btn btn-primary" onClick={shareResult}>📋 Share</button>
              <button className="btn btn-secondary" onClick={submitScoreManual}>🏆 Submit Score</button>
              <button className="btn btn-secondary" onClick={resetGame}>🔄 Play Again</button>
              <button
                className="result-close"
                style={{
                  position: 'static',
                  fontSize: '1rem',
                  width: 'auto',
                  height: 'auto',
                  borderRadius: 6,
                  padding: '0.5rem 1rem',
                  border: '2px solid var(--border-color)',
                  background: 'none',
                  cursor: 'pointer',
                }}
                onClick={closeToActionBar}
              >
                ✕ Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Persistent action bar */}
      {actionBar && (
        <div className="game-action-bar">
          <span className="game-action-bar-label">{actionBar}</span>
          <div className="game-action-bar-btns">
            <button className="btn btn-sm btn-primary" onClick={shareResult}>📋 Share</button>
            <button className="btn btn-sm btn-secondary" onClick={resetGame}>🔄 Play Again</button>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => {
                if (window.confirm('Start a new race? Progress will be lost.')) resetGame()
              }}
            >
              ↺ Restart
            </button>
          </div>
        </div>
      )}

      {/* Links Modal */}
      {showLinksModal && (
        <Modal title="Available Links" onClose={() => setShowLinksModal(false)}>
          <input
            type="text"
            className="form-input"
            placeholder="Search links..."
            value={linkSearch}
            onChange={e => setLinkSearch(e.target.value)}
          />
          <div className="links-list">
            {!filteredLinks.length ? (
              <p className="loading-message">No links found on this page.</p>
            ) : (
              filteredLinks.map((targetTitle, i) => {
                const isTarget = targetTitle.toLowerCase() === (currentChallenge?.target || '').toLowerCase()
                return (
                  <div
                    className={`link-item ${isTarget ? 'link-item-target' : ''}`}
                    key={i}
                    onClick={() => {
                      setShowLinksModal(false)
                      navigateToArticle(targetTitle)
                    }}
                  >
                    {targetTitle}
                  </div>
                )
              })
            )}
          </div>
        </Modal>
      )}

      {/* Help Modal */}
      {showHelp && (
        <Modal title="How to Play" onClose={() => setShowHelp(false)}>
          <div style={{ textAlign: 'left' }}>
            <h3>Objective</h3>
            <p>Navigate from the starting Wikipedia article to the target article by clicking only on links within the articles.</p>

            <h3>Rules</h3>
            <ul className="help-list">
              <li>You can only click on links within article content</li>
              <li>Try to reach the target in as few clicks as possible</li>
              <li>Time and clicks are recorded</li>
              <li>You can use hints, but they add to your final count</li>
            </ul>

            <h3>Tips</h3>
            <ul className="help-list">
              <li>Think about common topics that might connect the articles</li>
              <li>Look for geographical, historical, or thematic links</li>
              <li>The breadcrumb trail shows your path</li>
              <li>Use the "Show Links" button to see all available links</li>
              <li>Hints suggest intermediate articles</li>
            </ul>

            <h3>Scoring</h3>
            <p>Your score is based on the number of clicks and time taken. Fewer clicks and less time result in better scores!</p>
          </div>
        </Modal>
      )}

      {/* Stats Modal */}
      {showStats && (
        <Modal title="Statistics" onClose={() => setShowStats(false)}>
          <StatsGrid
            items={[
              { label: 'Races', value: stats.racesCompleted },
              { label: 'Avg Clicks', value: stats.racesCompleted > 0 ? Math.round(stats.totalClicks / stats.racesCompleted) : 0 },
              { label: 'Best Time', value: stats.bestTime ? formatTime(stats.bestTime) : '-' },
              { label: 'Articles', value: stats.totalArticles },
              { label: 'Best Score', value: stats.bestScore ?? '-' },
            ]}
          />

          <div className="challenge-history">
            <h3>Recent Races</h3>
            {!stats.history?.length ? (
              <p className="loading-message">No races yet!</p>
            ) : (
              stats.history.map((h, i) => (
                <div className="history-item" key={i}>
                  <div className="history-route">{h.start} → {h.target}</div>
                  <div className="history-meta">
                    <span>🖱 {h.clicks}</span>
                    <span>⏱ {formatTime(h.time)}</span>
                    <span>⭐ {h.score}</span>
                    <span className="history-date">{h.date}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Modal>
      )}

      {/* Name Prompt */}
      {namePrompt && (
        <NamePrompt
          onDone={name => {
            namePrompt.resolve(name)
            setNamePrompt(null)
          }}
        />
      )}
    </GameShell>
  )
}
