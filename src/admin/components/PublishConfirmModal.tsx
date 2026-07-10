import { useMemo } from 'react'
import { Loader2, Rocket } from 'lucide-react'
import type { TabConfig } from '../types'
import { useAdminStore } from '../store'
import { TABS } from '../config/tabs'
import { diffTab, type ChangeEntry, groupChangeEntries, type ChangeGroup } from '../lib/diff'
import ChangeGroupCard from './ChangeGroupCard'
import ModalFrame from './ModalFrame'

interface Props {
  tabKey?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function PublishConfirmModal({ tabKey, onConfirm, onCancel }: Props) {
  const state = useAdminStore(s => s.state)
  const originalState = useAdminStore(s => s.originalState)
  const pendingUploads = useAdminStore(s => s.pendingUploads)
  const publishing = useAdminStore(s => s.publishing)
  const revertChange = useAdminStore(s => s.revertChange)

  const tabChanges = useMemo(() => {
    const pendingImagePaths = new Set(pendingUploads.map(u => u.ghPath.replace(/^public/, '')))
    const result: { tab: TabConfig; entries: ChangeEntry[]; groups: ChangeGroup[] }[] = []
    const tabs = tabKey ? TABS.filter(t => t.key === tabKey) : TABS
    for (const tab of tabs) {
      if (!tab.file) continue
      const entries = diffTab(
        tab as TabConfig,
        originalState[tab.key],
        state[tab.key],
        pendingImagePaths,
      )
      if (entries.length > 0) {
        result.push({ tab: tab as TabConfig, entries, groups: groupChangeEntries(entries) })
      }
    }
    return result
  }, [state, originalState, tabKey, pendingUploads])

  const totalChanges = tabChanges.reduce((sum, tc) => sum + tc.entries.length, 0)

  const subtitle = `${totalChanges} Änderung${totalChanges !== 1 ? 'en' : ''} in ${tabChanges.length} Tab${tabChanges.length !== 1 ? 's' : ''}`

  return (
    <ModalFrame
      onClose={onCancel}
      icon={<Rocket size={18} className="text-spd-red" />}
      iconBg="bg-spd-red/10 dark:bg-spd-red/20"
      title="Veröffentlichen bestätigen"
      subtitle={subtitle}
    >
      <div className="space-y-5 mb-6">
        {tabChanges.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Keine Änderungen mehr vorhanden.</p>
        ) : (
          tabChanges.map(tc => (
            <div key={tc.tab.key}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-gray-900 dark:text-white">
                  {tc.tab.label}
                </span>
                <span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                  {tc.entries.length}
                </span>
              </div>
              <div className="space-y-2">
                {tc.groups.map(g => (
                  <ChangeGroupCard
                    key={g.key}
                    group={g}
                    onRevert={e => revertChange(tc.tab.key, e)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          className="text-xs px-4 py-2.5 rounded-xl border border-gray-200/60 dark:border-gray-700/40 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-all"
          onClick={onCancel}
        >
          Abbrechen
        </button>
        <button
          type="button"
          className="text-xs px-4 py-2.5 rounded-xl bg-spd-red hover:bg-spd-red-dark text-white font-bold shadow-sm shadow-spd-red/25 hover:shadow-lg hover:shadow-spd-red/35 active:scale-[0.98] transition-colors flex items-center gap-2 disabled:cursor-wait disabled:hover:bg-spd-red disabled:active:scale-100 whitespace-nowrap [hyphens:none]"
          onClick={onConfirm}
          disabled={publishing || totalChanges === 0}
        >
          {publishing ? (
            <Loader2 size={14} strokeWidth={2.5} className="animate-spin shrink-0" />
          ) : (
            <Rocket size={14} strokeWidth={2.5} className="shrink-0" />
          )}
          <span className="whitespace-nowrap">
            {publishing ? 'Veröffentliche…' : 'Ja, veröffentlichen'}
          </span>
        </button>
      </div>
    </ModalFrame>
  )
}
