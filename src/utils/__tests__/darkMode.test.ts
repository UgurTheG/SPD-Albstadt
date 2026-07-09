import { describe, it, expect, beforeEach } from 'vitest'
import { DARK_MODE_STORAGE_KEY, readDarkModePreference } from '../darkMode'

describe('readDarkModePreference', () => {
  beforeEach(() => localStorage.clear())

  it('returns true when the stored preference is "true"', () => {
    localStorage.setItem(DARK_MODE_STORAGE_KEY, 'true')
    expect(readDarkModePreference()).toBe(true)
  })

  it('returns false when the stored preference is "false"', () => {
    localStorage.setItem(DARK_MODE_STORAGE_KEY, 'false')
    expect(readDarkModePreference()).toBe(false)
  })

  it('falls back to prefers-color-scheme when nothing is stored', () => {
    // The global test setup stubs matchMedia with matches: false
    expect(readDarkModePreference()).toBe(false)
  })
})
