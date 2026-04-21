import {useState} from 'react'
import {ChevronRight, Download, Rocket} from 'lucide-react'
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
    const findOrphanImages = useAdminStore(s => s.findOrphanImages)
    const publishAll = useAdminStore(s => s.publishAll)
    const [orphans, setOrphans] = useState<string[] | null>(null)

    const data = state[tab.key]
    if (!data) return <p className="text-gray-400 text-center py-20">Daten werden geladen…</p>

    const isDirty = dirtyTabs().has(tab.key)

    const handlePublish = () => {
        const o = findOrphanImages()
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
                        publishAll(toDelete)
                    }}
                    onKeep={() => {
                        setOrphans(null);
                        publishTab(tab.key)
                    }}
                    onCancel={() => setOrphans(null)}
                />
            )}

            {/* Action bar */}
            <div className="flex items-center justify-end gap-2 mb-6">
                <button type="button" onClick={handleDownload}
                        className="text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-3.5 py-2 rounded-xl border border-gray-200/60 dark:border-gray-700/40 hover:border-gray-300 dark:hover:border-gray-600 transition-all flex items-center gap-2 backdrop-blur-sm bg-white/40 dark:bg-gray-800/30">
                    <Download size={13}/> Export
                </button>
                <button
                    type="button"
                    onClick={handlePublish}
                    disabled={!isDirty || publishing}
                    className={`text-xs font-bold px-5 py-2 rounded-xl flex items-center gap-2 transition-all duration-200 ${
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
                    className="bg-white/50 dark:bg-gray-900/30 backdrop-blur-sm border border-gray-200/40 dark:border-gray-700/30 rounded-2xl p-6 mb-6">
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
                                className="bg-white/50 dark:bg-gray-900/30 backdrop-blur-sm border border-gray-200/40 dark:border-gray-700/30 rounded-2xl p-6">
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
                                     onStructureChange={() => onSectionChange([...arr])}/>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
