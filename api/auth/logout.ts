import type { VercelRequest, VercelResponse } from '../vercel.d.ts'
import { clearAuthCookies, parseCookies, ACCESS_TOKEN_COOKIE } from './cookies.js'
import { setNoStore, isRateLimited, isOriginForbidden } from './middleware.js'

/**
 * POST /api/auth/logout
 *
 * Revokes the GitHub access token (best-effort) and clears all auth HttpOnly cookies.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }
  if (isRateLimited(req, res)) return
  if (isOriginForbidden(req, res)) return

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
  setNoStore(res)
  return res.status(200).json({ ok: true })
}
