import {useEffect, useMemo, useState} from 'react'
import {FileSearch, Plus, Trash2, Undo2, X} from 'lucide-react'
import {motion} from 'framer-motion'
import {useAdminStore} from '../store'
import {TABS} from '../config/tabs'
import {type ChangeEntry, diffTab, groupChangeEntries, type ChangeGroup} from '../lib/diff'
import {FieldChangeDiff} from './DiffDisplay'
import type {TabConfig} from '../types'

interface Props {
    tabKey: string
    onClose: () => void
    onRevertAll: () => void
}

export default function DiffModal({tabKey, onClose, onRevertAll}: Props) {
    const tab = TABS.find(t => t.key === tabKey) as TabConfig
    const current = useAdminStore(s => s.state[tabKey])
    const original = useAdminStore(s => s.originalState[tabKey])
    const pendingUploads = useAdminStore(s => s.pendingUploads)
    const revertChange = useAdminStore(s => s.revertChange)
    const [confirmRevertAll, setConfirmRevertAll] = useState(false)

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [onClose])

    const entries = useMemo(() => {
        if (!tab) return []
        const pendingImagePaths = new Set(pendingUploads.map(u => u.ghPath.replace(/^public/, '')))
        return diffTab(tab, original, current, pendingImagePaths)
    }, [tab, original, current, pendingUploads])

    const groups = useMemo(() => groupChangeEntries(entries), [entries])

    if (!tab) return null

    return (
        <div
            className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{opacity: 0, scale: 0.95, y: 10}}
                animate={{opacity: 1, scale: 1, y: 0}}
                exit={{opacity: 0, scale: 0.95, y: 10}}
                transition={{duration: 0.2}}
                className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl rounded-3xl p-5 sm:p-7 max-w-lg w-full max-h-[85vh] overflow-y-auto border border-white/50 dark:border-gray-700/50 shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                            <FileSearch size={18} className="text-blue-500"/>
                        </div>
                        <div>
                            <h3 className="text-base font-bold dark:text-white">Änderungen — {tab.label}</h3>
                            <p className="text-xs text-gray-400">
                                {entries.length} Änderung{entries.length !== 1 ? 'en' : ''}
                                {entries.length > 0 && ' · Einzeln oder alle zurücksetzbar'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 w-8 h-8 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors"
                    >
                        <X size={16}/>
                    </button>
                </div>

                {groups.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">Keine Änderungen gefunden.</p>
                ) : (
                    <div className="space-y-3">
                        {groups.map(g => (
                            <ChangeGroupBlock
                                key={g.key}
                                group={g}
                                onRevert={e => revertChange(tabKey, e)}
                            />
                        ))}
                    </div>
                )}

                <div className="flex items-center justify-between mt-5 gap-2">
                    {entries.length > 0 ? (
                        confirmRevertAll ? (
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Alle verwerfen?</span>
                                <button
                                    type="button"
                                    className="text-xs px-3 py-2 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors flex items-center gap-1.5"
                                    onClick={onRevertAll}
                                >
                                    <Undo2 size={11}/> Ja, alle verwerfen
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
                                <Undo2 size={11}/> Alle zurücksetzen
                            </button>
                        )
                    ) : <div/>}
                    <button
                        type="button"
                        className="text-xs px-4 py-2.5 rounded-xl border border-gray-200/60 dark:border-gray-700/40 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-all"
                        onClick={onClose}
                    >
                        Schließen
                    </button>
                </div>
            </motion.div>
        </div>
    )
}

function ChangeGroupBlock({group, onRevert}: {
    group: ChangeGroup
    onRevert: (entry: ChangeEntry) => void
}) {
    const isStructural = group.itemKind !== 'modified'
    const structural = isStructural ? group.entries[0] : undefined

    return (
        <div className="rounded-2xl border border-gray-200/60 dark:border-gray-700/40 overflow-hidden bg-white/50 dark:bg-gray-800/30">
            <div className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50/80 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-700/30">
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
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
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">{group.itemLabel}</span>
                        </>
                    )}
                </div>
                {structural && (
                    <button
                        type="button"
                        onClick={() => onRevert(structural)}
                        className="shrink-0 text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 px-2.5 py-1 rounded-lg border border-amber-300/60 dark:border-amber-700/40 transition-colors flex items-center gap-1.5"
                        title={group.itemKind === 'added' ? 'Diesen neuen Eintrag verwerfen' : group.itemKind === 'moved' ? 'Position zurücksetzen' : 'Entfernten Eintrag wiederherstellen'}
                    >
                        <Undo2 size={11}/>
                        {group.itemKind === 'added' ? 'Verwerfen' : group.itemKind === 'moved' ? 'Zurücksetzen' : 'Wiederherstellen'}
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
                                <div className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">{e.fieldLabel}</div>
                                <FieldChangeDiff entry={e}/>
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
