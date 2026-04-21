import {useEffect, useState} from 'react'
import {
    Building2,
    FileText,
    Landmark,
    LogOut,
    Menu,
    Moon,
    Newspaper,
    Rocket,
    Settings,
    Sun,
    Users,
    X
} from 'lucide-react'
import {AnimatePresence, motion} from 'framer-motion'
import {toast, Toaster} from 'sonner'
import {useAdminStore} from './store'
import {TABS} from './config/tabs'
import LoginScreen from './components/LoginScreen'
import TabEditor from './components/TabEditor'
import HaushaltsredenEditor from './components/HaushaltsredenEditor'

const TAB_ICON_MAP: Record<string, React.ReactNode> = {
    news: <Newspaper size={18}/>,
    party: <Users size={18}/>,
    fraktion: <Building2 size={18}/>,
    haushaltsreden: <FileText size={18}/>,
    history: <Landmark size={18}/>,
    config: <Settings size={18}/>,
}

export default function AdminApp() {
    const {
        user,
        token,
        tryAutoLogin,
        logout,
        activeTab,
        setActiveTab,
        darkMode,
        toggleDark,
        dirtyTabs,
        publishing,
        publishAll,
        statusMessage,
        statusType,
        dataLoaded,
        statusCounter,
    } = useAdminStore()
    const [sidebarOpen, setSidebarOpen] = useState(false)

    useEffect(() => {
        tryAutoLogin()
    }, [tryAutoLogin])

    // Sync active tab from URL hash on mount and hash changes
    useEffect(() => {
        const syncFromHash = () => {
            const hash = window.location.hash.slice(1)
            if (hash && TABS.some(t => t.key === hash)) {
                setActiveTab(hash)
            }
        }
        syncFromHash()
        window.addEventListener('hashchange', syncFromHash)
        return () => window.removeEventListener('hashchange', syncFromHash)
    }, [setActiveTab])

    // Update URL hash when active tab changes
    useEffect(() => {
        if (activeTab && window.location.hash !== `#${activeTab}`) {
            window.history.replaceState(null, '', `#${activeTab}`)
        }
    }, [activeTab])

    useEffect(() => {
        document.documentElement.classList.toggle('dark', darkMode)
    }, [darkMode])

    // Warn before closing with unsaved changes
    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (dirtyTabs().size > 0) {
                e.preventDefault()
            }
        }
        window.addEventListener('beforeunload', handler)
        return () => window.removeEventListener('beforeunload', handler)
    }, [dirtyTabs])

    useEffect(() => {
        if (!statusMessage) return
        if (statusType === 'success') toast.success(statusMessage)
        else if (statusType === 'error') toast.error(statusMessage)
        else toast(statusMessage)
    }, [statusMessage, statusType, statusCounter])

    if (!token || !user) return <LoginScreen/>

    const dirty = dirtyTabs()
    const currentTab = TABS.find(t => t.key === activeTab) ?? TABS[0]

    const handlePublishAll = () => {
        const orphans = useAdminStore.getState().findOrphanImages()
        publishAll(orphans.length > 0 ? orphans : undefined)
    }

    return (
        <div
            className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
            <Toaster position="top-right" richColors closeButton theme={darkMode ? 'dark' : 'light'}/>


            {/* Mobile sidebar overlay */}
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.div
                        initial={{opacity: 0}}
                        animate={{opacity: 1}}
                        exit={{opacity: 0}}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 h-full w-64 z-50 flex flex-col transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div
                    className="flex flex-col h-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-r border-gray-200/60 dark:border-gray-800/60">
                    {/* Logo area */}
                    <div className="p-5 pb-4">
                        <div className="flex items-center gap-3">
                            <div
                                className="w-10 h-10 bg-gradient-to-br from-spd-red to-spd-red-dark rounded-2xl flex items-center justify-center shadow-lg shadow-spd-red/25">
                                <span className="text-white font-black text-xs">SPD</span>
                            </div>
                            <div>
                                <h1 className="font-extrabold text-sm dark:text-white tracking-tight">Daten-Editor</h1>
                                <p className="text-[10px] text-gray-400 font-medium">SPD Albstadt</p>
                            </div>
                            <button type="button" onClick={() => setSidebarOpen(false)}
                                    className="ml-auto lg:hidden text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                <X size={18}/>
                            </button>
                        </div>
                    </div>

                    {/* Nav items */}
                    <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
                        {TABS.map(tab => {
                            const isActive = activeTab === tab.key
                            const isDirty = dirty.has(tab.key)
                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => {
                                        setActiveTab(tab.key);
                                        setSidebarOpen(false)
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 group relative ${
                                        isActive
                                            ? 'bg-spd-red/10 dark:bg-spd-red/15 text-spd-red dark:text-red-400 shadow-sm'
                                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-gray-200'
                                    }`}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="sidebar-active"
                                            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-spd-red rounded-r-full"
                                            transition={{type: 'spring', stiffness: 350, damping: 30}}
                                        />
                                    )}
                                    <span
                                        className={`transition-colors ${isActive ? 'text-spd-red dark:text-red-400' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`}>
                    {TAB_ICON_MAP[tab.key]}
                  </span>
                                    <span className="truncate">{tab.label}</span>
                                    {isDirty && (
                                        <span className="ml-auto w-2 h-2 bg-spd-red rounded-full animate-pulse"/>
                                    )}
                                </button>
                            )
                        })}
                    </nav>

                    {/* Bottom section */}
                    <div className="p-4 border-t border-gray-200/60 dark:border-gray-800/60 space-y-3">
                        {/* Publish all button */}
                        <AnimatePresence>
                            {dirty.size > 0 && (
                                <motion.button
                                    initial={{opacity: 0, y: 10}}
                                    animate={{opacity: 1, y: 0}}
                                    exit={{opacity: 0, y: 10}}
                                    type="button"
                                    onClick={handlePublishAll}
                                    disabled={publishing}
                                    className="w-full bg-gradient-to-r from-spd-red to-spd-red-dark text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:shadow-lg hover:shadow-spd-red/25 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60"
                                >
                                    {publishing ? (
                                        <div
                                            className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                                    ) : (
                                        <Rocket size={13}/>
                                    )}
                                    Alle veröffentlichen ({dirty.size})
                                </motion.button>
                            )}
                        </AnimatePresence>

                        {/* User info + controls */}
                        <div className="flex items-center gap-2">
                            {user.avatar_url && <img src={user.avatar_url} alt=""
                                                     className="w-7 h-7 rounded-full ring-2 ring-gray-200 dark:ring-gray-700"/>}
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold dark:text-white truncate">{user.login}</p>
                                <p className="text-[10px] text-gray-400">Verbunden</p>
                            </div>
                            <button type="button" onClick={toggleDark}
                                    className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                    title="Dark Mode">
                                {darkMode ? <Sun size={13}/> : <Moon size={13}/>}
                            </button>
                            <button type="button" onClick={logout}
                                    className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                                    title="Abmelden">
                                <LogOut size={13}/>
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main content area */}
            <div className="lg:pl-64">
                {/* Top bar for mobile */}
                <header
                    className="lg:hidden sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/60 dark:border-gray-800/60">
                    <div className="flex items-center justify-between px-4 py-3">
                        <button type="button" onClick={() => setSidebarOpen(true)}
                                className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400">
                            <Menu size={18}/>
                        </button>
                        <div className="flex items-center gap-2">
                            <div
                                className="w-8 h-8 bg-gradient-to-br from-spd-red to-spd-red-dark rounded-xl flex items-center justify-center">
                                <span className="text-white font-black text-[9px]">SPD</span>
                            </div>
                            <span className="font-bold text-sm dark:text-white">Editor</span>
                        </div>
                        <div className="w-9"/>
                        {/* Spacer */}
                    </div>
                </header>

                {/* Content */}
                <main className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
                    {/* Page header */}
                    <div className="mb-8">
                        <motion.div
                            key={activeTab}
                            initial={{opacity: 0, y: 8}}
                            animate={{opacity: 1, y: 0}}
                            transition={{duration: 0.25}}
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div
                                    className="w-10 h-10 rounded-xl bg-gradient-to-br from-spd-red/10 to-spd-red/5 dark:from-spd-red/20 dark:to-spd-red/10 flex items-center justify-center text-spd-red">
                                    {TAB_ICON_MAP[currentTab.key]}
                                </div>
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-extrabold dark:text-white tracking-tight">{currentTab.label}</h2>
                                    <p className="text-xs text-gray-400 font-medium flex items-center gap-1">
                                        Direkt-Bearbeitung — Veröffentlichung per Klick
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Editor content */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{opacity: 0, y: 12}}
                            animate={{opacity: 1, y: 0}}
                            exit={{opacity: 0, y: -8}}
                            transition={{duration: 0.2}}
                        >
                            {!dataLoaded ? (
                                <div className="flex flex-col items-center justify-center py-32">
                                    <div
                                        className="w-12 h-12 border-[3px] border-spd-red/20 border-t-spd-red rounded-full animate-spin mb-4"/>
                                    <p className="text-sm text-gray-400">Daten werden geladen…</p>
                                </div>
                            ) : currentTab.type === 'haushaltsreden' ? (
                                <HaushaltsredenEditor/>
                            ) : (
                                <TabEditor tab={currentTab}/>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    )
}
