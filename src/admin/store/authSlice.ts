import type { StateCreator } from 'zustand'
import type { AdminState } from './index'
import type { GHUser } from '../types'
import { AuthError, validateToken } from '../lib/github'
import { DRAFT_KEY, PENDING_KEY, resetPersistenceState } from './persistence'

// ─── Slice interface ───────────────────────────────────────────────────────────

export interface AuthSlice {
  authenticated: boolean
  tokenExpiresAt: number
  user: GHUser | null
  loginError: string
  loginLoading: boolean
  loginAuthStatus: number | null

  login: () => Promise<void>
  tryAutoLogin: () => Promise<void>
  logout: () => void
  ensureAuthenticated: () => Promise<void>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Check whether a valid auth session cookie exists (without exposing the token). */
async function fetchSession(): Promise<{ authenticated: boolean; expires_at: number }> {
  const res = await fetch('/api/auth/session', { credentials: 'include' })
  if (!res.ok) return { authenticated: false, expires_at: 0 }
  const data = await res.json()
  return data ?? { authenticated: false, expires_at: 0 }
}

// ─── Slice creator ────────────────────────────────────────────────────────────

export const createAuthSlice: StateCreator<AdminState, [], [], AuthSlice> = (set, get) => ({
  authenticated: false,
  tokenExpiresAt: 0,
  user: null,
  loginError: '',
  loginLoading: false,
  loginAuthStatus: null,

  login: async () => {
    set({ loginLoading: true, loginError: '', loginAuthStatus: null })
    try {
      const session = await fetchSession()
      if (!session.authenticated) {
        set({ loginError: 'Keine gültige Sitzung gefunden.', loginLoading: false })
        return
      }
      const expiresAt = session.expires_at
      const user = await validateToken()
      set({
        authenticated: true,
        tokenExpiresAt: expiresAt,
        user: user as GHUser,
        loginLoading: false,
      })
      await get().loadData()
    } catch (e) {
      if (e instanceof AuthError) {
        set({ loginError: (e as Error).message, loginLoading: false, loginAuthStatus: e.status })
      } else {
        set({ loginError: (e as Error).message, loginLoading: false })
      }
    }
  },

  tryAutoLogin: async () => {
    // Try to recover session from HttpOnly cookies
    let session: { authenticated: boolean; expires_at: number }
    try {
      session = await fetchSession()
    } catch {
      return // Network error — don't invalidate
    }
    if (!session.authenticated) return

    const expiresAt = session.expires_at

    // Hydrate the store with the session state before checking freshness
    // so ensureAuthenticated can read the correct expiry from the store.
    set({ authenticated: true, tokenExpiresAt: expiresAt })

    // Check if token needs refreshing
    if (expiresAt && Date.now() > expiresAt - 5 * 60 * 1000) {
      try {
        await get().ensureAuthenticated()
      } catch {
        return
      }
    }

    let user: GHUser
    try {
      user = (await validateToken()) as GHUser
    } catch (e) {
      if (e instanceof AuthError) {
        get().logout()
      }
      return
    }
    set({ user })
    try {
      await get().loadData()
    } catch {
      /* ignore — UI will remain in loading state */
    }
  },

  logout: () => {
    // Cancel any pending debounced persistence and reset module-level counters
    resetPersistenceState()

    localStorage.removeItem(DRAFT_KEY)
    localStorage.removeItem(PENDING_KEY)

    // Clear server-side HttpOnly cookies
    void fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })

    set({
      authenticated: false,
      tokenExpiresAt: 0,
      user: null,
      // Reset editor state
      state: {},
      originalState: {},
      dataLoaded: false,
      dataLoadErrors: [],
      pendingUploads: [],
      undoStacks: {},
      redoStacks: {},
      baseCommitSha: '',
    })
  },

  ensureAuthenticated: async () => {
    const { tokenExpiresAt } = get()
    // No expiry info — assume still valid
    if (!tokenExpiresAt) return
    // Valid for more than 5 minutes — nothing to do
    if (Date.now() < tokenExpiresAt - 5 * 60 * 1000) return
    // Need to refresh via server (refresh token is in HttpOnly cookie)
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    })
    if (!res.ok) {
      get().logout()
      throw new AuthError('Sitzung abgelaufen — bitte neu anmelden.', 401)
    }
    const data = (await res.json()) as {
      ok: boolean
      expires_in?: number
    }
    // Fetch updated session to get new expiry
    const session = await fetchSession()
    const newExpiresAt = data.expires_in ? Date.now() + data.expires_in * 1000 : session.expires_at
    set({
      authenticated: true,
      tokenExpiresAt: newExpiresAt,
    })
  },
})
