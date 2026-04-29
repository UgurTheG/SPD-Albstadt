import { createHmac, randomBytes } from 'node:crypto'
import type { Plugin } from 'vite'

// ─── Cookie helpers (mirrors api/auth/cookies.ts for dev server) ───────────────

function signState(state: string, secret: string): string {
  const sig = createHmac('sha256', secret).update(state).digest('hex')
  return `${state}.${sig}`
}

function verifyState(signed: string, secret: string): string | null {
  const dot = signed.lastIndexOf('.')
  if (dot < 1) return null
  const state = signed.slice(0, dot)
  const sig = signed.slice(dot + 1)
  const expected = createHmac('sha256', secret).update(state).digest('hex')
  if (sig.length !== expected.length) return null
  let mismatch = 0
  for (let i = 0; i < sig.length; i++) mismatch |= sig.charCodeAt(i) ^ expected.charCodeAt(i)
  return mismatch === 0 ? state : null
}

function parseCookies(header: string | undefined): Record<string, string> {
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

function makeCookie(name: string, value: string, maxAge: number): string {
  // Dev: no Secure flag (HTTP localhost)
  return `${name}=${encodeURIComponent(value)}; Path=/api/auth; Max-Age=${maxAge}; HttpOnly; SameSite=Lax`
}

function clearCookie(name: string): string {
  return makeCookie(name, '', 0)
}

const ACCESS_TOKEN_COOKIE = 'spd_access_token'
const TOKEN_EXPIRES_COOKIE = 'spd_token_expires_at'
const REFRESH_TOKEN_COOKIE = 'spd_refresh_token'
const REFRESH_EXPIRES_COOKIE = 'spd_refresh_expires_at'
const STATE_COOKIE = 'spd_oauth_state'

function makeAuthCookies(data: {
  access_token: string
  expires_in?: number
  refresh_token?: string
  refresh_token_expires_in?: number
}): string[] {
  const maxAge = data.expires_in ?? 8 * 3600
  const cookies = [
    makeCookie(ACCESS_TOKEN_COOKIE, data.access_token, maxAge),
    makeCookie(TOKEN_EXPIRES_COOKIE, String(Date.now() + maxAge * 1000), maxAge),
  ]
  if (data.refresh_token) {
    const refreshMax = data.refresh_token_expires_in ?? 6 * 30 * 24 * 3600
    cookies.push(makeCookie(REFRESH_TOKEN_COOKIE, data.refresh_token, refreshMax))
    cookies.push(
      makeCookie(REFRESH_EXPIRES_COOKIE, String(Date.now() + refreshMax * 1000), refreshMax),
    )
  }
  return cookies
}

function clearAuthCookies(): string[] {
  return [
    clearCookie(ACCESS_TOKEN_COOKIE),
    clearCookie(TOKEN_EXPIRES_COOKIE),
    clearCookie(REFRESH_TOKEN_COOKIE),
    clearCookie(REFRESH_EXPIRES_COOKIE),
  ]
}

/** Read the full request body as JSON. */
function readJsonBody(req: import('http').IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk: Buffer) => {
      data += chunk.toString()
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(data))
      } catch {
        reject(new Error('invalid_json'))
      }
    })
    req.on('error', reject)
  })
}

// ─── Plugin ────────────────────────────────────────────────────────────────────

export function serveOAuthCallback(env: Record<string, string>): Plugin {
  const secret = env.GITHUB_CLIENT_SECRET || ''

  return {
    name: 'serve-oauth-callback',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // ── GET /api/auth/start ───────────────────────────────────────────────
        if (req.url?.startsWith('/api/auth/start')) {
          const clientId = env.VITE_GITHUB_CLIENT_ID
          if (!clientId) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'server_misconfigured' }))
            return
          }
          const state = randomBytes(16).toString('hex')
          const signed = signState(state, secret)

          res.setHeader('Set-Cookie', makeCookie(STATE_COOKIE, signed, 600))

          const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: `http://localhost:5173/api/auth/callback`,
            state,
            scope: 'read:user repo',
          })
          res.statusCode = 302
          res.setHeader('Location', `https://github.com/login/oauth/authorize?${params}`)
          res.end()
          return
        }

        // ── GET /api/auth/callback ────────────────────────────────────────────
        if (req.url?.startsWith('/api/auth/callback')) {
          const url = new URL(req.url, 'http://localhost')
          const code = url.searchParams.get('code')
          const state = url.searchParams.get('state') ?? ''

          function redirect(query: string) {
            res.statusCode = 302
            res.setHeader('Location', `/admin?${query}`)
            res.end()
          }

          if (!code) return redirect('auth=error&msg=missing_code')

          // Validate CSRF state
          const cookies = parseCookies(req.headers.cookie)
          const signedState = cookies[STATE_COOKIE]
          const clearState = clearCookie(STATE_COOKIE)

          if (!state || !signedState) {
            res.setHeader('Set-Cookie', clearState)
            return redirect('auth=error&msg=invalid_state')
          }
          const expectedState = verifyState(signedState, secret)
          if (!expectedState || expectedState !== state) {
            res.setHeader('Set-Cookie', clearState)
            return redirect('auth=error&msg=invalid_state')
          }

          const clientId = env.VITE_GITHUB_CLIENT_ID
          const clientSecret = env.GITHUB_CLIENT_SECRET

          if (!clientId || !clientSecret) {
            res.setHeader('Set-Cookie', clearState)
            return redirect('auth=error&msg=server_misconfigured')
          }

          void fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
          })
            .then(
              r =>
                r.json() as Promise<{
                  access_token?: string
                  expires_in?: number
                  refresh_token?: string
                  refresh_token_expires_in?: number
                  error?: string
                  error_description?: string
                }>,
            )
            .then(data => {
              if (!data.access_token) {
                const msg = data.error_description ?? data.error ?? 'token_exchange_failed'
                res.setHeader('Set-Cookie', clearState)
                return redirect(`auth=error&msg=${encodeURIComponent(msg)}`)
              }
              const authCookies = makeAuthCookies({
                access_token: data.access_token!,
                expires_in: data.expires_in,
                refresh_token: data.refresh_token,
                refresh_token_expires_in: data.refresh_token_expires_in,
              })
              res.setHeader('Set-Cookie', [clearState, ...authCookies])
              redirect('auth=ok')
            })
            .catch(() => {
              res.setHeader('Set-Cookie', clearState)
              redirect('auth=error&msg=token_exchange_failed')
            })
          return
        }

        // ── GET /api/auth/session ─────────────────────────────────────────────
        if (req.url?.startsWith('/api/auth/session')) {
          const cookies = parseCookies(req.headers.cookie)
          const token = cookies[ACCESS_TOKEN_COOKIE] ?? null
          const expiresAt = Number(cookies[TOKEN_EXPIRES_COOKIE] || 0)
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Cache-Control', 'no-store')
          res.statusCode = 200
          // Don't expose the token — only return authentication status
          res.end(JSON.stringify({ authenticated: !!token, expires_at: token ? expiresAt : 0 }))
          return
        }

        // ── POST /api/auth/logout ─────────────────────────────────────────────
        if (req.url?.startsWith('/api/auth/logout') && req.method === 'POST') {
          res.setHeader('Set-Cookie', clearAuthCookies())
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Cache-Control', 'no-store')
          res.statusCode = 200
          res.end(JSON.stringify({ ok: true }))
          return
        }

        // ── POST /api/auth/refresh ────────────────────────────────────────────
        if (req.url?.startsWith('/api/auth/refresh') && req.method === 'POST') {
          const cookies = parseCookies(req.headers.cookie)
          const refreshToken = cookies[REFRESH_TOKEN_COOKIE]
          const cookieToken = cookies[ACCESS_TOKEN_COOKIE] ?? ''

          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Cache-Control', 'no-store')

          // Just verify an access token cookie exists (proof of prior auth)
          if (!cookieToken) {
            res.statusCode = 401
            res.end(JSON.stringify({ error: 'unauthorized' }))
            return
          }

          if (!refreshToken) {
            res.statusCode = 400
            res.end(JSON.stringify({ error: 'missing_refresh_token' }))
            return
          }

          const clientId = env.VITE_GITHUB_CLIENT_ID
          const clientSecret = env.GITHUB_CLIENT_SECRET
          if (!clientId || !clientSecret) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: 'server_misconfigured' }))
            return
          }

          void fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
              client_id: clientId,
              client_secret: clientSecret,
              grant_type: 'refresh_token',
              refresh_token: refreshToken,
            }),
          })
            .then(
              r =>
                r.json() as Promise<{
                  access_token?: string
                  expires_in?: number
                  refresh_token?: string
                  refresh_token_expires_in?: number
                  error?: string
                  error_description?: string
                }>,
            )
            .then(data => {
              if (!data.access_token) {
                res.statusCode = 401
                res.end(
                  JSON.stringify({
                    error: data.error_description ?? data.error ?? 'refresh_failed',
                  }),
                )
                return
              }
              res.setHeader(
                'Set-Cookie',
                makeAuthCookies({
                  access_token: data.access_token!,
                  expires_in: data.expires_in,
                  refresh_token: data.refresh_token,
                  refresh_token_expires_in: data.refresh_token_expires_in,
                }),
              )
              res.statusCode = 200
              res.end(JSON.stringify({ ok: true, expires_in: data.expires_in }))
            })
            .catch(() => {
              res.statusCode = 500
              res.end(JSON.stringify({ error: 'refresh_failed' }))
            })
          return
        }

        // ── POST /api/github (proxy) ──────────────────────────────────────────
        if (req.url?.startsWith('/api/github') && req.method === 'POST') {
          const cookies = parseCookies(req.headers.cookie)
          const accessToken = cookies[ACCESS_TOKEN_COOKIE]

          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Cache-Control', 'no-store')

          if (!accessToken) {
            res.statusCode = 401
            res.end(JSON.stringify({ error: 'unauthorized' }))
            return
          }

          void readJsonBody(req)
            .then(async parsed => {
              const { method, path, body } = parsed as {
                method?: string
                path?: string
                body?: unknown
              }

              if (!method || !path) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'missing_method_or_path' }))
                return
              }

              if (!path.startsWith('/user') && !path.startsWith('/repos/')) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'path_not_allowed' }))
                return
              }

              const ghHeaders: Record<string, string> = {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'If-None-Match': '',
              }

              const fetchOpts: RequestInit = {
                method: method.toUpperCase(),
                headers: ghHeaders,
                cache: 'no-store',
              }

              if (body !== undefined && method.toUpperCase() !== 'GET') {
                fetchOpts.body = JSON.stringify(body)
              }

              const ghRes = await fetch(`https://api.github.com${path}`, fetchOpts)
              const data = await ghRes.json()
              res.statusCode = ghRes.status
              res.end(JSON.stringify(data))
            })
            .catch(() => {
              res.statusCode = 502
              res.end(JSON.stringify({ error: 'github_request_failed' }))
            })
          return
        }

        next()
      })
    },
  }
}
