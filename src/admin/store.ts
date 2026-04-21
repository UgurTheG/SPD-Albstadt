import {create} from 'zustand'
import type {GHUser, PendingUpload, TabConfig} from './types'
import {TABS} from './config/tabs'
import {collectImagePaths} from './lib/images'
import {commitBinaryFile, commitFile, deleteFile, validateToken} from './lib/github'

const TOKEN_KEY = 'spd-admin-token'
const DARK_KEY = 'spd-admin-dark'

interface AdminState {
    // Auth
    token: string
    user: GHUser | null
    loginError: string
    loginLoading: boolean

    // Editor
    activeTab: string
    state: Record<string, unknown>
    originalState: Record<string, unknown>
    pendingUploads: PendingUpload[]
    dataLoaded: boolean

    // Dark mode
    darkMode: boolean

    // Publishing
    publishing: boolean
    statusMessage: string
    statusType: 'info' | 'success' | 'error'
    statusCounter: number

    // Computed
    dirtyTabs: () => Set<string>

    // Actions
    login: (token: string) => Promise<void>
    tryAutoLogin: () => Promise<void>
    logout: () => void
    loadData: () => Promise<void>
    setActiveTab: (key: string) => void
    updateState: (tabKey: string, data: unknown) => void
    addPendingUpload: (upload: PendingUpload) => void
    publishTab: (tabKey: string) => Promise<void>
    publishAll: (orphansToDelete?: string[]) => Promise<void>
    resetOriginal: (tabKey: string) => void
    toggleDark: () => void
    setStatus: (msg: string, type: 'info' | 'success' | 'error') => void
    findOrphanImages: () => string[]
}

export const useAdminStore = create<AdminState>((set, get) => ({
    token: localStorage.getItem(TOKEN_KEY) || '',
    user: null,
    loginError: '',
    loginLoading: false,
    activeTab: (() => {
        const hash = window.location.hash.slice(1)
        return TABS.some(t => t.key === hash) ? hash : TABS[0].key
    })(),
    state: {},
    originalState: {},
    pendingUploads: [],
    dataLoaded: false,
    darkMode: (() => {
        const pref = localStorage.getItem(DARK_KEY)
        if (pref === 'true') return true
        if (pref === 'false') return false
        return window.matchMedia('(prefers-color-scheme: dark)').matches
    })(),
    publishing: false,
    statusMessage: '',
    statusType: 'info',
    statusCounter: 0,

    dirtyTabs: () => {
        const {state: s, originalState: os} = get()
        const dirty = new Set<string>()
        for (const tab of TABS) {
            if (!tab.file) continue
            if (JSON.stringify(s[tab.key]) !== JSON.stringify(os[tab.key])) {
                dirty.add(tab.key)
            }
        }
        return dirty
    },

    login: async (token: string) => {
        set({loginLoading: true, loginError: ''})
        try {
            const user = await validateToken(token)
            localStorage.setItem(TOKEN_KEY, token)
            set({token, user: user as GHUser, loginLoading: false})
            await get().loadData()
        } catch (e) {
            set({loginError: (e as Error).message, loginLoading: false})
        }
    },

    tryAutoLogin: async () => {
        const token = get().token
        if (!token) return
        try {
            const user = await validateToken(token)
            set({user: user as GHUser})
            await get().loadData()
        } catch {
            localStorage.removeItem(TOKEN_KEY)
            set({token: ''})
        }
    },

    logout: () => {
        localStorage.removeItem(TOKEN_KEY)
        set({token: '', user: null, state: {}, originalState: {}, dataLoaded: false, pendingUploads: []})
    },

    loadData: async () => {
        const newState: Record<string, unknown> = {}
        await Promise.all(TABS.map(async (tab) => {
            if (!tab.file) {
                newState[tab.key] = null;
                return
            }
            try {
                const res = await fetch(tab.file)
                if (res.ok) {
                    newState[tab.key] = await res.json()
                } else {
                    newState[tab.key] = tab.type === 'array' ? [] : {}
                }
            } catch {
                newState[tab.key] = tab.type === 'array' ? [] : {}
            }
        }))
        set({
            state: newState,
            originalState: JSON.parse(JSON.stringify(newState)),
            dataLoaded: true,
        })
    },

    setActiveTab: (key) => set({activeTab: key}),

    updateState: (tabKey, data) => {
        set(prev => ({state: {...prev.state, [tabKey]: data}}))
    },

    addPendingUpload: (upload) => {
        set(prev => ({pendingUploads: [...prev.pendingUploads, upload]}))
    },

    resetOriginal: (tabKey) => {
        set(prev => ({
            originalState: {...prev.originalState, [tabKey]: JSON.parse(JSON.stringify(prev.state[tabKey]))},
        }))
    },

    publishTab: async (tabKey) => {
        const {token, state: s, pendingUploads, publishing} = get()
        if (publishing) return
        const tab = TABS.find(t => t.key === tabKey)
        if (!tab?.ghPath) return
        set({publishing: true})
        try {
            // Flush only pending uploads related to this tab
            const tabUploads: PendingUpload[] = []
            const otherUploads: PendingUpload[] = []
            const tabGhDir = tab.ghPath ? tab.ghPath.replace(/\/[^/]+$/, '') : ''
            for (const upload of pendingUploads) {
                if (tabGhDir && upload.ghPath.startsWith(tabGhDir.replace('/data/', '/images/'))) {
                    tabUploads.push(upload)
                } else {
                    otherUploads.push(upload)
                }
            }
            const failedUploads: PendingUpload[] = []
            for (const upload of tabUploads) {
                try {
                    await commitBinaryFile(token, upload.ghPath, upload.base64, upload.message)
                } catch {
                    failedUploads.push(upload)
                }
            }
            const json = JSON.stringify(s[tabKey], null, 2) + '\n'
            const fileName = tab.file?.split('/').pop() ?? tab.key
            await commitFile(token, tab.ghPath, json, `admin: ${fileName} aktualisiert`)
            get().resetOriginal(tabKey)
            set(prev => ({
                pendingUploads: [...otherUploads, ...failedUploads],
                statusMessage: 'Veröffentlicht! Seite wird in ~1 Min. aktualisiert.',
                statusType: 'success',
                statusCounter: prev.statusCounter + 1,
            }))
        } catch (e) {
            set(prev => ({
                statusMessage: 'Fehler: ' + (e as Error).message,
                statusType: 'error',
                statusCounter: prev.statusCounter + 1
            }))
        } finally {
            set({publishing: false})
        }
    },

    publishAll: async (orphansToDelete) => {
        const {token, pendingUploads, publishing} = get()
        if (publishing) return
        set({publishing: true})
        try {
            // Delete orphans
            if (orphansToDelete) {
                for (const imgPath of orphansToDelete) {
                    try {
                        await deleteFile(token, 'public' + imgPath, `admin: Bild ${imgPath.split('/').pop()} entfernt`)
                    } catch (e) {
                        console.error('Fehler beim Löschen:', imgPath, e)
                    }
                }
            }
            // Flush uploads
            const remaining: PendingUpload[] = []
            for (const upload of pendingUploads) {
                try {
                    await commitBinaryFile(token, upload.ghPath, upload.base64, upload.message)
                } catch {
                    remaining.push(upload)
                }
            }
            set({pendingUploads: remaining})
            // Publish all dirty tabs
            const dirty = get().dirtyTabs()
            let success = 0, fail = 0
            for (const tabKey of dirty) {
                const tab = TABS.find(t => t.key === tabKey)
                if (!tab?.ghPath) continue
                try {
                    const json = JSON.stringify(get().state[tabKey], null, 2) + '\n'
                    const fileName = tab.file?.split('/').pop() ?? tab.key
                    await commitFile(token, tab.ghPath, json, `admin: ${fileName} aktualisiert`)
                    get().resetOriginal(tabKey)
                    success++
                } catch {
                    fail++
                }
            }
            if (fail === 0) set(prev => ({
                statusMessage: `${success} Datei(en) veröffentlicht!`,
                statusType: 'success',
                statusCounter: prev.statusCounter + 1
            }))
            else set(prev => ({
                statusMessage: `${success} OK, ${fail} Fehler`,
                statusType: 'error',
                statusCounter: prev.statusCounter + 1
            }))
        } catch (e) {
            set(prev => ({
                statusMessage: 'Fehler: ' + (e as Error).message,
                statusType: 'error',
                statusCounter: prev.statusCounter + 1
            }))
        } finally {
            set({publishing: false})
        }
    },

    toggleDark: () => {
        set(prev => {
            const next = !prev.darkMode
            localStorage.setItem(DARK_KEY, String(next))
            document.documentElement.classList.toggle('dark', next)
            return {darkMode: next}
        })
    },

    setStatus: (msg, type) => set(prev => ({
        statusMessage: msg,
        statusType: type,
        statusCounter: prev.statusCounter + 1
    })),

    findOrphanImages: () => {
        const {state: s, originalState: os} = get()
        const dirty = get().dirtyTabs()
        // All current paths across all tabs
        const allCurrent = new Set<string>()
        for (const tab of TABS) {
            if (!tab.file || !s[tab.key]) continue
            for (const p of collectImagePaths(tab as TabConfig, s[tab.key] as Record<string, unknown>)) {
                allCurrent.add(p)
            }
        }
        const orphans: string[] = []
        for (const tabKey of dirty) {
            const tab = TABS.find(t => t.key === tabKey)
            if (!tab?.file || !os[tabKey]) continue
            const oldPaths = collectImagePaths(tab as TabConfig, os[tabKey] as Record<string, unknown>)
            for (const p of oldPaths) {
                if (!allCurrent.has(p)) orphans.push(p)
            }
        }
        return [...new Set(orphans)]
    },
}))

