import { useCallback, useEffect, useState } from 'react'
import { DARK_MODE_STORAGE_KEY, readDarkModePreference } from '@/utils/darkMode'

/**
 * Single source of truth for dark-mode on the public site.
 * Reads/writes the same localStorage key (`spd-darkmode`) that the admin
 * store uses, so switching between the two keeps the preference in sync.
 */
export function useDarkMode() {
  const [darkMode, setDarkMode] = useState(readDarkModePreference)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem(DARK_MODE_STORAGE_KEY, String(darkMode))
  }, [darkMode])

  const toggleDarkMode = useCallback(() => setDarkMode(prev => !prev), [])

  return { darkMode, toggleDarkMode } as const
}
