import { useEffect } from 'react'

/**
 * Registers Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y keyboard shortcuts for undo/redo.
 * Skips the shortcut when the focused element is a text input so the browser's
 * native undo still works inside fields.
 */
export function useUndoRedoShortcuts(
  tabKey: string,
  undo: (key: string) => void,
  redo: (key: string) => void,
) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      const isTextInput =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        (e.target as HTMLElement).isContentEditable
      // With Shift held the browser reports the uppercase key ('Z'), so the
      // comparison must be case-insensitive or Ctrl+Shift+Z never matches.
      const key = e.key.toLowerCase()
      if ((e.ctrlKey || e.metaKey) && key === 'z') {
        if (isTextInput) return
        e.preventDefault()
        if (e.shiftKey) redo(tabKey)
        else undo(tabKey)
      }
      if ((e.ctrlKey || e.metaKey) && key === 'y') {
        if (isTextInput) return
        e.preventDefault()
        redo(tabKey)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [tabKey, undo, redo])
}
