import type { VercelRequest, VercelResponse } from '../vercel.d.ts'
import { parseCookies, verifyState, makeAuthCookies, clearCookie, STATE_COOKIE } from './cookies'

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

  if (!state || !signedState) {
    res.setHeader('Set-Cookie', clearStateCookie)
    return redirect('auth=error&msg=invalid_state')
  }

  const expectedState = verifyState(signedState)
  if (!expectedState || expectedState !== state) {
    res.setHeader('Set-Cookie', clearStateCookie)
    return redirect('auth=error&msg=invalid_state')
  }

  // ── Exchange code for tokens ─────────────────────────────────────────────────
  const clientId = process.env.VITE_GITHUB_CLIENT_ID
  const clientSecret = process.env.GITHUB_CLIENT_SECRET
  const redirectUri = process.env.OAUTH_REDIRECT_URI

  if (!clientId || !clientSecret) {
    res.setHeader('Set-Cookie', clearStateCookie)
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
      const msg = data.error_description ?? data.error ?? 'token_exchange_failed'
      res.setHeader('Set-Cookie', clearStateCookie)
      return redirect(`auth=error&msg=${encodeURIComponent(msg)}`)
    }

    // Set auth cookies (HttpOnly, Secure, SameSite=Lax) + clear state cookie
    const authCookies = makeAuthCookies({
      access_token: data.access_token!,
      expires_in: data.expires_in,
      refresh_token: data.refresh_token,
      refresh_token_expires_in: data.refresh_token_expires_in,
    })
    res.setHeader('Set-Cookie', [clearStateCookie, ...authCookies])
    return redirect('auth=ok')
  } catch {
    res.setHeader('Set-Cookie', clearStateCookie)
    return redirect('auth=error&msg=token_exchange_failed')
  }
}
