import type { StateCreator } from 'zustand'
import type { AdminState } from './index'
import { readDarkModePreference, DARK_MODE_STORAGE_KEY } from '../../utils/readDarkModePreference'

// ─── Slice interface ───────────────────────────────────────────────────────────

export interface UISlice {
  darkMode: boolean
  statusMessage: string
  statusType: 'info' | 'success' | 'error'
  statusCounter: number
  toggleDark: () => void
  setStatus: (msg: string, type: 'info' | 'success' | 'error') => void
}

// ─── Slice creator ────────────────────────────────────────────────────────────

export const createUISlice: StateCreator<AdminState, [], [], UISlice> = set => ({
  darkMode: readDarkModePreference(),
  statusMessage: '',
  statusType: 'info',
  statusCounter: 0,

  toggleDark: () => {
    set(prev => {
      const next = !prev.darkMode
      localStorage.setItem(DARK_MODE_STORAGE_KEY, String(next))
      // DOM sync (document.documentElement.classList) is handled by the
      // useEffect in AdminApp — keeping side-effects out of store actions.
      return { darkMode: next }
    })
  },

  setStatus: (msg, type) =>
    set(prev => ({ statusMessage: msg, statusType: type, statusCounter: prev.statusCounter + 1 })),
})
