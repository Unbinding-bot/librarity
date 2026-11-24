import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import GameShell, { Modal } from '../../components/ui/GameShell'
import { useToast } from '../../contexts/ToastContext'
import { useGameState } from '../../contexts/GameStateContext'
import NamePrompt from '../../components/ui/NamePrompt'
import { getDisplayName } from '../../lib/logbook'

const WIKI_API = 'https://en.wikipedia.org/w/api.php'
const WIKI_ORIGIN = 'https://en.wikipedia.org'

const CHALLENGES = [
  // easy (6)
  { start: 'Apple', target: 'World War II', difficulty: 'easy' },
  { start: 'Coffee', target: 'Brazil', difficulty: 'easy' },
  { start: 'Football', target: 'England', difficulty: 'easy' },
  { start: 'Lion', target: 'Africa', difficulty: 'easy' },
  { start: 'Mount Everest', target: 'Nepal', difficulty: 'easy' },
  { start: 'Pizza', target: 'Italy', difficulty: 'easy' },
  // medium (8)
  { start: 'Bicycle', target: 'Industrial Revolution', difficulty: 'medium' },
  { start: 'Chess', target: 'India', difficulty: 'medium' },
  { start: 'Dolphin', target: 'Evolution', difficulty: 'medium' },
  { start: 'Helium', target: 'Universe', difficulty: 'medium' },
  { start: 'Mona Lisa', target: 'French Revolution', difficulty: 'medium' },
  { start: 'Roman Empire', target: 'Turkey', difficulty: 'medium' },
  { start: 'Tea', target: 'China', difficulty: 'medium' },
  { start: 'Volcano', target: 'Plate tectonics', difficulty: 'medium' },
  // hard (8)
  { start: 'Antarctica', target: 'Ferdinand Magellan', difficulty: 'hard' },
  { start: 'Bitcoin', target: 'Gold standard', difficulty: 'hard' },
  { start: 'Black hole', target: 'Albert Einstein', difficulty: 'hard' },
  { start: 'DNA', target: 'Charles Darwin', difficulty: 'hard' },
  { start: 'Great Wall of China', target: 'Silk Road', difficulty: 'hard' },
  { start: 'Jazz', target: 'Slave Trade', difficulty: 'hard' },
  { start: 'Olympic Games', target: 'Ancient Greece', difficulty: 'hard' },
  { start: 'Renaissance', target: 'Printing press', difficulty: 'hard' },
]

const HINT_PENALTY = 20
const CLICK_PENALTY = 10
const TIME_PENALTY = 0.1

const DEFAULT_STATS = {
  racesPlayed: 0,
  racesWon: 0,
  bestScore: 0,
  fewestClicks: null,
  totalClicks: 0,
  lastPlayedDaily: null,
}

function loadStats() {
  try {
    const saved = localStorage.getItem('wikipediaRaceStats')
    return saved ? { ...DEFAULT_STATS, ...JSON.parse(saved) } : { ...DEFAULT_STATS }
  } catch {
    return { ...DEFAULT_STATS }
  }
}

function saveStats(stats) {
  try {
    localStorage.setItem('wikipediaRaceStats', JSON.stringify(stats))
  } catch {}
}

/** Daily challenge index (rotates across all challenges). */
function getDailyChallenge() {
  const days = Math.abs(Math.floor((new Date() - new Date('2024-01-01')) / 86400000))
  return CHALLENGES[days % CHALLENGES.length]
}

function sanitizeHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  // strip scripts/styles/inline handlers
  doc.querySelectorAll('script, style, link, meta').forEach((el) => el.remove())
  doc.querySelectorAll('*').forEach((el) => {
    for (const attr of [...el.attributes]) {
      if (attr.name.startsWith('on') || attr.name === 'style' || attr.name === 'class') {
        el.removeAttribute(attr.name)
      }
    }
  })
  // tag /wiki/ links for click interception
  doc.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href') || ''
    if (href.startsWith('/wiki/')) {
      const title = decodeURIComponent(href.slice(6).split('#')[0])
      if (title.startsWith('File:') || title.startsWith('Special:') || title.startsWith('Wikipedia:')) {
        a.removeAttribute('href')
        return
      }
      a.classList.add('wiki-link')
      a.setAttribute('data-article', title.replace(/_/g, ' '))
    } else if (href.startsWith('#')) {
      // anchor within page — keep but neutralize
      a.removeAttribute('href')
    } else {
      a.removeAttribute('href')
    }
  })
  // remove edit links and reference backlinks that don't lead anywhere
  doc.querySelectorAll('.mw-editsection, .navbox, .vertical-navbox, #toc, .hatnote').forEach((el) => el.remove())
  return doc.body.innerHTML
}

export default function WikipediaRace() {
  const { showToast } = useToast()
  const { recordScore } = useGameState()

  const [mode, setMode] = useState('daily')
  const [difficultyFilter, setDifficultyFilter] = useState('all')
  const [challenge, setChallenge] = useState(() => getDailyChallenge())
  const [currentArticle, setCurrentArticle] = useState(null)
  const [html, setHtml] = useState('')
  const [loading, setLoading] = useState(false)
  const [clickCount, setClickCount] = useState(0)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [startTime, setStartTime] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [won, setWon] = useState(false)
  const [history, setHistory] = useState([])

  const [showHelp, setShowHelp] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [result, setResult] = useState(null)
  const resultRef = useRef(null)
  const [stats, setStats] = useState(() => loadStats())
  const [namePrompt, setNamePrompt] = useState(null)

  const startedRef = useRef(false)
  const wonRef = useRef(false)
  const timerRef = useRef(null)
  const articleBodyRef = useRef(null)
  const modeRef = useRef(mode)

  useEffect(() => { wonRef.current = won }, [won])

  /** Fetch a random article title via Wikipedia API. */
  const fetchRandomTitle = useCallback(async () => {
    try {
      const res = await fetch(`${WIKI_API}?action=query&list=random&rnnamespace=0&rnlimit=1&format=json&origin=*`)
      const data = await res.json()
      return data?.query?.random?.[0]?.title || 'Earth'
    } catch {
      return 'Earth'
    }
  }, [])

  const loadArticle = useCallback(async (title) => {
    setLoading(true)
    try {
      const url = `${WIKI_API}?action=parse&page=${encodeURIComponent(title)}&prop=text&formatversion=2&format=json&origin=*`
      const res = await fetch(url)
      const data = await res.json()
      if (data.error) {
        showToast(`Could not load "${title}"`, 'error')
        setLoading(false)
        return false
      }
      const clean = sanitizeHtml(data.parse.text)
      setHtml(clean)
      setCurrentArticle(data.parse.title)
      setLoading(false)
      return true
    } catch (err) {
      showToast('Failed to load article (network?)', 'error')
      setLoading(false)
      return false
    }
  }, [showToast])

  const startRace = useCallback(
    async (ch) => {
      setChallenge(ch)
      setClickCount(0)
      setHintsUsed(0)
      setElapsed(0)
      setWon(false)
      wonRef.current = false
      setResult(null)
      setHistory([ch.start])
      const ok = await loadArticle(ch.start)
      if (ok) {
        setStartTime(Date.now())
        // check if start == target edge case
        if (ch.start.toLowerCase() === ch.target.toLowerCase()) {
          setWon(true)
        }
      }
    },
    [loadArticle, showToast],
  )

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    const s = loadStats()
    setStats(s)
    const todayStr = new Date().toISOString().split('T')[0]
    if (s.lastPlayedDaily === todayStr) {
      modeRef.current = 'random'
      setMode('random')
      showToast('Daily race already done, switching to Random mode', 'info')
      const pool = difficultyFilter === 'all'
        ? CHALLENGES
        : CHALLENGES.filter((c) => c.difficulty === difficultyFilter)
      startRace(pool[Math.floor(Math.random() * pool.length)])
    } else {
      startRace(getDailyChallenge())
    }
  }, [startRace, showToast, difficultyFilter])

  // Timer
  useEffect(() => {
    if (!startTime || wonRef.current) return
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [startTime])

  const doSubmitScore = useCallback(
    async (score) => {
      try {
        const username = await new Promise((resolve) => setNamePrompt({ resolve }))
        if (!username) return
        await recordScore({
          gameType: 'wikipedia_race',
          gameMode: modeRef.current,
          playerName: username || getDisplayName(),
          score,
          timeTaken: resultRef.current?.seconds ?? null,
        })
        showToast(`Score submitted as "${username}"!`, 'success')
      } catch (err) {
        console.error('Error submitting score:', err)
        showToast('Could not submit score', 'error')
      }
    },
    [recordScore, showToast],
  )

  const checkWin = useCallback(
    (articleTitle) => {
      if (wonRef.current) return false
      const target = challenge.target.toLowerCase().replace(/_/g, ' ')
      const current = articleTitle.toLowerCase()
      if (current.includes(target) || target.includes(current)) {
        wonRef.current = true
        setWon(true)
        clearInterval(timerRef.current)
        const seconds = Math.floor((Date.now() - startTime) / 1000)
        const clicks = clickCount
        const hints = hintsUsed
        const score = Math.max(0, Math.round(1000 - clicks * CLICK_PENALTY - hints * HINT_PENALTY - seconds * TIME_PENALTY))

        const s = loadStats()
        s.racesPlayed += 1
        s.racesWon += 1
        s.totalClicks += clicks
        if (s.fewestClicks === null || clicks < s.fewestClicks) s.fewestClicks = clicks
        if (score > s.bestScore) s.bestScore = score
        if (modeRef.current === 'daily') s.lastPlayedDaily = new Date().toISOString().split('T')[0]
        saveStats(s)
        setStats(s)

        const res = { clicks, hints, seconds, score }
        resultRef.current = res
        setResult(res)
        doSubmitScore(score)
        return true
      }
      return false
    },
    [challenge, startTime, clickCount, hintsUsed, modeRef, doSubmitScore],
  )

  const navigateToArticle = useCallback(
    async (title) => {
      if (wonRef.current || loading) return
      const ok = await loadArticle(title)
      if (!ok) return
      const clicks = clickCount + 1
      setClickCount(clicks)
      setHistory((h) => [...h, title])
      checkWin(currentArticleRef.current || title)
    },
    [loadArticle, clickCount, checkWin, loading],
  )

  // keep latest article title in a ref for win check
  const currentArticleRef = useRef(null)
  useEffect(() => {
    currentArticleRef.current = currentArticle
    if (currentArticle && !wonRef.current) {
      checkWin(currentArticle)
    }
  }, [currentArticle, checkWin])

  // Click interception on article body
  useEffect(() => {
    const body = articleBodyRef.current
    if (!body) return
    const onClick = (e) => {
      const link = e.target.closest('a.wiki-link')
      if (!link) return
      e.preventDefault()
      const article = link.getAttribute('data-article')
      if (article) navigateToArticle(article)
    }
    body.addEventListener('click', onClick)
    return () => body.removeEventListener('click', onClick)
  }, [html, navigateToArticle])

  const showHintFn = useCallback(() => {
    setHintsUsed((h) => h + 1)
    setShowHint(true)
  }, [])

  const changeMode = useCallback(
    async (newMode) => {
      // Re-playing the same mode: in daily mode, fall back to random when
      // today's race is already finished (same rule as Wordle).
      if (newMode === modeRef.current) {
        if (newMode === 'daily' && loadStats().lastPlayedDaily === new Date().toISOString().split('T')[0]) {
          modeRef.current = 'random'
          setMode('random')
          showToast('Daily race already done, switching to Random mode', 'info')
          const pool = difficultyFilter === 'all'
            ? CHALLENGES
            : CHALLENGES.filter((c) => c.difficulty === difficultyFilter)
          startRace(pool[Math.floor(Math.random() * pool.length)])
        }
        return
      }
      setMode(newMode)
      modeRef.current = newMode
      if (newMode === 'daily') {
        startRace(getDailyChallenge())
      } else {
        // random: random start from a challenge, or fully random article
        const pool = difficultyFilter === 'all'
          ? CHALLENGES
          : CHALLENGES.filter((c) => c.difficulty === difficultyFilter)
        const ch = pool[Math.floor(Math.random() * pool.length)]
        startRace(ch)
      }
    },
    [startRace, difficultyFilter, showToast],
  )

  return (
    <GameShell
      title="Wikipedia Race"
      accent="var(--nb-green)"
      subtitle={`Get from "${challenge.start}" to "${challenge.target}" by clicking links`}
      wide
      controls={
        <>
          <button className={`mode-btn${mode === 'daily' ? ' active' : ''}`} onClick={() => changeMode('daily')}>
            Daily
          </button>
          <button className={`mode-btn${mode === 'random' ? ' active' : ''}`} onClick={() => changeMode('random')}>
            Random
          </button>
          <button className="icon-btn" title="How to play" onClick={() => setShowHelp(true)}>Help</button>
          <button className="icon-btn" title="Stats" onClick={() => setShowStats(true)}>Stats</button>
        </>
      }
    >
      {/* HUD */}
      <div className="game-info">
        <div className="info-item">
          <span className="info-label">Clicks</span>
          <span className="info-value" data-testid="wr-clicks">{clickCount}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Time</span>
          <span className="info-value" data-testid="wr-time">{elapsed}s</span>
        </div>
        <div className="info-item">
          <span className="info-label">Target</span>
          <span className="info-value">{challenge.target}</span>
        </div>
      </div>

      {/* Article viewer */}
      <div className="wr-article-frame">
        <div className="wr-article-header">
          <h2 className="wr-article-title" data-testid="wr-article-title">{currentArticle || 'Loading…'}</h2>
          <button className="btn btn-sm btn-outline" onClick={showHintFn} disabled={won}>
            Hint (−{HINT_PENALTY})
          </button>
        </div>
        {loading ? (
          <div className="wr-loading">Loading article…</div>
        ) : (
          <div
            className="wr-article-body"
            ref={articleBodyRef}
            data-testid="wr-article-body"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </div>

      {/* Trail */}
      {history.length > 1 && (
        <div className="wr-trail">
          <span className="wr-trail-label">Trail:</span>
          {history.map((h, i) => (
            <span key={i} className="wr-trail-step">
              {i > 0 && ' → '}
              {h}
            </span>
          ))}
        </div>
      )}

      {/* Help modal */}
      {showHelp && (
        <Modal title="How to Play" onClose={() => setShowHelp(false)}>
          <ul className="help-list">
            <li>Click links inside the article to move from the start page to the target page.</li>
            <li>Fewer clicks, no hints, and less time = a higher score.</li>
            <li>Score = 1000 − clicks×10 − hints×20 − seconds×0.1.</li>
            <li>Use a hint if you're stuck (it costs 20 points).</li>
          </ul>
        </Modal>
      )}

      {/* Hint modal */}
      {showHint && (
        <Modal title="Hint" onClose={() => setShowHint(false)}>
          <p>
            Think about what links <strong>{challenge.start}</strong> has to{' '}
            <strong>{challenge.target}</strong>. Common bridges: history, geography, science,
            and culture articles usually connect within 3–5 clicks.
          </p>
        </Modal>
      )}

      {/* Stats modal */}
      {showStats && (
        <Modal title="Your Statistics" onClose={() => setShowStats(false)}>
          <div className="stats-summary">
            <div className="stat-item">
              <span className="stat-value">{stats.racesPlayed}</span>
              <span className="stat-label">Races</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.racesWon}</span>
              <span className="stat-label">Wins</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.bestScore}</span>
              <span className="stat-label">Best Score</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.fewestClicks ?? '-'}</span>
              <span className="stat-label">Fewest Clicks</span>
            </div>
          </div>
        </Modal>
      )}

      {/* Result overlay */}
      {result && (
        <div className="game-result" data-testid="wr-result">
          <div className="result-content">
            <button className="result-close" onClick={() => setResult(null)}>×</button>
            <div className="result-title">You made it!</div>
            <div className="result-message">
              {challenge.start} → {challenge.target}
            </div>
            <div className="result-stats">
              <div className="result-stat">
                <span className="result-stat-value">{result.clicks}</span>
                <span className="result-stat-label">Clicks</span>
              </div>
              <div className="result-stat">
                <span className="result-stat-value">{result.seconds}s</span>
                <span className="result-stat-label">Time</span>
              </div>
              <div className="result-stat">
                <span className="result-stat-value">{result.score}</span>
                <span className="result-stat-label">Score</span>
              </div>
            </div>
            <div className="result-actions">
              <button className="btn btn-secondary" onClick={() => changeMode(mode)}>
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Name prompt for score submission */}
      {namePrompt && (
        <NamePrompt
          onDone={(name) => {
            namePrompt.resolve(name)
            setNamePrompt(null)
          }}
        />
      )}
    </GameShell>
  )
}
