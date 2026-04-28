import { Download, Eye, FileSearch, Loader2, Redo2, Rocket, Undo2 } from 'lucide-react'

interface AdminActionBarProps {
  isDirty: boolean
  publishing: boolean
  hasLoadError: boolean
  canUndo: boolean
  canRedo: boolean
  /** When undefined the Vorschau button is hidden */
  previewPath?: string
  onUndo: () => void
  onRedo: () => void
  onShowPreview: () => void
  onShowDiff: () => void
  onDownload: () => void
  onPublish: () => void
}

/**
 * Unified action bar shared by every admin editor section.
 * Matches the TabEditor toolbar exactly so all pages look consistent.
 */
export default function AdminActionBar({
  isDirty,
  publishing,
  hasLoadError,
  canUndo,
  canRedo,
  previewPath,
  onUndo,
  onRedo,
  onShowPreview,
  onShowDiff,
  onDownload,
  onPublish,
}: AdminActionBarProps) {
  return (
    <div className="flex items-center justify-end gap-1.5 sm:gap-2 mb-6 flex-wrap">
      {/* Undo / Redo — left-aligned */}
      <div className="flex items-center gap-0.5 mr-auto">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          title="Rückgängig (Ctrl+Z)"
          aria-label="Rückgängig"
          className={`p-2 rounded-xl transition-all ${
            canUndo
              ? 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
              : 'text-gray-300 dark:text-gray-700 cursor-not-allowed'
          }`}
        >
          <Undo2 size={14} />
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          title="Wiederherstellen (Ctrl+Shift+Z)"
          aria-label="Wiederherstellen"
          className={`p-2 rounded-xl transition-all ${
            canRedo
              ? 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
              : 'text-gray-300 dark:text-gray-700 cursor-not-allowed'
          }`}
        >
          <Redo2 size={14} />
        </button>
      </div>

      {/* Vorschau — only shown when a previewPath is configured */}
      {previewPath && (
        <button
          type="button"
          onClick={onShowPreview}
          className="text-[10px] sm:text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2.5 sm:px-3.5 py-2 rounded-xl border border-gray-200/60 dark:border-gray-700/40 hover:border-gray-300 dark:hover:border-gray-600 transition-all flex items-center gap-1.5 sm:gap-2 backdrop-blur-sm bg-white/40 dark:bg-gray-800/30"
        >
          <Eye size={13} /> <span className="hidden sm:inline">Vorschau</span>
        </button>
      )}

      {/* Änderungen — only shown when there are unsaved changes */}
      {isDirty && (
        <button
          type="button"
          onClick={onShowDiff}
          className="text-[10px] sm:text-xs font-medium text-amber-700 dark:text-amber-400 px-2.5 sm:px-3.5 py-2 rounded-xl border border-amber-300/60 dark:border-amber-700/40 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all flex items-center gap-1.5 sm:gap-2"
        >
          <FileSearch size={13} /> <span>Änderungen</span>
        </button>
      )}

      {/* Export */}
      <button
        type="button"
        onClick={onDownload}
        className="text-[10px] sm:text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2.5 sm:px-3.5 py-2 rounded-xl border border-gray-200/60 dark:border-gray-700/40 hover:border-gray-300 dark:hover:border-gray-600 transition-all flex items-center gap-1.5 sm:gap-2 backdrop-blur-sm bg-white/40 dark:bg-gray-800/30"
      >
        <Download size={13} /> <span className="hidden sm:inline">Export</span>
      </button>

      {/* Veröffentlichen */}
      <button
        type="button"
        onClick={onPublish}
        disabled={!isDirty || publishing || hasLoadError}
        title={hasLoadError ? 'Daten konnten nicht geladen werden — Seite neu laden' : undefined}
        className={`shrink-0 text-[10px] sm:text-xs font-bold px-3.5 sm:px-5 py-2 rounded-xl flex items-center gap-2 transition-colors whitespace-nowrap [hyphens:none] ${
          isDirty && !hasLoadError
            ? 'bg-spd-red hover:bg-spd-red-dark text-white shadow-sm shadow-spd-red/25 hover:shadow-lg hover:shadow-spd-red/35 active:scale-[0.98] disabled:cursor-wait disabled:hover:bg-spd-red disabled:active:scale-100'
            : 'bg-gray-200/60 dark:bg-gray-700/40 text-gray-400 dark:text-gray-500 cursor-not-allowed backdrop-blur-sm'
        }`}
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
  )
}
