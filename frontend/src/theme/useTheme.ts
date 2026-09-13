import { useCallback, useEffect, useState } from 'react'

export type Theme = 'dark' | 'light'

export const THEME_KEY = 'corama_theme'

export function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('light', theme === 'light')
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme)

  useEffect(() => {
    const onChange = (e: CustomEvent<{ theme: Theme }>) => setThemeState(e.detail.theme)
    window.addEventListener('themeChanged', onChange as EventListener)
    return () => window.removeEventListener('themeChanged', onChange as EventListener)
  }, [])

  const setTheme = useCallback((next: Theme) => {
    localStorage.setItem(THEME_KEY, next)
    applyTheme(next)
    setThemeState(next)
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: next } }))
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }, [theme, setTheme])

  return { theme, setTheme, toggleTheme }
}
