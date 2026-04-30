import type { StateCreator } from 'zustand'
import type { AdminState } from './index'
import type { PendingUpload, TabConfig } from '../types'
import type { TreeFileChange } from '../lib/github'
import { AuthError, ConflictError, commitTree, getFileContent } from '../lib/github'
import { collectImagePaths } from '../lib/images'
import { TABS } from '../config/tabs'
import { persistPendingUploads } from './persistence'
import { threeWayMerge } from '../lib/merge'
import type { MergeConflict } from '../lib/merge'

// ─── Slice interface ───────────────────────────────────────────────────────────

export interface PublishSlice {
  publishing: boolean
  /** Conflicts surfaced after an auto-merge attempt; null = no merge attempted */
  mergeConflicts: MergeConflict[] | null
  /** The tab key whose merge conflicts are being shown */
  mergeConflictTabKey: string | null
  publishTab: (tabKey: string, orphansToDelete?: string[]) => Promise<void>
  publishAll: (orphansToDelete?: string[]) => Promise<void>
  /** Called by ConflictMergeModal when the user resolves all conflicts */
  applyMergeResolution: (tabKey: string, resolved: unknown) => void
  dismissMergeConflicts: () => void
}

// ─── Slice creator ────────────────────────────────────────────────────────────

export const createPublishSlice: StateCreator<AdminState, [], [], PublishSlice> = (set, get) => ({
  publishing: false,
  mergeConflicts: null,
  mergeConflictTabKey: null,

  applyMergeResolution: (tabKey, resolved) => {
    // Update state + clear conflicts, then re-trigger publish
    get().updateState(tabKey, resolved)
    // Update originalState baseline to the latest published SHA so the retry
    // doesn't see a divergence (the merge already incorporated their changes).
    set(prev => ({
      mergeConflicts: null,
      mergeConflictTabKey: null,
      originalState: { ...prev.originalState, [tabKey]: resolved },
    }))
  },

  dismissMergeConflicts: () => set({ mergeConflicts: null, mergeConflictTabKey: null }),

  publishTab: async (tabKey, orphansToDelete) => {
    const { state: s, pendingUploads, publishing, dataLoadErrors, baseCommitSha } = get()
    if (publishing) return
    // Internal guard: never publish a tab whose data failed to load
    if (dataLoadErrors.includes(tabKey)) return
    const tab = TABS.find(t => t.key === tabKey)
    if (!tab?.ghPath) return
    set({ publishing: true })
    try {
      await get().ensureAuthenticated()
      const changes: TreeFileChange[] = []
      const currentPaths = collectImagePaths(tab as TabConfig, s[tabKey] as Record<string, unknown>)

      // Collect relevant image uploads
      const otherUploads: PendingUpload[] = []
      for (const upload of pendingUploads) {
        const publicUrl = upload.ghPath.replace(/^public/, '')
        if (currentPaths.has(publicUrl)) {
          changes.push({ path: upload.ghPath, base64Content: upload.base64 })
        } else {
          otherUploads.push(upload)
        }
      }

      // Collect orphan deletions
      if (orphansToDelete) {
        for (const imgPath of orphansToDelete) {
          changes.push({ path: 'public' + imgPath, delete: true })
        }
      }

      // Add the JSON data file
      const json = JSON.stringify(s[tabKey], null, 2) + '\n'
      const fileName = tab.file?.split('/').pop() ?? tab.key
      changes.push({ path: tab.ghPath, content: json })

      const result = await commitTree(`admin: ${fileName} aktualisiert`, changes, baseCommitSha)

      get().resetOriginal(tabKey)
      set({ pendingUploads: otherUploads, baseCommitSha: result?.sha ?? baseCommitSha })
      persistPendingUploads(otherUploads)
      get().setStatus('Veröffentlicht! Seite wird in ~1 Min. aktualisiert.', 'success')
    } catch (e) {
      if (e instanceof ConflictError) {
        // ── Auto-merge attempt ─────────────────────────────────────────────
        const tab = TABS.find(t => t.key === tabKey)
        if (tab?.ghPath && tab?.file) {
          try {
            const latest = await getFileContent(tab.ghPath)
            if (latest !== null) {
              const { merged, conflicts } = threeWayMerge(
                get().originalState[tabKey],
                get().state[tabKey],
                latest,
              )
              if (conflicts.length === 0) {
                // Clean merge — update state baseline and retry
                get().updateState(tabKey, merged)
                const { getBranchSha } = await import('../lib/github')
                const freshSha = await getBranchSha()
                set(prev => ({
                  originalState: { ...prev.originalState, [tabKey]: latest },
                  baseCommitSha: freshSha,
                }))
                await get().publishTab(tabKey, orphansToDelete)
                return
              } else {
                // Conflicts — surface merge modal with partially-merged draft
                get().updateState(tabKey, merged)
                set(prev => ({
                  originalState: { ...prev.originalState, [tabKey]: latest },
                  mergeConflicts: conflicts,
                  mergeConflictTabKey: tabKey,
                }))
                get().setStatus(
                  `${conflicts.length} Konflikt(e) erkannt — bitte die markierten Felder manuell auflösen.`,
                  'error',
                )
                return
              }
            }
          } catch {
            // Fall through to the generic error
          }
        }
        get().setStatus(
          'Konflikt: Ein anderer Benutzer hat Änderungen veröffentlicht. Bitte die Seite neu laden und Ihre Änderungen erneut eintragen.',
          'error',
        )
        return
      }
      if (e instanceof AuthError) {
        get().logout()
        get().setStatus('Sitzung abgelaufen — bitte neu anmelden.', 'error')
        return
      }
      get().setStatus('Fehler: ' + (e as Error).message, 'error')
    } finally {
      set({ publishing: false })
    }
  },

  publishAll: async orphansToDelete => {
    const { pendingUploads, publishing, dataLoadErrors, baseCommitSha } = get()
    if (publishing) return

    // Collect all changes BEFORE touching publishing state so an empty
    // batch never causes a spurious loading flash.
    const changes: TreeFileChange[] = []

    // Collect image uploads
    for (const upload of pendingUploads) {
      changes.push({ path: upload.ghPath, base64Content: upload.base64 })
    }

    // Collect orphan deletions
    if (orphansToDelete) {
      for (const imgPath of orphansToDelete) {
        changes.push({ path: 'public' + imgPath, delete: true })
      }
    }

    // Collect dirty JSON files — skip any tab whose data failed to load
    // to prevent overwriting live data with an empty fallback.
    const dirty = get().dirtyTabs()
    const dirtyKeys: string[] = []
    for (const tabKey of dirty) {
      if (dataLoadErrors.includes(tabKey)) continue
      const tab = TABS.find(t => t.key === tabKey)
      if (!tab?.ghPath) continue
      const json = JSON.stringify(get().state[tabKey], null, 2) + '\n'
      changes.push({ path: tab.ghPath, content: json })
      dirtyKeys.push(tabKey)
    }

    if (changes.length === 0) {
      get().setStatus('Nichts zu veröffentlichen.', 'info')
      return
    }

    set({ publishing: true })
    try {
      await get().ensureAuthenticated()
      // Build a descriptive commit message from file names
      const fileNames = dirtyKeys.map(k => {
        const tab = TABS.find(t => t.key === k)
        return tab?.file?.split('/').pop() ?? k
      })
      const message = `admin: ${fileNames.join(', ')} aktualisiert`

      const result = await commitTree(message, changes, baseCommitSha)

      for (const tabKey of dirtyKeys) {
        get().resetOriginal(tabKey)
      }
      set({ pendingUploads: [], baseCommitSha: result?.sha ?? baseCommitSha })
      persistPendingUploads([])
      get().setStatus(`${dirtyKeys.length} Datei(en) veröffentlicht!`, 'success')
    } catch (e) {
      if (e instanceof ConflictError) {
        // For publishAll, fall back to per-tab publishing so each tab gets its own auto-merge.
        // Run tabs in parallel — each publishTab manages its own publishing flag internally
        // so we coordinate via allSettled rather than sequencing.
        set({ publishing: false })
        get().setStatus(
          'Konflikt erkannt — versuche automatische Zusammenführung pro Datei…',
          'info',
        )
        await Promise.allSettled(dirtyKeys.map(tabKey => get().publishTab(tabKey, undefined)))
        return
      }
      if (e instanceof AuthError) {
        get().logout()
        get().setStatus('Sitzung abgelaufen — bitte neu anmelden.', 'error')
        return
      }
      get().setStatus('Fehler: ' + (e as Error).message, 'error')
    } finally {
      set({ publishing: false })
    }
  },
})
