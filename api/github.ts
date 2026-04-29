import type { VercelRequest, VercelResponse } from './vercel.d.ts'
import { parseCookies, isAllowedOrigin, ACCESS_TOKEN_COOKIE } from './auth/cookies'

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

function isAllowedPath(path: string): boolean {
  return path === '/user' || path.startsWith(ALLOWED_REPO_PREFIX)
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

  if (!isAllowedPath(path)) {
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

    const ghRes = await fetch(`https://api.github.com${path}`, fetchOpts)

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
