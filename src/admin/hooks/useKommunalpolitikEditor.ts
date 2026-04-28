/**
 * All state and data-manipulation logic for the Kommunalpolitik editor.
 * Extracted from KommunalpolitikEditor.tsx so the component is a thin render-only layer.
 */
import { useCallback, useState } from 'react'
import { useAdminStore } from '../store'
import type { FieldConfig } from '../types'
import { useUndoRedoShortcuts } from './useUndoRedoShortcuts'
import { useTabPublisher } from './useTabPublisher'

// ─── Domain types ─────────────────────────────────────────────────────────────

export interface KommunalpolitikPerson {
  name: string
  rolle?: string
  bildUrl?: string
  email?: string
  bio?: string
  stadt?: string
}

export interface Dokument {
  id: string
  titel: string
  url: string
}

export interface KommunalpolitikJahr {
  id: string
  jahr: string
  aktiv: boolean
  gemeinderaete: KommunalpolitikPerson[]
  kreisraete: KommunalpolitikPerson[]
  dokumente: Dokument[]
}

export interface KommunalpolitikData {
  sichtbar: boolean
  beschreibung: string
  jahre: KommunalpolitikJahr[]
}

export const PERSON_FIELDS: FieldConfig[] = [
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'rolle', label: 'Rolle / Amt', type: 'text' },
  { key: 'stadt', label: 'Stadt / Ortsteil', type: 'text' },
  { key: 'bildUrl', label: 'Profilbild', type: 'image', imageDir: 'kommunalpolitik' },
  { key: 'email', label: 'E-Mail', type: 'email' },
  { key: 'bio', label: 'Biografie', type: 'textarea' },
]

// ─── Hook return type ─────────────────────────────────────────────────────────

export interface KommunalpolitikEditorState {
  data: KommunalpolitikData
  isDirty: boolean
  hasLoadError: boolean
  canUndo: boolean
  canRedo: boolean
  expandedJahrIds: Set<string>
  collapsedSections: Set<string>
  publisher: ReturnType<typeof useTabPublisher>
  update: (patch: Partial<KommunalpolitikData>) => void
  addJahr: () => void
  removeJahr: (id: string) => void
  toggleJahrAktiv: (id: string) => void
  updateJahrName: (id: string, name: string) => void
  updateSection: (
    jahrId: string,
    section: 'gemeinderaete' | 'kreisraete',
    personen: Record<string, unknown>[],
  ) => void
  updateDokumente: (jahrId: string, dokumente: Dokument[]) => void
  toggleExpand: (id: string) => void
  toggleSection: (key: string) => void
  undo: () => void
  redo: () => void
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useKommunalpolitikEditor(): KommunalpolitikEditorState {
  const updateState = useAdminStore(s => s.updateState)
  const undoAction = useAdminStore(s => s.undo)
  const redoAction = useAdminStore(s => s.redo)
  const undoStacks = useAdminStore(s => s.undoStacks)
  const redoStacks = useAdminStore(s => s.redoStacks)
  const rawData = useAdminStore(s => s.state['kommunalpolitik'])
  const hasLoadError = useAdminStore(s => s.dataLoadErrors.includes('kommunalpolitik'))
  // Efficient dirty check: compare only this tab's data instead of calling dirtyTabs()
  // which would JSON.stringify every tab on every store update.
  const isDirty = useAdminStore(s => {
    if (
      JSON.stringify(s.state['kommunalpolitik']) !==
      JSON.stringify(s.originalState['kommunalpolitik'])
    )
      return true
    return s.pendingUploads.some(u => u.tabKey === 'kommunalpolitik')
  })

  const [expandedJahrIds, setExpandedJahrIds] = useState<Set<string>>(new Set())
  // key = `${jahrId}-gemeinderaete` | `${jahrId}-kreisraete` | `${jahrId}-dokumente`
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  const canUndo = (undoStacks['kommunalpolitik']?.length ?? 0) > 0
  const canRedo = (redoStacks['kommunalpolitik']?.length ?? 0) > 0

  useUndoRedoShortcuts('kommunalpolitik', undoAction, redoAction)
  const publisher = useTabPublisher('kommunalpolitik', 'kommunalpolitik.json')

  // Derive typed data — fall back to an empty structure if the store has nothing yet.
  const data: KommunalpolitikData =
    rawData && typeof rawData === 'object' && !Array.isArray(rawData)
      ? (rawData as KommunalpolitikData)
      : { sichtbar: false, beschreibung: '', jahre: [] }

  // ─── Mutations ───────────────────────────────────────────────────────────────

  const update = (patch: Partial<KommunalpolitikData>) => {
    updateState('kommunalpolitik', { ...data, ...patch })
  }

  const addJahr = () => {
    const newJahr: KommunalpolitikJahr = {
      id: crypto.randomUUID?.() ?? String(Date.now()),
      jahr: String(new Date().getFullYear()),
      aktiv: true,
      gemeinderaete: [],
      kreisraete: [],
      dokumente: [],
    }
    update({ jahre: [...data.jahre, newJahr] })
    setExpandedJahrIds(prev => new Set([...prev, newJahr.id]))
  }

  const removeJahr = (id: string) => {
    update({ jahre: data.jahre.filter(j => j.id !== id) })
    setExpandedJahrIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const toggleJahrAktiv = (id: string) => {
    update({ jahre: data.jahre.map(j => (j.id === id ? { ...j, aktiv: !j.aktiv } : j)) })
  }

  const updateJahrName = (id: string, name: string) => {
    update({ jahre: data.jahre.map(j => (j.id === id ? { ...j, jahr: name } : j)) })
  }

  const updateSection = (
    jahrId: string,
    section: 'gemeinderaete' | 'kreisraete',
    personen: Record<string, unknown>[],
  ) => {
    update({
      jahre: data.jahre.map(j =>
        j.id === jahrId ? { ...j, [section]: personen as unknown as KommunalpolitikPerson[] } : j,
      ),
    })
  }

  const updateDokumente = (jahrId: string, dokumente: Dokument[]) => {
    update({ jahre: data.jahre.map(j => (j.id === jahrId ? { ...j, dokumente } : j)) })
  }

  // ─── UI state ────────────────────────────────────────────────────────────────
  // These functions only close over stable state setters / Zustand actions —
  // useCallback with empty or stable deps avoids new references on every render.

  const toggleExpand = useCallback((id: string) => {
    setExpandedJahrIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSection = useCallback((key: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const undo = useCallback(() => undoAction('kommunalpolitik'), [undoAction])
  const redo = useCallback(() => redoAction('kommunalpolitik'), [redoAction])

  return {
    data,
    isDirty,
    hasLoadError,
    canUndo,
    canRedo,
    expandedJahrIds,
    collapsedSections,
    publisher,
    update,
    addJahr,
    removeJahr,
    toggleJahrAktiv,
    updateJahrName,
    updateSection,
    updateDokumente,
    toggleExpand,
    toggleSection,
    undo,
    redo,
  }
}
