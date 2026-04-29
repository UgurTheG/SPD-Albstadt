import type { VercelRequest, VercelResponse } from '../vercel.d.ts'
import {
  parseCookies,
  makeAuthCookies,
  clearAuthCookies,
  isAllowedOrigin,
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from './cookies'
import { rateLimit, getClientIP } from './rateLimit'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  // Rate limit: 10 refresh attempts per IP per minute
  const ip = getClientIP(req.headers as Record<string, string | string[] | undefined>)
  if (!rateLimit(ip, 10, 60_000)) {
    return res.status(429).json({ error: 'too_many_requests' })
  }

  // Guard against cross-origin abuse of the refresh endpoint.
  const origin = (req.headers['origin'] || req.headers['referer'] || '') as string
  if (!isAllowedOrigin(origin)) {
    return res.status(403).json({ error: 'forbidden_origin' })
  }

  // Require a valid access token cookie to be present (proof of prior auth)
  const cookies = parseCookies(req.headers.cookie)
  const cookieToken = cookies[ACCESS_TOKEN_COOKIE] ?? ''
  if (!cookieToken) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const clientId = process.env.VITE_GITHUB_CLIENT_ID
  const clientSecret = process.env.GITHUB_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'server_misconfigured' })
  }

  // Read refresh token from HttpOnly cookie
  const refreshToken = cookies[REFRESH_TOKEN_COOKIE]

  if (!refreshToken) {
    return res.status(400).json({ error: 'missing_refresh_token' })
  }

  // Don't trust client-supplied cookie timestamps — let GitHub decide if
  // the refresh token is expired and reject it server-side.

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    })

    const data = (await tokenRes.json()) as {
      access_token?: string
      expires_in?: number
      refresh_token?: string
      refresh_token_expires_in?: number
      error?: string
    }

    if (!data.access_token) {
      // Map raw GitHub error codes to opaque safe codes — do NOT forward
      // GitHub's error string verbatim as it leaks internal details to the client.
      const rawError = data.error ?? ''
      const safeCode =
        rawError === 'bad_refresh_token' || rawError === 'expired_token'
          ? 'token_expired'
          : rawError === 'incorrect_client_credentials'
            ? 'server_misconfigured'
            : 'refresh_failed'
      // Clear all auth cookies on ANY refresh failure — the refresh token is
      // either expired, revoked, or invalid. Force the user to re-authenticate
      // rather than leaving them stuck with stale cookies.
      res.setHeader('Set-Cookie', clearAuthCookies())
      return res.status(401).json({ error: safeCode })
    }

    // Update auth cookies
    res.setHeader(
      'Set-Cookie',
      makeAuthCookies({
        access_token: data.access_token!,
        expires_in: data.expires_in,
        refresh_token: data.refresh_token,
        refresh_token_expires_in: data.refresh_token_expires_in,
      }),
    )

    return res.status(200).json({
      ok: true,
      expires_in: data.expires_in,
    })
  } catch {
    return res.status(500).json({ error: 'refresh_failed' })
  }
}
