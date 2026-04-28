import type { StateCreator } from 'zustand'
import type { AdminState } from './index'
import type { GHUser } from '../types'
import { AuthError, validateToken } from '../lib/github'
import { DRAFT_KEY, PENDING_KEY, resetPersistenceState } from './persistence'

// ─── Slice interface ───────────────────────────────────────────────────────────

export interface LoginTokenData {
  token: string
  expiresAt?: number
  refreshToken?: string
  refreshTokenExpiresAt?: number
}

export interface AuthSlice {
  token: string
  tokenExpiresAt: number
  refreshToken: string
  refreshTokenExpiresAt: number
  user: GHUser | null
  loginError: string
  loginLoading: boolean
  loginAuthStatus: number | null

  login: (data: LoginTokenData) => Promise<void>
  tryAutoLogin: () => Promise<void>
  logout: () => void
  ensureFreshToken: () => Promise<string>
}

// ─── Storage keys ─────────────────────────────────────────────────────────────

const TOKEN_KEY = 'spd-admin-token'
const TOKEN_EXP_KEY = 'spd-admin-token-exp'
const REFRESH_TOKEN_KEY = 'spd-admin-refresh'
const REFRESH_EXP_KEY = 'spd-admin-refresh-exp'

// ─── Slice creator ────────────────────────────────────────────────────────────

export const createAuthSlice: StateCreator<AdminState, [], [], AuthSlice> = (set, get) => ({
  token: localStorage.getItem(TOKEN_KEY) || '',
  tokenExpiresAt: Number(localStorage.getItem(TOKEN_EXP_KEY) || 0),
  refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY) || '',
  refreshTokenExpiresAt: Number(localStorage.getItem(REFRESH_EXP_KEY) || 0),
  user: null,
  loginError: '',
  loginLoading: false,
  loginAuthStatus: null,

  login: async ({
    token,
    expiresAt = 0,
    refreshToken = '',
    refreshTokenExpiresAt = 0,
  }: LoginTokenData) => {
    set({ loginLoading: true, loginError: '', loginAuthStatus: null })
    try {
      const user = await validateToken(token)
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(TOKEN_EXP_KEY, String(expiresAt))
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
      localStorage.setItem(REFRESH_EXP_KEY, String(refreshTokenExpiresAt))
      set({
        token,
        tokenExpiresAt: expiresAt,
        refreshToken,
        refreshTokenExpiresAt,
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
    const token = get().token
    if (!token) return
    let freshToken: string
    try {
      freshToken = await get().ensureFreshToken()
    } catch {
      // ensureFreshToken already cleared state on expiry
      return
    }
    let user: GHUser
    try {
      user = (await validateToken(freshToken)) as GHUser
    } catch (e) {
      // Only invalidate the session for definitive auth failures.
      // Network errors (TypeError) or server errors leave the token intact
      // so a transient outage does not log the user out permanently.
      if (e instanceof AuthError) {
        get().logout()
      }
      return
    }
    set({ user })
    // Data load is best-effort: a transient network failure should not
    // invalidate a valid session. The editor will show a loading state
    // and the user can refresh manually.
    try {
      await get().loadData()
    } catch {
      /* ignore — UI will remain in loading state */
    }
  },

  logout: () => {
    // Cancel any pending debounced persistence and reset module-level counters
    resetPersistenceState()

    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(TOKEN_EXP_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(REFRESH_EXP_KEY)
    localStorage.removeItem(DRAFT_KEY)
    localStorage.removeItem(PENDING_KEY)

    set({
      token: '',
      tokenExpiresAt: 0,
      refreshToken: '',
      refreshTokenExpiresAt: 0,
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
    const { token, tokenExpiresAt, refreshToken, refreshTokenExpiresAt } = get()
    // No expiry info (classic OAuth token) — use as-is
    if (!tokenExpiresAt) return token
    // Valid for more than 5 minutes — use as-is
    if (Date.now() < tokenExpiresAt - 5 * 60 * 1000) return token
    // Need to refresh — check we have a non-expired refresh token
    if (!refreshToken || (refreshTokenExpiresAt && Date.now() > refreshTokenExpiresAt)) {
      get().logout()
      throw new AuthError('Sitzung abgelaufen — bitte neu anmelden.', 401)
    }
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
    if (!res.ok) {
      get().logout()
      throw new AuthError('Sitzung abgelaufen — bitte neu anmelden.', 401)
    }
    const data = (await res.json()) as {
      access_token: string
      expires_in?: number
      refresh_token?: string
      refresh_token_expires_in?: number
    }
    const newToken = data.access_token
    const newExpiresAt = data.expires_in ? Date.now() + data.expires_in * 1000 : 0
    const newRefreshToken = data.refresh_token ?? refreshToken
    const newRefreshTokenExpiresAt = data.refresh_token_expires_in
      ? Date.now() + data.refresh_token_expires_in * 1000
      : refreshTokenExpiresAt
    localStorage.setItem(TOKEN_KEY, newToken)
    localStorage.setItem(TOKEN_EXP_KEY, String(newExpiresAt))
    localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken)
    localStorage.setItem(REFRESH_EXP_KEY, String(newRefreshTokenExpiresAt))
    set({
      token: newToken,
      tokenExpiresAt: newExpiresAt,
      refreshToken: newRefreshToken,
      refreshTokenExpiresAt: newRefreshTokenExpiresAt,
    })
    return newToken
  },
})
