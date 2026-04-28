import { create } from 'zustand'
import { createAuthSlice, type AuthSlice } from './authSlice'
import { createEditorSlice, type EditorSlice } from './editorSlice'
import { createPublishSlice, type PublishSlice } from './publishSlice'
import { createUISlice, type UISlice } from './uiSlice'

/**
 * The full admin store type — intersection of all four slices.
 *
 * Slices:
 *   AuthSlice    — token management, login/logout, token refresh
 *   EditorSlice  — tab data, undo/redo, dirty tracking, drafts
 *   PublishSlice — commit to GitHub (single tab or all dirty tabs)
 *   UISlice      — dark mode, toast status messages
 */
export type AdminState = AuthSlice & EditorSlice & PublishSlice & UISlice

export const useAdminStore = create<AdminState>((...a) => ({
  ...createAuthSlice(...a),
  ...createEditorSlice(...a),
  ...createPublishSlice(...a),
  ...createUISlice(...a),
}))
