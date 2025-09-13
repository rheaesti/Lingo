import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false)
  
  // Force light mode on component mount - ignore system preferences
  if (typeof window !== 'undefined') {
    document.documentElement.classList.remove('dark')
    localStorage.setItem('darkMode', 'false')
    
    // Override any system preference detection
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      // Force light mode even if system prefers dark
      mediaQuery.addEventListener('change', () => {
        document.documentElement.classList.remove('dark')
        localStorage.setItem('darkMode', 'false')
      })
    }
  }

  useEffect(() => {
    // Always force light mode regardless of system preference
    localStorage.setItem('darkMode', 'false')
    setIsDarkMode(false)
    document.documentElement.classList.remove('dark')
    
    // Force remove dark class multiple times to ensure it's removed
    setTimeout(() => {
      document.documentElement.classList.remove('dark')
    }, 100)
    
    // Additional enforcement after a longer delay
    setTimeout(() => {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('darkMode', 'false')
    }, 500)
  }, [])

  useEffect(() => {
    // Save theme to localStorage whenever it changes
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode))
    
    // Apply theme to document
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
  }

  const value = {
    isDarkMode,
    toggleDarkMode
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}
