import type { StateCreator } from 'zustand'
import type { AdminState } from './index'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PresenceUser {
  login: string
  avatar_url: string
  /** The tab the user is currently viewing */
  activeTab: string
  /** The tabs that have unsaved changes (locally "locked") */
  dirtyTabs: string[]
  lastSeen: number
}

// ─── Slice interface ───────────────────────────────────────────────────────────

export interface PresenceSlice {
  /** Other users currently active in the admin panel */
  presenceUsers: PresenceUser[]
  /** True when the remote branch SHA has advanced past our baseCommitSha */
  remoteSha: string
  /** Polling interval handle */
  _presenceTimer: ReturnType<typeof setInterval> | null

  /** Send our current state to the server; receive other users' states */
  reportPresence: () => Promise<void>
  /** Start the 30-second polling loop (called once on login) */
  startPresencePolling: () => void
  /** Stop polling (called on logout) */
  stopPresencePolling: () => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 30_000

// ─── Slice creator ────────────────────────────────────────────────────────────

export const createPresenceSlice: StateCreator<AdminState, [], [], PresenceSlice> = (set, get) => ({
  presenceUsers: [],
  remoteSha: '',
  _presenceTimer: null,

  reportPresence: async () => {
    const { user, activeTab, dirtyTabs } = get()
    if (!user) return

    try {
      const res = await fetch('/api/admin-presence', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login: user.login,
          avatar_url: user.avatar_url,
          activeTab,
          dirtyTabs: [...dirtyTabs()],
        }),
      })
      if (!res.ok) return

      const data = (await res.json()) as { users: PresenceUser[] }
      set({ presenceUsers: data.users })
    } catch {
      // Network error — silently ignore; presence is best-effort
    }

    // Also check if the remote branch SHA has moved (someone else published)
    try {
      const { getBranchSha } = await import('../lib/github')
      const remoteSha = await getBranchSha()
      const { baseCommitSha: base } = get()
      if (remoteSha && base && remoteSha !== base) {
        set({ remoteSha })
      }
    } catch {
      // Ignore — conflict guard at publish time is the hard guarantee
    }
  },

  startPresencePolling: () => {
    const { _presenceTimer, reportPresence } = get()
    if (_presenceTimer) return // already running

    // Report immediately on start
    void reportPresence()

    const timer = setInterval(() => {
      void get().reportPresence()
    }, POLL_INTERVAL_MS)

    set({ _presenceTimer: timer })
  },

  stopPresencePolling: () => {
    const { _presenceTimer, user } = get()
    if (_presenceTimer) {
      clearInterval(_presenceTimer)
      set({ _presenceTimer: null, presenceUsers: [], remoteSha: '' })
    }
    // Best-effort departure notification
    if (user) {
      void fetch('/api/admin-presence', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: user.login }),
      }).catch(() => {})
    }
  },
})
