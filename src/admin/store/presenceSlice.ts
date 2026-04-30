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
  /** Currently active poll interval in ms (adapts based on presence) */
  _presenceInterval: number

  /** Send our current state to the server; receive other users' states */
  reportPresence: () => Promise<void>
  /** Start the polling loop (called once on login) */
  startPresencePolling: () => void
  /** Stop polling (called on logout) */
  stopPresencePolling: () => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Slow interval (ms) used when no other users are active */
const POLL_INTERVAL_IDLE_MS = 30_000
/** Fast interval (ms) used when at least one other user is present */
const POLL_INTERVAL_ACTIVE_MS = 10_000

// ─── Slice creator ────────────────────────────────────────────────────────────

export const createPresenceSlice: StateCreator<AdminState, [], [], PresenceSlice> = (set, get) => ({
  presenceUsers: [],
  remoteSha: '',
  _presenceTimer: null,
  _presenceInterval: POLL_INTERVAL_IDLE_MS,

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
      const newUsers = data.users
      set({ presenceUsers: newUsers })

      // Adapt polling speed based on whether other users are present.
      // Switch between idle (30 s) and active (10 s) intervals without
      // restarting the whole loop — just reschedule after checking.
      const desired = newUsers.length > 0 ? POLL_INTERVAL_ACTIVE_MS : POLL_INTERVAL_IDLE_MS
      const current = get()._presenceInterval
      if (current !== desired) {
        // Clear old timer and start a new one at the right frequency.
        const oldTimer = get()._presenceTimer
        if (oldTimer) clearInterval(oldTimer)
        const timer = setInterval(() => {
          void get().reportPresence()
        }, desired)
        set({ _presenceTimer: timer, _presenceInterval: desired })
      }
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
    }, POLL_INTERVAL_IDLE_MS)

    set({ _presenceTimer: timer, _presenceInterval: POLL_INTERVAL_IDLE_MS })

    // Re-report immediately when the user returns to this browser tab so
    // presence data is never stale after backgrounding.
    const onVisible = () => {
      if (document.visibilityState === 'visible') void get().reportPresence()
    }
    const onFocus = () => void get().reportPresence()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onFocus)

    // Store cleanup callbacks so stopPresencePolling can remove them.
    // We piggyback on _presenceTimer existing as the "running" sentinel.
    ;(get() as unknown as { _presenceVisibilityCleanup?: () => void })._presenceVisibilityCleanup =
      () => {
        document.removeEventListener('visibilitychange', onVisible)
        window.removeEventListener('focus', onFocus)
      }
  },

  stopPresencePolling: () => {
    const { _presenceTimer, user } = get()
    if (_presenceTimer) {
      clearInterval(_presenceTimer)
      // Remove visibility / focus listeners registered in startPresencePolling
      const state = get() as unknown as { _presenceVisibilityCleanup?: () => void }
      state._presenceVisibilityCleanup?.()
      delete state._presenceVisibilityCleanup
      set({
        _presenceTimer: null,
        _presenceInterval: POLL_INTERVAL_IDLE_MS,
        presenceUsers: [],
        remoteSha: '',
      })
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
