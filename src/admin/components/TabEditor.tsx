import type { SectionConfig, TabConfig } from '../types'
import { useAdminStore } from '../store'
import FieldRenderer from './FieldRenderer'
import ArrayEditor from './ArrayEditor'
import OrphanModal from './OrphanModal'
import PreviewModal from './PreviewModal'
import PublishConfirmModal from './PublishConfirmModal'
import StickyPublishBar from './StickyPublishBar'
import DiffModal from './DiffModal'
import AdminActionBar from './AdminActionBar'
import HaushaltsredenEditor from './HaushaltsredenEditor'
import KommunalpolitikEditor from './KommunalpolitikEditor'
import AdminWarningBanner from './AdminWarningBanner'
import { CollapsibleSection, CollapsibleSectionHeader } from './CollapsibleSection'
import { useUndoRedoShortcuts } from '../hooks/useUndoRedoShortcuts'
import { useTabPublisher } from '../hooks/useTabPublisher'

interface Props {
  tab: TabConfig
}

/**
 * Top-level editor router — dispatches to the appropriate editor based on tab type.
 * Bespoke editors (haushaltsreden, kommunalpolitik) manage their own action bars and
 * publish flows; all other types go through the generic TabEditor.
 */
export default function TabEditor({ tab }: Props) {
  if (tab.type === 'haushaltsreden') return <HaushaltsredenEditor />
  if (tab.type === 'kommunalpolitik') return <KommunalpolitikEditor />
  return <GenericTabEditor tab={tab} />
}

// ─── Generic editor (array / object tabs) ─────────────────────────────────────

function GenericTabEditor({ tab }: Props) {
  const state = useAdminStore(s => s.state)
  const undo = useAdminStore(s => s.undo)
  const redo = useAdminStore(s => s.redo)
  const undoStacks = useAdminStore(s => s.undoStacks)
  const redoStacks = useAdminStore(s => s.redoStacks)
  const loadData = useAdminStore(s => s.loadData)
  // Block publishing for this tab if its data failed to load on startup
  const hasLoadError = useAdminStore(s => s.dataLoadErrors.includes(tab.key))

  const canUndo = (undoStacks[tab.key]?.length ?? 0) > 0
  const canRedo = (redoStacks[tab.key]?.length ?? 0) > 0

  // Keyboard shortcuts for undo/redo
  useUndoRedoShortcuts(tab.key, undo, redo)

  const data = state[tab.key]

  // Must be called before any conditional return to satisfy Rules of Hooks.
  // Zustand compares the boolean result — component only re-renders when the
  // dirty flag for this specific tab actually changes.
  const isDirty = useAdminStore(s => s.dirtyTabs().has(tab.key))

  const filename = tab.file?.split('/').pop()
  const publisher = useTabPublisher(tab.key, filename)

  if (!data) return <p className="text-gray-400 text-center py-20">Daten werden geladen…</p>

  return (
    <div>
      {publisher.orphans && (
        <OrphanModal
          orphans={publisher.orphans}
          onConfirm={publisher.handleOrphanConfirm}
          onKeep={publisher.handleOrphanKeep}
          onCancel={publisher.handleOrphanCancel}
        />
      )}

      {publisher.showPublishConfirm && (
        <PublishConfirmModal
          tabKey={tab.key}
          onConfirm={publisher.handlePublishConfirmed}
          onCancel={() => publisher.setShowPublishConfirm(false)}
        />
      )}

      {publisher.showDiff && (
        <DiffModal
          tabKey={tab.key}
          onClose={() => publisher.setShowDiff(false)}
          onRevertAll={publisher.handleRevertAndCloseDiff}
        />
      )}

      {publisher.showPreview && (
        <PreviewModal tabKey={tab.key} onClose={() => publisher.setShowPreview(false)} />
      )}

      {/* Load-error warning — shown inline so it's visible next to the publish button */}
      {hasLoadError && (
        <div className="mb-5">
          <AdminWarningBanner>
            Daten für diesen Tab konnten nicht geladen werden. Veröffentlichen ist gesperrt —{' '}
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

      <AdminActionBar
        isDirty={isDirty}
        publishing={publisher.publishing}
        hasLoadError={hasLoadError}
        canUndo={canUndo}
        canRedo={canRedo}
        previewPath={tab.previewPath}
        onUndo={() => undo(tab.key)}
        onRedo={() => redo(tab.key)}
        onShowPreview={() => publisher.setShowPreview(true)}
        onShowDiff={() => publisher.setShowDiff(true)}
        onDownload={publisher.handleDownload}
        onPublish={publisher.handlePublish}
      />

      <StickyPublishBar
        isDirty={isDirty && !hasLoadError}
        publishing={publisher.publishing}
        onPublish={publisher.handlePublish}
        onShowDiff={() => publisher.setShowDiff(true)}
      />

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

// ─── Object editor ────────────────────────────────────────────────────────────

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

// ─── Shared collapsible section header ────────────────────────────────────────
// Re-exported from CollapsibleSection.tsx — kept here for backwards compat.
export { CollapsibleSectionHeader }

// ─── Section editor ───────────────────────────────────────────────────────────

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
  const sec = section

  if (sec.isSingleObject) {
    const obj = (data[sec.key] ?? {}) as Record<string, unknown>
    return (
      <CollapsibleSection label={sec.label}>
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
      </CollapsibleSection>
    )
  }

  const arr = (data[sec.key] ?? []) as Record<string, unknown>[]

  return (
    <CollapsibleSection label={sec.label} count={arr.length}>
      <ArrayEditor
        fields={sec.fields}
        data={arr}
        tabKey={tabKey}
        onStructureChange={newArr => onSectionChange(newArr)}
      />
    </CollapsibleSection>
  )
}
