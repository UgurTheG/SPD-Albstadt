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
  return {
    AuthError,
    commitTree: vi.fn().mockResolvedValue({}),
    validateToken: vi.fn().mockResolvedValue({ login: 'testuser', avatar_url: '' }),
    commitFile: vi.fn().mockResolvedValue({}),
    commitBinaryFile: vi.fn().mockResolvedValue({ content: { sha: 'abc' } }),
    deleteFile: vi.fn().mockResolvedValue({}),
    getFileContent: vi.fn().mockResolvedValue(null),
    listDirectory: vi.fn().mockResolvedValue([]),
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

// ── authSlice — logout ────────────────────────────────────────────────────────

describe('authSlice — logout', () => {
  beforeEach(() => resetStore())

  it('clears the token and user from store state', () => {
    useAdminStore.getState().logout()
    const { token, user } = useAdminStore.getState()
    expect(token).toBe('')
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

// ── authSlice — ensureFreshToken ──────────────────────────────────────────────

describe('authSlice — ensureFreshToken', () => {
  beforeEach(() => resetStore())

  it('returns the token immediately when tokenExpiresAt is 0 (classic token)', async () => {
    resetStore({ token: 'classic-token', tokenExpiresAt: 0 })
    const tok = await useAdminStore.getState().ensureFreshToken()
    expect(tok).toBe('classic-token')
  })

  it('returns the token when it is still valid (more than 5 min left)', async () => {
    const futureExp = Date.now() + 10 * 60 * 1000 // 10 min from now
    resetStore({ token: 'fresh-token', tokenExpiresAt: futureExp })
    const tok = await useAdminStore.getState().ensureFreshToken()
    expect(tok).toBe('fresh-token')
  })

  it('logs out and throws when token is expired and refresh endpoint fails', async () => {
    const pastExp = Date.now() - 1000
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
    } as Response)
    resetStore({ token: 'old-token', tokenExpiresAt: pastExp })
    await expect(useAdminStore.getState().ensureFreshToken()).rejects.toThrow()
    expect(useAdminStore.getState().token).toBe('')
    fetchSpy.mockRestore()
  })

  it('logs out and throws when refresh endpoint returns non-ok', async () => {
    const pastExp = Date.now() - 1000
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
    } as Response)

    resetStore({
      token: 'expired-token',
      tokenExpiresAt: pastExp,
    })

    await expect(useAdminStore.getState().ensureFreshToken()).rejects.toThrow()
    expect(useAdminStore.getState().token).toBe('')

    fetchSpy.mockRestore()
  })

  it('exchanges refresh token for a new access token via server', async () => {
    const pastExp = Date.now() - 1000

    // Stub the fetch call made by ensureFreshToken
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'new-access-token',
        expires_in: 3600,
      }),
    } as Response)

    resetStore({
      token: 'expired-token',
      tokenExpiresAt: pastExp,
    })

    const tok = await useAdminStore.getState().ensureFreshToken()
    expect(tok).toBe('new-access-token')
    expect(useAdminStore.getState().token).toBe('new-access-token')

    fetchSpy.mockRestore()
  })
})

// ── authSlice — login ─────────────────────────────────────────────────────────

describe('authSlice — login', () => {
  beforeEach(() => {
    resetStore()
    vi.mocked(validateToken).mockResolvedValue({ login: 'testuser', avatar_url: '' })
  })

  it('sets user and token on success', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'gh_token', expires_at: 0 }),
    } as Response)
    await useAdminStore.getState().login()
    const { user, token } = useAdminStore.getState()
    expect(token).toBe('gh_token')
    expect(user?.login).toBe('testuser')
    fetchSpy.mockRestore()
  })

  it('sets loginError when session endpoint returns no token', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: null, expires_at: 0 }),
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
      json: async () => ({ access_token: 'bad_token', expires_at: 0 }),
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
      json: async () => ({ access_token: 'bad_token', expires_at: 0 }),
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

  it('is a no-op when session endpoint returns no token', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: null, expires_at: 0 }),
    } as Response)
    resetStore({ token: '', user: null })
    await useAdminStore.getState().tryAutoLogin()
    expect(useAdminStore.getState().user).toBeNull()
    fetchSpy.mockRestore()
  })

  it('sets user when session returns valid token', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'valid', expires_at: 0 }),
    } as Response)
    resetStore({ token: '', tokenExpiresAt: 0, user: null })
    await useAdminStore.getState().tryAutoLogin()
    expect(useAdminStore.getState().user?.login).toBe('testuser')
    fetchSpy.mockRestore()
  })

  it('calls logout when validateToken throws AuthError', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'invalid', expires_at: 0 }),
    } as Response)
    vi.mocked(validateToken).mockRejectedValueOnce(
      new (AuthError as new (msg: string, status: number) => Error)('Unauthorized', 401),
    )
    resetStore({ token: '', tokenExpiresAt: 0, user: null })
    await useAdminStore.getState().tryAutoLogin()
    expect(useAdminStore.getState().token).toBe('')
    fetchSpy.mockRestore()
  })

  it('keeps session when validateToken throws a network error (non-AuthError)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'valid', expires_at: 0 }),
    } as Response)
    vi.mocked(validateToken).mockRejectedValueOnce(new TypeError('Failed to fetch'))
    resetStore({ token: '', tokenExpiresAt: 0, user: null })
    await useAdminStore.getState().tryAutoLogin()
    // Token was set from session, and should remain because it's a network error
    expect(useAdminStore.getState().token).toBe('valid')
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
    expect(useAdminStore.getState().token).toBe('')
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
    expect(useAdminStore.getState().token).toBe('')
  })

  it('publishAll resets publishing=false even after an error (finally block)', async () => {
    vi.mocked(commitTree).mockRejectedValueOnce(new Error('oops'))
    await useAdminStore.getState().publishAll()
    expect(useAdminStore.getState().publishing).toBe(false)
  })
})
