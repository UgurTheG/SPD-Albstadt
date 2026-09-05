import { randomBytes } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '../vercel.d.ts'
import { signState, serializeCookie, STATE_COOKIE, STATE_MAX_AGE_S } from './cookies.js'
import { rateLimit, getClientIP } from './rateLimit.js'

/**
 * GET /api/auth/start
 *
 * Generates a signed CSRF state, stores it in an HttpOnly cookie,
 * and redirects the user to GitHub's OAuth authorize endpoint.
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' })
    return
  }
  // Rate limit: 5 login attempts per IP per minute
  const ip = getClientIP(req.headers as Record<string, string | string[] | undefined>)
  if (!rateLimit(ip, 5, 60_000)) {
    res.status(429).json({ error: 'too_many_requests' })
    return
  }

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

  // Set state cookie (short-lived — the same limit is enforced inside the signature)
  res.setHeader('Set-Cookie', [
    serializeCookie(STATE_COOKIE, {
      value: signed,
      maxAge: STATE_MAX_AGE_S,
      path: '/api/auth',
    }),
  ])

  const params = new URLSearchParams({
    // VITE_GITHUB_CLIENT_ID is intentionally public — it's embedded in the frontend
    // bundle by LoginScreen.tsx and is not a secret (GitHub OAuth client IDs are public).
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    // Least privilege for a classic OAuth App: the content repo is public, so
    // `public_repo` is sufficient for commits. GitHub Apps ignore this value
    // and use their installation permissions instead.
    scope: 'read:user public_repo',
  })

  res.setHeader('Location', `https://github.com/login/oauth/authorize?${params}`)
  res.status(302).end('')
}
