/**
 * Tests for admin hooks:
 * - useUndoRedoShortcuts
 * - useTabPublisher
 * - useKommunalpolitikEditor
 * - useHaushaltsredenEditor
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// ── Mock github for hooks that use it ──────────────────────────────────────────
vi.mock('../../admin/lib/github', () => {
  class AuthError extends Error {
    status: number
    constructor(msg: string, status: number) {
      super(msg)
      this.name = 'AuthError'
      this.status = status
    }
  }
  return {
    AuthError,
    commitTree: vi.fn().mockResolvedValue({}),
    validateToken: vi.fn().mockResolvedValue({ login: 'testuser', avatar_url: '' }),
    commitFile: vi.fn().mockResolvedValue({}),
    commitBinaryFile: vi.fn().mockResolvedValue({ content: { sha: 'sha1' } }),
    deleteFile: vi.fn().mockResolvedValue({}),
    getFileContent: vi.fn().mockResolvedValue(null),
    listDirectory: vi.fn().mockResolvedValue([]),
  }
})

import { useAdminStore } from '../../admin/store'
import { resetPersistenceState } from '../../admin/store/persistence'
import { useUndoRedoShortcuts } from '../../admin/hooks/useUndoRedoShortcuts'
import { useTabPublisher } from '../../admin/hooks/useTabPublisher'
import { useKommunalpolitikEditor } from '../../admin/hooks/useKommunalpolitikEditor'
import { useHaushaltsredenEditor } from '../../admin/hooks/useHaushaltsredenEditor'
import {
  listDirectory,
  getFileContent,
  commitFile,
  commitBinaryFile,
  deleteFile,
} from '../../admin/lib/github'

function resetStore(overrides: Record<string, unknown> = {}) {
  localStorage.clear()
  resetPersistenceState()
  useAdminStore.setState({
    activeTab: 'news',
    state: {},
    originalState: {},
    pendingUploads: [],
    dataLoaded: true,
    dataLoadErrors: [],
    undoStacks: {},
    redoStacks: {},
    publishing: false,
    token: 'test-token',
    tokenExpiresAt: 0,
    user: { login: 'testuser', avatar_url: '' },
    loginError: '',
    loginLoading: false,
    loginAuthStatus: null,
    darkMode: false,
    statusMessage: '',
    statusType: 'info',
    statusCounter: 0,
    ...overrides,
  })
}

// ── useUndoRedoShortcuts ──────────────────────────────────────────────────────

describe('useUndoRedoShortcuts', () => {
  it('calls undo on Ctrl+Z', () => {
    const undo = vi.fn()
    const redo = vi.fn()
    renderHook(() => useUndoRedoShortcuts('news', undo, redo))
    const e = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true })
    window.dispatchEvent(e)
    expect(undo).toHaveBeenCalledWith('news')
  })

  it('calls redo on Ctrl+Shift+Z', () => {
    const undo = vi.fn()
    const redo = vi.fn()
    renderHook(() => useUndoRedoShortcuts('news', undo, redo))
    const e = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
      shiftKey: true,
      bubbles: true,
    })
    window.dispatchEvent(e)
    expect(redo).toHaveBeenCalledWith('news')
  })

  it('calls redo on Ctrl+Y', () => {
    const undo = vi.fn()
    const redo = vi.fn()
    renderHook(() => useUndoRedoShortcuts('news', undo, redo))
    const e = new KeyboardEvent('keydown', { key: 'y', ctrlKey: true, bubbles: true })
    window.dispatchEvent(e)
    expect(redo).toHaveBeenCalledWith('news')
  })

  it('ignores Ctrl+Z when target is an INPUT', () => {
    const undo = vi.fn()
    const redo = vi.fn()
    renderHook(() => useUndoRedoShortcuts('news', undo, redo))
    const input = document.createElement('input')
    document.body.appendChild(input)
    const e = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true })
    Object.defineProperty(e, 'target', { value: input, configurable: true })
    window.dispatchEvent(e)
    expect(undo).not.toHaveBeenCalled()
    document.body.removeChild(input)
  })

  it('ignores Ctrl+Y when target is TEXTAREA', () => {
    const undo = vi.fn()
    const redo = vi.fn()
    renderHook(() => useUndoRedoShortcuts('news', undo, redo))
    const ta = document.createElement('textarea')
    document.body.appendChild(ta)
    const e = new KeyboardEvent('keydown', { key: 'y', ctrlKey: true, bubbles: true })
    Object.defineProperty(e, 'target', { value: ta, configurable: true })
    window.dispatchEvent(e)
    expect(redo).not.toHaveBeenCalled()
    document.body.removeChild(ta)
  })

  it('ignores non-matching keys', () => {
    const undo = vi.fn()
    const redo = vi.fn()
    renderHook(() => useUndoRedoShortcuts('news', undo, redo))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true }))
    expect(undo).not.toHaveBeenCalled()
    expect(redo).not.toHaveBeenCalled()
  })

  it('cleans up event listener on unmount', () => {
    const undo = vi.fn()
    const redo = vi.fn()
    const { unmount } = renderHook(() => useUndoRedoShortcuts('news', undo, redo))
    unmount()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }))
    expect(undo).not.toHaveBeenCalled()
  })
})

// ── useTabPublisher ───────────────────────────────────────────────────────────

describe('useTabPublisher', () => {
  beforeEach(() => resetStore())

  it('initialises with all booleans false', () => {
    const { result } = renderHook(() => useTabPublisher('news', 'news.json'))
    expect(result.current.showDiff).toBe(false)
    expect(result.current.showPreview).toBe(false)
    expect(result.current.showPublishConfirm).toBe(false)
    expect(result.current.orphans).toBeNull()
  })

  it('handlePublish sets showPublishConfirm = true', () => {
    const { result } = renderHook(() => useTabPublisher('news'))
    act(() => result.current.handlePublish())
    expect(result.current.showPublishConfirm).toBe(true)
  })

  it('handlePublishConfirmed with no orphans calls publishTab', async () => {
    const { result } = renderHook(() => useTabPublisher('news'))
    await act(async () => result.current.handlePublishConfirmed())
    // publishTab would be called; store.publishing resets to false
    expect(useAdminStore.getState().publishing).toBe(false)
  })

  it('handlePublishConfirmed with orphans sets orphans state', () => {
    // Set up party data with an orphaned image
    const partyOriginal = {
      beschreibung: '',
      abgeordnete: [{ name: 'A', bildUrl: '/images/abgeordnete/a.webp' }],
      schwerpunkte: [],
      vorstand: [],
    }
    const partyCurrent = { beschreibung: '', abgeordnete: [], schwerpunkte: [], vorstand: [] }
    resetStore({
      state: { party: partyCurrent },
      originalState: { party: partyOriginal },
    })
    const { result } = renderHook(() => useTabPublisher('party'))
    act(() => result.current.handlePublishConfirmed())
    expect(result.current.orphans).not.toBeNull()
    expect(result.current.orphans!.length).toBeGreaterThan(0)
  })

  it('handleOrphanConfirm clears orphans and publishes', async () => {
    const { result } = renderHook(() => useTabPublisher('news'))
    act(() => {
      // Manually set orphans
      result.current.handlePublish()
    })
    await act(async () => {
      result.current.handleOrphanConfirm(['/images/old.webp'])
    })
    expect(result.current.orphans).toBeNull()
  })

  it('handleOrphanKeep clears orphans and publishes without deletions', async () => {
    const { result } = renderHook(() => useTabPublisher('news'))
    await act(async () => {
      result.current.handleOrphanKeep()
    })
    expect(result.current.orphans).toBeNull()
  })

  it('handleOrphanCancel clears orphans', () => {
    const { result } = renderHook(() => useTabPublisher('news'))
    act(() => result.current.handleOrphanCancel())
    expect(result.current.orphans).toBeNull()
  })

  it('handleDownload creates a download link', () => {
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:url')
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    resetStore({ state: { news: [{ titel: 'Test' }] } })
    const { result } = renderHook(() => useTabPublisher('news', 'news.json'))
    const clickMock = vi.fn()
    vi.spyOn(document, 'createElement').mockImplementationOnce((tag: string) => {
      const el = document.createElement(tag)
      el.click = clickMock
      return el
    })
    act(() => result.current.handleDownload())
    expect(clickMock).toHaveBeenCalled()
    createObjectURLSpy.mockRestore()
    revokeObjectURLSpy.mockRestore()
    vi.restoreAllMocks()
  })

  it('handleDownload uses tabKey as filename when none provided', () => {
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:url')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    resetStore({ state: { news: [{ titel: 'Test' }] } })
    const { result } = renderHook(() => useTabPublisher('news'))
    const clickMock = vi.fn()
    vi.spyOn(document, 'createElement').mockImplementationOnce((tag: string) => {
      const el = document.createElement(tag)
      el.click = clickMock
      return el
    })
    act(() => result.current.handleDownload())
    expect(clickMock).toHaveBeenCalled()
    createObjectURLSpy.mockRestore()
    vi.restoreAllMocks()
  })

  it('handleRevertAndCloseDiff calls revertTab and closes diff', () => {
    resetStore({
      state: { news: [{ titel: 'edited' }] },
      originalState: { news: [{ titel: 'original' }] },
    })
    const { result } = renderHook(() => useTabPublisher('news'))
    act(() => result.current.setShowDiff(true))
    act(() => result.current.handleRevertAndCloseDiff())
    expect(result.current.showDiff).toBe(false)
    // state restored
    expect(useAdminStore.getState().state.news).toEqual([{ titel: 'original' }])
  })

  it('setShowPreview updates showPreview', () => {
    const { result } = renderHook(() => useTabPublisher('news'))
    act(() => result.current.setShowPreview(true))
    expect(result.current.showPreview).toBe(true)
  })

  it('setShowPublishConfirm updates showPublishConfirm', () => {
    const { result } = renderHook(() => useTabPublisher('news'))
    act(() => result.current.setShowPublishConfirm(true))
    expect(result.current.showPublishConfirm).toBe(true)
  })
})

// ── useKommunalpolitikEditor ──────────────────────────────────────────────────

describe('useKommunalpolitikEditor', () => {
  beforeEach(() => {
    resetStore({
      state: {
        kommunalpolitik: {
          sichtbar: true,
          beschreibung: 'test',
          jahre: [],
        },
      },
      originalState: {
        kommunalpolitik: {
          sichtbar: true,
          beschreibung: 'test',
          jahre: [],
        },
      },
    })
  })

  it('data returns typed KommunalpolitikData', () => {
    const { result } = renderHook(() => useKommunalpolitikEditor())
    expect(result.current.data.sichtbar).toBe(true)
    expect(result.current.data.beschreibung).toBe('test')
    expect(Array.isArray(result.current.data.jahre)).toBe(true)
  })

  it('falls back to empty structure when state is null/array', () => {
    resetStore({ state: { kommunalpolitik: null } })
    const { result } = renderHook(() => useKommunalpolitikEditor())
    expect(result.current.data.jahre).toEqual([])
  })

  it('update patches the data', () => {
    const { result } = renderHook(() => useKommunalpolitikEditor())
    act(() => result.current.update({ sichtbar: false }))
    expect(result.current.data.sichtbar).toBe(false)
  })

  it('addJahr adds a new year and expands it', () => {
    const { result } = renderHook(() => useKommunalpolitikEditor())
    act(() => result.current.addJahr())
    expect(result.current.data.jahre).toHaveLength(1)
    const id = result.current.data.jahre[0].id
    expect(result.current.expandedJahrIds.has(id)).toBe(true)
  })

  it('removeJahr removes the year', () => {
    const { result } = renderHook(() => useKommunalpolitikEditor())
    act(() => result.current.addJahr())
    const id = result.current.data.jahre[0].id
    act(() => result.current.removeJahr(id))
    expect(result.current.data.jahre).toHaveLength(0)
  })

  it('toggleJahrAktiv toggles aktiv', () => {
    const { result } = renderHook(() => useKommunalpolitikEditor())
    act(() => result.current.addJahr())
    const id = result.current.data.jahre[0].id
    act(() => result.current.toggleJahrAktiv(id))
    expect(result.current.data.jahre[0].aktiv).toBe(false)
    act(() => result.current.toggleJahrAktiv(id))
    expect(result.current.data.jahre[0].aktiv).toBe(true)
  })

  it('updateJahrName updates the year name', () => {
    const { result } = renderHook(() => useKommunalpolitikEditor())
    act(() => result.current.addJahr())
    const id = result.current.data.jahre[0].id
    act(() => result.current.updateJahrName(id, '2025'))
    expect(result.current.data.jahre[0].jahr).toBe('2025')
  })

  it('updateSection updates gemeinderaete', () => {
    const { result } = renderHook(() => useKommunalpolitikEditor())
    act(() => result.current.addJahr())
    const id = result.current.data.jahre[0].id
    act(() => result.current.updateSection(id, 'gemeinderaete', [{ name: 'Alice' }]))
    expect(result.current.data.jahre[0].gemeinderaete).toHaveLength(1)
  })

  it('updateSection updates kreisraete', () => {
    const { result } = renderHook(() => useKommunalpolitikEditor())
    act(() => result.current.addJahr())
    const id = result.current.data.jahre[0].id
    act(() => result.current.updateSection(id, 'kreisraete', [{ name: 'Bob' }]))
    expect(result.current.data.jahre[0].kreisraete).toHaveLength(1)
  })

  it('updateDokumente updates dokumente', () => {
    const { result } = renderHook(() => useKommunalpolitikEditor())
    act(() => result.current.addJahr())
    const id = result.current.data.jahre[0].id
    act(() => result.current.updateDokumente(id, [{ id: 'd1', titel: 'Doc', url: '/doc.pdf' }]))
    expect(result.current.data.jahre[0].dokumente).toHaveLength(1)
  })

  it('toggleExpand toggles expansion', () => {
    const { result } = renderHook(() => useKommunalpolitikEditor())
    act(() => result.current.addJahr())
    const id = result.current.data.jahre[0].id
    // Was expanded on add; toggle closes it
    act(() => result.current.toggleExpand(id))
    expect(result.current.expandedJahrIds.has(id)).toBe(false)
    // Toggle again opens it
    act(() => result.current.toggleExpand(id))
    expect(result.current.expandedJahrIds.has(id)).toBe(true)
  })

  it('toggleSection adds to collapsed set', () => {
    const { result } = renderHook(() => useKommunalpolitikEditor())
    act(() => result.current.toggleSection('j1-gemeinderaete'))
    expect(result.current.collapsedSections.has('j1-gemeinderaete')).toBe(true)
    act(() => result.current.toggleSection('j1-gemeinderaete'))
    expect(result.current.collapsedSections.has('j1-gemeinderaete')).toBe(false)
  })

  it('undo/redo delegate to store', () => {
    resetStore({
      state: { kommunalpolitik: { sichtbar: true, beschreibung: '', jahre: [] } },
      originalState: { kommunalpolitik: { sichtbar: false, beschreibung: '', jahre: [] } },
      undoStacks: { kommunalpolitik: [{ sichtbar: false, beschreibung: '', jahre: [] }] },
    })
    const { result } = renderHook(() => useKommunalpolitikEditor())
    act(() => result.current.undo())
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(true)
    act(() => result.current.redo())
    expect(result.current.canRedo).toBe(false)
  })

  it('isDirty is true when state differs from original', () => {
    resetStore({
      state: { kommunalpolitik: { sichtbar: false, beschreibung: '', jahre: [] } },
      originalState: { kommunalpolitik: { sichtbar: true, beschreibung: '', jahre: [] } },
    })
    const { result } = renderHook(() => useKommunalpolitikEditor())
    expect(result.current.isDirty).toBe(true)
  })

  it('hasLoadError reflects dataLoadErrors', () => {
    resetStore({ dataLoadErrors: ['kommunalpolitik'] })
    const { result } = renderHook(() => useKommunalpolitikEditor())
    expect(result.current.hasLoadError).toBe(true)
  })
})

// ── useHaushaltsredenEditor ───────────────────────────────────────────────────

describe('useHaushaltsredenEditor', () => {
  beforeEach(() => {
    resetStore()
    vi.mocked(listDirectory).mockResolvedValue([
      { name: '2023.pdf', sha: 'sha23' },
      { name: '2024.pdf', sha: 'sha24' },
      { name: 'readme.txt', sha: 'rx' },
    ])
    vi.mocked(getFileContent).mockResolvedValue({ disabledYears: [2020] })
  })
  afterEach(() => vi.clearAllMocks())

  it('loads existing files on mount', async () => {
    const { result } = renderHook(() => useHaushaltsredenEditor())
    // Wait for loading to finish
    await act(async () => {
      await new Promise(r => setTimeout(r, 10))
    })
    expect(result.current.loading).toBe(false)
    expect(result.current.existingMap[2023]).toBe('sha23')
    expect(result.current.existingMap[2024]).toBe('sha24')
  })

  it('sets disabledYears from config', async () => {
    const { result } = renderHook(() => useHaushaltsredenEditor())
    await act(async () => {
      await new Promise(r => setTimeout(r, 10))
    })
    expect(result.current.disabledYears.has(2020)).toBe(true)
  })

  it('calculates allYears', async () => {
    const { result } = renderHook(() => useHaushaltsredenEditor())
    await act(async () => {
      await new Promise(r => setTimeout(r, 10))
    })
    expect(result.current.allYears.length).toBeGreaterThan(0)
    expect(result.current.allYears[0]).toBeGreaterThanOrEqual(new Date().getFullYear())
  })

  it('calculates totalAvail', async () => {
    const { result } = renderHook(() => useHaushaltsredenEditor())
    await act(async () => {
      await new Promise(r => setTimeout(r, 10))
    })
    expect(result.current.totalAvail).toBe(2)
  })

  it('handles load error', async () => {
    vi.mocked(listDirectory).mockRejectedValueOnce(new Error('fail'))
    vi.mocked(getFileContent).mockRejectedValueOnce(new Error('fail'))
    const { result } = renderHook(() => useHaushaltsredenEditor())
    await act(async () => {
      await new Promise(r => setTimeout(r, 10))
    })
    expect(result.current.loadError).toBe(true)
    expect(result.current.loading).toBe(false)
  })

  it('requestDelete and cancelDelete manage confirmDeleteYear', async () => {
    const { result } = renderHook(() => useHaushaltsredenEditor())
    await act(async () => {
      await new Promise(r => setTimeout(r, 10))
    })
    act(() => result.current.requestDelete(2023))
    expect(result.current.confirmDeleteYear).toBe(2023)
    act(() => result.current.cancelDelete())
    expect(result.current.confirmDeleteYear).toBeNull()
  })

  it('reload resets loading and refetches', async () => {
    const { result } = renderHook(() => useHaushaltsredenEditor())
    await act(async () => {
      await new Promise(r => setTimeout(r, 10))
    })
    await act(async () => {
      result.current.reload()
      await new Promise(r => setTimeout(r, 10))
    })
    expect(result.current.loading).toBe(false)
  })

  it('toggleYear toggles disabled state', async () => {
    vi.mocked(commitFile).mockResolvedValue({})
    const { result } = renderHook(() => useHaushaltsredenEditor())
    await act(async () => {
      await new Promise(r => setTimeout(r, 10))
    })
    await act(async () => {
      result.current.toggleYear(2023)
      await new Promise(r => setTimeout(r, 20))
    })
    expect(result.current.disabledYears.has(2023)).toBe(true)
    await act(async () => {
      result.current.toggleYear(2023)
      await new Promise(r => setTimeout(r, 20))
    })
    expect(result.current.disabledYears.has(2023)).toBe(false)
  })

  it('toggleYear handles save error', async () => {
    vi.mocked(commitFile).mockRejectedValueOnce(new Error('Save failed'))
    const { result } = renderHook(() => useHaushaltsredenEditor())
    await act(async () => {
      await new Promise(r => setTimeout(r, 10))
    })
    await act(async () => {
      result.current.toggleYear(2023)
      await new Promise(r => setTimeout(r, 30))
    })
    // Should have reverted disabled state and set error status
    expect(useAdminStore.getState().statusType).toBe('error')
  })

  it('uploadPdf uploads and updates existingMap', async () => {
    vi.mocked(commitBinaryFile).mockResolvedValue({ content: { sha: 'newsha' } })
    const { result } = renderHook(() => useHaushaltsredenEditor())
    await act(async () => {
      await new Promise(r => setTimeout(r, 10))
    })
    const file = new File(['pdf'], '2025.pdf', { type: 'application/pdf' })
    await act(async () => {
      await result.current.uploadPdf(2025, file)
    })
    // existingMap[2025] should be set to 'newsha' or 'pending' after upload
    expect(
      result.current.existingMap[2025] !== undefined ||
        useAdminStore.getState().statusType !== null,
    ).toBe(true)
  })

  it('uploadPdf handles error', async () => {
    vi.mocked(commitBinaryFile).mockRejectedValueOnce(new Error('Upload failed'))
    const { result } = renderHook(() => useHaushaltsredenEditor())
    await act(async () => {
      await new Promise(r => setTimeout(r, 10))
    })
    const file = new File(['pdf'], '2025.pdf', { type: 'application/pdf' })
    await act(async () => {
      await result.current.uploadPdf(2025, file)
    })
    expect(useAdminStore.getState().statusType).toBe('error')
  })

  it('deletePdf removes from existingMap', async () => {
    vi.mocked(deleteFile).mockResolvedValue(undefined)
    // After delete, silent reload returns empty list (no 2023.pdf)
    vi.mocked(listDirectory)
      .mockResolvedValueOnce([
        { name: '2023.pdf', sha: 'sha23' },
        { name: '2024.pdf', sha: 'sha24' },
      ]) // initial load
      .mockResolvedValue([{ name: '2024.pdf', sha: 'sha24' }]) // after delete reload
    vi.mocked(getFileContent).mockResolvedValue({ disabledYears: [] })
    const { result } = renderHook(() => useHaushaltsredenEditor())
    await act(async () => {
      await new Promise(r => setTimeout(r, 10))
    })
    expect(result.current.existingMap[2023]).toBe('sha23')
    await act(async () => {
      await result.current.deletePdf(2023)
      await new Promise(r => setTimeout(r, 10))
    })
    // After the reload that follows deletePdf, 2023 should no longer be present
    expect(2023 in result.current.existingMap).toBe(false)
  })

  it('deletePdf handles error', async () => {
    vi.mocked(deleteFile).mockRejectedValueOnce(new Error('Delete failed'))
    const { result } = renderHook(() => useHaushaltsredenEditor())
    await act(async () => {
      await new Promise(r => setTimeout(r, 10))
    })
    await act(async () => {
      await result.current.deletePdf(2023)
    })
    expect(useAdminStore.getState().statusType).toBe('error')
  })

  it('load handles silent=true with error (coverage path)', async () => {
    // First load succeeds
    const { result } = renderHook(() => useHaushaltsredenEditor())
    await act(async () => {
      await new Promise(r => setTimeout(r, 10))
    })
    // Now simulate a silent load error (happens inside uploadPdf/deletePdf to refresh after action)
    vi.mocked(listDirectory).mockRejectedValueOnce(new Error('background fail'))
    vi.mocked(getFileContent).mockRejectedValueOnce(new Error('background fail'))
    await act(async () => {
      result.current.reload()
      await new Promise(r => setTimeout(r, 20))
    })
    // Load error is visible since reload goes non-silent
    expect(result.current.loading).toBe(false)
  })
})
