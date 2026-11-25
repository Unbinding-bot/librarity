// Convert the OpenTriviaQA dataset (https://github.com/uberspot/OpenTriviaQA, CC BY-SA 4.0)
// into the app's trivia-questions.json schema:
//   { category, difficulty, question, answers: [exactly 4], correct }  where correct ∈ answers
//
// Usage: node scripts/convert-trivia.mjs <dataset-categories-dir> [out-json]
//
// Dataset format per file (one file per source category, extended-ASCII/UTF-8 mix):
//   #Q question text (may span continuation lines without a marker prefix)
//   ^ correct answer
//   A option 1
//   B option 2
//   ... (A..Z, usually A-D; the correct answer also appears among the options)

import fs from 'node:fs'
import path from 'node:path'

const datasetDir = process.argv[2]
const outFile = process.argv[3] || 'src/assets/trivia-questions.json'

if (!datasetDir || !fs.existsSync(datasetDir)) {
  console.error('Usage: node scripts/convert-trivia.mjs <dataset-categories-dir> [out-json]')
  process.exit(1)
}

// Dataset source file(s) -> app category id. "rated" and "newest" are
// overlapping dumps of other categories, so they are intentionally skipped.
const SOURCE_MAP = [
  { app: 'history', files: ['history'] },
  { app: 'geography', files: ['geography', 'world'] },
  { app: 'science', files: ['science-technology'] },
  { app: 'literature', files: ['literature'] },
  { app: 'arts', files: ['movies', 'music', 'television', 'celebrities', 'entertainment', 'video-games', 'humanities'] },
  { app: 'general', files: ['general', 'brain-teasers', 'for-kids', 'animals', 'hobbies', 'sports', 'religion-faith', 'people'] },
]

const CAP_PER_CATEGORY = 60

// ---------- decoding: UTF-8 per line, Windows-1252 fallback ----------

// Decode a potentially mixed-encoding string: try UTF-8, fall back to Windows-1252.
// This handles files that have both encodings in different parts.
function decodeLine(str) {
  // Strip NUL bytes and CR - they're encoding artifacts
  return str.replace(/\0/g, '').replace(/\r/g, '').replace(/[\x00-\x08\x0B\x0C\x1F\x7F]/g, '')
}

// ---------- normalization ----------

const CONTROL_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g

function clean(s) {
  return s.replace(CONTROL_RE, '').replace(/\s+/g, ' ').trim()
}

function normKey(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

// A distractor that is contained in the correct answer (or vice versa) gives
// the answer away ("Staff Sgt. Sean D" vs "Staff Sgt. Sean Dignam"). Guard
// with a min length so short numerals ("1" vs "18") don't trip it.
function isGiveaway(d, correct) {
  const nd = normKey(d)
  const nc = normKey(correct)
  if (nd.length < 5 || nc.length < 5) return false
  return nc.includes(nd) || nd.includes(nc)
}

// The dataset has no difficulty ratings; approximate from shape: short
// single-sentence recall questions are easy, long multi-sentence ones hard.
function difficultyFor(q) {
  const sentences = (q.match(/[.!?](\s|$)/g) || []).length
  if (q.length <= 60 && sentences <= 1) return 'easy'
  if (q.length > 140 || sentences >= 3) return 'hard'
  return 'medium'
}

// ---------- parsing ----------

function parseFile(filePath) {
  const raw = fs.readFileSync(filePath, 'latin1')  // use latin1 to preserve extended chars
  const lines = raw.split('\n').map(decodeLine)
  const questions = []
  let cur = null
  const startBlock = (text) => {
    if (cur && cur.q) questions.push(cur)
    cur = { q: clean(text), correct: '', options: [] }
  }
  for (const line of lines) {
    if (!line || !line.trim()) continue
    const t = line.trim()
    if (t.startsWith('#Q ')) { startBlock(t.slice(3)); continue }
    if (!cur) continue
    if (t.startsWith('^ ')) { cur.correct = clean(t.slice(2)); continue }
    const m = t.match(/^([A-Z]) (.+)$/)
    if (m && cur.correct === '') {
      // options may precede the ^ marker in malformed entries; still an option
      cur.options.push(clean(m[2])); continue
    }
    if (m) { cur.options.push(clean(m[2])); continue }
    // continuation line: part of the question until ^ appears, else part of last option
    if (!cur.correct) cur.q = clean(cur.q + ' ' + t)
    else if (cur.options.length) cur.options[cur.options.length - 1] = clean(cur.options[cur.options.length - 1] + ' ' + t)
  }
  if (cur && cur.q) questions.push(cur)
  return questions
}

function convert(entry) {
  const q = entry.q
  if (q.length < 10 || q.length > 400) return null
  if (!entry.correct || entry.correct.length < 1 || entry.correct.length > 120) return null
  // drop options that are empty/too short, then dedupe (case-insensitive)
  const seen = new Set([normKey(entry.correct)])
  const distractors = []
  for (const opt of entry.options) {
    if (opt.length < 2 || opt.length > 120) continue
    const k = normKey(opt)
    if (!k || seen.has(k)) continue
    if (isGiveaway(opt, entry.correct)) continue
    seen.add(k)
    distractors.push(opt)
  }
  if (distractors.length < 3) return null
  return {
    category: '',
    difficulty: difficultyFor(q),
    question: q,
    answers: [entry.correct, distractors[0], distractors[1], distractors[2]],
    correct: entry.correct,
  }
}

// ---------- main ----------

const existingPath = path.resolve(process.cwd(), outFile)
const existing = JSON.parse(fs.readFileSync(existingPath, 'utf8'))
const seenQuestions = new Set(existing.map((e) => normKey(e.question)))

const merged = [...existing]
const stats = { perApp: {}, perSource: {}, dropped: 0 }

for (const group of SOURCE_MAP) {
  let taken = 0
  const perSourceThis = {}
  // round-robin across the source files so the sample spreads over them
  const parsed = group.files.map((f) => {
    const p = path.join(datasetDir, f)
    const list = fs.existsSync(p) ? parseFile(p) : []
    stats.perSource[f] = list.length
    return list
  })
  let exhausted = false
  while (taken < CAP_PER_CATEGORY && !exhausted) {
    exhausted = true
    for (let fi = 0; fi < parsed.length && taken < CAP_PER_CATEGORY; fi++) {
      const list = parsed[fi]
      if (!list.length) continue
      exhausted = false
      const entry = list.shift()
      const converted = convert(entry)
      if (!converted) { stats.dropped++; continue }
      const key = normKey(converted.question)
      if (seenQuestions.has(key)) { stats.dropped++; continue }
      seenQuestions.add(key)
      converted.category = group.app
      merged.push(converted)
      taken++
      perSourceThis[group.files[fi]] = (perSourceThis[group.files[fi]] || 0) + 1
    }
  }
  stats.perApp[group.app] = { added: taken, from: perSourceThis }
}

fs.writeFileSync(existingPath, JSON.stringify(merged, null, 1) + '\n')

// ---------- report ----------
console.log(`existing: ${existing.length}`)
for (const [app, info] of Object.entries(stats.perApp)) {
  console.log(`${app}: +${info.added}  (${JSON.stringify(info.from)})`)
}
console.log(`dropped/unusable/duplicate: ${stats.dropped}`)
console.log(`total: ${merged.length}`)
const diff = {}
merged.forEach((e) => { diff[e.difficulty] = (diff[e.difficulty] || 0) + 1 })
console.log('difficulties:', diff)
const cats = {}
merged.forEach((e) => { cats[e.category] = (cats[e.category] || 0) + 1 })
console.log('categories:', cats)
