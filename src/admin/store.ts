/**
 * Public entry point for the admin store.
 * Implementation is split into slices under store/:
 *   store/authSlice.ts    — authentication & token management
 *   store/editorSlice.ts  — tab data, undo/redo, dirty tracking, drafts
 *   store/publishSlice.ts — GitHub commit logic
 *   store/uiSlice.ts      — dark mode & toast status
 *   store/persistence.ts  — localStorage helpers shared across slices
 */
export { useAdminStore } from './store/index'
export type { AdminState } from './store/index'
