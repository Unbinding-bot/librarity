import React, { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext()

const THEMES = {
  light: {
    name: 'Light',
    primary: '#5C6B3A',
    secondary: '#8A9A5B',
    accent: '#B5C08A',
    background: '#FDFAF4',
    surface: '#FDFAF4',
    text: '#1E1C14',
    textSecondary: '#5A5340',
    border: '#C8B99A',
    shadow: 'rgba(92, 107, 58, 0.15)',
  },
  dark: {
    name: 'Dark',
    primary: '#8A9A5B',
    secondary: '#B5C08A',
    accent: '#CDD9A0',
    background: '#1A1A12',
    surface: '#23221A',
    text: '#EDE8DA',
    textSecondary: '#B0A88E',
    border: '#3A3628',
    shadow: 'rgba(0, 0, 0, 0.5)',
  },
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('library-theme')
    return (saved === 'dark' || saved === 'light') ? saved : 'light'
  })

  useEffect(() => {
    localStorage.setItem('library-theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
    document.body.setAttribute('data-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(t => (t === 'light' ? 'dark' : 'light'))
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
