import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchGitHubLogin, hasPushAccess, isLoginAllowed } from '../auth/access'
import { parseCookies, signState } from '../auth/cookies'
import callback from '../auth/callback'
import refresh from '../auth/refresh'
import start from '../auth/start'
import { jsonResponse, makeRequest, makeResponse, mockFetchByUrl } from './helpers'

const ENV = {
  VITE_GITHUB_CLIENT_ID: 'client-id',
  GITHUB_CLIENT_SECRET: 'client-secret',
  STATE_SIGNING_SECRET: 'signing-secret',
  OAUTH_REDIRECT_URI: 'https://www.spd-albstadt.de/api/auth/callback',
}

beforeEach(() => {
  for (const [k, v] of Object.entries(ENV)) vi.stubEnv(k, v)
  vi.stubEnv('ALLOWED_GITHUB_LOGINS', '')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

function setCookies(res: ReturnType<typeof makeResponse>): string[] {
  const raw = res.headers['Set-Cookie']
  return Array.isArray(raw) ? [...raw] : typeof raw === 'string' ? [raw] : []
}

// ─── parseCookies ─────────────────────────────────────────────────────────────

describe('parseCookies', () => {
  it('parses and decodes values', () => {
    expect(parseCookies('a=1; b=hello%20world')).toEqual({ a: '1', b: 'hello world' })
  })

  it('does not throw on malformed percent-encoding', () => {
    expect(() => parseCookies('spd_access_token=%E0; ok=1')).not.toThrow()
    expect(parseCookies('spd_access_token=%E0; ok=1')).toEqual({ spd_access_token: '', ok: '1' })
  })
})

// ─── access helpers ───────────────────────────────────────────────────────────

describe('isLoginAllowed', () => {
  it('allows everyone when the allowlist is unset', () => {
    expect(isLoginAllowed('anyone')).toBe(true)
  })

  it('is case-insensitive and ignores whitespace when set', () => {
    vi.stubEnv('ALLOWED_GITHUB_LOGINS', ' UgurTheG , other ')
    expect(isLoginAllowed('ugurtheg')).toBe(true)
    expect(isLoginAllowed('OTHER')).toBe(true)
    expect(isLoginAllowed('stranger')).toBe(false)
  })
})

describe('hasPushAccess', () => {
  it('is true only when GitHub reports push permission', async () => {
    mockFetchByUrl([['/repos/', jsonResponse({ permissions: { push: true } })]])
    expect(await hasPushAccess('t')).toBe(true)
  })

  it('fails closed on read-only access, missing permissions, errors and network failures', async () => {
    mockFetchByUrl([['/repos/', jsonResponse({ permissions: { pull: true, push: false } })]])
    expect(await hasPushAccess('t')).toBe(false)
    vi.restoreAllMocks()
    mockFetchByUrl([['/repos/', jsonResponse({ full_name: 'x' })]])
    expect(await hasPushAccess('t')).toBe(false)
    vi.restoreAllMocks()
    mockFetchByUrl([['/repos/', jsonResponse({}, 404)]])
    expect(await hasPushAccess('t')).toBe(false)
    vi.restoreAllMocks()
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'))
    expect(await hasPushAccess('t')).toBe(false)
  })
})

describe('fetchGitHubLogin', () => {
  it('lower-cases the login and returns "" on failure', async () => {
    mockFetchByUrl([['/user', jsonResponse({ login: 'UgurTheG' })]])
    expect(await fetchGitHubLogin('t')).toBe('ugurtheg')
    vi.restoreAllMocks()
    mockFetchByUrl([['/user', jsonResponse({}, 401)]])
    expect(await fetchGitHubLogin('t')).toBe('')
  })
})

// ─── start ────────────────────────────────────────────────────────────────────

describe('GET /api/auth/start', () => {
  it('requests the least-privilege scope', () => {
    const res = makeResponse()
    start(makeRequest({ headers: { 'x-forwarded-for': '10.0.0.1' } }), res)
    expect(res.statusCode).toBe(302)
    const location = new URL(String(res.headers['Location']))
    expect(location.searchParams.get('scope')).toBe('read:user public_repo')
    expect(location.searchParams.get('client_id')).toBe('client-id')
  })
})

// ─── callback ─────────────────────────────────────────────────────────────────

describe('GET /api/auth/callback', () => {
  const state = 'abc123'

  function callbackRequest(ip: string) {
    return makeRequest({
      query: { code: 'the-code', state },
      headers: {
        cookie: `spd_oauth_state=${encodeURIComponent(signState(state))}`,
        'x-forwarded-for': ip,
      },
    })
  }

  function githubRoutes(overrides: { push?: boolean; login?: string } = {}) {
    return mockFetchByUrl([
      ['login/oauth/access_token', jsonResponse({ access_token: 'gho_new', expires_in: 3600 })],
      ['/user', jsonResponse({ login: overrides.login ?? 'Editor' })],
      ['/repos/', jsonResponse({ permissions: { push: overrides.push ?? true } })],
    ])
  }

  it('rejects users without push access even though the token exchange succeeded', async () => {
    githubRoutes({ push: false })
    const res = makeResponse()
    await callback(callbackRequest('10.0.1.1'), res)
    expect(res.headers['Location']).toBe('/admin?auth=error&msg=no_push_access')
    expect(setCookies(res).some(c => c.startsWith('spd_access_token=gho'))).toBe(false)
  })

  it('rejects users outside the allowlist before checking the repo', async () => {
    vi.stubEnv('ALLOWED_GITHUB_LOGINS', 'someone-else')
    const spy = githubRoutes()
    const res = makeResponse()
    await callback(callbackRequest('10.0.1.2'), res)
    expect(res.headers['Location']).toBe('/admin?auth=error&msg=unauthorized_user')
    expect(spy.mock.calls.some(([u]) => String(u).includes('/repos/'))).toBe(false)
  })

  it('sets auth cookies with the verified login for users with push access', async () => {
    githubRoutes()
    const res = makeResponse()
    await callback(callbackRequest('10.0.1.3'), res)
    expect(res.headers['Location']).toBe('/admin?auth=ok')
    const cookies = setCookies(res)
    expect(cookies.some(c => c.startsWith('spd_access_token=gho_new'))).toBe(true)
    expect(cookies.some(c => c.startsWith('spd_user_login=editor'))).toBe(true)
    expect(cookies.some(c => c.startsWith('spd_oauth_state=;'))).toBe(true)
  })
})

// ─── refresh ──────────────────────────────────────────────────────────────────

describe('POST /api/auth/refresh', () => {
  function refreshRequest(ip: string, login = 'editor') {
    return makeRequest({
      method: 'POST',
      headers: {
        origin: 'https://www.spd-albstadt.de',
        cookie: `spd_access_token=old; spd_refresh_token=r1; spd_user_login=${login}`,
        'x-forwarded-for': ip,
      },
    })
  }

  it('locks out a login removed from the allowlist and clears cookies', async () => {
    vi.stubEnv('ALLOWED_GITHUB_LOGINS', 'someone-else')
    mockFetchByUrl([['login/oauth/access_token', jsonResponse({ access_token: 'gho_new' })]])
    const res = makeResponse()
    await refresh(refreshRequest('10.0.2.1'), res)
    expect(res.statusCode).toBe(401)
    expect(res.body).toEqual({ error: 'unauthorized_user' })
    expect(setCookies(res).some(c => c.startsWith('spd_refresh_token=;'))).toBe(true)
  })

  it('locks out a login whose push access was revoked', async () => {
    mockFetchByUrl([
      ['login/oauth/access_token', jsonResponse({ access_token: 'gho_new' })],
      ['/repos/', jsonResponse({ permissions: { push: false } })],
    ])
    const res = makeResponse()
    await refresh(refreshRequest('10.0.2.2'), res)
    expect(res.statusCode).toBe(401)
    expect(res.body).toEqual({ error: 'no_push_access' })
  })

  it('rotates cookies for an authorised login', async () => {
    mockFetchByUrl([
      ['login/oauth/access_token', jsonResponse({ access_token: 'gho_new', expires_in: 100 })],
      ['/repos/', jsonResponse({ permissions: { push: true } })],
    ])
    const res = makeResponse()
    await refresh(refreshRequest('10.0.2.3'), res)
    expect(res.statusCode).toBe(200)
    expect(setCookies(res).some(c => c.startsWith('spd_access_token=gho_new'))).toBe(true)
    expect(setCookies(res).some(c => c.startsWith('spd_user_login=editor'))).toBe(true)
  })
})
