import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ChevronRight,
  Download,
  Eye,
  FileSearch,
  Loader2,
  Redo2,
  Rocket,
  Undo2,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import type { SectionConfig, TabConfig } from '../types'
import { useAdminStore } from '../store'
import FieldRenderer from './FieldRenderer'
import ArrayEditor from './ArrayEditor'
import OrphanModal from './OrphanModal'
import PreviewModal from './PreviewModal'
import PublishConfirmModal from './PublishConfirmModal'
import StickyPublishBar from './StickyPublishBar'
import DiffModal from './DiffModal'

interface Props {
  tab: TabConfig
}

export default function TabEditor({ tab }: Props) {
  const state = useAdminStore(s => s.state)
  const publishTab = useAdminStore(s => s.publishTab)
  const publishing = useAdminStore(s => s.publishing)
  const findOrphanImagesForTab = useAdminStore(s => s.findOrphanImagesForTab)
  const revertTab = useAdminStore(s => s.revertTab)
  const undo = useAdminStore(s => s.undo)
  const redo = useAdminStore(s => s.redo)
  const undoStacks = useAdminStore(s => s.undoStacks)
  const redoStacks = useAdminStore(s => s.redoStacks)
  // Block publishing for this tab if its data failed to load on startup
  const hasLoadError = useAdminStore(s => s.dataLoadErrors.includes(tab.key))
  const [orphans, setOrphans] = useState<string[] | null>(null)
  const [showDiff, setShowDiff] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showPublishConfirm, setShowPublishConfirm] = useState(false)

  const canUndo = (undoStacks[tab.key]?.length ?? 0) > 0
  const canRedo = (redoStacks[tab.key]?.length ?? 0) > 0

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't intercept when typing in a text field — let the browser handle native undo
      const tag = (e.target as HTMLElement).tagName
      const isTextInput =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        (e.target as HTMLElement).isContentEditable
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (isTextInput) return
        e.preventDefault()
        if (e.shiftKey) redo(tab.key)
        else undo(tab.key)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        if (isTextInput) return
        e.preventDefault()
        redo(tab.key)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [tab.key, undo, redo])

  const data = state[tab.key]

  // Must be called before any conditional return to satisfy Rules of Hooks.
  // Zustand compares the boolean result — component only re-renders when the
  // dirty flag for this specific tab actually changes.
  const isDirty = useAdminStore(s => s.dirtyTabs().has(tab.key))

  if (!data) return <p className="text-gray-400 text-center py-20">Daten werden geladen…</p>

  const handlePublish = () => {
    setShowPublishConfirm(true)
  }

  const handlePublishConfirmed = () => {
    setShowPublishConfirm(false)
    const o = findOrphanImagesForTab(tab.key)
    if (o.length > 0) {
      setOrphans(o)
      return
    }
    publishTab(tab.key)
  }

  const handleDownload = () => {
    if (!tab.file) return
    const filename = tab.file.split('/').pop()!
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      {orphans && (
        <OrphanModal
          orphans={orphans}
          onConfirm={toDelete => {
            setOrphans(null)
            publishTab(tab.key, toDelete)
          }}
          onKeep={() => {
            setOrphans(null)
            publishTab(tab.key)
          }}
          onCancel={() => setOrphans(null)}
        />
      )}

      {showPublishConfirm && (
        <PublishConfirmModal
          tabKey={tab.key}
          onConfirm={handlePublishConfirmed}
          onCancel={() => setShowPublishConfirm(false)}
        />
      )}

      {/* Diff modal (also handles revert all) */}
      {showDiff && (
        <DiffModal
          tabKey={tab.key}
          onClose={() => setShowDiff(false)}
          onRevertAll={() => {
            revertTab(tab.key)
            setShowDiff(false)
          }}
        />
      )}

      {showPreview && <PreviewModal tabKey={tab.key} onClose={() => setShowPreview(false)} />}

      {/* Load-error warning — shown inline so it's visible next to the publish button */}
      {hasLoadError && (
        <div className="mb-5 flex items-start gap-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-700/40 rounded-2xl px-4 py-3">
          <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
            Daten für diesen Tab konnten nicht geladen werden. Veröffentlichen ist gesperrt — bitte
            die Seite neu laden.
          </p>
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center justify-end gap-1.5 sm:gap-2 mb-6 flex-wrap">
        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5 mr-auto">
          <button
            type="button"
            onClick={() => undo(tab.key)}
            disabled={!canUndo}
            title="Rückgängig (Ctrl+Z)"
            className={`p-2 rounded-xl transition-all ${canUndo ? 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800' : 'text-gray-300 dark:text-gray-700 cursor-not-allowed'}`}
          >
            <Undo2 size={14} />
          </button>
          <button
            type="button"
            onClick={() => redo(tab.key)}
            disabled={!canRedo}
            title="Wiederherstellen (Ctrl+Shift+Z)"
            className={`p-2 rounded-xl transition-all ${canRedo ? 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800' : 'text-gray-300 dark:text-gray-700 cursor-not-allowed'}`}
          >
            <Redo2 size={14} />
          </button>
        </div>
        {/* Preview */}
        {tab.previewPath && (
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="text-[10px] sm:text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2.5 sm:px-3.5 py-2 rounded-xl border border-gray-200/60 dark:border-gray-700/40 hover:border-gray-300 dark:hover:border-gray-600 transition-all flex items-center gap-1.5 sm:gap-2 backdrop-blur-sm bg-white/40 dark:bg-gray-800/30"
          >
            <Eye size={13} /> <span className="hidden sm:inline">Vorschau</span>
          </button>
        )}
        {/* Diff / Änderungen */}
        {isDirty && (
          <button
            type="button"
            onClick={() => setShowDiff(true)}
            className="text-[10px] sm:text-xs font-medium text-amber-700 dark:text-amber-400 px-2.5 sm:px-3.5 py-2 rounded-xl border border-amber-300/60 dark:border-amber-700/40 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all flex items-center gap-1.5 sm:gap-2"
          >
            <FileSearch size={13} /> <span>Änderungen</span>
          </button>
        )}
        <button
          type="button"
          onClick={handleDownload}
          className="text-[10px] sm:text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2.5 sm:px-3.5 py-2 rounded-xl border border-gray-200/60 dark:border-gray-700/40 hover:border-gray-300 dark:hover:border-gray-600 transition-all flex items-center gap-1.5 sm:gap-2 backdrop-blur-sm bg-white/40 dark:bg-gray-800/30"
        >
          <Download size={13} /> <span className="hidden sm:inline">Export</span>
        </button>
        <button
          type="button"
          onClick={handlePublish}
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

      {/* Sticky publish bar — also guarded by hasLoadError */}
      <StickyPublishBar
        isDirty={isDirty && !hasLoadError}
        publishing={publishing}
        onPublish={handlePublish}
        onShowDiff={() => setShowDiff(true)}
      />

      {/* Content */}
      {tab.type === 'array' && tab.fields && (
        <ArrayEditor
          fields={tab.fields}
          data={data as Record<string, unknown>[]}
          tabKey={tab.key}
        />
      )}

      {tab.type === 'object' && <ObjectEditor tab={tab} data={data as Record<string, unknown>} />}
    </div>
  )
}

function ObjectEditor({ tab, data }: { tab: TabConfig; data: Record<string, unknown> }) {
  const updateState = useAdminStore(s => s.updateState)

  const updateField = (key: string, value: unknown, extras?: Record<string, unknown>) => {
    const clone = JSON.parse(JSON.stringify(data))
    clone[key] = value
    if (extras) Object.assign(clone, extras)
    updateState(tab.key, clone)
  }

  const updateSection = (sectionKey: string, value: unknown) => {
    const clone = JSON.parse(JSON.stringify(data))
    clone[sectionKey] = value
    updateState(tab.key, clone)
  }

  return (
    <div>
      {/* Top-level fields in a card */}
      {tab.topFields && tab.topFields.length > 0 && (
        <div className="bg-white/50 dark:bg-gray-900/30 backdrop-blur-sm border border-gray-200/40 dark:border-gray-700/30 rounded-2xl p-4 sm:p-6 mb-6">
          {tab.topFields.map(field => (
            <FieldRenderer
              key={field.key}
              field={field}
              value={data[field.key]}
              onChange={(v, extras) => updateField(field.key, v, extras)}
            />
          ))}
        </div>
      )}

      {/* Sections */}
      {tab.sections?.map(section => (
        <SectionEditor
          key={section.key}
          section={section}
          data={data}
          tabKey={tab.key}
          onSectionChange={val => updateSection(section.key, val)}
        />
      ))}
    </div>
  )
}

function SectionEditor({
  section,
  data,
  tabKey,
  onSectionChange,
}: {
  section: SectionConfig
  data: Record<string, unknown>
  tabKey: string
  onSectionChange: (value: unknown) => void
}) {
  const [open, setOpen] = useState(true)
  const sec = section

  if (sec.isSingleObject) {
    const obj = (data[sec.key] ?? {}) as Record<string, unknown>
    return (
      <div className="mb-6">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 w-full py-3 mb-4 group"
        >
          <ChevronRight
            size={14}
            className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
          />
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
            {sec.label}
          </h3>
          <div className="flex-1 h-px bg-linear-to-r from-gray-200 dark:from-gray-700 to-transparent ml-2" />
        </button>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="bg-white/50 dark:bg-gray-900/30 backdrop-blur-sm border border-gray-200/40 dark:border-gray-700/30 rounded-2xl p-4 sm:p-6">
                {sec.fields.map(field => (
                  <FieldRenderer
                    key={field.key}
                    field={field}
                    value={obj[field.key]}
                    onChange={(v, extras) => {
                      onSectionChange({ ...obj, [field.key]: v, ...(extras || {}) })
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  const arr = (data[sec.key] ?? []) as Record<string, unknown>[]

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full py-3 mb-4 group"
      >
        <ChevronRight
          size={14}
          className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
        />
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
          {sec.label}
        </h3>
        <span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
          {arr.length}
        </span>
        <div className="flex-1 h-px bg-linear-to-r from-gray-200 dark:from-gray-700 to-transparent ml-2" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <ArrayEditor
              fields={sec.fields}
              data={arr}
              tabKey={tabKey}
              onStructureChange={newArr => onSectionChange(newArr)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
