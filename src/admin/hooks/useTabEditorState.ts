import { useAdminStore } from '../store'
import { isTabDirty } from '../store/editorSlice'
import { TABS } from '../config/tabs'
import { useTabPublisher } from './useTabPublisher'
import { useUndoRedoShortcuts } from './useUndoRedoShortcuts'

/**
 * Everything the editor chrome needs for one tab — dirty/undo/load-error state,
 * the Ctrl+Z shortcuts and the publish flow — so every editor type (generic,
 * Kommunalpolitik, Haushaltsreden) shares one definition of "unsaved changes".
 */
export function useTabEditorState(tabKey: string) {
  const undo = useAdminStore(s => s.undo)
  const redo = useAdminStore(s => s.redo)
  const loadData = useAdminStore(s => s.loadData)
  const isDirty = useAdminStore(s => isTabDirty(s, tabKey))
  const hasLoadError = useAdminStore(s => s.dataLoadErrors.includes(tabKey))
  const canUndo = useAdminStore(s => (s.undoStacks[tabKey]?.length ?? 0) > 0)
  const canRedo = useAdminStore(s => (s.redoStacks[tabKey]?.length ?? 0) > 0)

  useUndoRedoShortcuts(tabKey, undo, redo)
  const publisher = useTabPublisher(
    tabKey,
    TABS.find(t => t.key === tabKey)
      ?.file?.split('/')
      .pop(),
  )

  return {
    isDirty,
    hasLoadError,
    canUndo,
    canRedo,
    publisher,
    loadData,
    undo: () => undo(tabKey),
    redo: () => redo(tabKey),
  }
}
