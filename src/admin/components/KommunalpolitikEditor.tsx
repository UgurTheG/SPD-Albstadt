import {useEffect, useState} from 'react'
import {
    ChevronDown,
    ChevronUp,
    Eye,
    Loader2,
    Plus,
    Redo2,
    Rocket,
    ToggleLeft,
    ToggleRight,
    Trash2,
    Undo2,
} from 'lucide-react'
import {AnimatePresence, motion} from 'framer-motion'
import {useAdminStore} from '../store'
import ArrayEditor from './ArrayEditor'
import OrphanModal from './OrphanModal'
import PreviewModal from './PreviewModal'
import PublishConfirmModal from './PublishConfirmModal'
import type {FieldConfig} from '../types'

interface KommunalpolitikPerson {
    name: string
    rolle?: string
    bildUrl?: string
    email?: string
    bio?: string
}

interface KommunalpolitikJahr {
    id: string
    jahr: string
    aktiv: boolean
    personen: KommunalpolitikPerson[]
}

interface KommunalpolitikData {
    sichtbar: boolean
    beschreibung: string
    jahre: KommunalpolitikJahr[]
}

const PERSON_FIELDS: FieldConfig[] = [
    {key: 'name', label: 'Name', type: 'text', required: true},
    {key: 'rolle', label: 'Rolle / Amt', type: 'text'},
    {key: 'bildUrl', label: 'Profilbild', type: 'image', imageDir: 'kommunalpolitik'},
    {key: 'email', label: 'E-Mail', type: 'email'},
    {key: 'bio', label: 'Biografie', type: 'textarea'},
]

const inputCls = 'w-full bg-white/60 dark:bg-gray-800/40 border border-gray-200/80 dark:border-gray-700/60 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-spd-red/20 focus:border-spd-red/40 focus:bg-white dark:focus:bg-gray-800/80 dark:text-white dark:placeholder-gray-500 transition-all duration-200 backdrop-blur-sm'

export default function KommunalpolitikEditor() {
    const state = useAdminStore(s => s.state)
    const updateState = useAdminStore(s => s.updateState)
    const publishTab = useAdminStore(s => s.publishTab)
    const publishing = useAdminStore(s => s.publishing)
    const findOrphanImagesForTab = useAdminStore(s => s.findOrphanImagesForTab)
    const undo = useAdminStore(s => s.undo)
    const redo = useAdminStore(s => s.redo)
    const undoStacks = useAdminStore(s => s.undoStacks)
    const redoStacks = useAdminStore(s => s.redoStacks)
    const hasLoadError = useAdminStore(s => s.dataLoadErrors.includes('kommunalpolitik'))
    const isDirty = useAdminStore(s => s.dirtyTabs().has('kommunalpolitik'))

    const [orphans, setOrphans] = useState<string[] | null>(null)
    const [showPreview, setShowPreview] = useState(false)
    const [showPublishConfirm, setShowPublishConfirm] = useState(false)
    const [expandedJahrIds, setExpandedJahrIds] = useState<Set<string>>(new Set())

    const canUndo = (undoStacks['kommunalpolitik']?.length ?? 0) > 0
    const canRedo = (redoStacks['kommunalpolitik']?.length ?? 0) > 0

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement).tagName
            const isTextInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' ||
                (e.target as HTMLElement).isContentEditable
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                if (isTextInput) return
                e.preventDefault()
                if (e.shiftKey) redo('kommunalpolitik')
                else undo('kommunalpolitik')
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                if (isTextInput) return
                e.preventDefault()
                redo('kommunalpolitik')
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [undo, redo])

    const rawData = state['kommunalpolitik']
    const data: KommunalpolitikData = (rawData && typeof rawData === 'object' && !Array.isArray(rawData))
        ? rawData as KommunalpolitikData
        : {sichtbar: false, beschreibung: '', jahre: []}

    const update = (patch: Partial<KommunalpolitikData>) => {
        updateState('kommunalpolitik', {...data, ...patch})
    }

    const handlePublish = () => setShowPublishConfirm(true)

    const handlePublishConfirmed = () => {
        setShowPublishConfirm(false)
        const o = findOrphanImagesForTab('kommunalpolitik')
        if (o.length > 0) {
            setOrphans(o)
            return
        }
        publishTab('kommunalpolitik')
    }

    const addJahr = () => {
        const newJahr: KommunalpolitikJahr = {
            id: crypto.randomUUID?.() ?? String(Date.now()),
            jahr: String(new Date().getFullYear()),
            aktiv: true,
            personen: [],
        }
        const newJahre = [...data.jahre, newJahr]
        update({jahre: newJahre})
        setExpandedJahrIds(prev => new Set([...prev, newJahr.id]))
    }

    const removeJahr = (id: string) => {
        update({jahre: data.jahre.filter(j => j.id !== id)})
        setExpandedJahrIds(prev => {
            const next = new Set(prev)
            next.delete(id)
            return next
        })
    }

    const toggleJahrAktiv = (id: string) => {
        update({
            jahre: data.jahre.map(j =>
                j.id === id ? {...j, aktiv: !j.aktiv} : j
            ),
        })
    }

    const updateJahrName = (id: string, name: string) => {
        update({
            jahre: data.jahre.map(j =>
                j.id === id ? {...j, jahr: name} : j
            ),
        })
    }

    const updatePersonen = (jahrId: string, personen: Record<string, unknown>[]) => {
        update({
            jahre: data.jahre.map(j =>
                j.id === jahrId
                    ? {...j, personen: personen as unknown as KommunalpolitikPerson[]}
                    : j
            ),
        })
    }

    const toggleExpand = (id: string) => {
        setExpandedJahrIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    return (
        <div>
            {orphans && (
                <OrphanModal
                    orphans={orphans}
                    onConfirm={toDelete => {
                        setOrphans(null)
                        publishTab('kommunalpolitik', toDelete.length > 0 ? toDelete : undefined)
                    }}
                    onKeep={() => {
                        setOrphans(null)
                        publishTab('kommunalpolitik')
                    }}
                    onCancel={() => setOrphans(null)}
                />
            )}
            {showPreview && (
                <PreviewModal path="/kommunalpolitik" onClose={() => setShowPreview(false)}/>
            )}
            {showPublishConfirm && (
                <PublishConfirmModal
                    onConfirm={handlePublishConfirmed}
                    onCancel={() => setShowPublishConfirm(false)}
                />
            )}

            {/* Toolbar */}
            <div className="flex items-center gap-2 mb-6 flex-wrap">
                <button
                    type="button"
                    onClick={() => undo('kommunalpolitik')}
                    disabled={!canUndo}
                    title="Rückgängig (Ctrl+Z)"
                    className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                    <Undo2 size={15}/>
                </button>
                <button
                    type="button"
                    onClick={() => redo('kommunalpolitik')}
                    disabled={!canRedo}
                    title="Wiederholen (Ctrl+Y)"
                    className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                    <Redo2 size={15}/>
                </button>
                <button
                    type="button"
                    onClick={() => setShowPreview(true)}
                    title="Vorschau"
                    className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-all"
                >
                    <Eye size={15}/>
                </button>
                <div className="flex-1"/>
                <button
                    type="button"
                    onClick={handlePublish}
                    disabled={publishing || !isDirty || hasLoadError}
                    title={hasLoadError ? 'Daten konnten nicht geladen werden' : undefined}
                    className="flex items-center gap-2 bg-spd-red hover:bg-spd-red-dark text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-sm shadow-spd-red/25 hover:shadow-lg hover:shadow-spd-red/35 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-spd-red disabled:active:scale-100"
                >
                    {publishing
                        ? <Loader2 size={14} strokeWidth={2.5} className="animate-spin"/>
                        : <Rocket size={14} strokeWidth={2.5}/>
                    }
                    {publishing ? 'Veröffentliche…' : 'Veröffentlichen'}
                </button>
            </div>

            {/* Sichtbar toggle */}
            <div className="bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/40 rounded-2xl p-5 mb-6">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                            Auf der Homepage anzeigen
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            Zeigt den Kommunalpolitik-Tab in der Navigation
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => update({sichtbar: !data.sichtbar})}
                        className={`shrink-0 transition-colors ${data.sichtbar ? 'text-spd-red' : 'text-gray-300 dark:text-gray-600'}`}
                        title={data.sichtbar ? 'Ausblenden' : 'Einblenden'}
                    >
                        {data.sichtbar
                            ? <ToggleRight size={36} strokeWidth={1.5}/>
                            : <ToggleLeft size={36} strokeWidth={1.5}/>
                        }
                    </button>
                </div>
            </div>

            {/* Beschreibung */}
            <div className="bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/40 rounded-2xl p-5 mb-6">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Beschreibung
                </label>
                <textarea
                    value={data.beschreibung}
                    onChange={e => update({beschreibung: e.target.value})}
                    rows={3}
                    placeholder="Kurze Beschreibung der Kommunalpolitik-Seite…"
                    className={inputCls + ' resize-none'}
                />
            </div>

            {/* Jahre */}
            <div className="space-y-1 mb-4">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Jahre</h3>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            {data.jahre.length} {data.jahre.length === 1 ? 'Jahr' : 'Jahre'} angelegt
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={addJahr}
                        className="flex items-center gap-1.5 text-xs font-semibold text-spd-red border border-spd-red/30 hover:bg-spd-red hover:text-white transition-all px-3 py-2 rounded-xl"
                    >
                        <Plus size={13}/> Jahr hinzufügen
                    </button>
                </div>

                {data.jahre.length === 0 && (
                    <div className="text-center py-12 text-sm text-gray-400 dark:text-gray-500">
                        Noch keine Jahre angelegt. Klicke auf „Jahr hinzufügen".
                    </div>
                )}

                <AnimatePresence initial={false}>
                    {data.jahre.map((jahr) => {
                        const expanded = expandedJahrIds.has(jahr.id)
                        return (
                            <motion.div
                                key={jahr.id}
                                layout
                                initial={{opacity: 0, y: 10}}
                                animate={{opacity: 1, y: 0}}
                                exit={{opacity: 0, height: 0, overflow: 'hidden'}}
                                transition={{duration: 0.2}}
                                className="bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/40 rounded-2xl overflow-hidden"
                            >
                                {/* Year header */}
                                <div className="flex items-center gap-3 px-4 py-3">
                                    {/* Aktiv toggle */}
                                    <button
                                        type="button"
                                        onClick={() => toggleJahrAktiv(jahr.id)}
                                        title={jahr.aktiv ? 'Ausblenden' : 'Einblenden'}
                                        className={`shrink-0 transition-colors ${jahr.aktiv ? 'text-spd-red' : 'text-gray-300 dark:text-gray-600'}`}
                                    >
                                        {jahr.aktiv
                                            ? <ToggleRight size={26} strokeWidth={1.5}/>
                                            : <ToggleLeft size={26} strokeWidth={1.5}/>
                                        }
                                    </button>

                                    {/* Year name */}
                                    <input
                                        type="text"
                                        value={jahr.jahr}
                                        onChange={e => updateJahrName(jahr.id, e.target.value)}
                                        placeholder="z.B. 2024"
                                        className="flex-1 bg-transparent border-none outline-none text-sm font-semibold text-gray-800 dark:text-gray-200 placeholder-gray-300 dark:placeholder-gray-600 min-w-0"
                                        onClick={e => e.stopPropagation()}
                                    />

                                    {/* Person count badge */}
                                    <span className="shrink-0 text-[11px] font-semibold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-lg">
                                        {jahr.personen.length} Person{jahr.personen.length !== 1 ? 'en' : ''}
                                    </span>

                                    {/* Delete */}
                                    <button
                                        type="button"
                                        onClick={() => removeJahr(jahr.id)}
                                        className="shrink-0 w-7 h-7 flex items-center justify-center rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                                        title="Jahr löschen"
                                    >
                                        <Trash2 size={13}/>
                                    </button>

                                    {/* Expand toggle */}
                                    <button
                                        type="button"
                                        onClick={() => toggleExpand(jahr.id)}
                                        className="shrink-0 w-7 h-7 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-all"
                                    >
                                        {expanded ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
                                    </button>
                                </div>

                                {/* Persons editor */}
                                <AnimatePresence initial={false}>
                                    {expanded && (
                                        <motion.div
                                            initial={{height: 0, opacity: 0}}
                                            animate={{height: 'auto', opacity: 1}}
                                            exit={{height: 0, opacity: 0}}
                                            transition={{duration: 0.25, ease: 'easeInOut'}}
                                            className="overflow-hidden border-t border-gray-200/50 dark:border-gray-700/40"
                                        >
                                            <div className="p-4">
                                                <ArrayEditor
                                                    fields={PERSON_FIELDS}
                                                    data={jahr.personen as unknown as Record<string, unknown>[]}
                                                    tabKey="kommunalpolitik"
                                                    onStructureChange={newPersonen => updatePersonen(jahr.id, newPersonen)}
                                                />
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )
                    })}
                </AnimatePresence>
            </div>
        </div>
    )
}
