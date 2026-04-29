/**
 * Simple in-memory rate limiter for serverless functions.
 *
 * On Vercel, warm function instances reuse the same process, so this
 * provides meaningful protection during sustained abuse.  Cold starts
 * reset the counters — for bulletproof rate limiting, use Vercel KV or
 * Upstash Redis instead.
 */

interface Entry {
  count: number
  resetAt: number
}

const store = new Map<string, Entry>()

// Periodically evict expired entries to prevent unbounded growth
let lastCleanup = Date.now()
const CLEANUP_INTERVAL = 60_000 // 1 min

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key)
  }
}

/**
 * Check whether a request from the given key should be rate-limited.
 *
 * @param key    Unique identifier (e.g. IP address)
 * @param limit  Max requests allowed in the window
 * @param windowMs  Window size in milliseconds
 * @returns `true` if the request is allowed, `false` if rate-limited
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  cleanup()
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  entry.count++
  if (entry.count > limit) return false
  return true
}

/**
 * Extract a rate-limit key from a request.
 * Uses x-forwarded-for (Vercel sets this), falls back to x-real-ip.
 */
export function getClientIP(headers: Record<string, string | string[] | undefined>): string {
  const forwarded = headers['x-forwarded-for']
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim()
  if (Array.isArray(forwarded) && forwarded.length > 0) return forwarded[0].split(',')[0].trim()
  const realIp = headers['x-real-ip']
  if (typeof realIp === 'string') return realIp
  return 'unknown'
}
