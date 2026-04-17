import { useCallback, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

function resolveInitialTheme(): Theme {
  const stored = localStorage.getItem('theme') as Theme | null
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

// Called once before React renders to prevent flash of wrong theme
export function initTheme() {
  applyTheme(resolveInitialTheme())
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(resolveInitialTheme)

  useEffect(() => {
    applyTheme(theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggle = useCallback(() => {
    setThemeState(t => (t === 'light' ? 'dark' : 'light'))
  }, [])

  return { theme, toggle }
}
