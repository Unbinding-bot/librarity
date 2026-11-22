import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import Navbar from './components/ui/Navbar'
import Footer from './components/ui/Footer'
import ThemeProvider from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import { GameStateProvider } from './contexts/GameStateContext'
import AppRouter from './router'
import usePageMeta from './pages/usePageMeta'

export default function App() {
  // Per-route meta: title, description, og:image — updated on every navigation.
  usePageMeta()
  return (
    <ThemeProvider>
      <ToastProvider>
        <GameStateProvider>
          <BrowserRouter basename="/librarity">
            <Navbar />
            <main id="main-content" className="main-content">
              <AppRouter />
            </main>
            <Footer />
          </BrowserRouter>
        </GameStateProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}