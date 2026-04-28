import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'spd-darkmode'

function readPreference(): boolean {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'true') return true
  if (saved === 'false') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/**
 * Single source of truth for dark-mode on the public site.
 * Reads/writes the same localStorage key (`spd-darkmode`) that the admin
 * store uses, so switching between the two keeps the preference in sync.
 */
export function useDarkMode() {
  const [darkMode, setDarkMode] = useState(readPreference)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem(STORAGE_KEY, String(darkMode))
  }, [darkMode])

  const toggleDarkMode = useCallback(() => setDarkMode(prev => !prev), [])

  return { darkMode, toggleDarkMode } as const
}
