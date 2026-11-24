import React from 'react'
import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import Home from './pages/Home'
import Games from './pages/Games'
import Tools from './pages/Tools'
import Events from './pages/Events'
import EventDetail from './pages/EventDetail'
import ComingSoon from './pages/ComingSoon'

import Wordle from './pages/games/Wordle'
import SpellingBee from './pages/games/SpellingBee'
import WordLadder from './pages/games/WordLadder'
import Trivia from './pages/games/Trivia'
import WikipediaRace from './pages/games/WikipediaRace'

import Dictionary from './pages/tools/Dictionary'
import Thesaurus from './pages/tools/Thesaurus'
import RhymeFinder from './pages/tools/RhymeFinder'

import Leaderboard from './pages/Leaderboard'
import VisitorLogbook from './pages/VisitorLogbook'
import Admin from './pages/Admin'

const TOOL_COMPONENTS = {
  dictionary: Dictionary,
  thesaurus: Thesaurus,
  'rhyme-finder': RhymeFinder,
}

function ToolRoute() {
  const { toolId } = useParams()
  const ToolComponent = TOOL_COMPONENTS[toolId]
  if (!ToolComponent) return <Navigate to="/tools" replace />
  return <ToolComponent />
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/games" element={<Games />} />
      <Route path="/tools" element={<Tools />} />
      <Route path="/events" element={<Events />} />
      <Route path="/events/:id" element={<EventDetail />} />
      <Route path="/leaderboard" element={<Leaderboard />} />
      <Route path="/logbook" element={<VisitorLogbook />} />

      {/* Games */}
      <Route path="/wordle" element={<Wordle />} />
      <Route path="/spelling-bee" element={<SpellingBee />} />
      <Route path="/word-ladder" element={<WordLadder />} />
      <Route path="/trivia" element={<Trivia />} />
      <Route path="/wikipedia-race" element={<WikipediaRace />} />

      {/* Tools (direct paths) */}
      <Route path="/dictionary" element={<Dictionary />} />
      <Route path="/thesaurus" element={<Thesaurus />} />
      <Route path="/rhyme-finder" element={<RhymeFinder />} />

      {/* Tools (via /tools/:toolId links from the Tools page) */}
      <Route path="/tools/:toolId" element={<ToolRoute />} />

      {/* Placeholder pages */}
      <Route path="/coming-soon" element={<ComingSoon />} />
      <Route path="/faculty" element={<ComingSoon />} />

      {/* Admin (Supabase Auth) */}
      <Route path="/admin" element={<Admin />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}