import type { VercelRequest, VercelResponse } from './vercel.d.ts'
import { parseCookies, isAllowedOrigin, ACCESS_TOKEN_COOKIE } from './auth/cookies.js'
import { REPO_OWNER, REPO_NAME } from './auth/access.js'

/**
 * POST /api/github
 *
 * Server-side proxy for GitHub API calls.  The access token never leaves the
 * server — it is read from the HttpOnly cookie and attached to the outgoing
 * request.  The client sends `{ method, path, body? }` and receives the
 * GitHub API response (status + JSON body) transparently.
 *
 * The proxy is deliberately narrow: it only forwards the handful of endpoints
 * the content editor needs, and every write is restricted to the content
 * directories under `public/`.  A stolen admin session (or an XSS in the
 * admin) must not be able to commit application code, workflows or Vercel
 * config to `main`, manage webhooks or collaborators, or touch other repos.
 *
 * Path validation alone is not enough for the Trees flow: `POST /git/commits`
 * accepts *any* tree SHA and `PATCH /git/refs/heads/main` accepts *any*
 * commit SHA, and GitHub resolves objects from the whole repository network —
 * including old revisions and commits pushed to a fork by an anonymous PR.
 * So before the branch is moved, `verifyRefUpdate` fetches the target commit
 * and requires that (a) its only parent is the current `main` tip and (b) its
 * tree differs from the parent's tree solely in regular blobs under the
 * content directories.
 */

const REPO_PATH = `/repos/${REPO_OWNER}/${REPO_NAME}`
const BRANCH = 'main'

/** Directories the editor may read and write (repo-relative, trailing slash). */
const CONTENT_PREFIXES = ['public/data/', 'public/images/', 'public/documents/']

/** Only regular files — no executables, symlinks or submodules in content dirs. */
const BLOB_MODE = '100644'

/**
 * A repo-relative file path is safe when it lives under one of the content
 * directories and contains no path-traversal or otherwise odd segments.
 */
export function isContentPath(path: unknown): path is string {
  if (typeof path !== 'string' || path.length === 0 || path.length > 512) return false
  if (path.includes('\\') || path.includes('\0') || path.includes('//')) return false
  if (path.startsWith('/') || path.endsWith('/')) return false
  const segments = path.split('/')
  if (segments.some(seg => seg === '' || seg === '.' || seg === '..')) return false
  return CONTENT_PREFIXES.some(prefix => path.startsWith(prefix) && path.length > prefix.length)
}

function isSha(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{40}$/i.test(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Validate the body of `POST /git/trees` — every entry must be a content blob. */
function isValidTreeBody(body: unknown): boolean {
  if (!isRecord(body)) return false
  // Without base_tree the new tree would *replace* the whole repository with
  // only the listed files — never allow that.
  if (!isSha(body.base_tree)) return false
  if (!Array.isArray(body.tree) || body.tree.length === 0 || body.tree.length > 500) return false
  return body.tree.every(entry => {
    if (!isRecord(entry)) return false
    if (!isContentPath(entry.path)) return false
    if (entry.mode !== BLOB_MODE || entry.type !== 'blob') return false
    // Exactly one of: sha (existing blob), sha: null (delete), inline content
    const hasSha = isSha(entry.sha)
    const isDelete = entry.sha === null
    const hasContent = typeof entry.content === 'string'
    return [hasSha, isDelete, hasContent].filter(Boolean).length === 1
  })
}

/** Validate the body of `POST /git/commits` — a single-parent commit on top of a SHA. */
function isValidCommitBody(body: unknown): boolean {
  if (!isRecord(body)) return false
  if (typeof body.message !== 'string' || body.message.length === 0) return false
  if (!isSha(body.tree)) return false
  return Array.isArray(body.parents) && body.parents.length === 1 && isSha(body.parents[0])
}

/** Validate the body of `PATCH /git/refs/heads/main` — fast-forward only. */
function isValidRefUpdateBody(body: unknown): boolean {
  return isRecord(body) && isSha(body.sha) && body.force !== true
}

/** Validate the body of `PUT|DELETE /contents/<path>` — commits on `main` only. */
function isValidContentsBody(body: unknown, method: string): boolean {
  if (!isRecord(body)) return false
  if (typeof body.message !== 'string') return false
  if (body.branch !== undefined && body.branch !== BRANCH) return false
  if (method === 'PUT') return typeof body.content === 'string'
  return isSha(body.sha)
}

interface ProxyRequest {
  method: string
  path: string
  body?: unknown
}

/**
 * Resolve the proxied request against the GitHub API origin and validate the
 * *normalized* pathname against the endpoint allowlist. Validating the raw
 * string is unsafe: the URL parser collapses `..` segments, so a string that
 * passes a naive `startsWith` check can resolve to a completely different
 * endpoint. Returns the safe request URL, or null if the request is not allowed.
 */
export function resolveAllowedUrl({ method, path, body }: ProxyRequest): string | null {
  if (typeof path !== 'string' || !path.startsWith('/')) return null

  let resolved: URL
  try {
    resolved = new URL(path, 'https://api.github.com')
  } catch {
    return null
  }
  if (resolved.origin !== 'https://api.github.com') return null

  let pathname: string
  try {
    pathname = decodeURIComponent(resolved.pathname)
  } catch {
    return null
  }

  const allowed = isAllowedEndpoint(method, pathname, body)
  return allowed ? resolved.toString() : null
}

function isAllowedEndpoint(method: string, pathname: string, body: unknown): boolean {
  // Identity check used by the login screen (exact path — no /user/* sub-paths)
  if (pathname === '/user') return method === 'GET'

  if (pathname === REPO_PATH) return method === 'GET'
  if (!pathname.startsWith(`${REPO_PATH}/`)) return false
  const sub = pathname.slice(REPO_PATH.length + 1)

  // File contents: read anywhere under public/, write only to content dirs.
  if (sub.startsWith('contents/')) {
    const filePath = sub.slice('contents/'.length)
    if (method === 'GET') return isContentPath(filePath)
    if (method === 'PUT' || method === 'DELETE') {
      return isContentPath(filePath) && isValidContentsBody(body, method)
    }
    return false
  }

  // Branch tip lookup for conflict detection
  if (sub === `git/ref/heads/${BRANCH}`) return method === 'GET'
  // Fast-forward the branch to a freshly created commit
  if (sub === `git/refs/heads/${BRANCH}`) return method === 'PATCH' && isValidRefUpdateBody(body)

  // Trees API publish flow
  if (sub.startsWith('git/commits/'))
    return method === 'GET' && isSha(sub.slice('git/commits/'.length))
  if (sub === 'git/commits') return method === 'POST' && isValidCommitBody(body)
  if (sub === 'git/blobs') {
    return (
      method === 'POST' &&
      isRecord(body) &&
      typeof body.content === 'string' &&
      body.encoding === 'base64'
    )
  }
  if (sub === 'git/trees') return method === 'POST' && isValidTreeBody(body)

  // "Did anyone change public/data since I loaded?" check
  if (sub.startsWith('compare/')) {
    const range = sub.slice('compare/'.length)
    const [base, head, ...rest] = range.split('...')
    return method === 'GET' && rest.length === 0 && isSha(base) && isSha(head)
  }

  return false
}

// ─── Branch update verification ───────────────────────────────────────────────

const GITHUB_API = 'https://api.github.com'
const REF_UPDATE_PATH = `${REPO_PATH}/git/refs/heads/${BRANCH}`

function githubHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'If-None-Match': '', // bypass GitHub CDN cache
  }
}

/** GET a GitHub API path; `null` on network failure, `{ status, data }` otherwise. */
async function githubGet(
  accessToken: string,
  path: string,
): Promise<{ status: number; data: unknown } | null> {
  try {
    const res = await fetch(`${GITHUB_API}${path}`, {
      headers: githubHeaders(accessToken),
      cache: 'no-store',
    })
    const contentType = res.headers.get('content-type') ?? ''
    const data: unknown = contentType.includes('application/json') ? await res.json() : null
    return { status: res.status, data }
  } catch {
    return null
  }
}

/** Every non-directory entry of a tree as `path → mode:type:sha`. */
type TreeIndex = Map<string, string>

/** `null` when the tree cannot be read completely (network error, truncated listing). */
async function fetchTreeIndex(accessToken: string, treeSha: string): Promise<TreeIndex | null> {
  const result = await githubGet(accessToken, `${REPO_PATH}/git/trees/${treeSha}?recursive=1`)
  if (!result || !isRecord(result.data)) return null
  const { truncated, tree } = result.data
  if (truncated === true || !Array.isArray(tree)) return null
  const index: TreeIndex = new Map()
  for (const entry of tree) {
    if (!isRecord(entry) || typeof entry.path !== 'string') return null
    // Directory entries carry no content of their own; a changed directory
    // always shows up as changed blobs beneath it.
    if (entry.type === 'tree') continue
    index.set(entry.path, `${String(entry.mode)}:${String(entry.type)}:${String(entry.sha)}`)
  }
  return index
}

export type RefUpdateVerdict = 'ok' | 'conflict' | 'forbidden' | 'unavailable'

/**
 * Decide whether `main` may be fast-forwarded to `newSha`.
 *
 * - `conflict`    — the commit does not sit directly on the current branch tip
 *                   (someone else published meanwhile, or the commit was built
 *                   on top of foreign history)
 * - `forbidden`   — the commit changes something outside the content
 *                   directories, or adds a non-regular-file entry
 * - `unavailable` — GitHub could not be consulted; fail closed
 */
export async function verifyRefUpdate(
  accessToken: string,
  newSha: string,
): Promise<RefUpdateVerdict> {
  const ref = await githubGet(accessToken, `${REPO_PATH}/git/ref/heads/${BRANCH}`)
  if (!ref) return 'unavailable'
  const headSha = isRecord(ref.data) && isRecord(ref.data.object) ? ref.data.object.sha : undefined
  if (!isSha(headSha)) return 'unavailable'
  if (newSha.toLowerCase() === headSha.toLowerCase()) return 'ok'

  const [newCommit, headCommit] = await Promise.all([
    githubGet(accessToken, `${REPO_PATH}/git/commits/${newSha}`),
    githubGet(accessToken, `${REPO_PATH}/git/commits/${headSha}`),
  ])
  if (!newCommit || !headCommit) return 'unavailable'
  if (!isRecord(newCommit.data) || newCommit.status !== 200) return 'forbidden'
  if (!isRecord(headCommit.data) || headCommit.status !== 200) return 'unavailable'

  const parents = newCommit.data.parents
  const parentSha = Array.isArray(parents) && isRecord(parents[0]) ? parents[0].sha : undefined
  if (!Array.isArray(parents) || parents.length !== 1 || !isSha(parentSha)) return 'forbidden'
  if (parentSha.toLowerCase() !== headSha.toLowerCase()) return 'conflict'

  const newTreeSha = isRecord(newCommit.data.tree) ? newCommit.data.tree.sha : undefined
  const headTreeSha = isRecord(headCommit.data.tree) ? headCommit.data.tree.sha : undefined
  if (!isSha(newTreeSha)) return 'forbidden'
  if (!isSha(headTreeSha)) return 'unavailable'

  const [newIndex, headIndex] = await Promise.all([
    fetchTreeIndex(accessToken, newTreeSha),
    fetchTreeIndex(accessToken, headTreeSha),
  ])
  if (!newIndex || !headIndex) return 'unavailable'

  for (const path of new Set([...newIndex.keys(), ...headIndex.keys()])) {
    const after = newIndex.get(path)
    if (after === headIndex.get(path)) continue
    if (!isContentPath(path)) return 'forbidden'
    if (after !== undefined && !after.startsWith(`${BLOB_MODE}:blob:`)) return 'forbidden'
  }
  return 'ok'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  // Origin check
  const origin = (req.headers['origin'] || req.headers['referer'] || '') as string
  if (!isAllowedOrigin(origin)) {
    return res.status(403).json({ error: 'forbidden_origin' })
  }

  // Read access token from HttpOnly cookie
  const cookies = parseCookies(req.headers.cookie)
  const accessToken = cookies[ACCESS_TOKEN_COOKIE]
  if (!accessToken) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  // Parse proxy request
  const { method, path, body } = (isRecord(req.body) ? req.body : {}) as {
    method?: unknown
    path?: unknown
    body?: unknown
  }

  if (typeof method !== 'string' || typeof path !== 'string') {
    return res.status(400).json({ error: 'missing_method_or_path' })
  }

  const upperMethod = method.toUpperCase()
  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(upperMethod)) {
    return res.status(400).json({ error: 'invalid_method' })
  }

  const requestUrl = resolveAllowedUrl({ method: upperMethod, path, body })
  if (!requestUrl) {
    return res.status(400).json({ error: 'path_not_allowed' })
  }

  if (upperMethod === 'PATCH' && new URL(requestUrl).pathname === REF_UPDATE_PATH) {
    const verdict = await verifyRefUpdate(accessToken, (body as { sha: string }).sha)
    if (verdict === 'conflict') {
      // Same status GitHub uses for a non-fast-forward update — the editor
      // maps it to its "someone else published" conflict flow.
      return res.status(422).json({ error: 'ref_not_fast_forward' })
    }
    if (verdict === 'forbidden') return res.status(403).json({ error: 'ref_update_not_allowed' })
    if (verdict === 'unavailable') return res.status(502).json({ error: 'github_request_failed' })
  }

  try {
    const fetchOpts: RequestInit = {
      method: upperMethod,
      headers: githubHeaders(accessToken),
      cache: 'no-store',
    }

    if (body !== undefined && upperMethod !== 'GET') {
      fetchOpts.body = JSON.stringify(body)
    }

    const ghRes = await fetch(requestUrl, fetchOpts)

    // Forward GitHub's status code and body
    const contentType = ghRes.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      const data = await ghRes.json()
      return res.status(ghRes.status).json(data)
    }

    // Non-JSON response (rare) — forward as plain text so an upstream HTML
    // error page is never rendered as a same-origin document.
    const text = await ghRes.text()
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    return res.status(ghRes.status).send(text)
  } catch {
    return res.status(502).json({ error: 'github_request_failed' })
  }
}
