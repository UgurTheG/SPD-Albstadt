import type { VercelRequest, VercelResponse } from '../vercel.d.ts'
import { clearAuthCookies, isAllowedOrigin, parseCookies, ACCESS_TOKEN_COOKIE } from './cookies.js'
import { rateLimit, getClientIP } from './rateLimit.js'

/**
 * POST /api/auth/logout
 *
 * Revokes the GitHub access token (best-effort) and clears all auth HttpOnly cookies.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  // Rate limit: 10 logout attempts per IP per minute
  const ip = getClientIP(req.headers as Record<string, string | string[] | undefined>)
  if (!rateLimit(ip, 10, 60_000)) {
    return res.status(429).json({ error: 'too_many_requests' })
  }

  // Guard against cross-origin CSRF logout.
  // Use Origin when available; fall back to Referer (extractOrigin handles full URLs).
  const origin = (req.headers['origin'] || req.headers['referer'] || '') as string
  if (!isAllowedOrigin(origin)) {
    return res.status(403).json({ error: 'forbidden_origin' })
  }

  // Best-effort: revoke the token on GitHub's side so it can't be reused if stolen.
  const cookies = parseCookies(req.headers.cookie)
  const accessToken = cookies[ACCESS_TOKEN_COOKIE]
  const clientId = process.env.VITE_GITHUB_CLIENT_ID
  const clientSecret = process.env.GITHUB_CLIENT_SECRET

  if (accessToken && clientId && clientSecret) {
    try {
      await fetch(`https://api.github.com/applications/${clientId}/token`, {
        method: 'DELETE',
        headers: {
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ access_token: accessToken }),
      })
    } catch {
      // Revocation failed — proceed to clear cookies anyway.
      // The token will expire on its own (GitHub App tokens are short-lived).
    }
  }

  res.setHeader('Set-Cookie', clearAuthCookies())
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({ ok: true })
}
