import type { StateCreator } from 'zustand'
import type { AdminState } from './index'
import type { PendingUpload, TabConfig } from '../types'
import type { ChangeEntry } from '../lib/diff'
import { applyRevert } from '../lib/diff'
import { collectImagePaths } from '../lib/images'
import { getBranchSha } from '../lib/github'
import { TABS } from '../config/tabs'
import {
  lastUndoPush,
  persistDirtyState,
  persistPendingUploads,
  removeDraft,
  restoreDrafts,
  restorePendingUploads,
} from './persistence'

// ─── Constants ────────────────────────────────────────────────────────────────

const UNDO_LIMIT = 50
const UNDO_DEBOUNCE = 600 // ms

// ─── Slice interface ───────────────────────────────────────────────────────────

export interface EditorSlice {
  // State
  activeTab: string
  state: Record<string, unknown>
  originalState: Record<string, unknown>
  pendingUploads: PendingUpload[]
  dataLoaded: boolean
  dataLoadErrors: string[]
  undoStacks: Record<string, unknown[]>
  redoStacks: Record<string, unknown[]>
  /** The branch tip commit SHA at the time data was last loaded. Used to detect
   *  concurrent edits by other users before attempting a publish. */
  baseCommitSha: string

  // Computed
  dirtyTabs: () => Set<string>

  // Actions
  loadData: () => Promise<void>
  setActiveTab: (key: string) => void
  updateState: (tabKey: string, data: unknown) => void
  undo: (tabKey: string) => void
  redo: (tabKey: string) => void
  addPendingUpload: (upload: PendingUpload) => void
  resetOriginal: (tabKey: string) => void
  revertTab: (tabKey: string) => void
  revertChange: (tabKey: string, entry: ChangeEntry) => void
  findOrphanImages: () => string[]
  findOrphanImagesForTab: (tabKey: string) => string[]
}

// ─── Slice creator ────────────────────────────────────────────────────────────

export const createEditorSlice: StateCreator<AdminState, [], [], EditorSlice> = (set, get) => ({
  activeTab: (() => {
    const hash = window.location.hash.slice(1)
    return TABS.some(t => t.key === hash) ? hash : TABS[0].key
  })(),
  state: {},
  originalState: {},
  pendingUploads: restorePendingUploads(),
  dataLoaded: false,
  dataLoadErrors: [],
  undoStacks: {},
  redoStacks: {},
  baseCommitSha: '',

  dirtyTabs: () => {
    const { state: s, originalState: os, pendingUploads } = get()
    const dirty = new Set<string>()
    for (const tab of TABS) {
      if (!tab.file) continue
      if (JSON.stringify(s[tab.key]) !== JSON.stringify(os[tab.key])) {
        dirty.add(tab.key)
      }
    }
    // Mark a tab dirty if it owns a pending upload — the tabKey is the ground truth,
    // so this catches document uploads where the new URL may not yet be in the state
    // (race between addPendingUpload and the state update from onChange).
    for (const upload of pendingUploads) {
      if (upload.tabKey) dirty.add(upload.tabKey)
    }
    // Also mark a tab dirty if there's a pending image upload targeting a path
    // referenced by the tab — otherwise replacing an image with the same URL
    // (e.g. same-named Abgeordneter) would leave the tab undetected as changed.
    if (pendingUploads.length > 0) {
      for (const tab of TABS) {
        if (!tab.file || dirty.has(tab.key) || !s[tab.key]) continue
        const paths = collectImagePaths(tab as TabConfig, s[tab.key] as Record<string, unknown>)
        for (const upload of pendingUploads) {
          if (paths.has(upload.ghPath.replace(/^public/, ''))) {
            dirty.add(tab.key)
            break
          }
        }
      }
    }
    return dirty
  },

  loadData: async () => {
    const newState: Record<string, unknown> = {}
    const failedTabs: string[] = []
    // Admin must always see the latest data — bypass browser/CDN caches
    const bust = `t=${Date.now()}`

    // Fetch the branch SHA and all tab data in parallel
    const [branchSha] = await Promise.all([
      getBranchSha().catch(() => ''),
      ...TABS.map(async tab => {
        if (!tab.file) {
          newState[tab.key] = null
          return
        }
        try {
          const url = tab.file + (tab.file.includes('?') ? '&' : '?') + bust
          const res = await fetch(url, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
          })
          if (res.ok) {
            newState[tab.key] = await res.json()
          } else {
            newState[tab.key] = tab.type === 'array' ? [] : {}
            failedTabs.push(tab.key)
          }
        } catch {
          newState[tab.key] = tab.type === 'array' ? [] : {}
          failedTabs.push(tab.key)
        }
      }),
    ])
    const original = JSON.parse(JSON.stringify(newState))
    // Restore any saved drafts from localStorage
    const merged = restoreDrafts(newState, original)
    try {
      set({
        state: merged,
        originalState: original,
        dataLoaded: true,
        dataLoadErrors: failedTabs,
        undoStacks: {},
        redoStacks: {},
        baseCommitSha: branchSha,
        remoteSha: '', // clear stale-data flag on successful reload
      })
    } catch {
      // Fallback: mark all file-backed tabs as failed rather than hanging forever
      set({ dataLoaded: true, dataLoadErrors: TABS.filter(t => t.file).map(t => t.key) })
    }
  },

  setActiveTab: key => {
    set({ activeTab: key })
    // Immediately push the new active tab to the presence server so other
    // users see where we moved without waiting for the next poll tick.
    void get().reportPresence()
  },

  updateState: (tabKey, data) => {
    const now = Date.now()
    const prev = get()
    // Debounced undo snapshot — don't push on every keystroke
    const lastPush = lastUndoPush[tabKey] || 0
    let newUndoStacks = prev.undoStacks
    if (now - lastPush > UNDO_DEBOUNCE) {
      const stack = [...(prev.undoStacks[tabKey] || [])]
      if (prev.state[tabKey] !== undefined) {
        stack.push(JSON.parse(JSON.stringify(prev.state[tabKey])))
      }
      if (stack.length > UNDO_LIMIT) stack.shift()
      newUndoStacks = { ...prev.undoStacks, [tabKey]: stack }
      lastUndoPush[tabKey] = now
    }
    const newState = { ...prev.state, [tabKey]: data }
    set({
      state: newState,
      undoStacks: newUndoStacks,
      redoStacks: { ...prev.redoStacks, [tabKey]: [] }, // clear redo on new edit
    })
    persistDirtyState(newState, prev.originalState)
  },

  undo: tabKey => {
    const prev = get()
    const stack = [...(prev.undoStacks[tabKey] || [])]
    if (stack.length === 0) return
    const snapshot = stack.pop()!
    const redoStack = [...(prev.redoStacks[tabKey] || [])]
    redoStack.push(JSON.parse(JSON.stringify(prev.state[tabKey])))
    const newState = { ...prev.state, [tabKey]: snapshot }
    set({
      state: newState,
      undoStacks: { ...prev.undoStacks, [tabKey]: stack },
      redoStacks: { ...prev.redoStacks, [tabKey]: redoStack },
    })
    persistDirtyState(newState, prev.originalState)
  },

  redo: tabKey => {
    const prev = get()
    const stack = [...(prev.redoStacks[tabKey] || [])]
    if (stack.length === 0) return
    const snapshot = stack.pop()!
    const undoStack = [...(prev.undoStacks[tabKey] || [])]
    undoStack.push(JSON.parse(JSON.stringify(prev.state[tabKey])))
    const newState = { ...prev.state, [tabKey]: snapshot }
    set({
      state: newState,
      undoStacks: { ...prev.undoStacks, [tabKey]: undoStack },
      redoStacks: { ...prev.redoStacks, [tabKey]: stack },
    })
    persistDirtyState(newState, prev.originalState)
  },

  addPendingUpload: upload => {
    set(prev => ({
      pendingUploads: [
        ...prev.pendingUploads,
        { ...upload, tabKey: upload.tabKey ?? prev.activeTab },
      ],
    }))
    persistPendingUploads(get().pendingUploads)
  },

  resetOriginal: tabKey => {
    set(prev => ({
      originalState: {
        ...prev.originalState,
        [tabKey]: JSON.parse(JSON.stringify(prev.state[tabKey])),
      },
      undoStacks: { ...prev.undoStacks, [tabKey]: [] },
      redoStacks: { ...prev.redoStacks, [tabKey]: [] },
    }))
    // Remove the tab's saved draft from localStorage via the persistence abstraction.
    removeDraft(tabKey)
  },

  revertTab: tabKey => {
    let keptForPersist: PendingUpload[] = []
    set(prev => {
      const orig = prev.originalState[tabKey]
      const nextState = {
        ...prev.state,
        [tabKey]: orig === undefined ? prev.state[tabKey] : JSON.parse(JSON.stringify(orig)),
      }
      const allPaths = new Set<string>()
      for (const tab of TABS) {
        if (!tab.file || !nextState[tab.key]) continue
        for (const p of collectImagePaths(
          tab as TabConfig,
          nextState[tab.key] as Record<string, unknown>,
        )) {
          allPaths.add(p)
        }
      }
      // Drop uploads tagged to this tab (covers same-URL replacements that wouldn't
      // be caught by path-reference filtering alone), plus unreferenced uploads.
      const keptUploads = prev.pendingUploads.filter(
        u => u.tabKey !== tabKey && allPaths.has(u.ghPath.replace(/^public/, '')),
      )
      keptForPersist = keptUploads
      persistDirtyState(nextState, prev.originalState)
      return {
        state: nextState,
        pendingUploads: keptUploads,
        undoStacks: { ...prev.undoStacks, [tabKey]: [] },
        redoStacks: { ...prev.redoStacks, [tabKey]: [] },
      }
    })
    persistPendingUploads(keptForPersist)
    get().setStatus('Änderungen verworfen.', 'info')
  },

  revertChange: (tabKey, entry) => {
    let keptForPersist: PendingUpload[] = []
    set(prev => {
      const tab = TABS.find(t => t.key === tabKey)
      if (!tab) return prev
      const nextTabValue = applyRevert(
        tab as TabConfig,
        prev.originalState[tabKey],
        prev.state[tabKey],
        entry,
      )
      const nextState = { ...prev.state, [tabKey]: nextTabValue }
      // Drop pending uploads whose target path is no longer referenced by any tab
      const allPaths = new Set<string>()
      for (const t of TABS) {
        if (!t.file || !nextState[t.key]) continue
        for (const p of collectImagePaths(
          t as TabConfig,
          nextState[t.key] as Record<string, unknown>,
        )) {
          allPaths.add(p)
        }
      }
      let keptUploads = prev.pendingUploads.filter(u =>
        allPaths.has(u.ghPath.replace(/^public/, '')),
      )
      // Reverting a same-URL image replacement: explicitly drop that upload
      if (entry.pendingImagePath) {
        keptUploads = keptUploads.filter(
          u => u.ghPath.replace(/^public/, '') !== entry.pendingImagePath,
        )
      }
      keptForPersist = keptUploads
      persistDirtyState(nextState, prev.originalState)
      // Push current state onto undo stack so the revert itself is undoable
      const undoStack = [...(prev.undoStacks[tabKey] || [])]
      undoStack.push(JSON.parse(JSON.stringify(prev.state[tabKey])))
      if (undoStack.length > UNDO_LIMIT) undoStack.shift()
      return {
        state: nextState,
        pendingUploads: keptUploads,
        undoStacks: { ...prev.undoStacks, [tabKey]: undoStack },
        redoStacks: { ...prev.redoStacks, [tabKey]: [] },
      }
    })
    persistPendingUploads(keptForPersist)
    get().setStatus('Änderung zurückgesetzt.', 'info')
  },

  findOrphanImages: () => {
    const { state: s, originalState: os } = get()
    const dirty = get().dirtyTabs()
    const allCurrent = new Set<string>()
    for (const tab of TABS) {
      if (!tab.file || !s[tab.key]) continue
      for (const p of collectImagePaths(tab as TabConfig, s[tab.key] as Record<string, unknown>)) {
        allCurrent.add(p)
      }
    }
    const orphans: string[] = []
    for (const tabKey of dirty) {
      const tab = TABS.find(t => t.key === tabKey)
      if (!tab?.file || !os[tabKey]) continue
      const oldPaths = collectImagePaths(tab as TabConfig, os[tabKey] as Record<string, unknown>)
      for (const p of oldPaths) {
        if (!allCurrent.has(p)) orphans.push(p)
      }
    }
    return [...new Set(orphans)]
  },

  findOrphanImagesForTab: tabKey => {
    const { state: s, originalState: os } = get()
    const tab = TABS.find(t => t.key === tabKey)
    if (!tab?.file || !os[tabKey] || !s[tabKey]) return []
    const oldPaths = collectImagePaths(tab as TabConfig, os[tabKey] as Record<string, unknown>)
    const allCurrent = new Set<string>()
    for (const t of TABS) {
      if (!t.file || !s[t.key]) continue
      for (const p of collectImagePaths(t as TabConfig, s[t.key] as Record<string, unknown>)) {
        allCurrent.add(p)
      }
    }
    const orphans: string[] = []
    for (const p of oldPaths) {
      if (!allCurrent.has(p)) orphans.push(p)
    }
    return [...new Set(orphans)]
  },
})
