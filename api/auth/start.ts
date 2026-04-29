import { randomBytes } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '../vercel.d.ts'
import { signState, serializeCookie, STATE_COOKIE } from './cookies'

/**
 * GET /api/auth/start
 *
 * Generates a signed CSRF state, stores it in an HttpOnly cookie,
 * and redirects the user to GitHub's OAuth authorize endpoint.
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  const clientId = process.env.VITE_GITHUB_CLIENT_ID
  if (!clientId) {
    res.status(500).json({ error: 'server_misconfigured' })
    return
  }

  // Determine redirect_uri from the request
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const host = req.headers['x-forwarded-host'] || req.headers['host'] || 'localhost'
  const redirectUri = `${proto}://${host}/api/auth/callback`

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
