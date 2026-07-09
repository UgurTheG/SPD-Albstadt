/**
 * Shared dark-mode preference storage. The key is read by both the public
 * site (useDarkMode) and the admin store (uiSlice) — do not change it, that
 * would reset every user's preference.
 */
export const DARK_MODE_STORAGE_KEY = 'spd-darkmode'

export function readDarkModePreference(): boolean {
  const saved = localStorage.getItem(DARK_MODE_STORAGE_KEY)
  if (saved === 'true') return true
  if (saved === 'false') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}
