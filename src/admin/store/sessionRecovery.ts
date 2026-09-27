import type { AdminState } from './index'
import { DRAFT_KEY, PENDING_KEY, resetPersistenceState } from './persistence'

type Recovery = Pick<
  AdminState,
  | 'state'
  | 'originalState'
  | 'pendingUploads'
  | 'dataLoadErrors'
  | 'baseCommitSha'
  | 'tabBaseShas'
  | 'undoStacks'
  | 'redoStacks'
  | 'mergeConflicts'
  | 'mergeConflictTabKey'
>
const OWNER_KEY = 'spd-admin-draft-owner'
const recoveryKey = (login: string) => `spd-admin-recovery:${login.toLowerCase()}`
const MAX_AGE = 7 * 24 * 60 * 60 * 1000

export function saveSessionRecovery(login: string, state: Recovery): void {
  const {
    state: draft,
    originalState,
    pendingUploads,
    dataLoadErrors,
    baseCommitSha,
    tabBaseShas,
    undoStacks,
    redoStacks,
    mergeConflicts,
    mergeConflictTabKey,
  } = state
  try {
    localStorage.setItem(OWNER_KEY, login.toLowerCase())
    localStorage.setItem(
      recoveryKey(login),
      JSON.stringify({
        state: draft,
        originalState,
        pendingUploads,
        dataLoadErrors,
        baseCommitSha,
        tabBaseShas,
        undoStacks,
        redoStacks,
        mergeConflicts,
        mergeConflictTabKey,
        savedAt: Date.now(),
      }),
    )
  } catch {
    /* Ordinary draft persistence remains available if the snapshot exceeds quota. */
  }
}

/** Recover the original baselines too, so remote edits remain mergeable after sign-in. */
export function activateDraftOwner(login: string): Recovery | null {
  resetPersistenceState()
  try {
    const owner = localStorage.getItem(OWNER_KEY)
    if (owner && owner !== login.toLowerCase()) {
      localStorage.removeItem(DRAFT_KEY)
      localStorage.removeItem(PENDING_KEY)
    }
    localStorage.setItem(OWNER_KEY, login.toLowerCase())
    const raw = localStorage.getItem(recoveryKey(login))
    if (!raw) return null
    const data = JSON.parse(raw) as Recovery & { savedAt: number }
    if (
      !Number.isFinite(data.savedAt) ||
      Date.now() - data.savedAt > MAX_AGE ||
      !data.state ||
      !data.originalState ||
      !Array.isArray(data.pendingUploads)
    )
      return null
    return {
      state: data.state,
      originalState: data.originalState,
      pendingUploads: data.pendingUploads,
      dataLoadErrors: data.dataLoadErrors,
      baseCommitSha: data.baseCommitSha,
      tabBaseShas: data.tabBaseShas,
      undoStacks: data.undoStacks,
      redoStacks: data.redoStacks,
      mergeConflicts: data.mergeConflicts,
      mergeConflictTabKey: data.mergeConflictTabKey,
    }
  } catch {
    return null
  }
}

export function clearSessionRecovery(login: string): void {
  try {
    localStorage.removeItem(recoveryKey(login))
  } catch {
    /* storage unavailable */
  }
}
