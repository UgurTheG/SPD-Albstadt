import {useEffect, useMemo, useState} from 'react'
import {ChevronRight, Download, Eye, FileSearch, Loader2, Plus, Redo2, Rocket, Trash2, Undo2, X} from 'lucide-react'
import {AnimatePresence, motion} from 'framer-motion'
import type {SectionConfig, TabConfig} from '../types'
import {useAdminStore} from '../store'
import {type ChangeEntry, diffTab, groupChangeEntries, type ChangeGroup} from '../lib/diff'
import {FieldChangeDiff} from './DiffDisplay'
import FieldRenderer from './FieldRenderer'
import ArrayEditor from './ArrayEditor'
import OrphanModal from './OrphanModal'
import PreviewModal from './PreviewModal'
import PublishConfirmModal from './PublishConfirmModal'

interface Props {
    tab: TabConfig
}

export default function TabEditor({tab}: Props) {
    const state = useAdminStore(s => s.state)
    const publishTab = useAdminStore(s => s.publishTab)
    const publishing = useAdminStore(s => s.publishing)
    const findOrphanImagesForTab = useAdminStore(s => s.findOrphanImagesForTab)
    const revertTab = useAdminStore(s => s.revertTab)
    const undo = useAdminStore(s => s.undo)
    const redo = useAdminStore(s => s.redo)
    const undoStacks = useAdminStore(s => s.undoStacks)
    const redoStacks = useAdminStore(s => s.redoStacks)
    const [orphans, setOrphans] = useState<string[] | null>(null)
    const [showDiff, setShowDiff] = useState(false)
    const [showPreview, setShowPreview] = useState(false)
    const [showPublishConfirm, setShowPublishConfirm] = useState(false)

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

    // Must be called before any conditional return to satisfy Rules of Hooks.
    // Zustand compares the boolean result — component only re-renders when the
    // dirty flag for this specific tab actually changes.
    const isDirty = useAdminStore(s => s.dirtyTabs().has(tab.key))

    if (!data) return <p className="text-gray-400 text-center py-20">Daten werden geladen…</p>

    const handlePublish = () => {
        setShowPublishConfirm(true)
    }

    const handlePublishConfirmed = () => {
        setShowPublishConfirm(false)
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

            {showPublishConfirm && (
                <PublishConfirmModal
                    tabKey={tab.key}
                    onConfirm={handlePublishConfirmed}
                    onCancel={() => setShowPublishConfirm(false)}
                />
            )}

            {/* Diff modal (also handles revert all) */}
            {showDiff && (
                <DiffModal
                    tab={tab}
                    onClose={() => setShowDiff(false)}
                    onRevertAll={() => {
                        revertTab(tab.key);
                        setShowDiff(false)
                    }}
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
                {/* Diff / Änderungen */}
                {isDirty && (
                    <button type="button" onClick={() => setShowDiff(true)}
                            className="text-[10px] sm:text-xs font-medium text-amber-700 dark:text-amber-400 px-2.5 sm:px-3.5 py-2 rounded-xl border border-amber-300/60 dark:border-amber-700/40 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all flex items-center gap-1.5 sm:gap-2">
                        <FileSearch size={13}/> <span>Änderungen</span>
                    </button>
                )}
                <button type="button" onClick={handleDownload}
                        className="text-[10px] sm:text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2.5 sm:px-3.5 py-2 rounded-xl border border-gray-200/60 dark:border-gray-700/40 hover:border-gray-300 dark:hover:border-gray-600 transition-all flex items-center gap-1.5 sm:gap-2 backdrop-blur-sm bg-white/40 dark:bg-gray-800/30">
                    <Download size={13}/> <span className="hidden sm:inline">Export</span>
                </button>
                <button
                    type="button"
                    onClick={handlePublish}
                    disabled={!isDirty || publishing}
                    className={`shrink-0 text-[10px] sm:text-xs font-bold px-3.5 sm:px-5 py-2 rounded-xl flex items-center gap-2 transition-colors whitespace-nowrap [hyphens:none] ${
                        isDirty
                            ? 'bg-spd-red hover:bg-spd-red-dark text-white shadow-sm shadow-spd-red/25 hover:shadow-lg hover:shadow-spd-red/35 active:scale-[0.98] disabled:cursor-wait disabled:hover:bg-spd-red disabled:active:scale-100'
                            : 'bg-gray-200/60 dark:bg-gray-700/40 text-gray-400 dark:text-gray-500 cursor-not-allowed backdrop-blur-sm'
                    }`}
                >
                    {publishing ? <Loader2 size={14} strokeWidth={2.5} className="animate-spin shrink-0"/> : <Rocket size={14} strokeWidth={2.5} className="shrink-0"/>}
                    <span className="whitespace-nowrap">{publishing ? 'Veröffentliche…' : 'Veröffentlichen'}</span>
                </button>
            </div>

            {/* Sticky publish bar */}
            <StickyPublishBar
                isDirty={isDirty}
                publishing={publishing}
                onPublish={handlePublish}
                onShowDiff={() => setShowDiff(true)}
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
                    <div className="flex-1 h-px bg-linear-to-r from-gray-200 dark:from-gray-700 to-transparent ml-2"/>
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
                <div className="flex-1 h-px bg-linear-to-r from-gray-200 dark:from-gray-700 to-transparent ml-2"/>
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

function StickyPublishBar({isDirty, publishing, onPublish, onShowDiff}: {
    isDirty: boolean; publishing: boolean; onPublish: () => void; onShowDiff: () => void
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
                    className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-6 sm:bottom-6 z-40 lg:right-auto lg:left-1/2 lg:ml-32 lg:-translate-x-1/2"
                >
                    <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-gray-200/60 dark:border-gray-700/60 shadow-2xl shadow-black/10 dark:shadow-black/40 rounded-2xl p-3 flex items-center gap-2 sm:gap-3 [hyphens:none] [text-align:left]">
                        <div className="flex items-center gap-2 px-1 sm:px-2 min-w-0 flex-1 sm:flex-initial">
                            <span className="w-2 h-2 rounded-full bg-spd-red animate-pulse shrink-0"/>
                            <span className="text-xs font-semibold dark:text-gray-200 truncate [hyphens:none]">Ungespeicherte Änderungen</span>
                        </div>
                        <button
                            type="button"
                            onClick={onShowDiff}
                            aria-label="Änderungen anzeigen"
                            className="shrink-0 text-xs font-medium px-2.5 sm:px-3 py-2 rounded-xl border border-amber-300/60 dark:border-amber-700/40 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors flex items-center gap-1.5 whitespace-nowrap [hyphens:none]"
                        >
                            <FileSearch size={12}/>
                            <span className="hidden sm:inline">Änderungen</span>
                        </button>
                        <button
                            type="button"
                            onClick={onPublish}
                            disabled={publishing}
                            className="shrink-0 text-xs font-bold px-3.5 sm:px-4 py-2 rounded-xl bg-spd-red hover:bg-spd-red-dark text-white shadow-sm shadow-spd-red/25 hover:shadow-lg hover:shadow-spd-red/35 active:scale-[0.98] transition-colors transition-shadow flex items-center gap-2 disabled:cursor-wait disabled:active:scale-100 whitespace-nowrap [hyphens:none]"
                        >
                            {publishing ? (
                                <Loader2 size={14} strokeWidth={2.5} className="animate-spin shrink-0"/>
                            ) : (
                                <Rocket size={14} strokeWidth={2.5} className="shrink-0"/>
                            )}
                            <span className="whitespace-nowrap">{publishing ? 'Veröffentliche…' : 'Veröffentlichen'}</span>
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

function DiffModal({tab, onClose, onRevertAll}: { tab: TabConfig; onClose: () => void; onRevertAll: () => void }) {
    const current = useAdminStore(s => s.state[tab.key])
    const original = useAdminStore(s => s.originalState[tab.key])
    const pendingUploads = useAdminStore(s => s.pendingUploads)
    const revertChange = useAdminStore(s => s.revertChange)
    const [confirmRevertAll, setConfirmRevertAll] = useState(false)

    const entries = useMemo(() => {
        const pendingImagePaths = new Set(pendingUploads.map(u => u.ghPath.replace(/^public/, '')))
        return diffTab(tab, original, current, pendingImagePaths)
    }, [tab, original, current, pendingUploads])
    const groups = useMemo(() => groupChangeEntries(entries), [entries])

    return (
        <div className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
             onClick={onClose}>
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
                     <button type="button" onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 w-8 h-8 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors">
                        <X size={16}/>
                    </button>
                </div>
                {groups.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">Keine Änderungen gefunden.</p>
                ) : (
                    <div className="space-y-3">
                        {groups.map(g => (
                            <ChangeGroupBlock key={g.key} group={g}
                                              onRevert={e => revertChange(tab.key, e)}/>
                        ))}
                    </div>
                )}
                <div className="flex items-center justify-between mt-5 gap-2">
                    {entries.length > 0 ? (
                        confirmRevertAll ? (
                            <div className="flex items-center gap-2">
                                <span
                                    className="text-xs text-amber-600 dark:text-amber-400 font-medium">Alle verwerfen?</span>
                                <button type="button"
                                    className="text-xs px-3 py-2 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors flex items-center gap-1.5"
                                    onClick={onRevertAll}>
                                    <Undo2 size={11}/> Ja, alle verwerfen
                                </button>
                                <button type="button"
                                    className="text-xs px-3 py-2 rounded-xl border border-gray-200/60 dark:border-gray-700/40 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-all"
                                    onClick={() => setConfirmRevertAll(false)}>
                                    Abbrechen
                                </button>
                            </div>
                        ) : (
                            <button type="button"
                                className="text-xs px-3 py-2 rounded-xl border border-amber-300/60 dark:border-amber-700/40 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors font-medium flex items-center gap-1.5"
                                onClick={() => setConfirmRevertAll(true)}>
                                <Undo2 size={11}/> Alle zurücksetzen
                            </button>
                        )
                    ) : <div/>}
                    <button type="button" className="text-xs px-4 py-2.5 rounded-xl border border-gray-200/60 dark:border-gray-700/40 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-all"
                            onClick={onClose}>Schließen</button>
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
                        <span
                            className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
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
                        <li key={e.id}
                            className="flex items-start justify-between gap-3 px-3 py-2.5">
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


// ChangeGroup and groupChangeEntries are imported from lib/diff
