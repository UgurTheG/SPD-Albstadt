import type { VercelRequest, VercelResponse } from '../vercel.d.ts'
import { clearAuthCookies, isAllowedOrigin } from './cookies'

/**
 * POST /api/auth/logout
 *
 * Clears all auth HttpOnly cookies.
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  // Guard against cross-origin CSRF logout.
  // Use Origin when available; fall back to Referer (extractOrigin handles full URLs).
  const origin = (req.headers['origin'] || req.headers['referer'] || '') as string
  if (!isAllowedOrigin(origin)) {
    return res.status(403).json({ error: 'forbidden_origin' })
  }

  res.setHeader('Set-Cookie', clearAuthCookies())
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({ ok: true })
}
