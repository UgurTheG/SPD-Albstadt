import { useMemo, useState } from 'react'
import { FileSearch, Undo2 } from 'lucide-react'
import { useAdminStore } from '../store'
import { TABS } from '../config/tabs'
import { diffTab, groupChangeEntries } from '../lib/diff'
import type { TabConfig } from '../types'
import ModalFrame from './ModalFrame'
import { ChangeGroupBlock } from './ChangeGroupBlock'

interface Props {
  tabKey: string
  onClose: () => void
  onRevertAll: () => void
}

export default function DiffModal({ tabKey, onClose, onRevertAll }: Props) {
  const tab = TABS.find(t => t.key === tabKey) as TabConfig
  const current = useAdminStore(s => s.state[tabKey])
  const original = useAdminStore(s => s.originalState[tabKey])
  const pendingUploads = useAdminStore(s => s.pendingUploads)
  const revertChange = useAdminStore(s => s.revertChange)
  const [confirmRevertAll, setConfirmRevertAll] = useState(false)

  const entries = useMemo(() => {
    if (!tab) return []
    const pendingImagePaths = new Set(pendingUploads.map(u => u.ghPath.replace(/^public/, '')))
    return diffTab(tab, original, current, pendingImagePaths)
  }, [tab, original, current, pendingUploads])

  const groups = useMemo(() => groupChangeEntries(entries), [entries])

  if (!tab) return null

  const subtitle = `${entries.length} Änderung${entries.length !== 1 ? 'en' : ''}${entries.length > 0 ? ' · Einzeln oder alle zurücksetzbar' : ''}`

  return (
    <ModalFrame
      onClose={onClose}
      icon={<FileSearch size={18} className="text-blue-500" />}
      iconBg="bg-blue-50 dark:bg-blue-900/20"
      title={`Änderungen — ${tab.label}`}
      subtitle={subtitle}
    >
      {groups.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">Keine Änderungen gefunden.</p>
      ) : (
        <div className="space-y-3">
          {groups.map(g => (
            <ChangeGroupBlock key={g.key} group={g} onRevert={e => revertChange(tabKey, e)} />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-5 gap-2">
        {entries.length > 0 ? (
          confirmRevertAll ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                Alle verwerfen?
              </span>
              <button
                type="button"
                className="text-xs px-3 py-2 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors flex items-center gap-1.5"
                onClick={onRevertAll}
              >
                <Undo2 size={11} /> Ja, alle verwerfen
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
              className="text-xs px-3 py-2 rounded-xl border border-amber-300/60 dark:border-amber-700/40 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors font-medium flex items-center gap-1.5"
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

