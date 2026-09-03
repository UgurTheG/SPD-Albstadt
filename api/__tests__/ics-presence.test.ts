import { afterEach, describe, expect, it, vi } from 'vitest'
import ics from '../ics'
import { isGitHubAvatarUrl } from '../admin-presence'
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
