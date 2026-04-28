import { useCallback, useRef } from 'react'
import { FileSearch, Loader2, LogOut, Moon, Rocket, Sun, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import type { GHUser } from '../types'
import { TABS } from '../config/tabs'
import { getTabIcon } from '../lib/tabIcons'
import Avatar from '../../components/Avatar'

interface AdminSidebarProps {
  open: boolean
  activeTab: string
  dirty: Set<string>
  darkMode: boolean
  publishing: boolean
  dataLoadErrors: string[]
  user: GHUser
  onClose: () => void
  onSelectTab: (key: string) => void
  onShowGlobalDiff: () => void
  onPublishAll: () => void
  onToggleDark: () => void
  onLogout: () => void
}

export default function AdminSidebar({
  open,
  activeTab,
  dirty,
  darkMode,
  publishing,
  dataLoadErrors,
  user,
  onClose,
  onSelectTab,
  onShowGlobalDiff,
  onPublishAll,
  onToggleDark,
  onLogout,
}: AdminSidebarProps) {
  // Swipe-left to close sidebar on mobile — internal implementation detail.
  const touchStartX = useRef<number | null>(null)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }, [])
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current !== null) {
        const delta = e.changedTouches[0].clientX - touchStartX.current
        if (delta < -50) onClose()
        touchStartX.current = null
      }
    },
    [onClose],
  )

  return (
    <>
      {/* Mobile backdrop overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="sidebar-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar panel */}
      <aside
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`fixed top-0 left-0 h-full w-64 z-50 flex flex-col transition-transform duration-300 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex flex-col h-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-r border-gray-200/60 dark:border-gray-800/60">
          {/* Logo area */}
          <div className="p-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl shadow-lg shadow-spd-red/25 overflow-hidden">
                <img src="/spd-logo.svg" alt="SPD" className="w-full h-full" />
              </div>
              <div>
                <h1 className="font-extrabold text-sm dark:text-white tracking-tight">
                  Daten-Editor
                </h1>
                <p className="text-[10px] text-gray-400 font-medium">SPD Albstadt</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Seitenleiste schließen"
                className="ml-auto lg:hidden text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={18} />
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
                  onClick={() => onSelectTab(tab.key)}
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
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  <span
                    className={`transition-colors ${isActive ? 'text-spd-red dark:text-red-400' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`}
                  >
                    {getTabIcon(tab.key)}
                  </span>
                  <span className="truncate">{tab.label}</span>
                  {isDirty && (
                    <span className="ml-auto w-2 h-2 bg-spd-red rounded-full animate-pulse" />
                  )}
                </button>
              )
            })}
          </nav>

          {/* Bottom section */}
          <div className="p-4 border-t border-gray-200/60 dark:border-gray-800/60 space-y-3">
            {/* Global changes + Publish all — keyed so AnimatePresence can animate exit */}
            <AnimatePresence>
              {dirty.size > 0 && (
                <motion.div
                  key="sidebar-publish-actions"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="space-y-3"
                >
                  <button
                    type="button"
                    onClick={onShowGlobalDiff}
                    className="w-full text-xs font-medium px-4 py-2.5 rounded-xl border border-amber-300/60 dark:border-amber-700/40 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all flex items-center justify-center gap-2"
                  >
                    <FileSearch size={13} />
                    Alle Änderungen ({dirty.size})
                  </button>
                  <button
                    type="button"
                    onClick={onPublishAll}
                    disabled={publishing || dataLoadErrors.length > 0}
                    title={
                      dataLoadErrors.length > 0
                        ? 'Nicht möglich: Einige Daten konnten nicht geladen werden'
                        : undefined
                    }
                    className="w-full bg-spd-red hover:bg-spd-red-dark text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm shadow-spd-red/25 hover:shadow-lg hover:shadow-spd-red/35 active:scale-[0.98] transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-spd-red disabled:active:scale-100 whitespace-nowrap [hyphens:none]"
                  >
                    {publishing ? (
                      <Loader2 size={14} strokeWidth={2.5} className="animate-spin shrink-0" />
                    ) : (
                      <Rocket size={14} strokeWidth={2.5} className="shrink-0" />
                    )}
                    <span className="whitespace-nowrap">
                      {publishing ? 'Veröffentliche…' : `Alle veröffentlichen (${dirty.size})`}
                    </span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* User info + controls */}
            <div className="flex items-center gap-2">
              <Avatar
                name={user.login}
                imageUrl={user.avatar_url || undefined}
                size="xs"
                className="ring-2 ring-gray-200 dark:ring-gray-700"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold dark:text-white truncate">{user.login}</p>
                <p className="text-[10px] text-gray-400">Verbunden</p>
              </div>
              <button
                type="button"
                onClick={onToggleDark}
                className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title="Dark Mode"
                aria-label={darkMode ? 'Helles Design aktivieren' : 'Dunkles Design aktivieren'}
              >
                {darkMode ? <Sun size={13} /> : <Moon size={13} />}
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                title="Abmelden"
                aria-label="Abmelden"
              >
                <LogOut size={13} />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
