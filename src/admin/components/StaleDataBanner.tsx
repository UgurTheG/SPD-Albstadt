/**
 * Sticky banner shown when the remote branch SHA has moved ahead of
 * the user's local baseCommitSha — i.e. someone else has published.
 *
 * Offers a "Neu laden" button to reload fresh data.  The user's unsaved
 * edits are preserved in localStorage drafts so they survive the reload.
 */
import { RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'

interface Props {
  /** Login name(s) of the users who published — derived from presenceUsers by caller */
  publishedBy?: string[]
  onReload: () => void
}

export default function StaleDataBanner({ publishedBy, onReload }: Props) {
  const who =
    publishedBy && publishedBy.length > 0 ? publishedBy.join(', ') : 'Ein anderer Benutzer'

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200/60 dark:border-blue-700/40 rounded-2xl px-4 py-3"
    >
      <RefreshCw
        size={15}
        className="text-blue-500 dark:text-blue-400 shrink-0 mt-0.5 animate-spin"
        style={{ animationDuration: '3s' }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-0.5">
          Neue Änderungen verfügbar
        </p>
        <p className="text-[11px] text-blue-700 dark:text-blue-400 font-medium">
          {who} hat Änderungen veröffentlicht. Beim Neu laden werden Ihre lokalen Entwürfe
          beibehalten.
        </p>
      </div>
      <button
        type="button"
        onClick={onReload}
        className="shrink-0 text-[11px] font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors"
      >
        Neu laden
      </button>
    </motion.div>
  )
}
