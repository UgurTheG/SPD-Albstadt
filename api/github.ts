import type { VercelRequest, VercelResponse } from './vercel.d.ts'
import { parseCookies, isAllowedOrigin, ACCESS_TOKEN_COOKIE } from './auth/cookies.js'

/**
 * POST /api/github
 *
 * Server-side proxy for GitHub API calls.  The access token never leaves the
 * server — it is read from the HttpOnly cookie and attached to the outgoing
 * request.  The client sends `{ method, path, body? }` and receives the
 * GitHub API response (status + JSON body) transparently.
 */

// Only allow the one specific private repo this app manages, plus the /user
// endpoint used by validateToken().  Note: we do NOT allow /user/* sub-paths
// (emails, repos, etc.) — only the exact /user identity endpoint is needed.
const ALLOWED_REPO_PREFIX = '/repos/UgurTheG/SPD-Albstadt/'

/**
 * Resolve the proxied path against the GitHub API origin and validate the
 * *normalized* pathname. Validating the raw string is unsafe: the URL parser
 * collapses `..` segments, so a string that passes a naive `startsWith` check
 * (e.g. `/repos/UgurTheG/SPD-Albstadt/../../../user/emails`) can resolve to a
 * completely different endpoint. Returns the safe request URL, or null if the
 * path is not allowed.
 */
function resolveAllowedUrl(path: string): string | null {
  if (typeof path !== 'string' || !path.startsWith('/')) return null

  let resolved: URL
  try {
    resolved = new URL(path, 'https://api.github.com')
  } catch {
    return null
  }

  // Reject anything that escaped the api.github.com origin.
  if (resolved.origin !== 'https://api.github.com') return null

  const pathname = resolved.pathname
  const allowed =
    pathname === '/user' ||
    pathname === ALLOWED_REPO_PREFIX.slice(0, -1) ||
    pathname.startsWith(ALLOWED_REPO_PREFIX)
  if (!allowed) return null

  return resolved.toString()
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
  const { method, path, body } = req.body as {
    method?: string
    path?: string
    body?: unknown
  }

  if (!method || !path) {
    return res.status(400).json({ error: 'missing_method_or_path' })
  }

  const upperMethod = method.toUpperCase()
  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(upperMethod)) {
    return res.status(400).json({ error: 'invalid_method' })
  }

  const requestUrl = resolveAllowedUrl(path)
  if (!requestUrl) {
    return res.status(400).json({ error: 'path_not_allowed' })
  }

  try {
    const ghHeaders: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'If-None-Match': '', // bypass GitHub CDN cache
    }

    const fetchOpts: RequestInit = {
      method: upperMethod,
      headers: ghHeaders,
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

    // Non-JSON response (rare) — forward as text
    const text = await ghRes.text()
    return res.status(ghRes.status).send(text)
  } catch {
    return res.status(502).json({ error: 'github_request_failed' })
  }
}
