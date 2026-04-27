import { useEffect, useState } from 'react'
import { FileSearch, Loader2, Rocket } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

interface Props {
  isDirty: boolean
  publishing: boolean
  onPublish: () => void
  onShowDiff: () => void
}

export default function StickyPublishBar({ isDirty, publishing, onPublish, onShowDiff }: Props) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 220)
    handler()
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const visible = isDirty && scrolled

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-6 sm:bottom-6 z-40 lg:right-auto lg:left-1/2 lg:ml-32 lg:-translate-x-1/2"
        >
          <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-gray-200/60 dark:border-gray-700/60 shadow-2xl shadow-black/10 dark:shadow-black/40 rounded-2xl p-3 flex items-center gap-2 sm:gap-3 [hyphens:none] [text-align:left]">
            <div className="flex items-center gap-2 px-1 sm:px-2 min-w-0 flex-1 sm:flex-initial">
              <span className="w-2 h-2 rounded-full bg-spd-red animate-pulse shrink-0" />
              <span className="text-xs font-semibold dark:text-gray-200 truncate [hyphens:none]">
                Ungespeicherte Änderungen
              </span>
            </div>
            <button
              type="button"
              onClick={onShowDiff}
              aria-label="Änderungen anzeigen"
              className="shrink-0 text-xs font-medium px-2.5 sm:px-3 py-2 rounded-xl border border-amber-300/60 dark:border-amber-700/40 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors flex items-center gap-1.5 whitespace-nowrap [hyphens:none]"
            >
              <FileSearch size={12} />
              <span className="hidden sm:inline">Änderungen</span>
            </button>
            <button
              type="button"
              onClick={onPublish}
              disabled={publishing}
              className="shrink-0 text-xs font-bold px-3.5 sm:px-4 py-2 rounded-xl bg-spd-red hover:bg-spd-red-dark text-white shadow-sm shadow-spd-red/25 hover:shadow-lg hover:shadow-spd-red/35 active:scale-[0.98] transition-colors transition-shadow flex items-center gap-2 disabled:cursor-wait disabled:active:scale-100 whitespace-nowrap [hyphens:none]"
            >
              {publishing ? (
                <Loader2 size={14} strokeWidth={2.5} className="animate-spin shrink-0" />
              ) : (
                <Rocket size={14} strokeWidth={2.5} className="shrink-0" />
              )}
              <span className="whitespace-nowrap">
                {publishing ? 'Veröffentliche…' : 'Veröffentlichen'}
              </span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
