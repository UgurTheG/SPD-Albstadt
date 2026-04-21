import {useEffect, useState} from 'react'
import {ChevronRight, Download, Eye, FileSearch, Redo2, Rocket, Undo2, X} from 'lucide-react'
import {AnimatePresence, motion} from 'framer-motion'
import type {SectionConfig, TabConfig} from '../types'
import {useAdminStore} from '../store'
import FieldRenderer from './FieldRenderer'
import ArrayEditor from './ArrayEditor'
import OrphanModal from './OrphanModal'
import PreviewModal from './PreviewModal'

interface Props {
    tab: TabConfig
}

export default function TabEditor({tab}: Props) {
    const state = useAdminStore(s => s.state)
    const originalState = useAdminStore(s => s.originalState)
    const publishTab = useAdminStore(s => s.publishTab)
    const publishing = useAdminStore(s => s.publishing)
    const dirtyTabs = useAdminStore(s => s.dirtyTabs)
    const findOrphanImagesForTab = useAdminStore(s => s.findOrphanImagesForTab)
    const revertTab = useAdminStore(s => s.revertTab)
    const undo = useAdminStore(s => s.undo)
    const redo = useAdminStore(s => s.redo)
    const undoStacks = useAdminStore(s => s.undoStacks)
    const redoStacks = useAdminStore(s => s.redoStacks)
    const [orphans, setOrphans] = useState<string[] | null>(null)
    const [confirmRevert, setConfirmRevert] = useState(false)
    const [showDiff, setShowDiff] = useState(false)
    const [showPreview, setShowPreview] = useState(false)

    const canUndo = (undoStacks[tab.key]?.length ?? 0) > 0
    const canRedo = (redoStacks[tab.key]?.length ?? 0) > 0

    // Keyboard shortcuts for undo/redo
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault()
                if (e.shiftKey) redo(tab.key)
                else undo(tab.key)
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                e.preventDefault()
                redo(tab.key)
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [tab.key, undo, redo])

    const data = state[tab.key]
    if (!data) return <p className="text-gray-400 text-center py-20">Daten werden geladen…</p>

    const isDirty = dirtyTabs().has(tab.key)

    const handlePublish = () => {
        const o = findOrphanImagesForTab(tab.key)
        if (o.length > 0) {
            setOrphans(o);
            return
        }
        publishTab(tab.key)
    }

    const handleDownload = () => {
        if (!tab.file) return
        const filename = tab.file.split('/').pop()!
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'})
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div>
            {orphans && (
                <OrphanModal
                    orphans={orphans}
                    onConfirm={toDelete => {
                        setOrphans(null);
                        publishTab(tab.key, toDelete)
                    }}
                    onKeep={() => {
                        setOrphans(null);
                        publishTab(tab.key)
                    }}
                    onCancel={() => setOrphans(null)}
                />
            )}

            {confirmRevert && (
                <ConfirmRevertModal
                    label={tab.label}
                    onConfirm={() => {
                        revertTab(tab.key);
                        setConfirmRevert(false)
                    }}
                    onCancel={() => setConfirmRevert(false)}
                />
            )}

            {/* Diff modal */}
            {showDiff && (
                <DiffModal
                    original={originalState[tab.key]}
                    current={state[tab.key]}
                    label={tab.label}
                    onClose={() => setShowDiff(false)}
                />
            )}

            {showPreview && (
                <PreviewModal tabKey={tab.key} onClose={() => setShowPreview(false)}/>
            )}

            {/* Action bar */}
            <div className="flex items-center justify-end gap-1.5 sm:gap-2 mb-6 flex-wrap">
                {/* Undo / Redo */}
                <div className="flex items-center gap-0.5 mr-auto">
                    <button type="button" onClick={() => undo(tab.key)} disabled={!canUndo}
                            title="Rückgängig (Ctrl+Z)"
                            className={`p-2 rounded-xl transition-all ${canUndo ? 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800' : 'text-gray-300 dark:text-gray-700 cursor-not-allowed'}`}>
                        <Undo2 size={14}/>
                    </button>
                    <button type="button" onClick={() => redo(tab.key)} disabled={!canRedo}
                            title="Wiederherstellen (Ctrl+Shift+Z)"
                            className={`p-2 rounded-xl transition-all ${canRedo ? 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800' : 'text-gray-300 dark:text-gray-700 cursor-not-allowed'}`}>
                        <Redo2 size={14}/>
                    </button>
                </div>
                {/* Preview */}
                {tab.previewPath && (
                    <button type="button" onClick={() => setShowPreview(true)}
                            className="text-[10px] sm:text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2.5 sm:px-3.5 py-2 rounded-xl border border-gray-200/60 dark:border-gray-700/40 hover:border-gray-300 dark:hover:border-gray-600 transition-all flex items-center gap-1.5 sm:gap-2 backdrop-blur-sm bg-white/40 dark:bg-gray-800/30">
                        <Eye size={13}/> <span className="hidden sm:inline">Vorschau</span>
                    </button>
                )}
                {/* Diff */}
                {isDirty && (
                    <button type="button" onClick={() => setShowDiff(true)}
                            className="text-[10px] sm:text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2.5 sm:px-3.5 py-2 rounded-xl border border-gray-200/60 dark:border-gray-700/40 hover:border-gray-300 dark:hover:border-gray-600 transition-all flex items-center gap-1.5 sm:gap-2 backdrop-blur-sm bg-white/40 dark:bg-gray-800/30">
                        <FileSearch size={13}/> <span>Änderungen</span>
                    </button>
                )}
                <button type="button" onClick={handleDownload}
                        className="text-[10px] sm:text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2.5 sm:px-3.5 py-2 rounded-xl border border-gray-200/60 dark:border-gray-700/40 hover:border-gray-300 dark:hover:border-gray-600 transition-all flex items-center gap-1.5 sm:gap-2 backdrop-blur-sm bg-white/40 dark:bg-gray-800/30">
                    <Download size={13}/> <span className="hidden sm:inline">Export</span>
                </button>
                <button
                    type="button"
                    onClick={() => setConfirmRevert(true)}
                    disabled={!isDirty || publishing}
                    className={`text-[10px] sm:text-xs font-medium px-2.5 sm:px-3.5 py-2 rounded-xl flex items-center gap-1.5 sm:gap-2 transition-all duration-200 border ${
                        isDirty
                            ? 'text-amber-700 dark:text-amber-400 border-amber-300/60 dark:border-amber-700/40 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                            : 'text-gray-300 dark:text-gray-600 border-gray-200/60 dark:border-gray-700/40 cursor-not-allowed'
                    }`}
                    title="Alle lokalen Änderungen in diesem Tab verwerfen"
                >
                    <Undo2 size={13}/> <span className="hidden sm:inline">Zurücksetzen</span>
                </button>
                <button
                    type="button"
                    onClick={handlePublish}
                    disabled={!isDirty || publishing}
                    className={`text-[10px] sm:text-xs font-bold px-3 sm:px-5 py-2 rounded-xl flex items-center gap-1.5 sm:gap-2 transition-all duration-200 ${
                        isDirty
                            ? 'bg-gradient-to-r from-spd-red to-spd-red-dark text-white hover:shadow-lg hover:shadow-spd-red/25 hover:scale-[1.02] active:scale-[0.98]'
                            : 'bg-gray-200/60 dark:bg-gray-700/40 text-gray-400 dark:text-gray-500 cursor-not-allowed backdrop-blur-sm'
                    }`}
                >
                    {publishing ? <div
                            className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> :
                        <Rocket size={13}/>}
                    Veröffentlichen
                </button>
            </div>

            {/* Sticky publish bar — visible when scrolled past the top action bar with unsaved changes */}
            <StickyPublishBar
                isDirty={isDirty}
                publishing={publishing}
                onPublish={handlePublish}
                onRevert={() => setConfirmRevert(true)}
            />

            {/* Content */}
            {tab.type === 'array' && tab.fields && (
                <ArrayEditor fields={tab.fields} data={data as Record<string, unknown>[]} tabKey={tab.key}/>
            )}

            {tab.type === 'object' && (
                <ObjectEditor tab={tab} data={data as Record<string, unknown>}/>
            )}
        </div>
    )
}

function ObjectEditor({tab, data}: { tab: TabConfig; data: Record<string, unknown> }) {
    const updateState = useAdminStore(s => s.updateState)

    const updateField = (key: string, value: unknown) => {
        const clone = JSON.parse(JSON.stringify(data))
        clone[key] = value
        updateState(tab.key, clone)
    }

    const updateSection = (sectionKey: string, value: unknown) => {
        const clone = JSON.parse(JSON.stringify(data))
        clone[sectionKey] = value
        updateState(tab.key, clone)
    }

    return (
        <div>
            {/* Top-level fields in a card */}
            {tab.topFields && tab.topFields.length > 0 && (
                <div
                    className="bg-white/50 dark:bg-gray-900/30 backdrop-blur-sm border border-gray-200/40 dark:border-gray-700/30 rounded-2xl p-4 sm:p-6 mb-6">
                    {tab.topFields.map(field => (
                        <FieldRenderer
                            key={field.key}
                            field={field}
                            value={data[field.key]}
                            onChange={v => updateField(field.key, v)}
                        />
                    ))}
                </div>
            )}

            {/* Sections */}
            {tab.sections?.map(section => (
                <SectionEditor key={section.key} section={section} data={data} tabKey={tab.key}
                               onSectionChange={(val) => updateSection(section.key, val)}/>
            ))}
        </div>
    )
}

function SectionEditor({section, data, tabKey, onSectionChange}: {
    section: SectionConfig
    data: Record<string, unknown>
    tabKey: string
    onSectionChange: (value: unknown) => void
}) {
    const [open, setOpen] = useState(true)
    const sec = section

    if (sec.isSingleObject) {
        const obj = (data[sec.key] ?? {}) as Record<string, unknown>
        return (
            <div className="mb-6">
                <button type="button" onClick={() => setOpen(!open)}
                        className="flex items-center gap-2 w-full py-3 mb-4 group">
                    <ChevronRight size={14}
                                  className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}/>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">{sec.label}</h3>
                    <div className="flex-1 h-px bg-gradient-to-r from-gray-200 dark:from-gray-700 to-transparent ml-2"/>
                </button>
                <AnimatePresence>
                    {open && (
                        <motion.div
                            initial={{opacity: 0, height: 0}}
                            animate={{opacity: 1, height: 'auto'}}
                            exit={{opacity: 0, height: 0}}
                            transition={{duration: 0.2}}
                            className="overflow-hidden"
                        >
                            <div
                                className="bg-white/50 dark:bg-gray-900/30 backdrop-blur-sm border border-gray-200/40 dark:border-gray-700/30 rounded-2xl p-4 sm:p-6">
                                {sec.fields.map(field => (
                                    <FieldRenderer key={field.key} field={field} value={obj[field.key]} onChange={v => {
                                        onSectionChange({...obj, [field.key]: v})
                                    }}/>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        )
    }

    const arr = (data[sec.key] ?? []) as Record<string, unknown>[]

    return (
        <div className="mb-6">
            <button type="button" onClick={() => setOpen(!open)}
                    className="flex items-center gap-2 w-full py-3 mb-4 group">
                <ChevronRight size={14}
                              className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}/>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                    {sec.label}
                </h3>
                <span
                    className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{arr.length}</span>
                <div className="flex-1 h-px bg-gradient-to-r from-gray-200 dark:from-gray-700 to-transparent ml-2"/>
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{opacity: 0, height: 0}}
                        animate={{opacity: 1, height: 'auto'}}
                        exit={{opacity: 0, height: 0}}
                        transition={{duration: 0.2}}
                        className="overflow-hidden"
                    >
                        <ArrayEditor fields={sec.fields} data={arr} tabKey={tabKey}
                                     onStructureChange={(newArr) => onSectionChange(newArr)}/>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

function StickyPublishBar({isDirty, publishing, onPublish, onRevert}: {
    isDirty: boolean; publishing: boolean; onPublish: () => void; onRevert: () => void
}) {
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        const handler = () => setScrolled(window.scrollY > 220)
        handler()
        window.addEventListener('scroll', handler, {passive: true})
        return () => window.removeEventListener('scroll', handler)
    }, [])

    const visible = isDirty && scrolled

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{opacity: 0, y: 24}}
                    animate={{opacity: 1, y: 0}}
                    exit={{opacity: 0, y: 24}}
                    transition={{duration: 0.2}}
                    className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-6 sm:bottom-6 z-40 lg:left-[calc(16rem+1.5rem)]"
                >
                    <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-gray-200/60 dark:border-gray-700/60 shadow-2xl shadow-black/10 dark:shadow-black/40 rounded-2xl p-3 flex items-center gap-2 sm:gap-3">
                        <div className="flex items-center gap-2 px-2 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-spd-red animate-pulse shrink-0"/>
                            <span className="text-xs font-semibold dark:text-gray-200 truncate">Ungespeicherte Änderungen</span>
                        </div>
                        <button
                            type="button"
                            onClick={onRevert}
                            disabled={publishing}
                            className="text-xs font-medium px-3 py-2 rounded-xl border border-amber-300/60 dark:border-amber-700/40 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors flex items-center gap-1.5"
                        >
                            <Undo2 size={12}/> <span className="hidden sm:inline">Zurücksetzen</span>
                        </button>
                        <button
                            type="button"
                            onClick={onPublish}
                            disabled={publishing}
                            className="text-xs font-bold px-4 py-2 rounded-xl bg-gradient-to-r from-spd-red to-spd-red-dark text-white hover:shadow-lg hover:shadow-spd-red/25 transition-all flex items-center gap-1.5 disabled:opacity-60"
                        >
                            {publishing ? (
                                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                            ) : (
                                <Rocket size={12}/>
                            )}
                            Veröffentlichen
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

function ConfirmRevertModal({label, onConfirm, onCancel}: {
    label: string; onConfirm: () => void; onCancel: () => void
}) {
    return (
        <div className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
             onClick={onCancel}>
            <motion.div
                initial={{opacity: 0, scale: 0.95, y: 10}}
                animate={{opacity: 1, scale: 1, y: 0}}
                exit={{opacity: 0, scale: 0.95, y: 10}}
                transition={{duration: 0.2}}
                className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl rounded-3xl p-6 sm:p-7 max-w-sm w-full border border-white/50 dark:border-gray-700/50 shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                            <Undo2 size={18} className="text-amber-500"/>
                        </div>
                        <h3 className="text-base font-bold dark:text-white">Änderungen verwerfen?</h3>
                    </div>
                    <button onClick={onCancel}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 w-8 h-8 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors">
                        <X size={16}/>
                    </button>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                    Alle lokalen Änderungen im Tab „<span className="font-semibold text-gray-700 dark:text-gray-300">{label}</span>"
                    werden auf den zuletzt veröffentlichten Stand zurückgesetzt. Diese Aktion kann nicht rückgängig gemacht werden.
                </p>
                <div className="flex gap-2 justify-end">
                    <button
                        className="text-xs px-4 py-2.5 rounded-xl border border-gray-200/60 dark:border-gray-700/40 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-all hover:bg-gray-50 dark:hover:bg-gray-800/40"
                        onClick={onCancel}>
                        Abbrechen
                    </button>
                    <button
                        className="text-xs px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold hover:shadow-lg hover:shadow-amber-500/25 transition-all flex items-center gap-1.5"
                        onClick={onConfirm}>
                        <Undo2 size={12}/> Verwerfen
                    </button>
                </div>
            </motion.div>
        </div>
    )
}

function InlineDiff({oldVal, newVal}: { oldVal?: unknown; newVal?: unknown }) {
    const a = typeof oldVal === 'string' ? oldVal : JSON.stringify(oldVal ?? '')
    const b = typeof newVal === 'string' ? newVal : JSON.stringify(newVal ?? '')

    // If both are short non-text (booleans, numbers, URLs), show simple before→after
    if (a.length < 80 && b.length < 80 && !a.includes(' ') && !b.includes(' ')) {
        return (
            <div className="flex items-center gap-2 flex-wrap">
                <span
                    className="text-red-500 line-through bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded">{a}</span>
                <span className="text-gray-400">→</span>
                <span
                    className="text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded">{b}</span>
            </div>
        )
    }

    // Word-level diff using LCS
    const wordsA = a.split(/(\s+)/)
    const wordsB = b.split(/(\s+)/)
    const segments = wordDiff(wordsA, wordsB)

    return (
        <div className="whitespace-pre-wrap break-words leading-relaxed">
            {segments.map((seg, i) => {
                if (seg.type === 'equal') return <span key={i}
                                                       className="text-gray-500 dark:text-gray-400">{seg.text}</span>
                if (seg.type === 'removed') return <span key={i}
                                                         className="text-red-500 line-through bg-red-50 dark:bg-red-900/20 rounded px-0.5">{seg.text}</span>
                return <span key={i}
                             className="text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded px-0.5">{seg.text}</span>
            })}
        </div>
    )
}

function wordDiff(a: string[], b: string[]): { type: 'equal' | 'removed' | 'added'; text: string }[] {
    // LCS table
    const m = a.length, n = b.length
    const dp: number[][] = Array.from({length: m + 1}, () => Array(n + 1).fill(0))
    for (let i = 1; i <= m; i++)
        for (let j = 1; j <= n; j++)
            dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])

    // Backtrack
    const result: { type: 'equal' | 'removed' | 'added'; text: string }[] = []
    let i = m, j = n
    const stack: typeof result = []
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
            stack.push({type: 'equal', text: a[i - 1]})
            i--;
            j--
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            stack.push({type: 'added', text: b[j - 1]})
            j--
        } else {
            stack.push({type: 'removed', text: a[i - 1]})
            i--
        }
    }
    stack.reverse()

    // Merge consecutive segments of same type
    for (const seg of stack) {
        if (result.length > 0 && result[result.length - 1].type === seg.type) {
            result[result.length - 1].text += seg.text
        } else {
            result.push({...seg})
        }
    }
    return result
}

function DiffModal({original, current, label, onClose}: {
    original: unknown; current: unknown; label: string; onClose: () => void
}) {
    const changes = computeDiff(original, current)
    return (
        <div className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
             onClick={onClose}>
            <motion.div
                initial={{opacity: 0, scale: 0.95, y: 10}}
                animate={{opacity: 1, scale: 1, y: 0}}
                exit={{opacity: 0, scale: 0.95, y: 10}}
                transition={{duration: 0.2}}
                className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl rounded-3xl p-5 sm:p-7 max-w-lg w-full max-h-[80vh] overflow-y-auto border border-white/50 dark:border-gray-700/50 shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                            <FileSearch size={18} className="text-blue-500"/>
                        </div>
                        <div>
                            <h3 className="text-base font-bold dark:text-white">Änderungen — {label}</h3>
                            <p className="text-xs text-gray-400">{changes.length} Änderung{changes.length !== 1 ? 'en' : ''}</p>
                        </div>
                    </div>
                    <button onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 w-8 h-8 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors">
                        <X size={16}/>
                    </button>
                </div>
                {changes.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">Keine Änderungen gefunden.</p>
                ) : (
                    <div className="space-y-2">
                        {changes.map((c, i) => (
                            <div key={i} className="text-xs rounded-xl bg-gray-50/80 dark:bg-gray-800/40 p-3 border border-gray-100/80 dark:border-gray-700/40">
                                <div className="font-semibold text-gray-600 dark:text-gray-300 mb-1">{c.path}</div>
                                {c.type === 'added' && <span className="text-green-600 dark:text-green-400">+ Hinzugefügt</span>}
                                {c.type === 'removed' && <span className="text-red-500">− Entfernt</span>}
                                {c.type === 'changed' && c.newVal === undefined && (
                                    <pre className="text-xs text-blue-600 dark:text-blue-400 whitespace-pre-wrap">↕ Verschoben{'\n'}{String(c.oldVal)}</pre>
                                )}
                                {c.type === 'changed' && c.newVal !== undefined && (
                                    <InlineDiff oldVal={c.oldVal} newVal={c.newVal}/>
                                )}
                            </div>
                        ))}
                    </div>
                )}
                <div className="flex justify-end mt-5">
                    <button className="text-xs px-4 py-2.5 rounded-xl border border-gray-200/60 dark:border-gray-700/40 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-all"
                            onClick={onClose}>Schließen</button>
                </div>
            </motion.div>
        </div>
    )
}

interface DiffEntry {
    path: string
    type: 'added' | 'removed' | 'changed'
    oldVal?: unknown
    newVal?: unknown
}

/** Get a human-readable label for an array item */
function itemLabel(item: unknown, index: number): string {
    if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>
        return String(obj.name || obj.titel || obj.title || `#${index + 1}`)
    }
    return `#${index + 1}`
}

/** Get a stable identity key for an array item (used to match items across reorder) */
function itemIdentity(item: unknown): string {
    if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>
        // Try common unique-ish fields first
        for (const key of ['id', 'name', 'titel', 'title', 'slug']) {
            if (obj[key] && typeof obj[key] === 'string') return `__key__${key}:${obj[key]}`
        }
    }
    // Fall back to full content hash
    return JSON.stringify(item)
}

function computeDiff(original: unknown, current: unknown, prefix = ''): DiffEntry[] {
    const changes: DiffEntry[] = []
    if (Array.isArray(original) && Array.isArray(current)) {
        // Build identity maps to detect moves vs real adds/removes/edits
        const origIds = original.map(itemIdentity)
        const currIds = current.map(itemIdentity)

        // Check if this is purely a reorder (same set of identities)
        const origIdSet = new Map<string, number[]>()
        const currIdSet = new Map<string, number[]>()
        origIds.forEach((id, i) => {
            if (!origIdSet.has(id)) origIdSet.set(id, []);
            origIdSet.get(id)!.push(i)
        })
        currIds.forEach((id, i) => {
            if (!currIdSet.has(id)) currIdSet.set(id, []);
            currIdSet.get(id)!.push(i)
        })

        // Match items: for each current item, find its original counterpart
        const origUsed = new Set<number>()
        const matched: { origIdx: number; currIdx: number }[] = []
        const added: number[] = []

        for (let ci = 0; ci < current.length; ci++) {
            const id = currIds[ci]
            const candidates = origIdSet.get(id)
            if (candidates) {
                const oi = candidates.find(i => !origUsed.has(i))
                if (oi !== undefined) {
                    origUsed.add(oi)
                    matched.push({origIdx: oi, currIdx: ci})
                    continue
                }
            }
            added.push(ci)
        }

        const removed: number[] = []
        for (let oi = 0; oi < original.length; oi++) {
            if (!origUsed.has(oi)) removed.push(oi)
        }

        // Detect position changes (moved items)
        const moved: { origIdx: number; currIdx: number; label: string }[] = []
        for (const {origIdx, currIdx} of matched) {
            if (origIdx !== currIdx) {
                moved.push({origIdx, currIdx, label: itemLabel(current[currIdx], currIdx)})
            }
        }

        // Report moves as a single summary entry
        if (moved.length > 0) {
            const movedLabels = moved.map(m => `${m.label} (${m.origIdx + 1} → ${m.currIdx + 1})`)
            const path = prefix ? `${prefix} › Reihenfolge` : 'Reihenfolge'
            changes.push({
                path,
                type: 'changed',
                oldVal: movedLabels.map(l => `• ${l}`).join('\n'),
                newVal: undefined,
            })
        }

        // Report added items
        for (const ci of added) {
            const label = itemLabel(current[ci], ci)
            const path = prefix ? `${prefix} › ${label}` : String(label)
            changes.push({path, type: 'added'})
        }

        // Report removed items
        for (const oi of removed) {
            const label = itemLabel(original[oi], oi)
            const path = prefix ? `${prefix} › ${label}` : String(label)
            changes.push({path, type: 'removed'})
        }

        // Report field-level edits within matched items (content changed, not just moved)
        for (const {origIdx, currIdx} of matched) {
            const origJson = JSON.stringify(original[origIdx])
            const currJson = JSON.stringify(current[currIdx])
            if (origJson !== currJson) {
                const label = itemLabel(current[currIdx], currIdx)
                const path = prefix ? `${prefix} › ${label}` : String(label)
                if (typeof original[origIdx] === 'object' && typeof current[currIdx] === 'object' && original[origIdx] && current[currIdx]) {
                    changes.push(...computeDiff(original[origIdx], current[currIdx], path))
                } else {
                    changes.push({path, type: 'changed', oldVal: original[origIdx], newVal: current[currIdx]})
                }
            }
        }
    } else if (typeof original === 'object' && typeof current === 'object' && original && current) {
        const allKeys = new Set([...Object.keys(original as Record<string, unknown>), ...Object.keys(current as Record<string, unknown>)])
        for (const key of allKeys) {
            const o = (original as Record<string, unknown>)[key]
            const c = (current as Record<string, unknown>)[key]
            const path = prefix ? `${prefix} › ${key}` : key
            if (o === undefined) { changes.push({path, type: 'added', newVal: c}); continue }
            if (c === undefined) { changes.push({path, type: 'removed', oldVal: o}); continue }
            if (JSON.stringify(o) !== JSON.stringify(c)) {
                if (typeof o === 'object' && typeof c === 'object' && o && c) {
                    changes.push(...computeDiff(o, c, path))
                } else {
                    changes.push({path, type: 'changed', oldVal: o, newVal: c})
                }
            }
        }
    }
    return changes
}
