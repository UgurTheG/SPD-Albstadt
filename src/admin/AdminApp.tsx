import { useEffect, useMemo, useState } from 'react'
import { Menu } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { toast, Toaster } from 'sonner'
import { useAdminStore } from './store'
import { TABS } from './config/tabs'
import LoginScreen from './components/LoginScreen'
import TabEditor from './components/TabEditor'
import GlobalDiffModal from './components/GlobalDiffModal'
import PublishConfirmModal from './components/PublishConfirmModal'
import OrphanModal from './components/OrphanModal'
import AdminWarningBanner from './components/AdminWarningBanner'
import AdminSidebar from './components/AdminSidebar'
import { getTabIcon } from './lib/tabIcons'
import AdminSkeleton from './components/AdminSkeleton'

export default function AdminApp() {
  // Actions: Zustand action references are stable — they never change between renders.
  const tryAutoLogin = useAdminStore(s => s.tryAutoLogin)
  const logout = useAdminStore(s => s.logout)
  const setActiveTab = useAdminStore(s => s.setActiveTab)
  const toggleDark = useAdminStore(s => s.toggleDark)
  const publishAll = useAdminStore(s => s.publishAll)
  const loadData = useAdminStore(s => s.loadData)

  // State slices: each selector only causes a re-render when its own value changes.
  const user = useAdminStore(s => s.user)
  const activeTab = useAdminStore(s => s.activeTab)
  const darkMode = useAdminStore(s => s.darkMode)
  const publishing = useAdminStore(s => s.publishing)
  const statusMessage = useAdminStore(s => s.statusMessage)
  const statusType = useAdminStore(s => s.statusType)
  const statusCounter = useAdminStore(s => s.statusCounter)
  const dataLoaded = useAdminStore(s => s.dataLoaded)
  const dataLoadErrors = useAdminStore(s => s.dataLoadErrors)

  // Dirty set as a stable string — AdminApp only re-renders when the *set of dirty
  // tab keys* changes, not on every keystroke inside a tab that is already dirty.
  const dirtyString = useAdminStore(s => [...s.dirtyTabs()].sort().join(','))
  const dirty = useMemo(() => new Set(dirtyString ? dirtyString.split(',') : []), [dirtyString])

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showGlobalDiff, setShowGlobalDiff] = useState(false)
  const [showPublishConfirm, setShowPublishConfirm] = useState(false)
  const [globalOrphans, setGlobalOrphans] = useState<string[] | null>(null)

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

  // Warn before browser refresh / tab close when there are unsaved changes.
  // Uses getState() so the handler is always fresh — no stale closure, no re-subscription.
  // A single handler covers both dirty tab data and pending image uploads.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      const { dirtyTabs, pendingUploads: uploads } = useAdminStore.getState()
      if (dirtyTabs().size > 0 || uploads.length > 0) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, []) // no deps — getState() always reads the latest store state

  useEffect(() => {
    if (!statusMessage) return
    if (statusType === 'success') toast.success(statusMessage)
    else if (statusType === 'error') toast.error(statusMessage)
    else toast(statusMessage)
  }, [statusMessage, statusType, statusCounter])

  if (!user) return <LoginScreen />

  const currentTab = TABS.find(t => t.key === activeTab) ?? TABS[0]

  const handlePublishAll = () => setShowPublishConfirm(true)

  const handlePublishAllConfirmed = () => {
    setShowPublishConfirm(false)
    const orphans = useAdminStore.getState().findOrphanImages()
    if (orphans.length > 0) {
      setGlobalOrphans(orphans)
      return
    }
    publishAll()
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-gray-50 to-gray-100 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900 text-gray-900 dark:text-gray-100 transition-colors text-left [hyphens:none]">
      <Toaster position="top-right" richColors closeButton theme={darkMode ? 'dark' : 'light'} />

      {/* Global modals */}
      {showGlobalDiff && <GlobalDiffModal onClose={() => setShowGlobalDiff(false)} />}
      {showPublishConfirm && (
        <PublishConfirmModal
          onConfirm={handlePublishAllConfirmed}
          onCancel={() => setShowPublishConfirm(false)}
        />
      )}
      {globalOrphans && (
        <OrphanModal
          orphans={globalOrphans}
          onConfirm={toDelete => {
            setGlobalOrphans(null)
            publishAll(toDelete.length > 0 ? toDelete : undefined)
          }}
          onKeep={() => {
            setGlobalOrphans(null)
            publishAll()
          }}
          onCancel={() => setGlobalOrphans(null)}
        />
      )}

      {/* Sidebar */}
      <AdminSidebar
        open={sidebarOpen}
        activeTab={activeTab}
        dirty={dirty}
        darkMode={darkMode}
        publishing={publishing}
        dataLoadErrors={dataLoadErrors}
        user={user}
        onClose={() => setSidebarOpen(false)}
        onSelectTab={key => {
          setActiveTab(key)
          setSidebarOpen(false)
        }}
        onShowGlobalDiff={() => setShowGlobalDiff(true)}
        onPublishAll={handlePublishAll}
        onToggleDark={toggleDark}
        onLogout={logout}
      />

      {/* Main content area */}
      <div className="lg:pl-64">
        {/* Top bar for mobile */}
        <header className="lg:hidden sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/60 dark:border-gray-800/60">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Seitenleiste öffnen"
              className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400"
            >
              <Menu size={18} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl overflow-hidden">
                <img src="/spd-logo.svg" alt="SPD" className="w-full h-full" />
              </div>
              <span className="font-bold text-sm dark:text-white">Editor</span>
            </div>
            <div className="w-9" />
            {/* Spacer */}
          </div>
        </header>

        {/* Content */}
        <main className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
          {/* Data load error banner */}
          {dataLoadErrors.length > 0 && (
            <div className="mb-6">
              <AdminWarningBanner title="Daten konnten nicht geladen werden" iconSize={16}>
                Folgende Tabs haben leere Daten erhalten:{' '}
                <strong>
                  {dataLoadErrors.map(k => TABS.find(t => t.key === k)?.label ?? k).join(', ')}
                </strong>
                . Bitte nicht veröffentlichen — das würde Live-Daten überschreiben.{' '}
                <button
                  type="button"
                  onClick={loadData}
                  className="underline font-semibold hover:no-underline"
                >
                  Erneut versuchen
                </button>
              </AdminWarningBanner>
            </div>
          )}

          {/* Page header */}
          <div className="mb-8">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-linear-to-br from-spd-red/10 to-spd-red/5 dark:from-spd-red/20 dark:to-spd-red/10 flex items-center justify-center text-spd-red">
                  {getTabIcon(currentTab.key)}
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold dark:text-white tracking-tight">
                    {currentTab.label}
                  </h2>
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
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {!dataLoaded ? <AdminSkeleton /> : <TabEditor tab={currentTab} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
