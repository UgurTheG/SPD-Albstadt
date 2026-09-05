import type { VercelRequest, VercelResponse } from '../vercel.d.ts'
import {
  parseCookies,
  isAllowedOrigin,
  clearAuthCookies,
  ACCESS_TOKEN_COOKIE,
  TOKEN_EXPIRES_COOKIE,
} from './cookies.js'
import { rateLimit, getClientIP } from './rateLimit.js'

/**
 * GET /api/auth/session
 *
 * Returns whether the user is authenticated and the token expiry timestamp.
 * The access token itself is NEVER returned — it stays in the HttpOnly cookie
 * and is only used server-side (by the /api/github proxy).
 *
 * Token introspection: verifies the token against GitHub's API so that revoked
 * tokens are caught immediately rather than trusted until local expiry.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  // Rate limit: every call with a token costs one GitHub API request on the
  // user's quota — 60 per IP per minute is far above what the editor needs.
  const ip = getClientIP(req.headers as Record<string, string | string[] | undefined>)
  if (!rateLimit(ip, 60, 60_000)) {
    return res.status(429).json({ error: 'too_many_requests' })
  }

  // Only allow same-origin requests
  const origin = req.headers['origin'] ?? ''
  if (origin && !isAllowedOrigin(origin)) {
    return res.status(403).json({ error: 'forbidden_origin' })
  }

  const cookies = parseCookies(req.headers.cookie)
  const token = cookies[ACCESS_TOKEN_COOKIE]
  const expiresAt = Number(cookies[TOKEN_EXPIRES_COOKIE] || 0)

  if (!token) {
    return res.status(200).json({ authenticated: false, expires_at: 0 })
  }

  // ── GitHub token introspection ───────────────────────────────────────────────
  // Verify the token is still valid on GitHub's side (catches revocations/expiry).
  try {
    const ghRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })

    if (!ghRes.ok) {
      // Token revoked or expired on GitHub's side — clear auth cookies
      res.setHeader('Set-Cookie', clearAuthCookies())
      return res.status(200).json({ authenticated: false, expires_at: 0 })
    }
  } catch {
    // Network error — fail open so a temporary GitHub outage doesn't log everyone out
    // but still return the local session state
  }

  return res.status(200).json({ authenticated: true, expires_at: expiresAt })
}
