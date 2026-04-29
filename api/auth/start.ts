import { randomBytes } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '../vercel.d.ts'
import { signState, serializeCookie, STATE_COOKIE } from './cookies'
import { rateLimit, getClientIP } from './rateLimit'

/**
 * GET /api/auth/start
 *
 * Generates a signed CSRF state, stores it in an HttpOnly cookie,
 * and redirects the user to GitHub's OAuth authorize endpoint.
 */
export default function handler(_req: VercelRequest, res: VercelResponse) {
  // Rate limit: 5 login attempts per IP per minute
  const ip = getClientIP(_req.headers as Record<string, string | string[] | undefined>)
  if (!rateLimit(ip, 5, 60_000)) {
    res.status(429).json({ error: 'too_many_requests' })
    return
  }

  const clientId = process.env.VITE_GITHUB_CLIENT_ID
  const redirectUri = process.env.OAUTH_REDIRECT_URI
  if (!clientId || !redirectUri) {
    res.status(500).json({ error: 'server_misconfigured' })
    return
  }

  // Generate and sign CSRF state
  const state = randomBytes(16).toString('hex')
  const signed = signState(state)

  // Set state cookie (short-lived, 10 minutes)
  res.setHeader(
    'Set-Cookie',
    serializeCookie(STATE_COOKIE, {
      value: signed,
      maxAge: 600,
      path: '/api/auth',
    }),
  )

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: 'read:user repo',
  })

  res.setHeader('Location', `https://github.com/login/oauth/authorize?${params}`)
  res.status(302).end('')
}
