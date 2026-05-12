import { useMemo, useState } from 'react'
import { FileSearch, Undo2 } from 'lucide-react'
import type { TabConfig } from '../types'
import { useAdminStore } from '../store'
import { TABS } from '../config/tabs'
import { type ChangeEntry, diffTab, groupChangeEntries, type ChangeGroup } from '../lib/diff'
import ModalFrame from './ModalFrame'
import { ChangeGroupBlock } from './ChangeGroupBlock'

interface Props {
  onClose: () => void
}

interface TabChanges {
  tab: TabConfig
  entries: ChangeEntry[]
  groups: ChangeGroup[]
}

export default function GlobalDiffModal({ onClose }: Props) {
  const state = useAdminStore(s => s.state)
  const originalState = useAdminStore(s => s.originalState)
  const pendingUploads = useAdminStore(s => s.pendingUploads)
  const revertChange = useAdminStore(s => s.revertChange)
  const revertTab = useAdminStore(s => s.revertTab)
  const [confirmRevertTab, setConfirmRevertTab] = useState<string | null>(null)
  const [confirmRevertAll, setConfirmRevertAll] = useState(false)

  const tabChanges = useMemo<TabChanges[]>(() => {
    const pendingImagePaths = new Set(pendingUploads.map(u => u.ghPath.replace(/^public/, '')))
    const result: TabChanges[] = []
    for (const tab of TABS) {
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
  }, [state, originalState, pendingUploads])

  const totalChanges = tabChanges.reduce((sum, tc) => sum + tc.entries.length, 0)

  const subtitle = `${totalChanges} Änderung${totalChanges !== 1 ? 'en' : ''} in ${tabChanges.length} Tab${tabChanges.length !== 1 ? 's' : ''}`

  return (
    <ModalFrame
      onClose={onClose}
      icon={<FileSearch size={18} className="text-blue-500" />}
      iconBg="bg-blue-50 dark:bg-blue-900/20"
      title="Alle Änderungen"
      subtitle={subtitle}
    >
      {tabChanges.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">Keine Änderungen vorhanden.</p>
      ) : (
        <div className="space-y-5">
          {tabChanges.map(tc => (
            <div key={tc.tab.key}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-900 dark:text-white">
                    {tc.tab.label}
                  </span>
                  <span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                    {tc.entries.length}
                  </span>
                </div>
                {confirmRevertTab === tc.tab.key ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors"
                      onClick={() => {
                        revertTab(tc.tab.key)
                        setConfirmRevertTab(null)
                      }}
                    >
                      Verwerfen
                    </button>
                    <button
                      type="button"
                      className="text-[10px] px-2.5 py-1 rounded-lg border border-gray-200/60 dark:border-gray-700/40 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-all"
                      onClick={() => setConfirmRevertTab(null)}
                    >
                      Abbrechen
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmRevertTab(tc.tab.key)}
                    className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 px-2.5 py-1 rounded-lg border border-amber-300/60 dark:border-amber-700/40 transition-colors flex items-center gap-1"
                  >
                    <Undo2 size={10} /> Tab komplett zurücksetzen
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {tc.groups.map(g => (
                  <ChangeGroupBlock
                    key={g.key}
                    group={g}
                    onRevert={e => revertChange(tc.tab.key, e)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-5 gap-2">
        {tabChanges.length > 0 ? (
          confirmRevertAll ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                Alles verwerfen?
              </span>
              <button
                type="button"
                className="text-xs px-3 py-2 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors flex items-center gap-1.5"
                onClick={() => {
                  for (const tc of tabChanges) revertTab(tc.tab.key)
                  setConfirmRevertAll(false)
                }}
              >
                <Undo2 size={11} /> Ja, alles verwerfen
              </button>
              <button
                type="button"
                className="text-xs px-3 py-2 rounded-xl border border-gray-200/60 dark:border-gray-700/40 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-all"
                onClick={() => setConfirmRevertAll(false)}
              >
                Abbrechen
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="text-xs font-semibold px-3 py-2 rounded-xl text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 border border-amber-300/60 dark:border-amber-700/40 transition-colors flex items-center gap-1.5"
              onClick={() => setConfirmRevertAll(true)}
            >
              <Undo2 size={11} /> Alle zurücksetzen
            </button>
          )
        ) : (
          <div />
        )}
        <button
          type="button"
          className="text-xs px-4 py-2.5 rounded-xl border border-gray-200/60 dark:border-gray-700/40 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-all"
          onClick={onClose}
        >
          Schließen
        </button>
      </div>
    </ModalFrame>
  )
}

