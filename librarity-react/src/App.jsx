import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import { GameStateProvider } from './contexts/GameStateContext'
import Navbar from './components/ui/Navbar'
import Footer from './components/ui/Footer'
import AppRouter from './router'

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <GameStateProvider>
          <BrowserRouter basename="/librarity-react">
            <div className="app-wrapper">
              <Navbar />
              <main id="main-content">
                <AppRouter />
              </main>
              <Footer />
            </div>
          </BrowserRouter>
        </GameStateProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}
