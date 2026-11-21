import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

import Home from './pages/Home'
import Games from './pages/Games'
import Tools from './pages/Tools'
import Leaderboard from './pages/Leaderboard'
import ComingSoon, { Faculty, Admin } from './pages/ComingSoon'
import Wordle from './pages/games/Wordle'
import SpellingBee from './pages/games/SpellingBee'
import WordLadder from './pages/games/WordLadder'
import Trivia from './pages/games/Trivia'
import Flashcards from './pages/games/Flashcards'
import WikipediaRace from './pages/games/WikipediaRace'
import Dictionary from './pages/tools/Dictionary'
import Thesaurus from './pages/tools/Thesaurus'
import RhymeFinder from './pages/tools/RhymeFinder'

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/games" element={<Games />} />
      <Route path="/wordle" element={<Wordle />} />
      <Route path="/spelling-bee" element={<SpellingBee />} />
      <Route path="/word-ladder" element={<WordLadder />} />
      <Route path="/trivia" element={<Trivia />} />
      <Route path="/flashcards" element={<Flashcards />} />
      <Route path="/wikipedia-race" element={<WikipediaRace />} />
      <Route path="/tools" element={<Tools />} />
      <Route path="/tools/dictionary" element={<Dictionary />} />
      <Route path="/tools/thesaurus" element={<Thesaurus />} />
      <Route path="/tools/rhyme-finder" element={<RhymeFinder />} />
      <Route path="/leaderboard" element={<Leaderboard />} />
      <Route path="/coming-soon" element={<ComingSoon />} />
      <Route path="/faculty" element={<Faculty />} />
      <Route path="/admin" element={<Admin />} />

      {/* Old .html URLs → new SPA routes */}
      <Route path="/index.html" element={<Navigate to="/" replace />} />
      <Route path="/wordle.html" element={<Navigate to="/wordle" replace />} />
      <Route path="/spelling-bee.html" element={<Navigate to="/spelling-bee" replace />} />
      <Route path="/word-ladder.html" element={<Navigate to="/word-ladder" replace />} />
      <Route path="/trivia.html" element={<Navigate to="/trivia" replace />} />
      <Route path="/flashcards.html" element={<Navigate to="/flashcards" replace />} />
      <Route path="/wikipedia-race.html" element={<Navigate to="/wikipedia-race" replace />} />
      <Route path="/tools.html" element={<Navigate to="/tools" replace />} />
      <Route path="/dictionary.html" element={<Navigate to="/tools/dictionary" replace />} />
      <Route path="/leaderboard.html" element={<Navigate to="/leaderboard" replace />} />
      <Route path="/coming-soon.html" element={<Navigate to="/coming-soon" replace />} />
      <Route path="/faculty-door.html" element={<Navigate to="/faculty" replace />} />
      <Route path="/admin.html" element={<Navigate to="/admin" replace />} />

      {/* Catch-all → home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
