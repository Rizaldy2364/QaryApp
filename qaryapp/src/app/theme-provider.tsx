import {
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import { useSettings } from '../features/settings/useSettings'
import type { ThemeMode } from '../types'
import { ThemeContext } from './theme-context'

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function updateThemeColorMeta() {
  if (typeof document === 'undefined') return
  const meta = document.getElementById('theme-color-meta')
  if (meta) {
    const bg = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-bg')
      .trim()
    if (bg) {
      meta.setAttribute('content', bg)
    }
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { settings, updateSettings } = useSettings()
  const theme = settings.theme

  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() =>
    getSystemTheme(),
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const resolvedTheme = useMemo<'light' | 'dark'>(() => {
    return theme === 'system' ? systemTheme : theme
  }, [theme, systemTheme])

  useEffect(() => {
    const root = document.documentElement
    if (resolvedTheme === 'dark') {
      root.classList.add('dark')
      root.style.colorScheme = 'dark'
    } else {
      root.classList.remove('dark')
      root.style.colorScheme = 'light'
    }
    updateThemeColorMeta()
  }, [resolvedTheme])

  const setTheme = useCallback(
    (newTheme: ThemeMode) => {
      updateSettings({ theme: newTheme })
    },
    [updateSettings],
  )

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
    }),
    [theme, resolvedTheme, setTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
