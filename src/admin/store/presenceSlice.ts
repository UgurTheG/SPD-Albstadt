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
  /** Polling interval handle (POST heartbeat, always 30 s) */
  _presenceTimer: ReturnType<typeof setInterval> | null
  /** @deprecated kept for compatibility — always POLL_INTERVAL_IDLE_MS now */
  _presenceInterval: number
  /** Last presence-version received from the server */
  _lastPresenceVersion: number
  /** Fast version-check timer handle (500 ms, only while other users are present) */
  _versionTimer: ReturnType<typeof setInterval> | null

  /** Send our current state to the server; receive other users' states */
  reportPresence: () => Promise<void>
  /** Lightweight GET that checks if the server version has advanced; fetches
   *  full presence only when something actually changed. */
  checkPresenceVersion: () => Promise<void>
  /** Start the polling loop (called once on login) */
  startPresencePolling: () => void
  /** Stop polling (called on logout) */
  stopPresencePolling: () => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Heartbeat interval (ms) — keeps our own presence record alive in KV */
const POLL_INTERVAL_IDLE_MS = 30_000
/** How often (ms) receivers check whether the server version has changed.
 *  500 ms means a tab-switch from another user is visible within half a second. */
const VERSION_POLL_MS = 500

// Module-level storage for the visibility/focus listener cleanup.
// Kept outside Zustand state to avoid mutating the store object directly,
// which bypasses TypeScript types and risks losing the callback if the state
// reference is replaced before stopPresencePolling runs.
let _visibilityCleanup: (() => void) | null = null

// ─── Slice creator ────────────────────────────────────────────────────────────

export const createPresenceSlice: StateCreator<AdminState, [], [], PresenceSlice> = (set, get) => ({
  presenceUsers: [],
  remoteSha: '',
  _presenceTimer: null,
  _presenceInterval: POLL_INTERVAL_IDLE_MS,
  _lastPresenceVersion: 0,
  _versionTimer: null,

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

      const data = (await res.json()) as { version?: number; users: PresenceUser[] }
      const newUsers = data.users
      const newVersion = data.version ?? get()._lastPresenceVersion
      set({ presenceUsers: newUsers, _lastPresenceVersion: newVersion })

      // Start or stop the fast version-check timer based on whether other
      // users are currently active. The POST heartbeat always stays at 30 s.
      const { _versionTimer } = get()
      if (newUsers.length > 0 && !_versionTimer) {
        const timer = setInterval(() => void get().checkPresenceVersion(), VERSION_POLL_MS)
        set({ _versionTimer: timer })
      } else if (newUsers.length === 0 && _versionTimer) {
        clearInterval(_versionTimer)
        set({ _versionTimer: null })
      }
    } catch {
      // Network error — silently ignore; presence is best-effort
    }

    // Also check if the remote branch SHA has moved (someone else published)
    try {
      const { getBranchSha, hasDataChanges } = await import('../lib/github')
      const remoteSha = await getBranchSha()
      const { baseCommitSha: base } = get()
      if (remoteSha && base && remoteSha !== base) {
        // Only show the "reload" banner when actual data files changed.
        // Other commits (CI runs, Vercel deploy bots, code-style fixes, …) must
        // NOT trigger the banner.  If no public/data file was touched we silently
        // advance baseCommitSha so the same commits aren't re-checked next poll.
        const dataChanged = await hasDataChanges(base, remoteSha)
        if (dataChanged) {
          set({ remoteSha })
        } else {
          set({ baseCommitSha: remoteSha })
        }
      }
    } catch {
      // Ignore — conflict guard at publish time is the hard guarantee
    }
  },

  checkPresenceVersion: async () => {
    const { user, _lastPresenceVersion } = get()
    if (!user) return

    try {
      const res = await fetch(`/api/admin-presence?since=${_lastPresenceVersion}`, {
        credentials: 'include',
      })
      if (!res.ok) return

      const data = (await res.json()) as
        | { version: number; changed: false }
        | { version: number; changed: true; users: PresenceUser[] }

      if (!data.changed) {
        // Nothing changed — update version in case server restarted with 0
        if (data.version !== _lastPresenceVersion) {
          set({ _lastPresenceVersion: data.version })
        }
        return
      }

      // Something changed — update presence and manage the version timer
      const newUsers = data.users
      set({ presenceUsers: newUsers, _lastPresenceVersion: data.version })

      if (newUsers.length === 0) {
        // All other users left — stop the fast timer
        const timer = get()._versionTimer
        if (timer) {
          clearInterval(timer)
          set({ _versionTimer: null })
        }
      }
    } catch {
      // Network error — silently ignore
    }
  },

  startPresencePolling: () => {
    const { _presenceTimer, reportPresence } = get()
    if (_presenceTimer) return // already running

    // Report immediately on start
    void reportPresence()

    // POST heartbeat every 30 s — keeps our KV entry alive and picks up
    // any presence changes that the lightweight version check might have missed.
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

    _visibilityCleanup = () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onFocus)
    }
  },

  stopPresencePolling: () => {
    const { _presenceTimer, _versionTimer, user } = get()
    if (_presenceTimer) {
      clearInterval(_presenceTimer)
      _visibilityCleanup?.()
      _visibilityCleanup = null
    }
    if (_versionTimer) {
      clearInterval(_versionTimer)
    }
    if (_presenceTimer || _versionTimer) {
      set({
        _presenceTimer: null,
        _versionTimer: null,
        _presenceInterval: POLL_INTERVAL_IDLE_MS,
        _lastPresenceVersion: 0,
        presenceUsers: [],
        remoteSha: '',
      })
    }
    // Best-effort departure notification (explicit logout — page is still alive,
    // so a regular fetch DELETE is reliable here).
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
