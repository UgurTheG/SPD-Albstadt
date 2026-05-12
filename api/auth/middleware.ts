import type { VercelRequest, VercelResponse } from '../vercel.d.ts'
import { isAllowedOrigin } from './cookies.js'
import { rateLimit, getClientIP } from './rateLimit.js'

/** Sets Cache-Control: no-store on every sensitive API response. */
export function setNoStore(res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')
}

/**
 * Checks the per-IP rate limit. Returns `true` (and sends 429) if the limit
 * is exceeded so the caller can `return` immediately.
 */
export function isRateLimited(
  req: VercelRequest,
  res: VercelResponse,
  limit = 10,
): boolean {
  const ip = getClientIP(req.headers as Record<string, string | string[] | undefined>)
  if (!rateLimit(ip, limit, 60_000)) {
    res.status(429).json({ error: 'too_many_requests' })
    return true
  }
  return false
}

/**
 * Validates the request origin. Returns `true` (and sends 403) if the origin
 * is not allowed so the caller can `return` immediately.
 */
export function isOriginForbidden(req: VercelRequest, res: VercelResponse): boolean {
  const origin = (req.headers['origin'] || req.headers['referer'] || '') as string
  if (!isAllowedOrigin(origin)) {
    res.status(403).json({ error: 'forbidden_origin' })
    return true
  }
  return false
}
