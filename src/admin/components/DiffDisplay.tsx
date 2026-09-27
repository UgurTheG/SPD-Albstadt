import { ArrowRight, Plus, Trash2, Undo2 } from 'lucide-react'
import { type ChangeEntry, type ChangeGroup, summarizeValue } from '../lib/diff'
import { cn } from '@/utils/cn'

type StructuralKind = Exclude<ChangeGroup['itemKind'], 'modified'>

const KIND_BADGE: Record<StructuralKind, { label: string; icon?: typeof Plus; cls: string }> = {
  added: {
    label: 'Neu',
    icon: Plus,
    cls: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
  },
  removed: {
    label: 'Entfernt',
    icon: Trash2,
    cls: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300',
  },
  moved: {
    label: 'Verschoben',
    cls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  },
}

const STRUCTURAL_REVERT: Record<StructuralKind, { label: string; title: string }> = {
  added: { label: 'Verwerfen', title: 'Diesen neuen Eintrag verwerfen' },
  removed: { label: 'Wiederherstellen', title: 'Entfernten Eintrag wiederherstellen' },
  moved: { label: 'Zurücksetzen', title: 'Position zurücksetzen' },
}

// md: single-tab "Änderungen" modal. sm: the denser multi-tab lists in
// "Alle Änderungen" and the publish confirmation.
const CARD_SIZES = {
  md: {
    card: 'rounded-2xl',
    header: 'px-3 py-2',
    headerItems: 'gap-2',
    badge: 'inline-flex items-center gap-1 text-[10px] tracking-wider px-2 py-0.5',
    group: 'text-[10px]',
    itemLabel: 'text-xs truncate',
    revert: 'text-[11px] px-2.5 py-1 rounded-lg gap-1.5',
    icon: 11,
    moved: 'px-3 py-2 text-xs',
    row: 'items-start gap-3 px-3 py-2.5',
    fieldLabel: 'text-xs mb-1',
  },
  sm: {
    card: 'rounded-xl text-[11px]',
    header: 'px-2.5 py-1.5',
    headerItems: 'gap-1.5',
    badge: 'text-[9px] px-1.5 py-0.5',
    group: 'text-[9px]',
    itemLabel: '',
    revert: 'px-2 py-0.5 rounded-md gap-1',
    icon: 9,
    moved: 'px-2.5 py-1.5',
    row: 'items-center gap-2 px-2.5 py-1.5',
    fieldLabel: 'text-[10px] mb-0.5',
  },
} as const

const REVERT_BUTTON =
  'shrink-0 font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 border border-amber-300/60 dark:border-amber-700/40 transition-colors flex items-center'

/** One grouped block of changes (an item or section) with per-change revert buttons. */
export function ChangeGroupCard({
  group,
  onRevert,
  size = 'sm',
}: {
  group: ChangeGroup
  onRevert: (entry: ChangeEntry) => void
  size?: keyof typeof CARD_SIZES
}) {
  const sz = CARD_SIZES[size]
  const kind = group.itemKind === 'modified' ? null : group.itemKind
  const badge = kind && KIND_BADGE[kind]
  const BadgeIcon = size === 'md' ? badge?.icon : undefined

  return (
    <div
      className={cn(
        'border border-gray-200/60 dark:border-gray-700/40 overflow-hidden bg-white/50 dark:bg-gray-800/30',
        sz.card,
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between gap-2 bg-gray-50/80 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-700/30',
          sz.header,
        )}
      >
        <div className={cn('flex items-center min-w-0 flex-wrap', sz.headerItems)}>
          {badge && (
            <span className={cn('font-bold uppercase rounded-full', sz.badge, badge.cls)}>
              {BadgeIcon && <BadgeIcon size={10} />}
              {badge.label}
            </span>
          )}
          <span
            className={cn(
              'font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate',
              sz.group,
            )}
          >
            {group.group}
          </span>
          {group.itemLabel && (
            <>
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <span className={cn('font-semibold text-gray-700 dark:text-gray-200', sz.itemLabel)}>
                {group.itemLabel}
              </span>
            </>
          )}
        </div>
        {kind && (
          <button
            type="button"
            onClick={() => onRevert(group.entries[0])}
            className={cn(REVERT_BUTTON, sz.revert)}
            title={STRUCTURAL_REVERT[kind].title}
          >
            <Undo2 size={sz.icon} />
            {STRUCTURAL_REVERT[kind].label}
          </button>
        )}
      </div>

      {kind === 'moved' && (
        <div className={cn('text-gray-500 dark:text-gray-400', sz.moved)}>Reihenfolge geändert</div>
      )}
      {!kind && (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {group.entries.map(e => (
            <li key={e.id} className={cn('flex justify-between', sz.row)}>
              <div className="min-w-0 flex-1">
                <div
                  className={cn('font-semibold text-gray-700 dark:text-gray-200', sz.fieldLabel)}
                >
                  {e.fieldLabel}
                </div>
                <FieldChangeDiff entry={e} />
              </div>
              <button
                type="button"
                onClick={() => onRevert(e)}
                className={cn(REVERT_BUTTON, sz.revert)}
              >
                <Undo2 size={sz.icon} /> Zurücksetzen
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function FieldChangeDiff({ entry }: { entry: ChangeEntry }) {
  const t = entry.fieldType
  if (entry.pendingImagePath) {
    const filename = entry.pendingImagePath.split('/').pop() || entry.pendingImagePath
    return (
      <div className="text-[11px] text-gray-500 dark:text-gray-400">
        Neues Bild hochgeladen ·{' '}
        <span className="font-mono text-gray-700 dark:text-gray-300">{filename}</span>
      </div>
    )
  }
  const isTextish = t === 'textarea' || t === 'text' || t === 'email' || t === 'url'
  if (isTextish && typeof entry.before === 'string' && typeof entry.after === 'string') {
    return (
      <div className="text-[11px]">
        <InlineDiff oldVal={entry.before} newVal={entry.after} />
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 min-w-0 flex-wrap">
      <span className="line-through text-gray-400 dark:text-gray-500">
        {summarizeValue(entry.before, t, false)}
      </span>
      <ArrowRight size={10} className="shrink-0 text-gray-400" />
      <span className="font-medium text-gray-700 dark:text-gray-300">
        {summarizeValue(entry.after, t, false)}
      </span>
    </div>
  )
}

export function InlineDiff({ oldVal, newVal }: { oldVal?: unknown; newVal?: unknown }) {
  const a = typeof oldVal === 'string' ? oldVal : JSON.stringify(oldVal ?? '')
  const b = typeof newVal === 'string' ? newVal : JSON.stringify(newVal ?? '')

  if (a.length < 80 && b.length < 80 && !a.includes(' ') && !b.includes(' ')) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-red-500 line-through bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded">
          {a}
        </span>
        <span className="text-gray-400">→</span>
        <span className="text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded">
          {b}
        </span>
      </div>
    )
  }

  const wordsA = a.split(/(\s+)/)
  const wordsB = b.split(/(\s+)/)
  const segments = wordDiff(wordsA, wordsB)

  return (
    <div className="whitespace-pre-wrap wrap-break-word leading-relaxed">
      {segments.map((seg, i) => {
        if (seg.type === 'equal')
          return (
            <span key={i} className="text-gray-500 dark:text-gray-400">
              {seg.text}
            </span>
          )
        if (seg.type === 'removed')
          return (
            <span
              key={i}
              className="text-red-500 line-through bg-red-50 dark:bg-red-900/20 rounded px-0.5"
            >
              {seg.text}
            </span>
          )
        return (
          <span
            key={i}
            className="text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded px-0.5"
          >
            {seg.text}
          </span>
        )
      })}
    </div>
  )
}

function wordDiff(
  a: string[],
  b: string[],
): { type: 'equal' | 'removed' | 'added'; text: string }[] {
  const m = a.length,
    n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])

  const result: { type: 'equal' | 'removed' | 'added'; text: string }[] = []
  let i = m,
    j = n
  const stack: typeof result = []
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      stack.push({ type: 'equal', text: a[i - 1] })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      stack.push({ type: 'added', text: b[j - 1] })
      j--
    } else {
      stack.push({ type: 'removed', text: a[i - 1] })
      i--
    }
  }
  stack.reverse()

  for (const seg of stack) {
    if (result.length > 0 && result[result.length - 1].type === seg.type) {
      result[result.length - 1].text += seg.text
    } else {
      result.push({ ...seg })
    }
  }
  return result
}
