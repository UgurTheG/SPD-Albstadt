/**
 * Additional store slice tests covering authSlice and publishSlice edge cases
 * not already tested in store.test.ts.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// ── Mock github before the store is imported ───────────────────────────────────
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
    commitFile: vi.fn().mockResolvedValue({}),
    commitBinaryFile: vi.fn().mockResolvedValue({ content: { sha: 'abc' } }),
    deleteFile: vi.fn().mockResolvedValue({}),
    getFileContent: vi.fn().mockResolvedValue(null),
    listDirectory: vi.fn().mockResolvedValue([]),
    getBranchSha: vi.fn().mockResolvedValue('abc123'),
  }
})

import { useAdminStore } from '../../admin/store'
import { commitTree, validateToken, AuthError } from '../../admin/lib/github'
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
    authenticated: true,
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

// ── authSlice — logout ────────────────────────────────────────────────────────

describe('authSlice — logout', () => {
  beforeEach(() => resetStore())

  it('clears the authenticated flag and user from store state', () => {
    useAdminStore.getState().logout()
    const { authenticated, user } = useAdminStore.getState()
    expect(authenticated).toBe(false)
    expect(user).toBeNull()
  })

  it('resets dataLoaded to false', () => {
    useAdminStore.getState().logout()
    expect(useAdminStore.getState().dataLoaded).toBe(false)
  })

  it('clears pending uploads', () => {
    resetStore({
      pendingUploads: [{ ghPath: 'public/img.webp', base64: 'x', message: 'm', tabKey: 'news' }],
    })
    useAdminStore.getState().logout()
    expect(useAdminStore.getState().pendingUploads).toHaveLength(0)
  })

  it('calls logout endpoint to clear auth cookies', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    } as Response)
    useAdminStore.getState().logout()
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/auth/logout',
      expect.objectContaining({ method: 'POST' }),
    )
    fetchSpy.mockRestore()
  })
})

// ── authSlice — ensureAuthenticated ──────────────────────────────────────────────

describe('authSlice — ensureAuthenticated', () => {
  beforeEach(() => resetStore())

  it('returns immediately when tokenExpiresAt is 0 (classic token)', async () => {
    resetStore({ authenticated: true, tokenExpiresAt: 0 })
    await expect(useAdminStore.getState().ensureAuthenticated()).resolves.toBeUndefined()
  })

  it('returns when token is still valid (more than 5 min left)', async () => {
    const futureExp = Date.now() + 10 * 60 * 1000 // 10 min from now
    resetStore({ authenticated: true, tokenExpiresAt: futureExp })
    await expect(useAdminStore.getState().ensureAuthenticated()).resolves.toBeUndefined()
  })

  it('logs out and throws when token is expired and refresh endpoint fails', async () => {
    const pastExp = Date.now() - 1000
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
    } as Response)
    resetStore({ authenticated: true, tokenExpiresAt: pastExp })
    await expect(useAdminStore.getState().ensureAuthenticated()).rejects.toThrow()
    expect(useAdminStore.getState().authenticated).toBe(false)
    fetchSpy.mockRestore()
  })

  it('logs out and throws when refresh endpoint returns non-ok', async () => {
    const pastExp = Date.now() - 1000
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
    } as Response)

    resetStore({
      authenticated: true,
      tokenExpiresAt: pastExp,
    })

    await expect(useAdminStore.getState().ensureAuthenticated()).rejects.toThrow()
    expect(useAdminStore.getState().authenticated).toBe(false)

    fetchSpy.mockRestore()
  })

  it('updates expiry after successful token refresh via server', async () => {
    const pastExp = Date.now() - 1000

    // Stub: 1st call = refresh endpoint, 2nd call = session endpoint
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          expires_in: 3600,
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          authenticated: true,
          expires_at: Date.now() + 3600 * 1000,
        }),
      } as Response)

    resetStore({
      authenticated: true,
      tokenExpiresAt: pastExp,
    })

    await useAdminStore.getState().ensureAuthenticated()
    expect(useAdminStore.getState().authenticated).toBe(true)
    expect(useAdminStore.getState().tokenExpiresAt).toBeGreaterThan(Date.now())

    fetchSpy.mockRestore()
  })
})

// ── authSlice — login ─────────────────────────────────────────────────────────

describe('authSlice — login', () => {
  beforeEach(() => {
    resetStore()
    vi.mocked(validateToken).mockResolvedValue({ login: 'testuser', avatar_url: '' })
  })

  it('sets user and authenticated on success', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ authenticated: true, expires_at: 0 }),
    } as Response)
    await useAdminStore.getState().login()
    const { user, authenticated } = useAdminStore.getState()
    expect(authenticated).toBe(true)
    expect(user?.login).toBe('testuser')
    fetchSpy.mockRestore()
  })

  it('sets loginError when session endpoint returns not authenticated', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ authenticated: false, expires_at: 0 }),
    } as Response)
    await useAdminStore.getState().login()
    const { loginError, loginLoading } = useAdminStore.getState()
    expect(loginError).toBeTruthy()
    expect(loginLoading).toBe(false)
    fetchSpy.mockRestore()
  })

  it('sets loginError and clears loginLoading on AuthError', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ authenticated: true, expires_at: 0 }),
    } as Response)
    vi.mocked(validateToken).mockRejectedValueOnce(
      new (AuthError as new (msg: string, status: number) => Error)('Bad credentials', 401),
    )
    await useAdminStore.getState().login()
    const { loginError, loginLoading, loginAuthStatus } = useAdminStore.getState()
    expect(loginError).toBeTruthy()
    expect(loginLoading).toBe(false)
    expect(loginAuthStatus).toBe(401)
    fetchSpy.mockRestore()
  })

  it('sets loginError on generic error', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ authenticated: true, expires_at: 0 }),
    } as Response)
    vi.mocked(validateToken).mockRejectedValueOnce(new Error('Network error'))
    await useAdminStore.getState().login()
    expect(useAdminStore.getState().loginError).toBe('Network error')
    expect(useAdminStore.getState().loginLoading).toBe(false)
    fetchSpy.mockRestore()
  })
})

// ── authSlice — tryAutoLogin ───────────────────────────────────────────────────

describe('authSlice — tryAutoLogin', () => {
  beforeEach(() => {
    resetStore()
    vi.mocked(validateToken).mockResolvedValue({ login: 'testuser', avatar_url: '' })
  })

  it('is a no-op when session endpoint returns not authenticated', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ authenticated: false, expires_at: 0 }),
    } as Response)
    resetStore({ authenticated: false, user: null })
    await useAdminStore.getState().tryAutoLogin()
    expect(useAdminStore.getState().user).toBeNull()
    fetchSpy.mockRestore()
  })

  it('sets user when session returns authenticated', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ authenticated: true, expires_at: 0 }),
    } as Response)
    resetStore({ authenticated: false, tokenExpiresAt: 0, user: null })
    await useAdminStore.getState().tryAutoLogin()
    expect(useAdminStore.getState().user?.login).toBe('testuser')
    fetchSpy.mockRestore()
  })

  it('calls logout when validateToken throws AuthError', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ authenticated: true, expires_at: 0 }),
    } as Response)
    vi.mocked(validateToken).mockRejectedValueOnce(
      new (AuthError as new (msg: string, status: number) => Error)('Unauthorized', 401),
    )
    resetStore({ authenticated: false, tokenExpiresAt: 0, user: null })
    await useAdminStore.getState().tryAutoLogin()
    expect(useAdminStore.getState().authenticated).toBe(false)
    fetchSpy.mockRestore()
  })

  it('keeps session when validateToken throws a network error (non-AuthError)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ authenticated: true, expires_at: 0 }),
    } as Response)
    vi.mocked(validateToken).mockRejectedValueOnce(new TypeError('Failed to fetch'))
    resetStore({ authenticated: false, tokenExpiresAt: 0, user: null })
    await useAdminStore.getState().tryAutoLogin()
    // Authenticated was set from session, and should remain because it's a network error
    expect(useAdminStore.getState().authenticated).toBe(true)
    fetchSpy.mockRestore()
  })
})

// ── publishSlice — concurrent guard ──────────────────────────────────────────

describe('publishSlice — concurrent publishing guard', () => {
  beforeEach(() => {
    resetStore()
    vi.mocked(commitTree).mockClear()
  })

  it('publishAll is a no-op when already publishing', async () => {
    useAdminStore.setState({ publishing: true })
    await useAdminStore.getState().publishAll()
    expect(commitTree).not.toHaveBeenCalled()
  })

  it('publishTab is a no-op when already publishing', async () => {
    useAdminStore.setState({ publishing: true })
    await useAdminStore.getState().publishTab('news')
    expect(commitTree).not.toHaveBeenCalled()
  })
})

// ── publishSlice — error handling ─────────────────────────────────────────────

describe('publishSlice — error handling', () => {
  beforeEach(() => {
    resetStore({
      state: { news: [{ titel: 'edited' }] },
      originalState: { news: [] },
    })
    vi.mocked(commitTree).mockClear()
  })

  it('publishAll sets an error status on commit failure', async () => {
    vi.mocked(commitTree).mockRejectedValueOnce(new Error('GitHub API down'))
    await useAdminStore.getState().publishAll()
    const { statusMessage, statusType } = useAdminStore.getState()
    expect(statusType).toBe('error')
    expect(statusMessage).toContain('GitHub API down')
  })

  it('publishAll logs out on AuthError from commitTree', async () => {
    vi.mocked(commitTree).mockRejectedValueOnce(
      new (AuthError as new (msg: string, status: number) => Error)('Unauthorized', 401),
    )
    await useAdminStore.getState().publishAll()
    expect(useAdminStore.getState().authenticated).toBe(false)
    expect(useAdminStore.getState().statusType).toBe('error')
  })

  it('publishTab sets an error status on commit failure', async () => {
    vi.mocked(commitTree).mockRejectedValueOnce(new Error('Commit failed'))
    await useAdminStore.getState().publishTab('news')
    expect(useAdminStore.getState().statusType).toBe('error')
    expect(useAdminStore.getState().statusMessage).toContain('Commit failed')
  })

  it('publishTab logs out on AuthError from commitTree', async () => {
    vi.mocked(commitTree).mockRejectedValueOnce(
      new (AuthError as new (msg: string, status: number) => Error)('Unauthorized', 401),
    )
    await useAdminStore.getState().publishTab('news')
    expect(useAdminStore.getState().authenticated).toBe(false)
  })

  it('publishAll resets publishing=false even after an error (finally block)', async () => {
    vi.mocked(commitTree).mockRejectedValueOnce(new Error('oops'))
    await useAdminStore.getState().publishAll()
    expect(useAdminStore.getState().publishing).toBe(false)
  })
})
