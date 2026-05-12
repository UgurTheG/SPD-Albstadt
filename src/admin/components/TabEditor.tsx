import type { SectionConfig, TabConfig } from '../types'
import { useAdminStore } from '../store'
import { deepClone } from '../../utils/deepClone'
import FieldRenderer from './FieldRenderer'
import ArrayEditor from './ArrayEditor'
import HaushaltsredenEditor from './HaushaltsredenEditor'
import KommunalpolitikEditor from './KommunalpolitikEditor'
import TabEditorShell from './TabEditorShell'
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
  const undo = useAdminStore(s => s.undo)
  const redo = useAdminStore(s => s.redo)
  const undoStacks = useAdminStore(s => s.undoStacks)
  const redoStacks = useAdminStore(s => s.redoStacks)
  const loadData = useAdminStore(s => s.loadData)
  const hasLoadError = useAdminStore(s => s.dataLoadErrors.includes(tab.key))
  const isDirty = useAdminStore(s => s.dirtyTabs().has(tab.key))
  const data = useAdminStore(s => s.state[tab.key])

  const canUndo = (undoStacks[tab.key]?.length ?? 0) > 0
  const canRedo = (redoStacks[tab.key]?.length ?? 0) > 0

  useUndoRedoShortcuts(tab.key, undo, redo)

  const publisher = useTabPublisher(tab.key, tab.file?.split('/').pop())

  if (!data) return <p className="text-gray-400 text-center py-20">Daten werden geladen…</p>

  return (
    <TabEditorShell
      tabKey={tab.key}
      previewPath={tab.previewPath}
      isDirty={isDirty}
      hasLoadError={hasLoadError}
      canUndo={canUndo}
      canRedo={canRedo}
      publisher={publisher}
      onUndo={() => undo(tab.key)}
      onRedo={() => redo(tab.key)}
      onReloadData={loadData}
    >
      {tab.type === 'array' && tab.fields && (
        <ArrayEditor
          fields={tab.fields}
          data={data as Record<string, unknown>[]}
          tabKey={tab.key}
        />
      )}
      {tab.type === 'object' && <ObjectEditor tab={tab} data={data as Record<string, unknown>} />}
    </TabEditorShell>
  )
}

// ─── Object editor ────────────────────────────────────────────────────────────

function ObjectEditor({ tab, data }: { tab: TabConfig; data: Record<string, unknown> }) {
  const updateState = useAdminStore(s => s.updateState)

  const updateField = (key: string, value: unknown, extras?: Record<string, unknown>) => {
    const clone = deepClone(data)
    clone[key] = value
    if (extras) Object.assign(clone, extras)
    updateState(tab.key, clone)
  }

  const updateSection = (sectionKey: string, value: unknown) => {
    const clone = deepClone(data)
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
