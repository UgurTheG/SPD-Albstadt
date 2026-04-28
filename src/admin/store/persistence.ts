/**
 * Module-level persistence helpers shared across store slices.
 * All localStorage I/O lives here to keep slices free of storage concerns.
 */
import { TABS } from '../config/tabs'
import type { PendingUpload } from '../types'

export const DRAFT_KEY = 'spd-admin-drafts'
export const PENDING_KEY = 'spd-admin-pending-uploads'

// ─── Module-level mutable state (reset on logout) ─────────────────────────────

/** Debounce timer for draft persistence */
export let saveTimer: ReturnType<typeof setTimeout> | null = null
/** Tracks last undo snapshot time per tab to debounce pushes */
export let lastUndoPush: Record<string, number> = {}

/** Called by logout to cancel pending timers and reset counters. */
export function resetPersistenceState() {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  lastUndoPush = {}
}

// ─── Hash ─────────────────────────────────────────────────────────────────────

/**
 * Non-cryptographic 32-bit hash used only for draft-invalidation comparison.
 * Collision probability is negligible for JSON strings of this size.
 */
export function simpleHash(str: string): string {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0
  }
  return h.toString(36)
}

// ─── Draft persistence ────────────────────────────────────────────────────────

/** Debounced — writes changed tabs to localStorage after 1 s of inactivity. */
export function persistDirtyState(
  state: Record<string, unknown>,
  originalState: Record<string, unknown>,
) {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      const drafts: Record<string, { data: unknown; originalHash: string }> = {}
      for (const tab of TABS) {
        if (!tab.file) continue
        const cur = JSON.stringify(state[tab.key])
        const orig = JSON.stringify(originalState[tab.key])
        if (cur !== orig) {
          drafts[tab.key] = { data: state[tab.key], originalHash: simpleHash(orig) }
        }
      }
      if (Object.keys(drafts).length > 0) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts))
      } else {
        localStorage.removeItem(DRAFT_KEY)
      }
    } catch {
      /* quota exceeded — ignore */
    }
  }, 1000)
}

export function restoreDrafts(
  state: Record<string, unknown>,
  originalState: Record<string, unknown>,
): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return state
    const drafts = JSON.parse(raw) as Record<string, { data: unknown; originalHash: string }>
    const merged = { ...state }
    for (const [key, draft] of Object.entries(drafts)) {
      const origStr = JSON.stringify(originalState[key])
      if (simpleHash(origStr) === draft.originalHash) {
        merged[key] = draft.data
      }
    }
    return merged
  } catch {
    return state
  }
}

/**
 * Removes the saved draft for a single tab (called after a successful publish
 * or explicit reset). Uses the same DRAFT_KEY as persistDirtyState.
 */
export function removeDraft(tabKey: string) {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return
    const drafts = JSON.parse(raw) as Record<string, unknown>
    delete drafts[tabKey]
    if (Object.keys(drafts).length > 0) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts))
    } else {
      localStorage.removeItem(DRAFT_KEY)
    }
  } catch {
    /* ignore */
  }
}

// ─── Pending uploads persistence ──────────────────────────────────────────────

export function persistPendingUploads(uploads: PendingUpload[]) {
  try {
    if (uploads.length > 0) localStorage.setItem(PENDING_KEY, JSON.stringify(uploads))
    else localStorage.removeItem(PENDING_KEY)
  } catch {
    /* quota exceeded — ignore */
  }
}

export function restorePendingUploads(): PendingUpload[] {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    return raw ? (JSON.parse(raw) as PendingUpload[]) : []
  } catch {
    return []
  }
}
