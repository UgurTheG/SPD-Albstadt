import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAdminStore } from '..'
import { DRAFT_KEY, PENDING_KEY, resetPersistenceState } from '../persistence'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
const original = { startseite: { heroSlogan: 'published' } }
const draft = { heroSlogan: 'unsaved work' }
const upload = {
  ghPath: 'public/images/news/draft.webp',
  base64: 'YQ==',
  message: 'draft',
  tabKey: 'news',
}
let login = 'alice'

function authenticationNetwork(refreshStatus = 400) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input)
    if (url === '/api/auth/refresh') return json({ error: 'refresh_failed' }, refreshStatus)
    if (url === '/api/auth/session')
      return json({ authenticated: true, expires_at: Date.now() + 3600_000 })
    if (url === '/api/admin-presence') return json({ users: [], version: 0 })
    if (url === '/api/auth/logout') return json({ ok: true })
    if (url === '/api/github') {
      const request = JSON.parse(String(init?.body))
      if (request.path === '/user') return json({ login, avatar_url: '' })
      if (request.path.endsWith('/SPD-Albstadt')) return json({ permissions: { push: true } })
      if (request.path.includes('/git/ref/')) return json({ object: { sha: 'remote-revision' } })
      if (request.path.includes('/compare/'))
        return json({ files: [{ filename: 'public/data/startseite.json' }] })
      if (request.path.includes('/contents/'))
        return json({ content: btoa(JSON.stringify({ heroSlogan: 'remote work' })) })
    }
    throw new Error('Unexpected request: ' + url)
  })
}

beforeEach(() => {
  localStorage.clear()
  resetPersistenceState()
  login = 'alice'
  useAdminStore.setState(
    {
      ...useAdminStore.getInitialState(),
      authenticated: true,
      dataLoaded: true,
      user: { login, avatar_url: '' },
      tokenExpiresAt: Date.now() + 1000,
      state: structuredClone(original),
      originalState: structuredClone(original),
      baseCommitSha: 'original-revision',
      tabBaseShas: { startseite: 'original-revision' },
    },
    true,
  )
  useAdminStore.getState().updateState('startseite', draft)
  useAdminStore.getState().addPendingUpload(upload)
})
afterEach(() => {
  useAdminStore.getState().stopPresencePolling()
  resetPersistenceState()
  vi.restoreAllMocks()
})

describe('expired sessions preserve work for the verified account', () => {
  it.each(['login', 'tryAutoLogin'] as const)(
    'restores drafts, baselines, uploads and undo history through %s',
    async method => {
      const fetchSpy = authenticationNetwork()
      await expect(useAdminStore.getState().ensureAuthenticated()).rejects.toThrow()
      expect(useAdminStore.getState().authenticated).toBe(false)
      expect(JSON.parse(localStorage.getItem(DRAFT_KEY)!).startseite.data).toEqual(draft)
      expect(JSON.parse(localStorage.getItem(PENDING_KEY)!)[0]).toMatchObject(upload)
      expect(fetchSpy.mock.calls.some(([url]) => url === '/api/auth/logout')).toBe(false)

      await useAdminStore.getState()[method]()
      const recovered = useAdminStore.getState()
      expect(recovered.authenticated).toBe(true)
      expect(recovered.state.startseite).toEqual(draft)
      expect(recovered.originalState).toEqual(original)
      expect(recovered.tabBaseShas.startseite).toBe('original-revision')
      expect(recovered.pendingUploads[0]).toMatchObject(upload)
      expect(recovered.dirtyTabs().has('startseite')).toBe(true)
      recovered.undo('startseite')
      expect(useAdminStore.getState().state).toEqual(original)
    },
  )

  it('isolates recovery from a different account without deleting the original account snapshot', async () => {
    authenticationNetwork()
    await expect(useAdminStore.getState().ensureAuthenticated()).rejects.toThrow()
    login = 'bob'
    await useAdminStore.getState().login()
    expect(useAdminStore.getState().state.startseite).not.toEqual(draft)
    expect(useAdminStore.getState().pendingUploads).toEqual([])
    useAdminStore.getState().logout()

    login = 'alice'
    await useAdminStore.getState().login()
    expect(useAdminStore.getState().state.startseite).toEqual(draft)
    expect(useAdminStore.getState().pendingUploads[0]).toMatchObject(upload)
  })

  it.each([429, 503])(
    'keeps the active editor and allows retry after a transient %i',
    async status => {
      authenticationNetwork(status)
      await expect(useAdminStore.getState().ensureAuthenticated()).rejects.toThrow()
      expect(useAdminStore.getState().authenticated).toBe(true)
      expect(useAdminStore.getState().state.startseite).toEqual(draft)
      expect(useAdminStore.getState().pendingUploads[0]).toMatchObject(upload)
      expect(useAdminStore.getState().undoStacks.startseite).toHaveLength(1)
    },
  )

  it('retains explicit logout as the action that discards drafts', () => {
    authenticationNetwork()
    useAdminStore.getState().logout()
    expect(useAdminStore.getState().authenticated).toBe(false)
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull()
    expect(localStorage.getItem(PENDING_KEY)).toBeNull()
    expect(useAdminStore.getState().state).toEqual({})
  })

  it('does not overwrite recovery when automatic sign-in fails before loading data', async () => {
    authenticationNetwork()
    await expect(useAdminStore.getState().ensureAuthenticated()).rejects.toThrow()
    useAdminStore.getState().invalidateSession()
    await useAdminStore.getState().login()
    expect(useAdminStore.getState().state.startseite).toEqual(draft)
  })
})
