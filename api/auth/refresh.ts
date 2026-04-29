import type { VercelRequest, VercelResponse } from '../vercel.d.ts'
import {
  parseCookies,
  makeAuthCookies,
  clearAuthCookies,
  isAllowedOrigin,
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  REFRESH_EXPIRES_COOKIE,
} from './cookies'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  // Guard against cross-origin abuse of the refresh endpoint.
  // Use Origin when available; fall back to Referer (extractOrigin handles full URLs).
  const origin = (req.headers['origin'] || req.headers['referer'] || '') as string
  if (!isAllowedOrigin(origin)) {
    return res.status(403).json({ error: 'forbidden_origin' })
  }

  // Require a valid (possibly expired) access token as an authorization check
  const authHeader = req.headers['authorization'] ?? ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const cookies = parseCookies(req.headers.cookie)
  const cookieToken = cookies[ACCESS_TOKEN_COOKIE] ?? ''
  if (!bearerToken || bearerToken !== cookieToken) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const clientId = process.env.VITE_GITHUB_CLIENT_ID
  const clientSecret = process.env.GITHUB_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'server_misconfigured' })
  }

  // Read refresh token from HttpOnly cookie
  const refreshToken = cookies[REFRESH_TOKEN_COOKIE]
  const refreshTokenExpiresAt = Number(cookies[REFRESH_EXPIRES_COOKIE] || 0)

  if (!refreshToken) {
    return res.status(400).json({ error: 'missing_refresh_token' })
  }

  if (refreshTokenExpiresAt && Date.now() > refreshTokenExpiresAt) {
    res.setHeader('Set-Cookie', clearAuthCookies())
    return res.status(401).json({ error: 'refresh_token_expired' })
  }

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
      error_description?: string
    }

    if (!data.access_token) {
      const msg = data.error_description ?? data.error ?? 'refresh_failed'
      return res.status(401).json({ error: msg })
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

    // Don't return the raw access_token — it's already in the HttpOnly cookie.
    // The session endpoint will provide it on next fetch.
    return res.status(200).json({
      ok: true,
      expires_in: data.expires_in,
    })
  } catch {
    return res.status(500).json({ error: 'refresh_failed' })
  }
}
