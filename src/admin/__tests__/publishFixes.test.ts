/**
 * Regression tests for publish-flow fixes:
 * - orphan deletions skip paths that don't exist in the repo
 * - applyMergeResolution keeps the tab dirty until the follow-up publish succeeds
 * - loadData prunes pending uploads that nothing references any more
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../../admin/lib/github', () => {
  class AuthError extends Error {
    status: number
    constructor(msg: string, status: number) {
      super(msg)
      this.name = 'AuthError'
      this.status = status
    }
  }
  class ConflictError extends Error {
    constructor(msg = 'Konflikt') {
      super(msg)
      this.name = 'ConflictError'
    }
  }
  return {
    AuthError,
    ConflictError,
    commitTree: vi.fn().mockResolvedValue({}),
    validateToken: vi.fn().mockResolvedValue({ login: 'testuser', avatar_url: '' }),
    commitBinaryFile: vi.fn().mockResolvedValue({ content: { sha: 'abc' } }),
    deleteFile: vi.fn().mockResolvedValue({}),
    getFileContent: vi.fn().mockResolvedValue(null),
    listDirectory: vi.fn().mockResolvedValue([]),
    getBranchSha: vi.fn().mockResolvedValue('abc123'),
    getDataChanges: vi.fn().mockResolvedValue({ changed: true, authors: [] }),
    fileExists: vi.fn().mockResolvedValue(true),
  }
})

import { useAdminStore } from '../../admin/store'
import { commitTree, fileExists } from '../../admin/lib/github'
import { resetPersistenceState } from '../../admin/store/persistence'

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
    mergeConflicts: null,
    mergeConflictTabKey: null,
    authenticated: true,
    tokenExpiresAt: 0,
    user: { login: 'testuser', avatar_url: '' },
    statusMessage: '',
    statusType: 'info',
    statusCounter: 0,
    ...overrides,
  })
}

beforeEach(() => {
  vi.mocked(commitTree).mockClear()
  vi.mocked(commitTree).mockResolvedValue({})
  vi.mocked(fileExists).mockClear()
  vi.mocked(fileExists).mockResolvedValue(true)
})

// ── Orphan deletions skip non-existent paths ──────────────────────────────────

describe('publishTab — orphan deletion existence check', () => {
  beforeEach(() => {
    resetStore({
      state: { news: [{ titel: 'edited' }] },
      originalState: { news: [] },
    })
  })

  it('includes deletions for paths that exist in the repo', async () => {
    await useAdminStore.getState().publishTab('news', ['/images/news/old.webp'])
    const [, changes] = vi.mocked(commitTree).mock.calls[0] as [
      string,
      { path: string; delete?: boolean }[],
    ]
    expect(changes.some(c => c.delete && c.path === 'public/images/news/old.webp')).toBe(true)
  })

  it('skips deletions for paths that were never committed', async () => {
    vi.mocked(fileExists).mockResolvedValue(false)
    await useAdminStore.getState().publishTab('news', ['/dokumente/never-committed.pdf'])
    expect(commitTree).toHaveBeenCalledTimes(1)
    const [, changes] = vi.mocked(commitTree).mock.calls[0] as [
      string,
      { path: string; delete?: boolean }[],
    ]
    expect(changes.some(c => c.delete)).toBe(false)
    // The JSON change itself still goes out
    expect(changes.some(c => c.path === 'public/data/news.json')).toBe(true)
  })

  it('publishAll reports nothing to publish when the only orphan does not exist', async () => {
    vi.mocked(fileExists).mockResolvedValue(false)
    resetStore({ state: {}, originalState: {} })
    await useAdminStore.getState().publishAll(['/images/never-committed.webp'])
    expect(commitTree).not.toHaveBeenCalled()
    expect(useAdminStore.getState().statusMessage).toBe('Nichts zu veröffentlichen.')
  })
})

// ── applyMergeResolution keeps the tab dirty ──────────────────────────────────

describe('applyMergeResolution', () => {
  it('does not touch originalState, so a failed follow-up publish stays visible as dirty', () => {
    const remote = [{ titel: 'their version' }]
    resetStore({
      state: { news: [{ titel: 'merged draft' }] },
      originalState: { news: remote },
      mergeConflicts: [{ path: [0, 'titel'], label: 't', ours: 'mine', theirs: 'theirs' }],
      mergeConflictTabKey: 'news',
    })

    useAdminStore.getState().applyMergeResolution('news', [{ titel: 'resolved' }])

    const st = useAdminStore.getState()
    expect(st.mergeConflicts).toBeNull()
    expect(st.mergeConflictTabKey).toBeNull()
    expect(st.state['news']).toEqual([{ titel: 'resolved' }])
    // Baseline still the remote version — the tab must remain dirty until
    // the follow-up publish succeeds and calls resetOriginal.
    expect(st.originalState['news']).toEqual(remote)
    expect(st.dirtyTabs().has('news')).toBe(true)
  })
})

// ── loadData prunes stale pending uploads ─────────────────────────────────────

describe('loadData — pending upload pruning', () => {
  it('drops uploads whose path is no longer referenced by any tab', async () => {
    resetStore({
      pendingUploads: [
        // Will be referenced by the fetched news data → kept
        { ghPath: 'public/images/news/keep.webp', base64: 'a', message: 'm', tabKey: 'news' },
        // Referenced by nothing (its draft is gone) → pruned
        { ghPath: 'public/images/news/stale.webp', base64: 'b', message: 'm', tabKey: 'news' },
      ],
    })

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(url => {
      const u = String(url)
      const body = u.includes('/data/news.json')
        ? [{ titel: 'a', bildUrl: '/images/news/keep.webp' }]
        : u.includes('/data/') && !u.includes('news')
          ? {}
          : {}
      return Promise.resolve(
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
    })

    try {
      await useAdminStore.getState().loadData()
    } finally {
      fetchMock.mockRestore()
    }

    const uploads = useAdminStore.getState().pendingUploads
    expect(uploads.map(u => u.ghPath)).toEqual(['public/images/news/keep.webp'])
  })
})
