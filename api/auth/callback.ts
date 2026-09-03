import type { VercelRequest, VercelResponse } from '../vercel.d.ts'
import { parseCookies, verifyState, makeAuthCookies, clearCookie, STATE_COOKIE } from './cookies.js'
import { rateLimit, getClientIP } from './rateLimit.js'
import { fetchGitHubLogin, hasPushAccess, isLoginAllowed } from './access.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' })
    return
  }

  // Rate limit: 10 callback attempts per IP per minute to prevent code stuffing.
  const ip = getClientIP(req.headers as Record<string, string | string[] | undefined>)
  if (!rateLimit(ip, 10, 60_000)) {
    res.status(429).json({ error: 'too_many_requests' })
    return
  }

  const q = req.query
  const code = Array.isArray(q.code) ? q.code[0] : q.code
  const state = Array.isArray(q.state) ? q.state[0] : q.state

  function redirect(query: string) {
    res.setHeader('Location', `/admin?${query}`)
    res.status(302).end('')
  }

  if (!code) return redirect('auth=error&msg=missing_code')

  // ── Validate CSRF state server-side ──────────────────────────────────────────
  const cookies = parseCookies(req.headers.cookie)
  const signedState = cookies[STATE_COOKIE]

  // Always clear the one-time state cookie
  const clearStateCookie = clearCookie(STATE_COOKIE)
  const clearOAuthCookies = [clearStateCookie]

  if (!state || !signedState) {
    res.setHeader('Set-Cookie', clearOAuthCookies)
    return redirect('auth=error&msg=invalid_state')
  }

  // Bail early if the signing secret is unavailable (prevents unhandled throw from verifyState)
  if (!process.env.STATE_SIGNING_SECRET && !process.env.GITHUB_CLIENT_SECRET) {
    res.setHeader('Set-Cookie', clearOAuthCookies)
    return redirect('auth=error&msg=server_misconfigured')
  }

  const expectedState = verifyState(signedState)
  if (!expectedState || expectedState !== state) {
    res.setHeader('Set-Cookie', clearOAuthCookies)
    return redirect('auth=error&msg=invalid_state')
  }

  // ── Exchange code for tokens ─────────────────────────────────────────────────
  const clientId = process.env.VITE_GITHUB_CLIENT_ID
  const clientSecret = process.env.GITHUB_CLIENT_SECRET
  const redirectUri = process.env.OAUTH_REDIRECT_URI

  if (!clientId || !clientSecret) {
    res.setHeader('Set-Cookie', clearOAuthCookies)
    return redirect('auth=error&msg=server_misconfigured')
  }

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        ...(redirectUri ? { redirect_uri: redirectUri } : {}),
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
      // Do NOT forward GitHub's error_description verbatim — it leaks internals
      // into browser history and the URL bar. Map to a fixed opaque code instead.
      const rawError = data.error ?? ''
      const safeCode =
        rawError === 'bad_verification_code'
          ? 'bad_code'
          : rawError === 'incorrect_client_credentials'
            ? 'server_misconfigured'
            : rawError === 'redirect_uri_mismatch'
              ? 'server_misconfigured'
              : 'token_exchange_failed'
      res.setHeader('Set-Cookie', clearOAuthCookies)
      return redirect(`auth=error&msg=${safeCode}`)
    }

    // ── Authorisation ────────────────────────────────────────────────────────────
    // The repository is public, so a successful token exchange proves nothing
    // about the user's rights. Require push access on the content repo (verified
    // with the user's own token) and, if configured, the login allowlist.
    // The login is stored in an HttpOnly cookie so presence endpoints can bind
    // identity to the token without trusting client-supplied values.
    const login = await fetchGitHubLogin(data.access_token)
    if (!login) {
      res.setHeader('Set-Cookie', clearOAuthCookies)
      return redirect('auth=error&msg=token_exchange_failed')
    }

    if (!isLoginAllowed(login)) {
      res.setHeader('Set-Cookie', clearOAuthCookies)
      return redirect('auth=error&msg=unauthorized_user')
    }

    if (!(await hasPushAccess(data.access_token))) {
      res.setHeader('Set-Cookie', clearOAuthCookies)
      return redirect('auth=error&msg=no_push_access')
    }

    // Set auth cookies (HttpOnly, Secure, SameSite=Lax) + clear OAuth cookies
    const authCookies = makeAuthCookies({
      access_token: data.access_token,
      expires_in: data.expires_in,
      refresh_token: data.refresh_token,
      refresh_token_expires_in: data.refresh_token_expires_in,
      login,
    })
    res.setHeader('Set-Cookie', [...clearOAuthCookies, ...authCookies])
    return redirect('auth=ok')
  } catch {
    res.setHeader('Set-Cookie', clearOAuthCookies)
    return redirect('auth=error&msg=token_exchange_failed')
  }
}
