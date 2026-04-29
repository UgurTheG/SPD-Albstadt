import type { VercelRequest, VercelResponse } from '../vercel.d.ts'
import { parseCookies, verifyState, makeAuthCookies, clearCookie, STATE_COOKIE } from './cookies.js'
import { rateLimit, getClientIP } from './rateLimit.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')

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

    // ── User allowlist check ─────────────────────────────────────────────────────
    // If ALLOWED_GITHUB_LOGINS is set, only those exact GitHub usernames may log in.
    // This is a defence-in-depth measure on top of GitHub's own repo-access control.
    const allowedLogins = process.env.ALLOWED_GITHUB_LOGINS
    if (allowedLogins) {
      const allowed = allowedLogins
        .split(',')
        .map(l => l.trim().toLowerCase())
        .filter(Boolean)

      let login = ''
      try {
        const userRes = await fetch('https://api.github.com/user', {
          headers: {
            Authorization: `Bearer ${data.access_token}`,
            Accept: 'application/json',
          },
        })
        if (userRes.ok) {
          const userJson = (await userRes.json()) as { login?: string }
          login = (userJson.login ?? '').toLowerCase()
        }
      } catch {
        // Network error fetching /user — fail closed
      }

      if (!login || !allowed.includes(login)) {
        res.setHeader('Set-Cookie', clearOAuthCookies)
        return redirect('auth=error&msg=unauthorized_user')
      }
    }

    // Set auth cookies (HttpOnly, Secure, SameSite=Lax) + clear OAuth cookies
    const authCookies = makeAuthCookies({
      access_token: data.access_token!,
      expires_in: data.expires_in,
      refresh_token: data.refresh_token,
      refresh_token_expires_in: data.refresh_token_expires_in,
    })
    res.setHeader('Set-Cookie', [...clearOAuthCookies, ...authCookies])
    return redirect('auth=ok')
  } catch {
    res.setHeader('Set-Cookie', clearOAuthCookies)
    return redirect('auth=error&msg=token_exchange_failed')
  }
}
