import {useEffect, useRef, useState} from 'react'
import {
    AlertTriangle,
    ChevronDown,
    ChevronUp,
    Download,
    ExternalLink,
    Eye,
    FileSearch,
    FileUp,
    Link as LinkIcon,
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
import DiffModal from './DiffModal'
import OrphanModal from './OrphanModal'
import PreviewModal from './PreviewModal'
import PublishConfirmModal from './PublishConfirmModal'
import StickyPublishBar from './StickyPublishBar'
import {fileToBase64, slugify} from '../lib/images'
import type {FieldConfig} from '../types'

interface KommunalpolitikPerson {
    name: string
    rolle?: string
    bildUrl?: string
    email?: string
    bio?: string
    stadt?: string
}

interface Dokument {
    id: string
    titel: string
    url: string
}

interface KommunalpolitikJahr {
    id: string
    jahr: string
    aktiv: boolean
    gemeinderaete: KommunalpolitikPerson[]
    kreisraete: KommunalpolitikPerson[]
    dokumente: Dokument[]
}

interface KommunalpolitikData {
    sichtbar: boolean
    beschreibung: string
    jahre: KommunalpolitikJahr[]
}

const PERSON_FIELDS: FieldConfig[] = [
    {key: 'name', label: 'Name', type: 'text', required: true},
    {key: 'rolle', label: 'Rolle / Amt', type: 'text'},
    {key: 'stadt', label: 'Stadt / Ortsteil', type: 'text'},
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

    const revertTab = useAdminStore(s => s.revertTab)

    const [orphans, setOrphans] = useState<string[] | null>(null)
    const [showPreview, setShowPreview] = useState(false)
    const [showPublishConfirm, setShowPublishConfirm] = useState(false)
    const [showDiff, setShowDiff] = useState(false)
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

    const handleDownload = () => {
        const blob = new Blob([JSON.stringify(rawData, null, 2)], {type: 'application/json'})
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'kommunalpolitik.json'
        a.click()
        URL.revokeObjectURL(url)
    }

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
            gemeinderaete: [],
            kreisraete: [],
            dokumente: [],
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
        update({jahre: data.jahre.map(j => j.id === id ? {...j, aktiv: !j.aktiv} : j)})
    }

    const updateJahrName = (id: string, name: string) => {
        update({jahre: data.jahre.map(j => j.id === id ? {...j, jahr: name} : j)})
    }

    const updateSection = (
        jahrId: string,
        section: 'gemeinderaete' | 'kreisraete',
        personen: Record<string, unknown>[],
    ) => {
        update({
            jahre: data.jahre.map(j =>
                j.id === jahrId
                    ? {...j, [section]: personen as unknown as KommunalpolitikPerson[]}
                    : j
            ),
        })
    }

    const updateDokumente = (jahrId: string, dokumente: Dokument[]) => {
        update({jahre: data.jahre.map(j => j.id === jahrId ? {...j, dokumente} : j)})
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
                <PreviewModal tabKey="kommunalpolitik" onClose={() => setShowPreview(false)}/>
            )}
            {showPublishConfirm && (
                <PublishConfirmModal
                    tabKey="kommunalpolitik"
                    onConfirm={handlePublishConfirmed}
                    onCancel={() => setShowPublishConfirm(false)}
                />
            )}
            {showDiff && (
                <DiffModal
                    tabKey="kommunalpolitik"
                    onClose={() => setShowDiff(false)}
                    onRevertAll={() => {
                        revertTab('kommunalpolitik')
                        setShowDiff(false)
                    }}
                />
            )}

            {/* Load-error banner */}
            {hasLoadError && (
                <div className="mb-5 flex items-start gap-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-700/40 rounded-2xl px-4 py-3">
                    <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"/>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                        Daten für diesen Tab konnten nicht geladen werden. Veröffentlichen ist gesperrt — bitte die Seite neu laden.
                    </p>
                </div>
            )}

            {/* Toolbar */}
            <div className="flex items-center gap-2 mb-6 flex-wrap">
                <button type="button" onClick={() => undo('kommunalpolitik')} disabled={!canUndo}
                        title="Rückgängig (Ctrl+Z)"
                        className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                    <Undo2 size={15}/>
                </button>
                <button type="button" onClick={() => redo('kommunalpolitik')} disabled={!canRedo}
                        title="Wiederholen (Ctrl+Y)"
                        className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                    <Redo2 size={15}/>
                </button>
                <button type="button" onClick={() => setShowPreview(true)} title="Vorschau"
                        className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-all">
                    <Eye size={15}/>
                </button>
                <div className="flex-1"/>
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
                <button type="button" onClick={handlePublish}
                        disabled={publishing || !isDirty || hasLoadError}
                        title={hasLoadError ? 'Daten konnten nicht geladen werden' : undefined}
                        className="flex items-center gap-2 bg-spd-red hover:bg-spd-red-dark text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-sm shadow-spd-red/25 hover:shadow-lg hover:shadow-spd-red/35 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-spd-red disabled:active:scale-100">
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
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Auf der Homepage anzeigen</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Zeigt den Kommunalpolitik-Tab in der Navigation</p>
                    </div>
                    <button type="button" onClick={() => update({sichtbar: !data.sichtbar})}
                            className={`shrink-0 transition-colors ${data.sichtbar ? 'text-spd-red' : 'text-gray-300 dark:text-gray-600'}`}
                            title={data.sichtbar ? 'Ausblenden' : 'Einblenden'}>
                        {data.sichtbar ? <ToggleRight size={36} strokeWidth={1.5}/> : <ToggleLeft size={36} strokeWidth={1.5}/>}
                    </button>
                </div>
            </div>

            {/* Beschreibung */}
            <div className="bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/40 rounded-2xl p-5 mb-6">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Beschreibung
                </label>
                <textarea value={data.beschreibung} onChange={e => update({beschreibung: e.target.value})}
                          rows={3} placeholder="Kurze Beschreibung der Kommunalpolitik-Seite…"
                          className={inputCls + ' resize-none'}/>
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
                    <button type="button" onClick={addJahr}
                            className="flex items-center gap-1.5 text-xs font-semibold text-spd-red border border-spd-red/30 hover:bg-spd-red hover:text-white transition-all px-3 py-2 rounded-xl">
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
                        const gemeinderaete = jahr.gemeinderaete ?? []
                        const kreisraete = jahr.kreisraete ?? []
                        const dokumente = jahr.dokumente ?? []
                        const total = gemeinderaete.length + kreisraete.length
                        return (
                            <motion.div key={jahr.id} layout
                                        initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}}
                                        exit={{opacity: 0, height: 0, overflow: 'hidden'}}
                                        transition={{duration: 0.2}}
                                        className="bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/40 rounded-2xl overflow-hidden">

                                {/* Year header */}
                                <div className="flex items-center gap-3 px-4 py-3">
                                    <button type="button" onClick={() => toggleJahrAktiv(jahr.id)}
                                            title={jahr.aktiv ? 'Ausblenden' : 'Einblenden'}
                                            className={`shrink-0 transition-colors ${jahr.aktiv ? 'text-spd-red' : 'text-gray-300 dark:text-gray-600'}`}>
                                        {jahr.aktiv ? <ToggleRight size={26} strokeWidth={1.5}/> : <ToggleLeft size={26} strokeWidth={1.5}/>}
                                    </button>

                                    <input type="text" value={jahr.jahr}
                                           onChange={e => updateJahrName(jahr.id, e.target.value)}
                                           placeholder="z.B. 2024"
                                           className="flex-1 bg-transparent border-none outline-none text-sm font-semibold text-gray-800 dark:text-gray-200 placeholder-gray-300 dark:placeholder-gray-600 min-w-0"
                                           onClick={e => e.stopPropagation()}/>

                                    <span className="shrink-0 text-[11px] font-semibold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-lg">
                                        {total} {total !== 1 ? 'Personen' : 'Person'}
                                        {dokumente.length > 0 && ` · ${dokumente.length} ${dokumente.length !== 1 ? 'Dok.' : 'Dok.'}`}
                                    </span>

                                    <button type="button" onClick={() => removeJahr(jahr.id)}
                                            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                                            title="Jahr löschen">
                                        <Trash2 size={13}/>
                                    </button>
                                    <button type="button" onClick={() => toggleExpand(jahr.id)}
                                            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-all">
                                        {expanded ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
                                    </button>
                                </div>

                                {/* Gemeinderäte + Kreisräte editors */}
                                <AnimatePresence initial={false}>
                                    {expanded && (
                                        <motion.div initial={{height: 0, opacity: 0}}
                                                    animate={{height: 'auto', opacity: 1}}
                                                    exit={{height: 0, opacity: 0}}
                                                    transition={{duration: 0.25, ease: 'easeInOut'}}
                                                    className="overflow-hidden border-t border-gray-200/50 dark:border-gray-700/40">
                                            <div className="p-4 space-y-6">

                                                {/* Gemeinderäte */}
                                                <div>
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                                                            Gemeinderäte
                                                        </h4>
                                                        <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-lg">
                                                            {gemeinderaete.length}
                                                        </span>
                                                    </div>
                                                    <ArrayEditor
                                                        fields={PERSON_FIELDS}
                                                        data={gemeinderaete as unknown as Record<string, unknown>[]}
                                                        tabKey="kommunalpolitik"
                                                        onStructureChange={p => updateSection(jahr.id, 'gemeinderaete', p)}
                                                    />
                                                </div>

                                                <div className="border-t border-gray-200/50 dark:border-gray-700/40"/>

                                                {/* Kreisräte */}
                                                <div>
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                                                            Kreisräte
                                                        </h4>
                                                        <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-lg">
                                                            {kreisraete.length}
                                                        </span>
                                                    </div>
                                                    <ArrayEditor
                                                        fields={PERSON_FIELDS}
                                                        data={kreisraete as unknown as Record<string, unknown>[]}
                                                        tabKey="kommunalpolitik"
                                                        onStructureChange={p => updateSection(jahr.id, 'kreisraete', p)}
                                                    />
                                                </div>

                                                <div className="border-t border-gray-200/50 dark:border-gray-700/40"/>

                                                {/* Dokumente */}
                                                <div>
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                                                                Dokumente
                                                            </h4>
                                                            <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-lg">
                                                                {dokumente.length}
                                                            </span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => updateDokumente(jahr.id, [
                                                                ...dokumente,
                                                                {id: crypto.randomUUID?.() ?? String(Date.now()), titel: '', url: ''},
                                                            ])}
                                                            className="flex items-center gap-1.5 text-[11px] font-semibold text-spd-red border border-spd-red/30 hover:bg-spd-red hover:text-white transition-all px-2.5 py-1.5 rounded-lg">
                                                            <Plus size={11}/> Hinzufügen
                                                        </button>
                                                    </div>
                                                    {dokumente.length === 0 && (
                                                        <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center py-4">
                                                            Noch keine Dokumente hinzugefügt.
                                                        </p>
                                                    )}
                                                    <div className="space-y-2">
                                                        {dokumente.map((dok) => (
                                                            <DokumentRow
                                                                key={dok.id}
                                                                dok={dok}
                                                                onChange={updated => updateDokumente(
                                                                    jahr.id,
                                                                    dokumente.map(d => d.id === dok.id ? updated : d),
                                                                )}
                                                                onRemove={() => updateDokumente(
                                                                    jahr.id,
                                                                    dokumente.filter(d => d.id !== dok.id),
                                                                )}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>

                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )
                    })}
                </AnimatePresence>
            </div>

            <StickyPublishBar
                isDirty={isDirty && !hasLoadError}
                publishing={publishing}
                onPublish={handlePublish}
                onShowDiff={() => setShowDiff(true)}
            />
        </div>
    )
}

function mimeFromExt(ext: string): string {
    switch (ext.toLowerCase()) {
        case 'pdf': return 'application/pdf'
        case 'doc': return 'application/msword'
        case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        default: return 'application/octet-stream'
    }
}

function openPendingFile(base64: string, publicUrl: string) {
    const ext = publicUrl.split('.').pop() ?? 'pdf'
    const mime = mimeFromExt(ext)
    const byteChars = atob(base64)
    const byteArr = new Uint8Array(byteChars.length)
    for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i)
    const blob = new Blob([byteArr], {type: mime})
    const blobUrl = URL.createObjectURL(blob)
    window.open(blobUrl, '_blank')
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000)
}

function DokumentRow({dok, onChange, onRemove}: {
    dok: Dokument
    onChange: (d: Dokument) => void
    onRemove: () => void
}) {
    const fileRef = useRef<HTMLInputElement>(null)
    const addPendingUpload = useAdminStore(s => s.addPendingUpload)
    const setStatus = useAdminStore(s => s.setStatus)
    const pendingUploads = useAdminStore(s => s.pendingUploads)
    const [showUrl, setShowUrl] = useState(!dok.url)

    const pendingEntry = dok.url
        ? pendingUploads.find(u => u.ghPath.replace(/^public/, '') === dok.url) ?? null
        : null
    const isPending = !!pendingEntry
    const displayName = dok.url ? dok.url.split('/').pop() : null

    const handleFile = async (file: File) => {
        try {
            const base64 = await fileToBase64(file)
            const namePart = slugify(dok.titel || 'dokument') + '-' + Date.now()
            const ext = file.name.includes('.') ? file.name.split('.').pop()! : 'pdf'
            const ghPath = `public/dokumente/kommunalpolitik/${namePart}.${ext}`
            const publicUrl = `/dokumente/kommunalpolitik/${namePart}.${ext}`
            addPendingUpload({ghPath, base64, message: `admin: Dokument ${namePart}.${ext} hochgeladen`})
            onChange({...dok, url: publicUrl})
            setShowUrl(false)
            setStatus('Dokument vorbereitet — wird beim Veröffentlichen hochgeladen', 'success')
        } catch {
            setStatus('Fehler beim Lesen der Datei', 'error')
        }
    }

    const handlePreview = () => {
        if (!dok.url) return
        if (pendingEntry) {
            openPendingFile(pendingEntry.base64, dok.url)
        } else {
            window.open(dok.url, '_blank')
        }
    }

    return (
        <div className="bg-white/50 dark:bg-gray-800/30 border border-gray-200/50 dark:border-gray-700/40 rounded-2xl p-3 space-y-2">
            <div className="flex gap-2 items-center">
                <input
                    type="text"
                    value={dok.titel}
                    onChange={e => onChange({...dok, titel: e.target.value})}
                    placeholder="Titel des Dokuments…"
                    className={inputCls + ' flex-1 py-2'}
                />
                <button
                    type="button"
                    onClick={onRemove}
                    className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                    title="Entfernen">
                    <Trash2 size={13}/>
                </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-1.5 text-[11px] font-semibold bg-spd-red/10 text-spd-red hover:bg-spd-red/15 px-3 py-1.5 rounded-xl transition-colors">
                    <FileUp size={11}/> {displayName ? 'Ersetzen' : 'Datei hochladen'}
                </button>
                {displayName && (
                    <>
                        <button
                            type="button"
                            onClick={handlePreview}
                            title="Dokument öffnen"
                            className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400 hover:text-spd-red dark:hover:text-spd-red border border-gray-200/60 dark:border-gray-700/40 hover:border-spd-red/30 px-3 py-1.5 rounded-xl transition-colors">
                            <ExternalLink size={11}/>
                            <span className={`font-mono truncate max-w-[160px] ${isPending ? 'text-amber-600 dark:text-amber-400' : ''}`}
                                  title={dok.url}>
                                {isPending ? '⏳ ' : ''}{displayName}
                            </span>
                        </button>
                    </>
                )}
                <button
                    type="button"
                    onClick={() => setShowUrl(v => !v)}
                    className="text-[11px] font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex items-center gap-1">
                    <LinkIcon size={10}/> {showUrl ? 'URL ausblenden' : 'URL eingeben'}
                </button>
                <input ref={fileRef} type="file" accept="application/pdf,.pdf,.doc,.docx" className="hidden"
                       onChange={e => {
                           if (e.target.files?.[0]) void handleFile(e.target.files[0])
                           e.target.value = ''
                       }}/>
            </div>
            {showUrl && (
                <input
                    type="text"
                    className={inputCls + ' font-mono text-xs'}
                    placeholder="/dokumente/... oder https://..."
                    value={dok.url}
                    spellCheck={false}
                    autoCapitalize="off"
                    autoCorrect="off"
                    onChange={e => onChange({...dok, url: e.target.value})}
                />
            )}
        </div>
    )
}
