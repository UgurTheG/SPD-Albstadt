import { createHmac } from 'node:crypto'

// ─── Cookie names ──────────────────────────────────────────────────────────────

export const ACCESS_TOKEN_COOKIE = 'spd_access_token'
export const TOKEN_EXPIRES_COOKIE = 'spd_token_expires_at'
export const REFRESH_TOKEN_COOKIE = 'spd_refresh_token'
export const REFRESH_EXPIRES_COOKIE = 'spd_refresh_expires_at'
export const STATE_COOKIE = 'spd_oauth_state'
export const PKCE_COOKIE = 'spd_pkce_verifier'

// ─── HMAC helpers (state signing) ──────────────────────────────────────────────

function getSecret(): string {
  if (process.env.STATE_SIGNING_SECRET) return process.env.STATE_SIGNING_SECRET
  // Fallback: warn loudly in logs so the operator knows to set the dedicated secret
  if (process.env.GITHUB_CLIENT_SECRET) {
    console.warn(
      '[auth] STATE_SIGNING_SECRET is not set — falling back to GITHUB_CLIENT_SECRET for ' +
        'HMAC signing. Set STATE_SIGNING_SECRET as a separate env var to decouple signing ' +
        'from the OAuth client secret.',
    )
    return process.env.GITHUB_CLIENT_SECRET
  }
  throw new Error('Missing STATE_SIGNING_SECRET or GITHUB_CLIENT_SECRET — cannot sign OAuth state')
}

export function signState(state: string): string {
  const sig = createHmac('sha256', getSecret()).update(state).digest('hex')
  return `${state}.${sig}`
}

export function verifyState(signed: string): string | null {
  const dot = signed.lastIndexOf('.')
  if (dot < 1) return null
  const state = signed.slice(0, dot)
  const sig = signed.slice(dot + 1)
  const expected = createHmac('sha256', getSecret()).update(state).digest('hex')
  if (sig.length !== expected.length) return null
  // Constant-time comparison
  let mismatch = 0
  for (let i = 0; i < sig.length; i++) {
    mismatch |= sig.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return mismatch === 0 ? state : null
}

// ─── Origin allowlist ────────────────────────────────────────────────────────

function getAllowedOrigins(): string[] {
  const origins: string[] = []
  if (process.env.VERCEL_URL) origins.push(`https://${process.env.VERCEL_URL}`)
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    origins.push(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
  if (process.env.NODE_ENV !== 'production') origins.push('http://localhost:5173')
  return origins
}

/**
 * Extract the origin (scheme + host) from a URL or Origin header.
 * Returns '' if parsing fails. Handles both bare origins and full URLs (Referer).
 */
export function extractOrigin(raw: string): string {
  try {
    const url = new URL(raw)
    return url.origin // e.g. "https://example.com"
  } catch {
    return ''
  }
}

/** Check whether the given origin/URL is in the allowed list (exact origin match). */
export function isAllowedOrigin(rawOriginOrUrl: string): boolean {
  const origin = extractOrigin(rawOriginOrUrl)
  if (!origin) return false
  return getAllowedOrigins().some(a => origin === a.replace(/\/+$/, ''))
}

// ─── Cookie serialisation helpers ──────────────────────────────────────────────

interface CookieOpts {
  value: string
  maxAge?: number
  path?: string
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'Lax' | 'Strict' | 'None'
}

export function serializeCookie(name: string, opts: CookieOpts): string {
  const parts = [`${name}=${encodeURIComponent(opts.value)}`]
  parts.push(`Path=${opts.path ?? '/api/auth'}`)
  if (opts.maxAge !== undefined) parts.push(`Max-Age=${opts.maxAge}`)
  if (opts.httpOnly !== false) parts.push('HttpOnly')
  if (opts.secure !== false) parts.push('Secure')
  parts.push(`SameSite=${opts.sameSite ?? 'Lax'}`)
  return parts.join('; ')
}

export function clearCookie(name: string, path = '/api/auth'): string {
  return serializeCookie(name, { value: '', maxAge: 0, path })
}

export function parseCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {}
  if (!header) return cookies
  for (const pair of header.split(';')) {
    const [rawName, ...rest] = pair.split('=')
    const name = rawName.trim()
    if (!name) continue
    cookies[name] = decodeURIComponent(rest.join('=').trim())
  }
  return cookies
}

/** Set token cookies after a successful OAuth code exchange or refresh. */
export function makeAuthCookies(data: {
  access_token: string
  expires_in?: number
  refresh_token?: string
  refresh_token_expires_in?: number
}): string[] {
  const cookies: string[] = []
  const maxAge = data.expires_in ?? 8 * 3600 // default 8h

  // Path must be /api (not /api/auth) so that the /api/github proxy
  // receives the access-token cookie from the browser.
  cookies.push(
    serializeCookie(ACCESS_TOKEN_COOKIE, { value: data.access_token, maxAge, path: '/api' }),
  )
  cookies.push(
    serializeCookie(TOKEN_EXPIRES_COOKIE, {
      value: String(Date.now() + maxAge * 1000),
      maxAge,
      path: '/api',
    }),
  )

  if (data.refresh_token) {
    const refreshMax = data.refresh_token_expires_in ?? 6 * 30 * 24 * 3600 // ~6 months
    cookies.push(
      serializeCookie(REFRESH_TOKEN_COOKIE, {
        value: data.refresh_token,
        maxAge: refreshMax,
        path: '/api',
      }),
    )
    cookies.push(
      serializeCookie(REFRESH_EXPIRES_COOKIE, {
        value: String(Date.now() + refreshMax * 1000),
        maxAge: refreshMax,
        path: '/api',
      }),
    )
  }

  return cookies
}

/** Cookie strings that clear all auth cookies. */
export function clearAuthCookies(): string[] {
  return [
    clearCookie(ACCESS_TOKEN_COOKIE, '/api'),
    clearCookie(TOKEN_EXPIRES_COOKIE, '/api'),
    clearCookie(REFRESH_TOKEN_COOKIE, '/api'),
    clearCookie(REFRESH_EXPIRES_COOKIE, '/api'),
  ]
}
