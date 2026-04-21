import {lazy, Suspense, useEffect, useMemo} from 'react'
import {motion} from 'framer-motion'
import {Monitor, X} from 'lucide-react'
import {SWRConfig} from 'swr'
import {useAdminStore} from '../store'
import {TABS} from '../config/tabs'

const Aktuelles = lazy(() => import('../../components/sections/Aktuelles'))
const Partei = lazy(() => import('../../components/sections/Partei'))
const Fraktion = lazy(() => import('../../components/sections/Fraktion'))
const Historie = lazy(() => import('../../components/sections/Historie'))
const Kontakt = lazy(() => import('../../components/sections/Kontakt'))

/** Maps admin tab keys to the section component + the data file URL */
const TAB_PREVIEW_MAP: Record<string, {
    Component: React.LazyExoticComponent<React.ComponentType<any>>;
    label: string
}> = {
    news: {Component: Aktuelles as any, label: 'Aktuelles'},
    party: {Component: Partei as any, label: 'Partei'},
    fraktion: {Component: Fraktion as any, label: 'Fraktion'},
    history: {Component: Historie as any, label: 'Historie'},
    config: {Component: Kontakt as any, label: 'Kontakt'},
}

interface Props {
    tabKey: string
    onClose: () => void
}

export default function PreviewModal({tabKey, onClose}: Props) {
    const state = useAdminStore(s => s.state)
    const pendingUploads = useAdminStore(s => s.pendingUploads)

    // Build a map from public image URLs → base64 data URLs for pending uploads
    const uploadUrlMap = useMemo(() => {
        const map: Record<string, string> = {}
        for (const upload of pendingUploads) {
            // ghPath is like "public/images/vorstand/name.webp" → public URL "/images/vorstand/name.webp"
            const publicUrl = upload.ghPath.replace(/^public/, '')
            map[publicUrl] = `data:image/webp;base64,${upload.base64}`
        }
        return map
    }, [pendingUploads])

    // Build SWR fallback map: file URL → admin store data
    // This makes useData() inside the real components return admin data
    // Also replaces image URLs with base64 data URLs for pending uploads
    const swrFallback = useMemo(() => {
        const replaceUrls = (obj: unknown): unknown => {
            if (typeof obj === 'string') return uploadUrlMap[obj] ?? obj
            if (Array.isArray(obj)) return obj.map(replaceUrls)
            if (obj && typeof obj === 'object') {
                const result: Record<string, unknown> = {}
                for (const [k, v] of Object.entries(obj)) {
                    result[k] = replaceUrls(v)
                }
                return result
            }
            return obj
        }
        const fallback: Record<string, unknown> = {}
        for (const tab of TABS) {
            if (tab.file && state[tab.key] !== undefined) {
                fallback[tab.file] = Object.keys(uploadUrlMap).length > 0
                    ? replaceUrls(state[tab.key])
                    : state[tab.key]
            }
        }
        return fallback
    }, [state, uploadUrlMap])

    // Lock body scroll while preview is open
    useEffect(() => {
        document.body.style.overflow = 'hidden'
        document.documentElement.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = ''
            document.documentElement.style.overflow = ''
        }
    }, [])

    const entry = TAB_PREVIEW_MAP[tabKey]
    if (!entry) return null

    const {Component, label} = entry

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <motion.div
                initial={{opacity: 0, y: 20}}
                animate={{opacity: 1, y: 0}}
                exit={{opacity: 0, y: 20}}
                transition={{duration: 0.25}}
                className="flex flex-col h-full"
                onClick={e => e.stopPropagation()}
            >
                {/* Toolbar */}
                <div
                    className="shrink-0 flex items-center justify-between px-4 py-2.5 bg-gray-900/95 backdrop-blur-xl border-b border-gray-700/60">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-spd-red/20 flex items-center justify-center">
                            <Monitor size={14} className="text-spd-red"/>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">Vorschau — {label}</h3>
                            <p className="text-[10px] text-gray-400">Live-Vorschau mit aktuellen Änderungen</p>
                        </div>
                    </div>


                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-xl bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={16}/>
                    </button>
                </div>

                {/* Preview area */}
                <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-950 flex justify-center">
                    <div
                        className="bg-white dark:bg-gray-950 shadow-2xl transition-all duration-300 overflow-auto"
                        style={{
                            width: '100%',
                            maxWidth: '100%',
                            minHeight: '100%',
                        }}
                    >
                        <SWRConfig value={{
                            fallback: swrFallback,
                            // Use a fetcher that first checks the fallback, so components
                            // that fetch URLs we have in admin state get the admin data.
                            // For other URLs (e.g. /api/instagram), fall through to real fetch.
                            fetcher: async (url: string) => {
                                if (swrFallback[url] !== undefined) {
                                    return swrFallback[url]
                                }
                                const res = await fetch(url)
                                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                                return res.json()
                            },
                            revalidateOnFocus: false,
                            revalidateOnReconnect: false,
                            // Disable revalidation so fallback data sticks
                            revalidateIfStale: false,
                        }}>
                            <Suspense fallback={
                                <div className="flex items-center justify-center py-32">
                                    <div
                                        className="w-10 h-10 border-4 border-spd-red/30 border-t-spd-red rounded-full animate-spin"/>
                                </div>
                            }>
                                <Component/>
                            </Suspense>
                        </SWRConfig>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}

