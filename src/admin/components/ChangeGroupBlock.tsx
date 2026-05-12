import { Plus, Trash2, Undo2 } from 'lucide-react'
import { type ChangeEntry, type ChangeGroup } from '../lib/diff'
import { FieldChangeDiff } from './DiffDisplay'

interface Props {
  group: ChangeGroup
  onRevert: (entry: ChangeEntry) => void
}

/**
 * Renders a single change group (added / removed / moved / modified fields).
 * Callers that need to thread a tabKey through onRevert should curry it:
 *   onRevert={e => revert(tabKey, e)}
 */
export function ChangeGroupBlock({ group, onRevert }: Props) {
  const isStructural = group.itemKind !== 'modified'
  const structural = isStructural ? group.entries[0] : undefined

  return (
    <div className="rounded-2xl border border-gray-200/60 dark:border-gray-700/40 overflow-hidden bg-white/50 dark:bg-gray-800/30">
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50/80 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-700/30">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          {group.itemKind === 'added' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
              <Plus size={10} /> Neu
            </span>
          )}
          {group.itemKind === 'removed' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300">
              <Trash2 size={10} /> Entfernt
            </span>
          )}
          {group.itemKind === 'moved' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
              Verschoben
            </span>
          )}
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">
            {group.group}
          </span>
          {group.itemLabel && (
            <>
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">
                {group.itemLabel}
              </span>
            </>
          )}
        </div>
        {structural && (
          <button
            type="button"
            onClick={() => onRevert(structural)}
            className="shrink-0 text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 px-2.5 py-1 rounded-lg border border-amber-300/60 dark:border-amber-700/40 transition-colors flex items-center gap-1.5"
            title={
              group.itemKind === 'added'
                ? 'Diesen neuen Eintrag verwerfen'
                : group.itemKind === 'moved'
                  ? 'Position zurücksetzen'
                  : 'Entfernten Eintrag wiederherstellen'
            }
          >
            <Undo2 size={11} />
            {group.itemKind === 'added'
              ? 'Verwerfen'
              : group.itemKind === 'moved'
                ? 'Zurücksetzen'
                : 'Wiederherstellen'}
          </button>
        )}
      </div>

      {group.itemKind === 'moved' && (
        <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
          Reihenfolge geändert
        </div>
      )}
      {!isStructural && (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {group.entries.map(e => (
            <li key={e.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                  {e.fieldLabel}
                </div>
                <FieldChangeDiff entry={e} />
              </div>
              <button
                type="button"
                onClick={() => onRevert(e)}
                className="shrink-0 text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 px-2.5 py-1 rounded-lg border border-amber-300/60 dark:border-amber-700/40 transition-colors flex items-center gap-1.5"
              >
                <Undo2 size={11} /> Zurücksetzen
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
