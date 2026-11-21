import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import Navbar from './components/ui/Navbar'
import Footer from './components/ui/Footer'
import ThemeProvider from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import { GameStateProvider } from './contexts/GameStateContext'
import AppRouter from './router'

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <GameStateProvider>
          <BrowserRouter basename="/librarity-react">
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