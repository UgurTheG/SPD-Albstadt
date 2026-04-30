import { create } from 'zustand'
import { createAuthSlice, type AuthSlice } from './authSlice'
import { createEditorSlice, type EditorSlice } from './editorSlice'
import { createPublishSlice, type PublishSlice } from './publishSlice'
import { createUISlice, type UISlice } from './uiSlice'
import { createPresenceSlice, type PresenceSlice } from './presenceSlice'

/**
 * The full admin store type — intersection of all five slices.
 *
 * Slices:
 *   AuthSlice     — token management, login/logout, token refresh
 *   EditorSlice   — tab data, undo/redo, dirty tracking, drafts
 *   PublishSlice  — commit to GitHub (single tab or all dirty tabs)
 *   UISlice       — dark mode, toast status messages
 *   PresenceSlice — real-time multi-user awareness & stale-data detection
 */
export type AdminState = AuthSlice & EditorSlice & PublishSlice & UISlice & PresenceSlice

export const useAdminStore = create<AdminState>((...a) => ({
  ...createAuthSlice(...a),
  ...createEditorSlice(...a),
  ...createPublishSlice(...a),
  ...createUISlice(...a),
  ...createPresenceSlice(...a),
}))
