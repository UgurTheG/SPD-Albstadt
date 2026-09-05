import { afterEach, describe, expect, it, vi } from 'vitest'
import handler, { isContentPath, resolveAllowedUrl, verifyRefUpdate } from '../github'
import { jsonResponse, makeRequest, makeResponse, mockFetchByUrl } from './helpers'

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

  it('forwards non-JSON upstream bodies as plain text, never as HTML', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 502,
      headers: new Headers({ 'content-type': 'text/html' }),
      text: async () => '<html>Bad Gateway</html>',
    } as unknown as Response)
    const res = makeResponse()
    await handler(
      makeRequest({ method: 'POST', headers, body: { method: 'GET', path: '/user' } }),
      res,
    )
    expect(res.statusCode).toBe(502)
    expect(res.headers['Content-Type']).toBe('text/plain; charset=utf-8')
    expect(res.body).toBe('<html>Bad Gateway</html>')
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

// ─── Branch update verification ───────────────────────────────────────────────

const HEAD = 'c'.repeat(40)
const NEW = 'd'.repeat(40)
const NEW_TREE = 'e'.repeat(40)
const HEAD_TREE = 'f'.repeat(40)

interface TreeEntry {
  path: string
  mode?: string
  type?: string
  sha?: string
}

const BASE_TREE: TreeEntry[] = [
  { path: 'api', mode: '040000', type: 'tree', sha: '1'.repeat(40) },
  { path: 'api/github.ts', mode: '100644', type: 'blob', sha: '2'.repeat(40) },
  { path: 'public/data/news.json', mode: '100644', type: 'blob', sha: '3'.repeat(40) },
  { path: 'public/images/vorstand/max.webp', mode: '100644', type: 'blob', sha: '4'.repeat(40) },
]

/** Wire up the five GitHub reads `verifyRefUpdate` performs plus the final PATCH. */
function refUpdateRoutes(
  opts: {
    newTree?: TreeEntry[]
    parents?: string[]
    truncated?: boolean
    newCommitStatus?: number
  } = {},
) {
  const parents = (opts.parents ?? [HEAD]).map(sha => ({ sha }))
  return mockFetchByUrl([
    ['git/ref/heads/main', jsonResponse({ object: { sha: HEAD } })],
    [
      `git/commits/${NEW}`,
      jsonResponse({ parents, tree: { sha: NEW_TREE } }, opts.newCommitStatus ?? 200),
    ],
    [`git/commits/${HEAD}`, jsonResponse({ parents: [], tree: { sha: HEAD_TREE } })],
    [
      `git/trees/${NEW_TREE}`,
      jsonResponse({ truncated: opts.truncated ?? false, tree: opts.newTree ?? BASE_TREE }),
    ],
    [`git/trees/${HEAD_TREE}`, jsonResponse({ truncated: false, tree: BASE_TREE })],
    ['git/refs/heads/main', jsonResponse({ ref: 'refs/heads/main', object: { sha: NEW } })],
  ])
}

function withChange(...entries: TreeEntry[]): TreeEntry[] {
  const changed = new Map(entries.map(e => [e.path, e]))
  return [...BASE_TREE.filter(e => !changed.has(e.path)), ...entries]
}

describe('verifyRefUpdate', () => {
  afterEach(() => vi.restoreAllMocks())

  it('accepts a commit on the branch tip that only changes content blobs', async () => {
    refUpdateRoutes({
      newTree: withChange(
        { path: 'public/data/news.json', mode: '100644', type: 'blob', sha: '9'.repeat(40) },
        {
          path: 'public/images/vorstand/neu.webp',
          mode: '100644',
          type: 'blob',
          sha: '8'.repeat(40),
        },
      ).filter(e => e.path !== 'public/images/vorstand/max.webp'),
    })
    expect(await verifyRefUpdate('tok', NEW)).toBe('ok')
  })

  it('accepts a no-op update to the current tip without further lookups', async () => {
    const spy = refUpdateRoutes()
    expect(await verifyRefUpdate('tok', HEAD)).toBe('ok')
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('rejects a commit whose tree touches application code', async () => {
    refUpdateRoutes({
      newTree: withChange({
        path: 'api/github.ts',
        mode: '100644',
        type: 'blob',
        sha: '9'.repeat(40),
      }),
    })
    expect(await verifyRefUpdate('tok', NEW)).toBe('forbidden')
  })

  it('rejects a commit that adds a workflow or deletes application code', async () => {
    refUpdateRoutes({
      newTree: [
        ...BASE_TREE,
        { path: '.github/workflows/pwn.yml', mode: '100644', type: 'blob', sha: '9'.repeat(40) },
      ],
    })
    expect(await verifyRefUpdate('tok', NEW)).toBe('forbidden')

    vi.restoreAllMocks()
    refUpdateRoutes({ newTree: BASE_TREE.filter(e => e.path !== 'api/github.ts') })
    expect(await verifyRefUpdate('tok', NEW)).toBe('forbidden')
  })

  it('rejects executables, symlinks and submodules even under content directories', async () => {
    for (const entry of [
      { path: 'public/data/run.sh', mode: '100755', type: 'blob', sha: '9'.repeat(40) },
      { path: 'public/data/link', mode: '120000', type: 'blob', sha: '9'.repeat(40) },
      { path: 'public/documents/sub', mode: '160000', type: 'commit', sha: '9'.repeat(40) },
    ]) {
      vi.restoreAllMocks()
      refUpdateRoutes({ newTree: [...BASE_TREE, entry] })
      expect(await verifyRefUpdate('tok', NEW)).toBe('forbidden')
    }
  })

  it('reports a conflict when the commit is not built on the current tip', async () => {
    refUpdateRoutes({ parents: ['a'.repeat(40)] })
    expect(await verifyRefUpdate('tok', NEW)).toBe('conflict')
  })

  it('rejects merge commits and commits GitHub cannot find', async () => {
    refUpdateRoutes({ parents: [HEAD, 'a'.repeat(40)] })
    expect(await verifyRefUpdate('tok', NEW)).toBe('forbidden')

    vi.restoreAllMocks()
    refUpdateRoutes({ newCommitStatus: 404 })
    expect(await verifyRefUpdate('tok', NEW)).toBe('forbidden')
  })

  it('fails closed when a tree listing is truncated or GitHub is unreachable', async () => {
    refUpdateRoutes({ truncated: true })
    expect(await verifyRefUpdate('tok', NEW)).toBe('unavailable')

    vi.restoreAllMocks()
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('down'))
    expect(await verifyRefUpdate('tok', NEW)).toBe('unavailable')
  })
})

describe('POST /api/github handler — branch updates', () => {
  afterEach(() => vi.restoreAllMocks())

  const headers = {
    origin: 'https://www.spd-albstadt.de',
    cookie: 'spd_access_token=gho_secret',
  }
  const patchMain = {
    method: 'PATCH',
    path: `${REPO}/git/refs/heads/main`,
    body: { sha: NEW },
  }

  it('forwards the ref update once the commit has been verified', async () => {
    const spy = refUpdateRoutes({
      newTree: withChange({
        path: 'public/data/news.json',
        mode: '100644',
        type: 'blob',
        sha: '9'.repeat(40),
      }),
    })
    const res = makeResponse()
    await handler(makeRequest({ method: 'POST', headers, body: patchMain }), res)
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ ref: 'refs/heads/main', object: { sha: NEW } })
    const patchCall = spy.mock.calls.find(([, opts]) => opts?.method === 'PATCH')
    expect(String(patchCall?.[0])).toBe(`https://api.github.com${REPO}/git/refs/heads/main`)
  })

  it('refuses to move main to a commit that changes application code', async () => {
    const spy = refUpdateRoutes({
      newTree: withChange({
        path: 'api/github.ts',
        mode: '100644',
        type: 'blob',
        sha: '9'.repeat(40),
      }),
    })
    const res = makeResponse()
    await handler(makeRequest({ method: 'POST', headers, body: patchMain }), res)
    expect(res.statusCode).toBe(403)
    expect(res.body).toEqual({ error: 'ref_update_not_allowed' })
    expect(spy.mock.calls.some(([, opts]) => opts?.method === 'PATCH')).toBe(false)
  })

  it('answers 422 for a commit built on stale history so the editor shows its conflict flow', async () => {
    refUpdateRoutes({ parents: ['a'.repeat(40)] })
    const res = makeResponse()
    await handler(makeRequest({ method: 'POST', headers, body: patchMain }), res)
    expect(res.statusCode).toBe(422)
  })

  it('answers 502 when the verification lookups fail', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('down'))
    const res = makeResponse()
    await handler(makeRequest({ method: 'POST', headers, body: patchMain }), res)
    expect(res.statusCode).toBe(502)
  })
})
