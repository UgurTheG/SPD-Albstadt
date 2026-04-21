import {create} from 'zustand'
import type {GHUser, PendingUpload, TabConfig} from './types'
import {TABS} from './config/tabs'
import {collectImagePaths} from './lib/images'
import {applyRevert, type ChangeEntry} from './lib/diff'
import {commitTree, type TreeFileChange, validateToken} from './lib/github'

const TOKEN_KEY = 'spd-admin-token'
const DARK_KEY = 'spd-admin-dark'
const DRAFT_KEY = 'spd-admin-drafts'
const UNDO_LIMIT = 50

// Debounced localStorage persistence
let saveTimer: ReturnType<typeof setTimeout> | null = null
function persistDirtyState(state: Record<string, unknown>, originalState: Record<string, unknown>) {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
        try {
            const drafts: Record<string, { data: unknown; originalHash: string }> = {}
            for (const tab of TABS) {
                if (!tab.file) continue
                const cur = JSON.stringify(state[tab.key])
                const orig = JSON.stringify(originalState[tab.key])
                if (cur !== orig) {
                    drafts[tab.key] = { data: state[tab.key], originalHash: simpleHash(orig) }
                }
            }
            if (Object.keys(drafts).length > 0) {
                localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts))
            } else {
                localStorage.removeItem(DRAFT_KEY)
            }
        } catch { /* quota exceeded — ignore */ }
    }, 1000)
}

function simpleHash(str: string): string {
    let h = 0
    for (let i = 0; i < str.length; i++) {
        h = ((h << 5) - h + str.charCodeAt(i)) | 0
    }
    return h.toString(36)
}

function restoreDrafts(state: Record<string, unknown>, originalState: Record<string, unknown>): Record<string, unknown> {
    try {
        const raw = localStorage.getItem(DRAFT_KEY)
        if (!raw) return state
        const drafts = JSON.parse(raw) as Record<string, { data: unknown; originalHash: string }>
        const merged = { ...state }
        for (const [key, draft] of Object.entries(drafts)) {
            const origStr = JSON.stringify(originalState[key])
            if (simpleHash(origStr) === draft.originalHash) {
                merged[key] = draft.data
            }
        }
        return merged
    } catch {
        return state
    }
}

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

    // Undo/Redo
    undoStacks: Record<string, unknown[]>
    redoStacks: Record<string, unknown[]>

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
    undo: (tabKey: string) => void
    redo: (tabKey: string) => void
    addPendingUpload: (upload: PendingUpload) => void
    publishTab: (tabKey: string, orphansToDelete?: string[]) => Promise<void>
    publishAll: (orphansToDelete?: string[]) => Promise<void>
    resetOriginal: (tabKey: string) => void
    revertTab: (tabKey: string) => void
    revertChange: (tabKey: string, entry: ChangeEntry) => void
    toggleDark: () => void
    setStatus: (msg: string, type: 'info' | 'success' | 'error') => void
    findOrphanImages: () => string[]
    findOrphanImagesForTab: (tabKey: string) => string[]
}

// Debounce undo snapshots — don't push on every keystroke
let lastUndoPush: Record<string, number> = {}
const UNDO_DEBOUNCE = 600 // ms

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
    undoStacks: {},
    redoStacks: {},
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
        localStorage.removeItem(DRAFT_KEY)
        set({token: '', user: null, state: {}, originalState: {}, dataLoaded: false, pendingUploads: [], undoStacks: {}, redoStacks: {}})
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
        const original = JSON.parse(JSON.stringify(newState))
        // Restore any saved drafts from localStorage
        const merged = restoreDrafts(newState, original)
        set({
            state: merged,
            originalState: original,
            dataLoaded: true,
            undoStacks: {},
            redoStacks: {},
        })
    },

    setActiveTab: (key) => set({activeTab: key}),

    updateState: (tabKey, data) => {
        const now = Date.now()
        const prev = get()
        // Debounced undo snapshot
        const lastPush = lastUndoPush[tabKey] || 0
        let newUndoStacks = prev.undoStacks
        if (now - lastPush > UNDO_DEBOUNCE) {
            const stack = [...(prev.undoStacks[tabKey] || [])]
            stack.push(JSON.parse(JSON.stringify(prev.state[tabKey])))
            if (stack.length > UNDO_LIMIT) stack.shift()
            newUndoStacks = {...prev.undoStacks, [tabKey]: stack}
            lastUndoPush[tabKey] = now
        }
        const newState = {...prev.state, [tabKey]: data}
        set({
            state: newState,
            undoStacks: newUndoStacks,
            redoStacks: {...prev.redoStacks, [tabKey]: []}, // clear redo on new edit
        })
        persistDirtyState(newState, prev.originalState)
    },

    undo: (tabKey) => {
        const prev = get()
        const stack = [...(prev.undoStacks[tabKey] || [])]
        if (stack.length === 0) return
        const snapshot = stack.pop()!
        const redoStack = [...(prev.redoStacks[tabKey] || [])]
        redoStack.push(JSON.parse(JSON.stringify(prev.state[tabKey])))
        const newState = {...prev.state, [tabKey]: snapshot}
        set({
            state: newState,
            undoStacks: {...prev.undoStacks, [tabKey]: stack},
            redoStacks: {...prev.redoStacks, [tabKey]: redoStack},
        })
        persistDirtyState(newState, prev.originalState)
    },

    redo: (tabKey) => {
        const prev = get()
        const stack = [...(prev.redoStacks[tabKey] || [])]
        if (stack.length === 0) return
        const snapshot = stack.pop()!
        const undoStack = [...(prev.undoStacks[tabKey] || [])]
        undoStack.push(JSON.parse(JSON.stringify(prev.state[tabKey])))
        const newState = {...prev.state, [tabKey]: snapshot}
        set({
            state: newState,
            undoStacks: {...prev.undoStacks, [tabKey]: undoStack},
            redoStacks: {...prev.redoStacks, [tabKey]: stack},
        })
        persistDirtyState(newState, prev.originalState)
    },

    addPendingUpload: (upload) => {
        set(prev => ({pendingUploads: [...prev.pendingUploads, upload]}))
    },

    resetOriginal: (tabKey) => {
        set(prev => ({
            originalState: {...prev.originalState, [tabKey]: JSON.parse(JSON.stringify(prev.state[tabKey]))},
            undoStacks: {...prev.undoStacks, [tabKey]: []},
            redoStacks: {...prev.redoStacks, [tabKey]: []},
        }))
        // Remove from localStorage drafts
        try {
            const raw = localStorage.getItem(DRAFT_KEY)
            if (raw) {
                const drafts = JSON.parse(raw)
                delete drafts[tabKey]
                if (Object.keys(drafts).length > 0) localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts))
                else localStorage.removeItem(DRAFT_KEY)
            }
        } catch { /* ignore */ }
    },

    publishTab: async (tabKey, orphansToDelete) => {
        const {token, state: s, pendingUploads, publishing} = get()
        if (publishing) return
        const tab = TABS.find(t => t.key === tabKey)
        if (!tab?.ghPath) return
        set({publishing: true})
        try {
            const changes: TreeFileChange[] = []
            const currentPaths = collectImagePaths(tab as TabConfig, s[tabKey] as Record<string, unknown>)

            // Collect relevant image uploads
            const otherUploads: PendingUpload[] = []
            for (const upload of pendingUploads) {
                const publicUrl = upload.ghPath.replace(/^public/, '')
                if (currentPaths.has(publicUrl)) {
                    changes.push({path: upload.ghPath, base64Content: upload.base64})
                } else {
                    otherUploads.push(upload)
                }
            }

            // Collect orphan deletions
            if (orphansToDelete) {
                for (const imgPath of orphansToDelete) {
                    changes.push({path: 'public' + imgPath, delete: true})
                }
            }

            // Add JSON file
            const json = JSON.stringify(s[tabKey], null, 2) + '\n'
            const fileName = tab.file?.split('/').pop() ?? tab.key
            changes.push({path: tab.ghPath, content: json})

            await commitTree(token, `admin: ${fileName} aktualisiert`, changes)

            get().resetOriginal(tabKey)
            set(prev => ({
                pendingUploads: otherUploads,
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

    revertTab: (tabKey) => {
        set(prev => {
            const orig = prev.originalState[tabKey]
            const nextState = {
                ...prev.state,
                [tabKey]: orig === undefined ? prev.state[tabKey] : JSON.parse(JSON.stringify(orig)),
            }
            const allPaths = new Set<string>()
            for (const tab of TABS) {
                if (!tab.file || !nextState[tab.key]) continue
                for (const p of collectImagePaths(tab as TabConfig, nextState[tab.key] as Record<string, unknown>)) {
                    allPaths.add(p)
                }
            }
            const keptUploads = prev.pendingUploads.filter(u => allPaths.has(u.ghPath.replace(/^public/, '')))
            persistDirtyState(nextState, prev.originalState)
            return {
                state: nextState,
                pendingUploads: keptUploads,
                undoStacks: {...prev.undoStacks, [tabKey]: []},
                redoStacks: {...prev.redoStacks, [tabKey]: []},
                statusMessage: 'Änderungen verworfen.',
                statusType: 'info' as const,
                statusCounter: prev.statusCounter + 1,
            }
        })
    },

    revertChange: (tabKey, entry) => {
        set(prev => {
            const tab = TABS.find(t => t.key === tabKey)
            if (!tab) return prev
            const nextTabValue = applyRevert(tab as TabConfig, prev.originalState[tabKey], prev.state[tabKey], entry)
            const nextState = {...prev.state, [tabKey]: nextTabValue}
            // Drop pending uploads whose target path is no longer referenced by any tab
            const allPaths = new Set<string>()
            for (const t of TABS) {
                if (!t.file || !nextState[t.key]) continue
                for (const p of collectImagePaths(t as TabConfig, nextState[t.key] as Record<string, unknown>)) {
                    allPaths.add(p)
                }
            }
            const keptUploads = prev.pendingUploads.filter(u => allPaths.has(u.ghPath.replace(/^public/, '')))
            persistDirtyState(nextState, prev.originalState)
            return {
                state: nextState,
                pendingUploads: keptUploads,
                undoStacks: {...prev.undoStacks, [tabKey]: []},
                redoStacks: {...prev.redoStacks, [tabKey]: []},
                statusMessage: 'Änderung zurückgesetzt.',
                statusType: 'info' as const,
                statusCounter: prev.statusCounter + 1,
            }
        })
    },

    publishAll: async (orphansToDelete) => {
        const {token, pendingUploads, publishing} = get()
        if (publishing) return
        set({publishing: true})
        try {
            const changes: TreeFileChange[] = []

            // Collect image uploads
            for (const upload of pendingUploads) {
                changes.push({path: upload.ghPath, base64Content: upload.base64})
            }

            // Collect orphan deletions
            if (orphansToDelete) {
                for (const imgPath of orphansToDelete) {
                    changes.push({path: 'public' + imgPath, delete: true})
                }
            }

            // Collect dirty JSON files
            const dirty = get().dirtyTabs()
            const dirtyKeys: string[] = []
            for (const tabKey of dirty) {
                const tab = TABS.find(t => t.key === tabKey)
                if (!tab?.ghPath) continue
                const json = JSON.stringify(get().state[tabKey], null, 2) + '\n'
                changes.push({path: tab.ghPath, content: json})
                dirtyKeys.push(tabKey)
            }

            if (changes.length === 0) {
                set(prev => ({statusMessage: 'Nichts zu veröffentlichen.', statusType: 'info', statusCounter: prev.statusCounter + 1}))
                return
            }

            // Build commit message
            const fileNames = dirtyKeys.map(k => {
                const tab = TABS.find(t => t.key === k)
                return tab?.file?.split('/').pop() ?? k
            })
            const message = `admin: ${fileNames.join(', ')} aktualisiert`

            await commitTree(token, message, changes)

            // Reset state
            for (const tabKey of dirtyKeys) {
                get().resetOriginal(tabKey)
            }
            set(prev => ({
                pendingUploads: [],
                statusMessage: `${dirtyKeys.length} Datei(en) veröffentlicht!`,
                statusType: 'success',
                statusCounter: prev.statusCounter + 1,
            }))
        } catch (e) {
            set(prev => ({statusMessage: 'Fehler: ' + (e as Error).message, statusType: 'error', statusCounter: prev.statusCounter + 1}))
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

    setStatus: (msg, type) => set(prev => ({statusMessage: msg, statusType: type, statusCounter: prev.statusCounter + 1})),

    findOrphanImages: () => {
        const {state: s, originalState: os} = get()
        const dirty = get().dirtyTabs()
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

    findOrphanImagesForTab: (tabKey) => {
        const {state: s, originalState: os} = get()
        const tab = TABS.find(t => t.key === tabKey)
        if (!tab?.file || !os[tabKey] || !s[tabKey]) return []
        const oldPaths = collectImagePaths(tab as TabConfig, os[tabKey] as Record<string, unknown>)
        const allCurrent = new Set<string>()
        for (const t of TABS) {
            if (!t.file || !s[t.key]) continue
            for (const p of collectImagePaths(t as TabConfig, s[t.key] as Record<string, unknown>)) {
                allCurrent.add(p)
            }
        }
        const orphans: string[] = []
        for (const p of oldPaths) {
            if (!allCurrent.has(p)) orphans.push(p)
        }
        return [...new Set(orphans)]
    },
}))

