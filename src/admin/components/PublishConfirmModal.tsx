import {useMemo} from 'react'
import {Loader2, Rocket, Undo2, X} from 'lucide-react'
import {motion} from 'framer-motion'
import type {TabConfig} from '../types'
import {useAdminStore} from '../store'
import {TABS} from '../config/tabs'
import {diffTab, type ChangeEntry, type ChangeKind} from '../lib/diff'
import {FieldChangeDiff} from './DiffDisplay'

interface Props {
    tabKey?: string
    onConfirm: () => void
    onCancel: () => void
}

interface ChangeGroup {
    key: string
    group: string
    itemLabel?: string
    itemKind: ChangeKind
    entries: ChangeEntry[]
}

function groupChangeEntries(entries: ChangeEntry[]): ChangeGroup[] {
    const map = new Map<string, ChangeGroup>()
    for (const e of entries) {
        const gkey = [e.group, e.groupKey ?? '-', e.itemIndex ?? '-', e.kind === 'modified' ? 'm' : e.kind].join('|')
        let g = map.get(gkey)
        if (!g) {
            g = {key: gkey, group: e.group, itemLabel: e.itemLabel, itemKind: e.kind, entries: []}
            map.set(gkey, g)
        }
        g.entries.push(e)
    }
    return [...map.values()]
}

export default function PublishConfirmModal({tabKey, onConfirm, onCancel}: Props) {
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
            if (!tab.file || tab.type === 'haushaltsreden') continue
            const entries = diffTab(tab as TabConfig, originalState[tab.key], state[tab.key], pendingImagePaths)
            if (entries.length > 0) {
                result.push({tab: tab as TabConfig, entries, groups: groupChangeEntries(entries)})
            }
        }
        return result
    }, [state, originalState, tabKey, pendingUploads])

    const totalChanges = tabChanges.reduce((sum, tc) => sum + tc.entries.length, 0)

    return (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
             onClick={onCancel}>
            <motion.div
                initial={{opacity: 0, scale: 0.95, y: 10}}
                animate={{opacity: 1, scale: 1, y: 0}}
                exit={{opacity: 0, scale: 0.95, y: 10}}
                transition={{duration: 0.2}}
                className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl rounded-3xl p-5 sm:p-7 max-w-lg w-full max-h-[85vh] overflow-y-auto border border-white/50 dark:border-gray-700/50 shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-spd-red/10 dark:bg-spd-red/20 flex items-center justify-center">
                            <Rocket size={18} className="text-spd-red"/>
                        </div>
                        <div>
                            <h3 className="text-base font-bold dark:text-white">Veröffentlichen bestätigen</h3>
                            <p className="text-xs text-gray-400">
                                {totalChanges} Änderung{totalChanges !== 1 ? 'en' : ''} in {tabChanges.length} Tab{tabChanges.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                    <button onClick={onCancel}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 w-8 h-8 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors">
                        <X size={16}/>
                    </button>
                </div>

                {/* Changes preview */}
                <div className="space-y-5 mb-6">
                    {tabChanges.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">Keine Änderungen mehr vorhanden.</p>
                    ) : tabChanges.map(tc => (
                        <div key={tc.tab.key}>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-bold text-gray-900 dark:text-white">{tc.tab.label}</span>
                                <span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                                    {tc.entries.length}
                                </span>
                            </div>
                            <div className="space-y-2">
                                {tc.groups.map(g => (
                                    <PublishChangeGroup key={g.key} group={g} tabKey={tc.tab.key} onRevert={revertChange}/>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2">
                    <button
                        className="text-xs px-4 py-2.5 rounded-xl border border-gray-200/60 dark:border-gray-700/40 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-all"
                        onClick={onCancel}>
                        Abbrechen
                    </button>
                    <button
                        className="text-xs px-4 py-2.5 rounded-xl bg-spd-red hover:bg-spd-red-dark text-white font-bold shadow-sm shadow-spd-red/25 hover:shadow-lg hover:shadow-spd-red/35 active:scale-[0.98] transition-colors flex items-center gap-2 disabled:cursor-wait disabled:hover:bg-spd-red disabled:active:scale-100 whitespace-nowrap [hyphens:none]"
                        onClick={onConfirm}
                        disabled={publishing || totalChanges === 0}
                    >
                        {publishing ? (
                            <Loader2 size={14} strokeWidth={2.5} className="animate-spin shrink-0"/>
                        ) : (
                            <Rocket size={14} strokeWidth={2.5} className="shrink-0"/>
                        )}
                        <span className="whitespace-nowrap">{publishing ? 'Veröffentliche…' : 'Ja, veröffentlichen'}</span>
                    </button>
                </div>
            </motion.div>
        </div>
    )
}

function PublishChangeGroup({group, tabKey, onRevert}: {
    group: ChangeGroup
    tabKey: string
    onRevert: (tabKey: string, entry: ChangeEntry) => void
}) {
    const isStructural = group.itemKind !== 'modified'
    const structural = isStructural ? group.entries[0] : undefined

    return (
        <div className="rounded-xl border border-gray-200/60 dark:border-gray-700/40 overflow-hidden bg-white/50 dark:bg-gray-800/30 text-[11px]">
            <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-gray-50/80 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-700/30">
                <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                    {group.itemKind === 'added' && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">Neu</span>
                    )}
                    {group.itemKind === 'removed' && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300">Entfernt</span>
                    )}
                    {group.itemKind === 'moved' && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">Verschoben</span>
                    )}
                    <span className="font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 text-[9px]">{group.group}</span>
                    {group.itemLabel && (
                        <>
                            <span className="text-gray-300 dark:text-gray-600">·</span>
                            <span className="font-semibold text-gray-700 dark:text-gray-200">{group.itemLabel}</span>
                        </>
                    )}
                </div>
                {structural && (
                    <button
                        onClick={() => onRevert(tabKey, structural)}
                        className="shrink-0 font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 px-2 py-0.5 rounded-md border border-amber-300/60 dark:border-amber-700/40 transition-colors flex items-center gap-1"
                    >
                        <Undo2 size={9}/>
                        {group.itemKind === 'added' ? 'Verwerfen' : group.itemKind === 'moved' ? 'Zurücksetzen' : 'Wiederherstellen'}
                    </button>
                )}
            </div>
            {group.itemKind === 'moved' && (
                <div className="px-2.5 py-1.5 text-gray-500 dark:text-gray-400">
                    Reihenfolge geändert
                </div>
            )}
            {!isStructural && (
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                    {group.entries.map(e => (
                        <li key={e.id} className="flex items-center justify-between gap-2 px-2.5 py-1.5">
                            <div className="min-w-0 flex-1">
                                <div className="text-[10px] font-semibold text-gray-700 dark:text-gray-200 mb-0.5">{e.fieldLabel}</div>
                                <FieldChangeDiff entry={e}/>
                            </div>
                            <button
                                onClick={() => onRevert(tabKey, e)}
                                className="shrink-0 font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 px-2 py-0.5 rounded-md border border-amber-300/60 dark:border-amber-700/40 transition-colors flex items-center gap-1"
                            >
                                <Undo2 size={9}/> Zurücksetzen
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
