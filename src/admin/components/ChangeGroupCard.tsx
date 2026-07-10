/**
 * Shared rendering for one grouped change entry — used by DiffModal (md),
 * GlobalDiffModal (sm), and PublishConfirmModal (sm), which previously each
 * carried their own near-identical copy of this card.
 */
import { Plus, Trash2, Undo2 } from 'lucide-react'
import type { ChangeEntry, ChangeGroup } from '../lib/diff'
import { FieldChangeDiff } from './DiffDisplay'

interface Props {
  group: ChangeGroup
  onRevert: (entry: ChangeEntry) => void
  /** 'md' is the roomier single-tab DiffModal layout; 'sm' the compact multi-tab lists. */
  size?: 'sm' | 'md'
}

const SIZES = {
  sm: {
    container: 'rounded-xl text-[11px]',
    header: 'px-2.5 py-1.5',
    badge: 'text-[9px] px-1.5 py-0.5 gap-0',
    badgeIcon: 0,
    groupLabel: 'text-[9px]',
    itemLabel: '',
    revertBtn: 'px-2 py-0.5 rounded-md gap-1',
    revertIcon: 9,
    movedRow: 'px-2.5 py-1.5',
    entryRow: 'items-center gap-2 px-2.5 py-1.5',
    fieldLabel: 'text-[10px] mb-0.5',
  },
  md: {
    container: 'rounded-2xl',
    header: 'px-3 py-2',
    badge: 'text-[10px] px-2 py-0.5 gap-1',
    badgeIcon: 10,
    groupLabel: 'text-[10px]',
    itemLabel: 'text-xs truncate',
    revertBtn: 'text-[11px] px-2.5 py-1 rounded-lg gap-1.5',
    revertIcon: 11,
    movedRow: 'px-3 py-2 text-xs',
    entryRow: 'items-start gap-3 px-3 py-2.5',
    fieldLabel: 'text-xs mb-1',
  },
} as const

export default function ChangeGroupCard({ group, onRevert, size = 'sm' }: Props) {
  const s = SIZES[size]
  const isStructural = group.itemKind !== 'modified'
  const structural = isStructural ? group.entries[0] : undefined

  return (
    <div
      className={`${s.container} border border-gray-200/60 dark:border-gray-700/40 overflow-hidden bg-white/50 dark:bg-gray-800/30`}
    >
      <div
        className={`flex items-center justify-between gap-2 ${s.header} bg-gray-50/80 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-700/30`}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          {group.itemKind === 'added' && (
            <span
              className={`inline-flex items-center ${s.badge} font-bold uppercase tracking-wider rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300`}
            >
              {s.badgeIcon > 0 && <Plus size={s.badgeIcon} />} Neu
            </span>
          )}
          {group.itemKind === 'removed' && (
            <span
              className={`inline-flex items-center ${s.badge} font-bold uppercase tracking-wider rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300`}
            >
              {s.badgeIcon > 0 && <Trash2 size={s.badgeIcon} />} Entfernt
            </span>
          )}
          {group.itemKind === 'moved' && (
            <span
              className={`inline-flex items-center ${s.badge} font-bold uppercase tracking-wider rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300`}
            >
              Verschoben
            </span>
          )}
          <span
            className={`${s.groupLabel} font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate`}
          >
            {group.group}
          </span>
          {group.itemLabel && (
            <>
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <span className={`${s.itemLabel} font-semibold text-gray-700 dark:text-gray-200`}>
                {group.itemLabel}
              </span>
            </>
          )}
        </div>
        {structural && (
          <button
            type="button"
            onClick={() => onRevert(structural)}
            className={`shrink-0 ${s.revertBtn} font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 border border-amber-300/60 dark:border-amber-700/40 transition-colors flex items-center`}
            title={
              group.itemKind === 'added'
                ? 'Diesen neuen Eintrag verwerfen'
                : group.itemKind === 'moved'
                  ? 'Position zurücksetzen'
                  : 'Entfernten Eintrag wiederherstellen'
            }
          >
            <Undo2 size={s.revertIcon} />
            {group.itemKind === 'added'
              ? 'Verwerfen'
              : group.itemKind === 'moved'
                ? 'Zurücksetzen'
                : 'Wiederherstellen'}
          </button>
        )}
      </div>

      {group.itemKind === 'moved' && (
        <div className={`${s.movedRow} text-gray-500 dark:text-gray-400`}>Reihenfolge geändert</div>
      )}
      {!isStructural && (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {group.entries.map(e => (
            <li key={e.id} className={`flex justify-between ${s.entryRow}`}>
              <div className="min-w-0 flex-1">
                <div className={`${s.fieldLabel} font-semibold text-gray-700 dark:text-gray-200`}>
                  {e.fieldLabel}
                </div>
                <FieldChangeDiff entry={e} />
              </div>
              <button
                type="button"
                onClick={() => onRevert(e)}
                className={`shrink-0 ${s.revertBtn} font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 border border-amber-300/60 dark:border-amber-700/40 transition-colors flex items-center`}
              >
                <Undo2 size={s.revertIcon} /> Zurücksetzen
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
