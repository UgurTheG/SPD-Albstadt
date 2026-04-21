import {useMemo, useState} from 'react'
import {AnimatePresence, motion} from 'framer-motion'
import {ArrowRight, ChevronDown, History, Plus, Trash2, Undo2} from 'lucide-react'
import type {TabConfig} from '../types'
import {useAdminStore} from '../store'
import {diffTab, summarizeValue, type ChangeEntry} from '../lib/diff'

interface Props {
    tab: TabConfig
}

export default function ChangeList({tab}: Props) {
    const state = useAdminStore(s => s.state[tab.key])
    const original = useAdminStore(s => s.originalState[tab.key])
    const revertChange = useAdminStore(s => s.revertChange)
    const [open, setOpen] = useState(false)

    const entries = useMemo(() => diffTab(tab, original, state), [tab, original, state])

    if (entries.length === 0) return null

    // Group by (group + item) so multiple field edits on the same item collapse together
    const groups = groupEntries(entries)

    return (
        <div className="mb-6">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-50/80 to-amber-50/40 dark:from-amber-900/20 dark:to-amber-900/5 border border-amber-200/60 dark:border-amber-800/40 hover:from-amber-50 hover:to-amber-50/60 dark:hover:from-amber-900/30 transition-all group"
            >
                <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                    <History size={14} className="text-amber-600 dark:text-amber-400"/>
                </div>
                <div className="flex-1 min-w-0 text-left">
                    <div className="text-xs font-bold text-amber-800 dark:text-amber-200 flex items-center gap-2">
                        Ungespeicherte Änderungen
                        <span className="text-[10px] font-bold bg-amber-200/80 dark:bg-amber-800/60 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-full">
                            {entries.length}
                        </span>
                    </div>
                    <div className="text-[11px] text-amber-700/80 dark:text-amber-300/70 mt-0.5 truncate">
                        Jede Änderung einzeln zurücksetzbar
                    </div>
                </div>
                <ChevronDown size={16}
                             className={`text-amber-600 dark:text-amber-400 transition-transform duration-200 shrink-0 ${open ? 'rotate-180' : ''}`}/>
            </button>

            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        initial={{opacity: 0, height: 0}}
                        animate={{opacity: 1, height: 'auto'}}
                        exit={{opacity: 0, height: 0}}
                        transition={{duration: 0.2}}
                        className="overflow-hidden"
                    >
                        <div className="pt-3 flex flex-col gap-3">
                            {groups.map(g => (
                                <GroupCard key={g.key} group={g} onRevert={e => revertChange(tab.key, e)}/>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

interface Group {
    key: string
    group: string
    itemLabel?: string
    itemIndex?: number
    itemKind: 'modified' | 'added' | 'removed'
    entries: ChangeEntry[]
}

function groupEntries(entries: ChangeEntry[]): Group[] {
    const map = new Map<string, Group>()
    for (const e of entries) {
        const key = [e.group, e.groupKey ?? '-', e.itemIndex ?? '-', e.kind === 'modified' ? 'm' : e.kind].join('|')
        let g = map.get(key)
        if (!g) {
            g = {
                key,
                group: e.group,
                itemLabel: e.itemLabel,
                itemIndex: e.itemIndex,
                itemKind: e.kind === 'modified' ? 'modified' : e.kind,
                entries: [],
            }
            map.set(key, g)
        }
        g.entries.push(e)
    }
    return [...map.values()]
}

function GroupCard({group, onRevert}: { group: Group; onRevert: (entry: ChangeEntry) => void }) {
    const isStructural = group.itemKind !== 'modified'
    const structural = isStructural ? group.entries[0] : undefined

    return (
        <div
            className="bg-white/70 dark:bg-gray-900/40 backdrop-blur-sm border border-gray-200/60 dark:border-gray-700/40 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-gray-50/80 dark:bg-gray-800/30 border-b border-gray-200/50 dark:border-gray-700/40">
                <div className="flex items-center gap-2 min-w-0">
                    {group.itemKind === 'added' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                            <Plus size={10}/> Neu
                        </span>
                    )}
                    {group.itemKind === 'removed' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300">
                            <Trash2 size={10}/> Entfernt
                        </span>
                    )}
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">
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
                        title={group.itemKind === 'added' ? 'Diesen neuen Eintrag verwerfen' : 'Entfernten Eintrag wiederherstellen'}
                    >
                        <Undo2 size={11}/>
                        {group.itemKind === 'added' ? 'Verwerfen' : 'Wiederherstellen'}
                    </button>
                )}
            </div>

            {!isStructural && (
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                    {group.entries.map(e => (
                        <li key={e.id}
                            className="flex items-center justify-between gap-3 px-4 py-3">
                            <div className="min-w-0 flex-1">
                                <div className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                                    {e.fieldLabel}
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 min-w-0">
                                    <span className="line-through text-gray-400 dark:text-gray-500 truncate max-w-[40%]">
                                        {summarizeValue(e.before, e.fieldType)}
                                    </span>
                                    <ArrowRight size={10} className="shrink-0 text-gray-400"/>
                                    <span className="font-medium text-gray-700 dark:text-gray-300 truncate max-w-[55%]">
                                        {summarizeValue(e.after, e.fieldType)}
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => onRevert(e)}
                                className="shrink-0 text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 px-2.5 py-1 rounded-lg border border-amber-300/60 dark:border-amber-700/40 transition-colors flex items-center gap-1.5"
                            >
                                <Undo2 size={11}/> Zurücksetzen
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
