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
import StaleDataBanner from './components/StaleDataBanner'
import ConflictMergeModal from './components/ConflictMergeModal'
import PresenceBadge from './components/PresenceBadge'
import { getTabIcon } from './lib/tabIcons'
import AdminSkeleton from './components/AdminSkeleton'
import { useOrphanGate } from './hooks/useOrphanGate'

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
  const presenceUsers = useAdminStore(s => s.presenceUsers)
  const remoteSha = useAdminStore(s => s.remoteSha)
  const mergeConflicts = useAdminStore(s => s.mergeConflicts)
  const mergeConflictTabKey = useAdminStore(s => s.mergeConflictTabKey)
  const dismissMergeConflicts = useAdminStore(s => s.dismissMergeConflicts)

  // Dirty set as a stable string — AdminApp only re-renders when the *set of dirty
  // tab keys* changes, not on every keystroke inside a tab that is already dirty.
  const dirtyString = useAdminStore(s => [...s.dirtyTabs()].sort().join(','))
  const dirty = useMemo(() => new Set(dirtyString ? dirtyString.split(',') : []), [dirtyString])

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showGlobalDiff, setShowGlobalDiff] = useState(false)
  const [showPublishConfirm, setShowPublishConfirm] = useState(false)
  const orphanGate = useOrphanGate(
    () => useAdminStore.getState().findOrphanImages(),
    orphansToDelete => publishAll(orphansToDelete),
  )

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

  // Users who have the current tab open (viewing or dirty)
  const usersOnCurrentTab = presenceUsers.filter(
    u => u.activeTab === activeTab || u.dirtyTabs.includes(activeTab),
  )
  // Users who have no dirty tabs — they likely just published and reloaded.
  // Fall back to all known presence users if none match, so the StaleDataBanner
  // always shows someone rather than "Ein anderer Benutzer" when users are present.
  const recentPublishers = (() => {
    const cleanUsers = presenceUsers.filter(u => u.dirtyTabs.length === 0).map(u => u.login)
    if (cleanUsers.length > 0) return cleanUsers
    // If everyone still has dirty tabs, at least surface their names
    return presenceUsers.map(u => u.login)
  })()

  const handlePublishAll = () => setShowPublishConfirm(true)

  const handlePublishAllConfirmed = () => {
    setShowPublishConfirm(false)
    orphanGate.start()
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors text-left [hyphens:none]">
      {/* Ambient background decorations */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-48 -right-48 w-[700px] h-[700px] bg-spd-red/[0.03] dark:bg-spd-red/[0.06] rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-spd-red/[0.02] dark:bg-spd-red/[0.04] rounded-full blur-3xl" />
      </div>
      <Toaster position="top-right" richColors closeButton theme={darkMode ? 'dark' : 'light'} />

      {/* Global modals */}
      {showGlobalDiff && <GlobalDiffModal onClose={() => setShowGlobalDiff(false)} />}
      {showPublishConfirm && (
        <PublishConfirmModal
          onConfirm={handlePublishAllConfirmed}
          onCancel={() => setShowPublishConfirm(false)}
        />
      )}
      {orphanGate.orphans && (
        <OrphanModal
          orphans={orphanGate.orphans}
          onConfirm={orphanGate.confirm}
          onKeep={orphanGate.keep}
          onCancel={orphanGate.cancel}
        />
      )}
      {mergeConflicts && mergeConflictTabKey && (
        <ConflictMergeModal
          tabKey={mergeConflictTabKey}
          conflicts={mergeConflicts}
          onClose={dismissMergeConflicts}
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
        presenceUsers={presenceUsers}
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
        <header className="lg:hidden sticky top-0 z-30 bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl border-b border-gray-200/60 dark:border-gray-800/60 shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-spd-red via-spd-red/50 to-transparent" />
          <div className="flex items-center justify-between px-4 py-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Seitenleiste öffnen"
              className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800/80 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <Menu size={18} />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="absolute inset-0 bg-spd-red/20 blur-sm" />
                <div className="relative w-7 h-7 overflow-hidden shadow-sm">
                  <img src="/spd-logo.svg" alt="SPD" className="w-full h-full" />
                </div>
              </div>
              <span className="font-bold text-sm dark:text-white tracking-tight">Daten-Editor</span>
            </div>
            <div className="w-9" />
          </div>
        </header>

        {/* Content */}
        <main className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
          {/* Stale data banner — another user published since we loaded */}
          {remoteSha && (
            <StaleDataBanner
              publishedBy={recentPublishers}
              onReload={() => {
                // loadData clears remoteSha via baseCommitSha refresh
                loadData()
              }}
            />
          )}

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
              <div className="relative rounded-2xl bg-white/70 dark:bg-gray-900/50 border border-gray-200/70 dark:border-gray-800/60 shadow-sm overflow-hidden mb-4">
                {/* Top accent stripe */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-spd-red via-spd-red/40 to-transparent" />
                {/* Background gradient wash */}
                <div className="absolute inset-0 bg-gradient-to-br from-spd-red/[0.04] via-transparent to-transparent dark:from-spd-red/[0.08] pointer-events-none" />
                <div className="relative flex items-center gap-4 px-5 py-4 sm:px-6 sm:py-5">
                  {/* Tab icon */}
                  <div className="relative shrink-0">
                    <div className="absolute inset-0 bg-spd-red/15 dark:bg-spd-red/20 rounded-2xl blur-md" />
                    <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-spd-red/12 to-spd-red/4 dark:from-spd-red/20 dark:to-spd-red/8 flex items-center justify-center text-spd-red ring-1 ring-spd-red/10 dark:ring-spd-red/20 shadow-sm">
                      <span className="scale-110">{getTabIcon(currentTab.key)}</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl sm:text-2xl font-extrabold dark:text-white tracking-tight leading-none mb-1">
                      {currentTab.label}
                    </h2>
                    <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                      Direkt-Bearbeitung · Veröffentlichung per Klick
                    </p>
                  </div>
                  {/* Other users on this tab */}
                  {usersOnCurrentTab.length > 0 && (
                    <div className="flex items-center gap-2">
                      <PresenceBadge users={usersOnCurrentTab} />
                      <span className="text-[10px] text-gray-400 hidden sm:block">
                        {usersOnCurrentTab.map(u => u.login).join(', ')} bearbeitet gerade
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {/* Tab locked warning */}
              {usersOnCurrentTab.some(u => u.dirtyTabs.includes(activeTab)) && (
                <div className="mb-4">
                  <AdminWarningBanner
                    title="Tab wird von anderem Benutzer bearbeitet"
                    iconSize={13}
                  >
                    {usersOnCurrentTab
                      .filter(u => u.dirtyTabs.includes(activeTab))
                      .map(u => u.login)
                      .join(', ')}{' '}
                    hat ungespeicherte Änderungen in diesem Tab. Ihre Änderungen könnten beim
                    Veröffentlichen in Konflikt geraten — das System versucht automatisch, die
                    Änderungen zusammenzuführen.
                  </AdminWarningBanner>
                </div>
              )}
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
