import { useMemo } from 'react'
import { useAdminStore } from '../store'
import { TABS } from '../config/tabs'
import { type ChangeEntry, type ChangeGroup, diffTab, groupChangeEntries } from '../lib/diff'
import type { TabConfig } from '../types'

export interface TabChanges {
  tab: TabConfig
  entries: ChangeEntry[]
  groups: ChangeGroup[]
}

/**
 * Diffs every tab (or only `tabKey`) against its published original and
 * returns the tabs that have changes — the single source for the
 * Änderungen, Alle Änderungen and Veröffentlichen panels.
 */
export function useTabChanges(tabKey?: string): TabChanges[] {
  const state = useAdminStore(s => s.state)
  const originalState = useAdminStore(s => s.originalState)
  const pendingUploads = useAdminStore(s => s.pendingUploads)

  return useMemo(() => {
    const pendingImagePaths = new Set(pendingUploads.map(u => u.ghPath.replace(/^public/, '')))
    const tabs = tabKey ? TABS.filter(t => t.key === tabKey) : TABS
    return tabs.flatMap(tab => {
      if (!tab.file) return []
      const entries = diffTab(tab, originalState[tab.key], state[tab.key], pendingImagePaths)
      return entries.length > 0 ? [{ tab, entries, groups: groupChangeEntries(entries) }] : []
    })
  }, [state, originalState, pendingUploads, tabKey])
}
