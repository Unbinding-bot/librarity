import React, { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext()

// Dark palette is being reworked — light is forced for everyone (the toggle
// is hidden in Navbar.jsx). Flip this to true to restore toggle + persistence.
const DARK_MODE_ENABLED = false

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    if (!DARK_MODE_ENABLED) {
      setTheme('light')
      return
    }
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      setTheme(savedTheme)
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark')
    }
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    if (DARK_MODE_ENABLED) {
      localStorage.setItem('theme', theme)
    }
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

export default ThemeProvider