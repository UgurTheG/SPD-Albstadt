import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ics from '../ics'
import presence, { isGitHubAvatarUrl } from '../admin-presence'
import { makeLoginCookieValue } from '../auth/cookies'
import { makeRequest, makeResponse } from './helpers'

function textResponse(body: string, extraHeaders: Record<string, string> = {}): Response {
  const bytes = new TextEncoder().encode(body)
  return {
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'text/calendar', ...extraHeaders }),
    arrayBuffer: async () => bytes.buffer,
    text: async () => body,
  } as unknown as Response
}

describe('GET /api/ics', () => {
  afterEach(() => vi.restoreAllMocks())

  it('relays the upstream feed over https with a timeout', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(textResponse('BEGIN:VCALENDAR'))
    const res = makeResponse()
    await ics(makeRequest({ headers: { 'x-forwarded-for': '10.1.0.1' } }), res)
    expect(res.statusCode).toBe(200)
    expect(String(res.body)).toBe('BEGIN:VCALENDAR')
    const [url, opts] = spy.mock.calls[0]!
    // config.json may hold a webcal:// URL — the proxy must always fetch over https
    expect(String(url).startsWith('https://')).toBe(true)
    expect(opts!.signal).toBeInstanceOf(AbortSignal)
  })

  it('rate-limits repeated requests from one IP', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(textResponse('BEGIN:VCALENDAR'))
    let last = makeResponse()
    for (let i = 0; i < 31; i++) {
      last = makeResponse()
      await ics(makeRequest({ headers: { 'x-forwarded-for': '10.1.0.2' } }), last)
    }
    expect(last.statusCode).toBe(429)
  })

  it('rejects oversized upstream bodies', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      textResponse('x', { 'content-length': String(3 * 1024 * 1024) }),
    )
    const res = makeResponse()
    await ics(makeRequest({ headers: { 'x-forwarded-for': '10.1.0.3' } }), res)
    expect(res.statusCode).toBe(502)
    expect(res.body).toEqual({ error: 'upstream_too_large' })
  })

  it('answers OPTIONS and rejects other methods', async () => {
    let res = makeResponse()
    await ics(makeRequest({ method: 'OPTIONS' }), res)
    expect(res.statusCode).toBe(204)
    res = makeResponse()
    await ics(makeRequest({ method: 'POST' }), res)
    expect(res.statusCode).toBe(405)
  })

  it('maps timeouts and network errors to an opaque 502', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new DOMException('timeout', 'TimeoutError'))
    const res = makeResponse()
    await ics(makeRequest({ headers: { 'x-forwarded-for': '10.1.0.4' } }), res)
    expect(res.statusCode).toBe(502)
    expect(res.body).toEqual({ error: 'upstream_error' })
  })
})

describe('isGitHubAvatarUrl', () => {
  it('accepts only https URLs on the GitHub avatar CDN', () => {
    expect(isGitHubAvatarUrl('https://avatars.githubusercontent.com/u/1?v=4')).toBe(true)
    expect(isGitHubAvatarUrl('http://avatars.githubusercontent.com/u/1')).toBe(false)
    expect(isGitHubAvatarUrl('https://avatars.githubusercontent.com.evil.example/u/1')).toBe(false)
    expect(isGitHubAvatarUrl('https://tracker.example/pixel.gif')).toBe(false)
    expect(isGitHubAvatarUrl('javascript:alert(1)')).toBe(false)
    expect(isGitHubAvatarUrl('')).toBe(false)
    expect(isGitHubAvatarUrl('not a url')).toBe(false)
  })
})

// ─── /api/admin-presence ──────────────────────────────────────────────────────

describe('/api/admin-presence', () => {
  beforeEach(() => vi.stubEnv('STATE_SIGNING_SECRET', 'presence-secret'))
  afterEach(() => vi.unstubAllEnvs())

  function cookieHeader(loginCookie: string | undefined): string {
    const parts = ['spd_access_token=gho_x']
    if (loginCookie !== undefined) parts.push(`spd_user_login=${encodeURIComponent(loginCookie)}`)
    return parts.join('; ')
  }

  function request(
    method: string,
    loginCookie: string | undefined,
    body?: Record<string, unknown>,
    ip = '10.2.0.1',
  ) {
    return makeRequest({
      method,
      body,
      headers: {
        origin: 'https://www.spd-albstadt.de',
        cookie: cookieHeader(loginCookie),
        'x-forwarded-for': ip,
      },
    })
  }

  it('rejects requests without a valid signed identity cookie', async () => {
    let res = makeResponse()
    await presence(request('GET', undefined), res)
    expect(res.statusCode).toBe(401)
    expect(res.body).toEqual({ error: 'invalid_identity_cookie' })

    // A plain (unsigned) login value — what the client's owner could set by hand
    res = makeResponse()
    await presence(request('POST', 'editor', { activeTab: 'news' }), res)
    expect(res.statusCode).toBe(401)

    // A signature made with another secret
    vi.stubEnv('STATE_SIGNING_SECRET', 'other')
    const foreign = makeLoginCookieValue('editor', 3600)
    vi.stubEnv('STATE_SIGNING_SECRET', 'presence-secret')
    res = makeResponse()
    await presence(request('DELETE', foreign), res)
    expect(res.statusCode).toBe(401)
  })

  it('rejects requests without the access-token cookie', async () => {
    const res = makeResponse()
    await presence(
      makeRequest({
        method: 'GET',
        headers: {
          cookie: `spd_user_login=${encodeURIComponent(makeLoginCookieValue('editor', 3600))}`,
          'x-forwarded-for': '10.2.0.2',
        },
      }),
      res,
    )
    expect(res.statusCode).toBe(401)
    expect(res.body).toEqual({ error: 'unauthenticated' })
  })

  it('binds presence to the verified login and ignores body.login', async () => {
    const alice = makeLoginCookieValue('alice', 3600)
    const bob = makeLoginCookieValue('bob', 3600)

    let res = makeResponse()
    await presence(
      request('POST', alice, {
        login: 'mallory',
        avatar_url: 'https://tracker.example/pixel.gif',
        activeTab: 'news',
        dirtyTabs: ['news', 'not-a-tab'],
      }),
      res,
    )
    expect(res.statusCode).toBe(200)
    // The caller never sees themselves in the list
    expect((res.body as { users: unknown[] }).users).toEqual([])

    res = makeResponse()
    await presence(request('GET', bob), res)
    expect(res.statusCode).toBe(200)
    const { users } = res.body as {
      users: { login: string; avatar_url: string; activeTab: string; dirtyTabs: string[] }[]
    }
    expect(users).toHaveLength(1)
    expect(users[0]).toMatchObject({
      login: 'alice',
      avatar_url: '',
      activeTab: 'news',
      dirtyTabs: ['news'],
    })

    // DELETE only ever removes the caller's own entry
    res = makeResponse()
    await presence(request('DELETE', bob, { login: 'alice' }), res)
    expect(res.statusCode).toBe(200)
    res = makeResponse()
    await presence(request('GET', bob), res)
    expect((res.body as { users: { login: string }[] }).users.map(u => u.login)).toEqual(['alice'])

    res = makeResponse()
    await presence(request('DELETE', alice), res)
    res = makeResponse()
    await presence(request('GET', bob), res)
    expect((res.body as { users: unknown[] }).users).toEqual([])
  })

  it('rejects cross-origin callers', async () => {
    const res = makeResponse()
    await presence(
      makeRequest({
        method: 'GET',
        headers: {
          origin: 'https://evil.example',
          cookie: cookieHeader(makeLoginCookieValue('editor', 3600)),
          'x-forwarded-for': '10.2.0.3',
        },
      }),
      res,
    )
    expect(res.statusCode).toBe(403)
  })
})
