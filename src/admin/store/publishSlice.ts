import type { StateCreator } from 'zustand'
import type { AdminState } from './index'
import type { PendingUpload, TabConfig } from '../types'
import type { TreeFileChange } from '../lib/github'
import { AuthError, commitTree } from '../lib/github'
import { collectImagePaths } from '../lib/images'
import { TABS } from '../config/tabs'
import { persistPendingUploads } from './persistence'

// ─── Slice interface ───────────────────────────────────────────────────────────

export interface PublishSlice {
  publishing: boolean
  publishTab: (tabKey: string, orphansToDelete?: string[]) => Promise<void>
  publishAll: (orphansToDelete?: string[]) => Promise<void>
}

// ─── Slice creator ────────────────────────────────────────────────────────────

export const createPublishSlice: StateCreator<AdminState, [], [], PublishSlice> = (set, get) => ({
  publishing: false,

  publishTab: async (tabKey, orphansToDelete) => {
    const { state: s, pendingUploads, publishing, dataLoadErrors } = get()
    if (publishing) return
    // Internal guard: never publish a tab whose data failed to load
    if (dataLoadErrors.includes(tabKey)) return
    const tab = TABS.find(t => t.key === tabKey)
    if (!tab?.ghPath) return
    set({ publishing: true })
    try {
      const token = await get().ensureFreshToken()
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

      await commitTree(token, `admin: ${fileName} aktualisiert`, changes)

      get().resetOriginal(tabKey)
      set({ pendingUploads: otherUploads })
      persistPendingUploads(otherUploads)
      get().setStatus('Veröffentlicht! Seite wird in ~1 Min. aktualisiert.', 'success')
    } catch (e) {
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
    const { pendingUploads, publishing, dataLoadErrors } = get()
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
      const token = await get().ensureFreshToken()
      // Build a descriptive commit message from file names
      const fileNames = dirtyKeys.map(k => {
        const tab = TABS.find(t => t.key === k)
        return tab?.file?.split('/').pop() ?? k
      })
      const message = `admin: ${fileNames.join(', ')} aktualisiert`

      await commitTree(token, message, changes)

      for (const tabKey of dirtyKeys) {
        get().resetOriginal(tabKey)
      }
      set({ pendingUploads: [] })
      persistPendingUploads([])
      get().setStatus(`${dirtyKeys.length} Datei(en) veröffentlicht!`, 'success')
    } catch (e) {
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
