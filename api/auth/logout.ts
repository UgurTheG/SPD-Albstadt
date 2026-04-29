import type { VercelRequest, VercelResponse } from '../vercel.d.ts'
import { clearAuthCookies } from './cookies'

/**
 * POST /api/auth/logout
 *
 * Clears all auth HttpOnly cookies.
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }
  res.setHeader('Set-Cookie', clearAuthCookies())
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({ ok: true })
}
