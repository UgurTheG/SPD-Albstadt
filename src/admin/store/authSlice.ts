import type { StateCreator } from 'zustand'
import type { AdminState } from './index'
import type { GHUser } from '../types'
import { AuthError, validateToken } from '../lib/github'
import { DRAFT_KEY, PENDING_KEY, resetPersistenceState } from './persistence'

// ─── Slice interface ───────────────────────────────────────────────────────────

export interface AuthSlice {
  token: string
  tokenExpiresAt: number
  user: GHUser | null
  loginError: string
  loginLoading: boolean
  loginAuthStatus: number | null

  login: () => Promise<void>
  tryAutoLogin: () => Promise<void>
  logout: () => void
  ensureFreshToken: () => Promise<string>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Fetch the current access token from the server-side HttpOnly cookie via the session endpoint. */
async function fetchSession(): Promise<{ access_token: string | null; expires_at: number }> {
  const res = await fetch('/api/auth/session', { credentials: 'include' })
  if (!res.ok) return { access_token: null, expires_at: 0 }
  const data = await res.json()
  return data ?? { access_token: null, expires_at: 0 }
}

// ─── Slice creator ────────────────────────────────────────────────────────────

export const createAuthSlice: StateCreator<AdminState, [], [], AuthSlice> = (set, get) => ({
  token: '',
  tokenExpiresAt: 0,
  user: null,
  loginError: '',
  loginLoading: false,
  loginAuthStatus: null,

  login: async () => {
    set({ loginLoading: true, loginError: '', loginAuthStatus: null })
    try {
      const session = await fetchSession()
      if (!session.access_token) {
        set({ loginError: 'Keine gültige Sitzung gefunden.', loginLoading: false })
        return
      }
      const token = session.access_token
      const expiresAt = session.expires_at
      const user = await validateToken(token)
      set({
        token,
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
    let session: { access_token: string | null; expires_at: number }
    try {
      session = await fetchSession()
    } catch {
      return // Network error — don't invalidate
    }
    if (!session.access_token) return

    const token = session.access_token
    const expiresAt = session.expires_at

    // Check if token needs refreshing
    if (expiresAt && Date.now() > expiresAt - 5 * 60 * 1000) {
      try {
        const freshToken = await get().ensureFreshToken()
        set({ token: freshToken })
      } catch {
        return
      }
    } else {
      set({ token, tokenExpiresAt: expiresAt })
    }

    const currentToken = get().token
    if (!currentToken) return

    let user: GHUser
    try {
      user = (await validateToken(currentToken)) as GHUser
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
      token: '',
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
    })
  },

  ensureFreshToken: async () => {
    const { token, tokenExpiresAt } = get()
    // No expiry info (classic OAuth token) — use as-is
    if (!tokenExpiresAt) return token
    // Valid for more than 5 minutes — use as-is
    if (Date.now() < tokenExpiresAt - 5 * 60 * 1000) return token
    // Need to refresh via server (refresh token is in HttpOnly cookie)
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    if (!res.ok) {
      get().logout()
      throw new AuthError('Sitzung abgelaufen — bitte neu anmelden.', 401)
    }
    const data = (await res.json()) as {
      access_token: string
      expires_in?: number
    }
    const newToken = data.access_token
    const newExpiresAt = data.expires_in ? Date.now() + data.expires_in * 1000 : 0
    set({
      token: newToken,
      tokenExpiresAt: newExpiresAt,
    })
    return newToken
  },
})
