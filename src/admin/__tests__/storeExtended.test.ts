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
    refreshToken: '',
    refreshTokenExpiresAt: 0,
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

  it('removes auth keys from localStorage', () => {
    localStorage.setItem('spd-admin-token', 'tok')
    localStorage.setItem('spd-admin-refresh', 'ref')
    useAdminStore.getState().logout()
    expect(localStorage.getItem('spd-admin-token')).toBeNull()
    expect(localStorage.getItem('spd-admin-refresh')).toBeNull()
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

  it('logs out and throws when token is expired and there is no refresh token', async () => {
    const pastExp = Date.now() - 1000
    resetStore({ token: 'old-token', tokenExpiresAt: pastExp, refreshToken: '' })
    await expect(useAdminStore.getState().ensureFreshToken()).rejects.toThrow()
    expect(useAdminStore.getState().token).toBe('')
  })

  it('logs out and throws when refresh token itself is expired', async () => {
    const pastExp = Date.now() - 1000
    resetStore({
      token: 'old-token',
      tokenExpiresAt: pastExp,
      refreshToken: 'ref-tok',
      refreshTokenExpiresAt: pastExp,
    })
    await expect(useAdminStore.getState().ensureFreshToken()).rejects.toThrow()
    expect(useAdminStore.getState().token).toBe('')
  })

  it('exchanges refresh token for a new access token', async () => {
    const pastExp = Date.now() - 1000
    const futureRefreshExp = Date.now() + 60 * 60 * 1000

    // Stub the fetch call made by ensureFreshToken
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'new-access-token',
        expires_in: 3600,
        refresh_token: 'new-refresh-token',
        refresh_token_expires_in: 86400,
      }),
    } as Response)

    resetStore({
      token: 'expired-token',
      tokenExpiresAt: pastExp,
      refreshToken: 'valid-refresh',
      refreshTokenExpiresAt: futureRefreshExp,
    })

    const tok = await useAdminStore.getState().ensureFreshToken()
    expect(tok).toBe('new-access-token')
    expect(useAdminStore.getState().token).toBe('new-access-token')

    fetchSpy.mockRestore()
  })

  it('logs out and throws when the refresh endpoint returns non-ok', async () => {
    const pastExp = Date.now() - 1000
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
    } as Response)

    resetStore({
      token: 'expired-token',
      tokenExpiresAt: pastExp,
      refreshToken: 'valid-refresh',
      refreshTokenExpiresAt: 0,
    })

    await expect(useAdminStore.getState().ensureFreshToken()).rejects.toThrow()
    expect(useAdminStore.getState().token).toBe('')

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
    await useAdminStore.getState().login({ token: 'gh_token' })
    const { user, token } = useAdminStore.getState()
    expect(token).toBe('gh_token')
    expect(user?.login).toBe('testuser')
  })

  it('persists the token in localStorage', async () => {
    await useAdminStore.getState().login({ token: 'gh_token' })
    expect(localStorage.getItem('spd-admin-token')).toBe('gh_token')
  })

  it('sets loginError and clears loginLoading on AuthError', async () => {
    vi.mocked(validateToken).mockRejectedValueOnce(
      new (AuthError as new (msg: string, status: number) => Error)('Bad credentials', 401),
    )
    await useAdminStore.getState().login({ token: 'bad_token' })
    const { loginError, loginLoading, loginAuthStatus } = useAdminStore.getState()
    expect(loginError).toBeTruthy()
    expect(loginLoading).toBe(false)
    expect(loginAuthStatus).toBe(401)
  })

  it('sets loginError on generic error', async () => {
    vi.mocked(validateToken).mockRejectedValueOnce(new Error('Network error'))
    await useAdminStore.getState().login({ token: 'bad_token' })
    expect(useAdminStore.getState().loginError).toBe('Network error')
    expect(useAdminStore.getState().loginLoading).toBe(false)
  })
})

// ── authSlice — tryAutoLogin ───────────────────────────────────────────────────

describe('authSlice — tryAutoLogin', () => {
  beforeEach(() => {
    resetStore()
    vi.mocked(validateToken).mockResolvedValue({ login: 'testuser', avatar_url: '' })
  })

  it('is a no-op when there is no token', async () => {
    resetStore({ token: '', user: null })
    await useAdminStore.getState().tryAutoLogin()
    expect(useAdminStore.getState().user).toBeNull()
  })

  it('sets user when token is valid', async () => {
    resetStore({ token: 'valid', tokenExpiresAt: 0, user: null })
    await useAdminStore.getState().tryAutoLogin()
    expect(useAdminStore.getState().user?.login).toBe('testuser')
  })

  it('calls logout when validateToken throws AuthError', async () => {
    vi.mocked(validateToken).mockRejectedValueOnce(
      new (AuthError as new (msg: string, status: number) => Error)('Unauthorized', 401),
    )
    resetStore({ token: 'invalid', tokenExpiresAt: 0, user: null })
    await useAdminStore.getState().tryAutoLogin()
    expect(useAdminStore.getState().token).toBe('')
  })

  it('keeps session when validateToken throws a network error (non-AuthError)', async () => {
    vi.mocked(validateToken).mockRejectedValueOnce(new TypeError('Failed to fetch'))
    resetStore({ token: 'valid', tokenExpiresAt: 0, user: null })
    await useAdminStore.getState().tryAutoLogin()
    // Token must NOT be cleared for transient network failures
    expect(useAdminStore.getState().token).toBe('valid')
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
