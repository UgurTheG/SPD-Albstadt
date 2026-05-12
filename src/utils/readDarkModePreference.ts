export const DARK_MODE_STORAGE_KEY = 'spd-darkmode'
const STORAGE_KEY = DARK_MODE_STORAGE_KEY

/** Reads the persisted dark-mode preference, falling back to the OS setting. */
export function readDarkModePreference(): boolean {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'true') return true
  if (saved === 'false') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}
