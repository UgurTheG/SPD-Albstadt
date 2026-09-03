import { afterEach, describe, expect, it, vi } from 'vitest'
import handler, { isContentPath, resolveAllowedUrl } from '../github'
import { jsonResponse, makeRequest, makeResponse } from './helpers'

const REPO = '/repos/UgurTheG/SPD-Albstadt'
const SHA_A = 'a'.repeat(40)
const SHA_B = 'b'.repeat(40)

describe('isContentPath', () => {
  it('accepts files under the content directories', () => {
    expect(isContentPath('public/data/news.json')).toBe(true)
    expect(isContentPath('public/images/vorstand/max-1.webp')).toBe(true)
    expect(isContentPath('public/documents/fraktion/haushaltsreden/2024.pdf')).toBe(true)
  })

  it('rejects application code and config paths', () => {
    expect(isContentPath('api/github.ts')).toBe(false)
    expect(isContentPath('.github/workflows/ci.yml')).toBe(false)
    expect(isContentPath('vercel.json')).toBe(false)
    expect(isContentPath('public/head.js')).toBe(false)
    expect(isContentPath('src/main.tsx')).toBe(false)
  })

  it('rejects the bare directory, traversal and odd segments', () => {
    expect(isContentPath('public/data/')).toBe(false)
    expect(isContentPath('public/data')).toBe(false)
    expect(isContentPath('public/data/../../api/x.ts')).toBe(false)
    expect(isContentPath('public/data/./x.json')).toBe(false)
    expect(isContentPath('public/data//x.json')).toBe(false)
    expect(isContentPath('/public/data/x.json')).toBe(false)
    expect(isContentPath('public\\data\\x.json')).toBe(false)
    expect(isContentPath('public/data/x\0.json')).toBe(false)
  })

  it('rejects non-strings', () => {
    expect(isContentPath(undefined)).toBe(false)
    expect(isContentPath(42)).toBe(false)
  })
})

describe('resolveAllowedUrl — read endpoints', () => {
  it('allows the identity and repo root endpoints for GET only', () => {
    expect(resolveAllowedUrl({ method: 'GET', path: '/user' })).toBe('https://api.github.com/user')
    expect(resolveAllowedUrl({ method: 'GET', path: REPO })).toBe(`https://api.github.com${REPO}`)
    expect(resolveAllowedUrl({ method: 'POST', path: '/user' })).toBeNull()
    expect(resolveAllowedUrl({ method: 'DELETE', path: REPO })).toBeNull()
  })

  it('rejects /user sub-paths and other repos', () => {
    expect(resolveAllowedUrl({ method: 'GET', path: '/user/emails' })).toBeNull()
    expect(resolveAllowedUrl({ method: 'GET', path: '/repos/UgurTheG/Other' })).toBeNull()
    expect(resolveAllowedUrl({ method: 'GET', path: '/repos/UgurTheG/SPD-Albstadt2' })).toBeNull()
  })

  it('rejects normalised path traversal that escapes the repo prefix', () => {
    expect(resolveAllowedUrl({ method: 'GET', path: `${REPO}/../../../user/emails` })).toBeNull()
    expect(
      resolveAllowedUrl({
        method: 'GET',
        path: `${REPO}/contents/public/data/%2e%2e/%2e%2e/api/x`,
      }),
    ).toBeNull()
    expect(resolveAllowedUrl({ method: 'GET', path: '//evil.example/user' })).toBeNull()
  })

  it('allows content reads with query strings and encoded names', () => {
    expect(
      resolveAllowedUrl({
        method: 'GET',
        path: `${REPO}/contents/public/data/news.json?ref=main&t=1`,
      }),
    ).toBe(`https://api.github.com${REPO}/contents/public/data/news.json?ref=main&t=1`)
    expect(
      resolveAllowedUrl({
        method: 'GET',
        path: `${REPO}/contents/public/images/max-m%C3%BCller.webp`,
      }),
    ).not.toBeNull()
    expect(resolveAllowedUrl({ method: 'GET', path: `${REPO}/contents/api/github.ts` })).toBeNull()
  })

  it('allows branch, commit and compare lookups with real SHAs only', () => {
    expect(
      resolveAllowedUrl({ method: 'GET', path: `${REPO}/git/ref/heads/main?t=1` }),
    ).not.toBeNull()
    expect(resolveAllowedUrl({ method: 'GET', path: `${REPO}/git/ref/heads/other` })).toBeNull()
    expect(
      resolveAllowedUrl({ method: 'GET', path: `${REPO}/git/commits/${SHA_A}` }),
    ).not.toBeNull()
    expect(resolveAllowedUrl({ method: 'GET', path: `${REPO}/git/commits/main` })).toBeNull()
    expect(
      resolveAllowedUrl({ method: 'GET', path: `${REPO}/compare/${SHA_A}...${SHA_B}` }),
    ).not.toBeNull()
    expect(resolveAllowedUrl({ method: 'GET', path: `${REPO}/compare/main...dev` })).toBeNull()
  })

  it('rejects repo administration endpoints', () => {
    for (const sub of ['hooks', 'collaborators/x', 'actions/secrets', 'branches', 'keys']) {
      expect(resolveAllowedUrl({ method: 'GET', path: `${REPO}/${sub}` })).toBeNull()
      expect(resolveAllowedUrl({ method: 'POST', path: `${REPO}/${sub}` })).toBeNull()
      expect(resolveAllowedUrl({ method: 'PUT', path: `${REPO}/${sub}` })).toBeNull()
      expect(resolveAllowedUrl({ method: 'DELETE', path: `${REPO}/${sub}` })).toBeNull()
    }
  })
})

describe('resolveAllowedUrl — write endpoints', () => {
  const treeEntry = (path: string, extra: Record<string, unknown> = { content: '{}' }) => ({
    path,
    mode: '100644',
    type: 'blob',
    ...extra,
  })

  it('allows a well-formed content tree', () => {
    const body = {
      base_tree: SHA_A,
      tree: [
        treeEntry('public/data/news.json'),
        treeEntry('public/images/news/bild-1.webp', { sha: SHA_B }),
        treeEntry('public/images/news/alt.webp', { sha: null }),
      ],
    }
    expect(resolveAllowedUrl({ method: 'POST', path: `${REPO}/git/trees`, body })).not.toBeNull()
  })

  it('rejects trees that touch anything outside the content directories', () => {
    const body = {
      base_tree: SHA_A,
      tree: [treeEntry('public/data/news.json'), treeEntry('api/github.ts')],
    }
    expect(resolveAllowedUrl({ method: 'POST', path: `${REPO}/git/trees`, body })).toBeNull()
  })

  it('rejects trees without base_tree (would replace the whole repository)', () => {
    const body = { tree: [treeEntry('public/data/news.json')] }
    expect(resolveAllowedUrl({ method: 'POST', path: `${REPO}/git/trees`, body })).toBeNull()
  })

  it('rejects executable, symlink and submodule tree entries', () => {
    for (const mode of ['100755', '120000', '160000']) {
      const body = {
        base_tree: SHA_A,
        tree: [treeEntry('public/data/x.json', { mode, content: '' })],
      }
      expect(resolveAllowedUrl({ method: 'POST', path: `${REPO}/git/trees`, body })).toBeNull()
    }
    const body = {
      base_tree: SHA_A,
      tree: [treeEntry('public/data/x.json', { type: 'tree', sha: SHA_B })],
    }
    expect(resolveAllowedUrl({ method: 'POST', path: `${REPO}/git/trees`, body })).toBeNull()
  })

  it('rejects empty or malformed tree bodies', () => {
    expect(
      resolveAllowedUrl({
        method: 'POST',
        path: `${REPO}/git/trees`,
        body: { base_tree: SHA_A, tree: [] },
      }),
    ).toBeNull()
    expect(resolveAllowedUrl({ method: 'POST', path: `${REPO}/git/trees`, body: 'x' })).toBeNull()
    expect(resolveAllowedUrl({ method: 'POST', path: `${REPO}/git/trees` })).toBeNull()
  })

  it('validates commit, blob and ref-update bodies', () => {
    const commit = { message: 'admin: news.json aktualisiert', tree: SHA_A, parents: [SHA_B] }
    expect(
      resolveAllowedUrl({ method: 'POST', path: `${REPO}/git/commits`, body: commit }),
    ).not.toBeNull()
    expect(
      resolveAllowedUrl({
        method: 'POST',
        path: `${REPO}/git/commits`,
        body: { ...commit, parents: [] },
      }),
    ).toBeNull()
    expect(
      resolveAllowedUrl({
        method: 'POST',
        path: `${REPO}/git/blobs`,
        body: { content: 'AAA=', encoding: 'base64' },
      }),
    ).not.toBeNull()
    expect(
      resolveAllowedUrl({
        method: 'POST',
        path: `${REPO}/git/blobs`,
        body: { content: 'x', encoding: 'utf-8' },
      }),
    ).toBeNull()
    expect(
      resolveAllowedUrl({
        method: 'PATCH',
        path: `${REPO}/git/refs/heads/main`,
        body: { sha: SHA_A },
      }),
    ).not.toBeNull()
    expect(
      resolveAllowedUrl({
        method: 'PATCH',
        path: `${REPO}/git/refs/heads/main`,
        body: { sha: SHA_A, force: true },
      }),
    ).toBeNull()
    expect(
      resolveAllowedUrl({
        method: 'PATCH',
        path: `${REPO}/git/refs/heads/release`,
        body: { sha: SHA_A },
      }),
    ).toBeNull()
    expect(resolveAllowedUrl({ method: 'DELETE', path: `${REPO}/git/refs/heads/main` })).toBeNull()
  })

  it('validates single-file content writes', () => {
    const put = { message: 'admin: upload', content: 'AAA=', branch: 'main' }
    expect(
      resolveAllowedUrl({
        method: 'PUT',
        path: `${REPO}/contents/public/documents/fraktion/haushaltsreden/2024.pdf`,
        body: put,
      }),
    ).not.toBeNull()
    expect(
      resolveAllowedUrl({ method: 'PUT', path: `${REPO}/contents/vercel.json`, body: put }),
    ).toBeNull()
    expect(
      resolveAllowedUrl({
        method: 'PUT',
        path: `${REPO}/contents/public/data/x.json`,
        body: { ...put, branch: 'gh-pages' },
      }),
    ).toBeNull()
    const del = { message: 'admin: delete', sha: SHA_A, branch: 'main' }
    expect(
      resolveAllowedUrl({
        method: 'DELETE',
        path: `${REPO}/contents/public/documents/x.pdf`,
        body: del,
      }),
    ).not.toBeNull()
    expect(
      resolveAllowedUrl({
        method: 'DELETE',
        path: `${REPO}/contents/public/documents/x.pdf`,
        body: { message: 'x' },
      }),
    ).toBeNull()
    expect(
      resolveAllowedUrl({ method: 'POST', path: `${REPO}/contents/public/data/x.json`, body: put }),
    ).toBeNull()
  })
})

describe('POST /api/github handler', () => {
  afterEach(() => vi.restoreAllMocks())

  const headers = {
    origin: 'https://www.spd-albstadt.de',
    cookie: 'spd_access_token=gho_secret',
  }

  it('rejects non-POST, bad origin and missing token', async () => {
    let res = makeResponse()
    await handler(makeRequest({ method: 'GET', headers }), res)
    expect(res.statusCode).toBe(405)

    res = makeResponse()
    await handler(
      makeRequest({ method: 'POST', headers: { ...headers, origin: 'https://evil.example' } }),
      res,
    )
    expect(res.statusCode).toBe(403)

    res = makeResponse()
    await handler(makeRequest({ method: 'POST', headers: { origin: headers.origin } }), res)
    expect(res.statusCode).toBe(401)
  })

  it('returns 400 for disallowed paths without contacting GitHub', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const res = makeResponse()
    await handler(
      makeRequest({ method: 'POST', headers, body: { method: 'DELETE', path: `${REPO}/hooks/1` } }),
      res,
    )
    expect(res.statusCode).toBe(400)
    expect(res.body).toEqual({ error: 'path_not_allowed' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('forwards an allowed request with the cookie token and returns GitHub’s body', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ login: 'ugurtheg' }))
    const res = makeResponse()
    await handler(
      makeRequest({ method: 'POST', headers, body: { method: 'get', path: '/user' } }),
      res,
    )
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ login: 'ugurtheg' })
    const [url, opts] = fetchSpy.mock.calls[0]!
    expect(url).toBe('https://api.github.com/user')
    expect((opts!.headers as Record<string, string>).Authorization).toBe('Bearer gho_secret')
    expect(res.headers['Cache-Control']).toBe('no-store')
  })

  it('maps upstream failures to 502', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('down'))
    const res = makeResponse()
    await handler(
      makeRequest({ method: 'POST', headers, body: { method: 'GET', path: '/user' } }),
      res,
    )
    expect(res.statusCode).toBe(502)
  })
})
