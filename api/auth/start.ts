import { randomBytes } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '../vercel.d.ts'
import { signState, serializeCookie, STATE_COOKIE } from './cookies.js'
import { setNoStore, isRateLimited } from './middleware.js'

/**
 * GET /api/auth/start
 *
 * Generates a signed CSRF state, stores it in an HttpOnly cookie,
 * and redirects the user to GitHub's OAuth authorize endpoint.
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  setNoStore(res)
  if (isRateLimited(req, res, 5)) return

  const clientId = process.env.VITE_GITHUB_CLIENT_ID
  const redirectUri = process.env.OAUTH_REDIRECT_URI
  const hasSigningSecret = !!(process.env.STATE_SIGNING_SECRET || process.env.GITHUB_CLIENT_SECRET)
  if (!clientId || !redirectUri || !hasSigningSecret) {
    res.status(500).json({ error: 'server_misconfigured' })
    return
  }

  // Generate and sign CSRF state
  const state = randomBytes(16).toString('hex')
  const signed = signState(state)

  // Set state cookie (short-lived, 10 minutes)
  res.setHeader('Set-Cookie', [
    serializeCookie(STATE_COOKIE, {
      value: signed,
      maxAge: 600,
      path: '/api/auth',
    }),
  ])

  const params = new URLSearchParams({
    // VITE_GITHUB_CLIENT_ID is intentionally public — it's embedded in the frontend
    // bundle by LoginScreen.tsx and is not a secret (GitHub OAuth client IDs are public).
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
  })

  res.setHeader('Location', `https://github.com/login/oauth/authorize?${params}`)
  res.status(302).end('')
}
