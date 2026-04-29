import type { VercelRequest, VercelResponse } from '../vercel.d.ts'
import { parseCookies, isAllowedOrigin, ACCESS_TOKEN_COOKIE, TOKEN_EXPIRES_COOKIE } from './cookies'

/**
 * GET /api/auth/session
 *
 * Returns the current access token and expiry from HttpOnly cookies.
 * The client calls this on page load to hydrate the Zustand store
 * (since tokens are no longer stored in localStorage).
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')

  // Only allow same-origin requests to read the token
  const origin = req.headers['origin'] ?? ''
  // For same-origin GET requests the browser may omit the Origin header,
  // so we allow empty origin (cookie SameSite=Lax already blocks cross-site).
  if (origin && !isAllowedOrigin(origin)) {
    return res.status(403).json({ error: 'forbidden_origin' })
  }

  const cookies = parseCookies(req.headers.cookie)
  const token = cookies[ACCESS_TOKEN_COOKIE]
  const expiresAt = Number(cookies[TOKEN_EXPIRES_COOKIE] || 0)

  if (!token) {
    return res.status(200).json({ access_token: null, expires_at: 0 })
  }

  return res.status(200).json({ access_token: token, expires_at: expiresAt })
}
