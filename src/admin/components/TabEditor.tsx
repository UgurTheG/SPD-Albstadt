import {useEffect, useState} from 'react'
import {ChevronRight, Download, Rocket, Undo2, X} from 'lucide-react'
import {AnimatePresence, motion} from 'framer-motion'
import type {SectionConfig, TabConfig} from '../types'
import {useAdminStore} from '../store'
import FieldRenderer from './FieldRenderer'
import ArrayEditor from './ArrayEditor'
import OrphanModal from './OrphanModal'

interface Props {
    tab: TabConfig
}

export default function TabEditor({tab}: Props) {
    const state = useAdminStore(s => s.state)
    const publishTab = useAdminStore(s => s.publishTab)
    const publishing = useAdminStore(s => s.publishing)
    const dirtyTabs = useAdminStore(s => s.dirtyTabs)
    const findOrphanImagesForTab = useAdminStore(s => s.findOrphanImagesForTab)
    const revertTab = useAdminStore(s => s.revertTab)
    const [orphans, setOrphans] = useState<string[] | null>(null)
    const [confirmRevert, setConfirmRevert] = useState(false)

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

            {/* Action bar */}
            <div className="flex items-center justify-end gap-1.5 sm:gap-2 mb-6 flex-wrap">
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
