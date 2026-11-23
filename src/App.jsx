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
  return (
    <ThemeProvider>
      <ToastProvider>
        <GameStateProvider>
          {/* basename derives from the Vite base (set via BASE_PATH in
              vite.config.js): /librarity on GitHub Pages, /library on
              Vercel. import.meta.env.BASE_URL always carries the live value. */}
          <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Meta />
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

// Per-route meta: title, description, og:image — updated on every navigation.
// Renders INSIDE <BrowserRouter> because usePageMeta() calls useLocation().
function Meta() {
  usePageMeta()
  return null
}