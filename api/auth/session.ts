import type { VercelRequest, VercelResponse } from '../vercel.d.ts'
import {
  parseCookies,
  isAllowedOrigin,
  ACCESS_TOKEN_COOKIE,
  TOKEN_EXPIRES_COOKIE,
} from './cookies.js'

/**
 * GET /api/auth/session
 *
 * Returns whether the user is authenticated and the token expiry timestamp.
 * The access token itself is NEVER returned — it stays in the HttpOnly cookie
 * and is only used server-side (by the /api/github proxy).
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')

  // Only allow same-origin requests
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
    return res.status(200).json({ authenticated: false, expires_at: 0 })
  }

  return res.status(200).json({ authenticated: true, expires_at: expiresAt })
}
