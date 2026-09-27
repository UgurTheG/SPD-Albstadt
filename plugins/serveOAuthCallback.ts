import { randomBytes } from 'node:crypto'
import type { Plugin } from 'vite'
import { resolveAllowedUrl, verifyRefUpdate } from '../api/github'
import { oauthErrorCode } from '../api/auth/callback'
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  STATE_COOKIE,
  STATE_MAX_AGE_S,
  TOKEN_EXPIRES_COOKIE,
  clearAuthCookies,
  clearCookie,
  makeAuthCookies,
  parseCookies,
  serializeCookie,
  signState,
  verifyState,
} from '../api/auth/cookies'

// ─── Cookies ───────────────────────────────────────────────────────────────────
// Cookie names, CSRF state signing and serialisation come from the production
// helpers in api/auth/cookies.ts so a local login behaves like the Vercel one.
// Only the Secure attribute is dropped: the dev server runs on http://localhost.

function devCookies(cookies: string | string[]): string[] {
  return [cookies].flat().map(c => c.replace('; Secure', ''))
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
  const hasSigningSecret = Boolean(env.STATE_SIGNING_SECRET || env.GITHUB_CLIENT_SECRET)

  return {
    name: 'serve-oauth-callback',
    configureServer(server) {
      // The shared signing helpers read their secret from process.env, which
      // loadEnv() does not populate from .env files.
      for (const key of ['STATE_SIGNING_SECRET', 'GITHUB_CLIENT_SECRET'] as const) {
        if (env[key] && !process.env[key]) process.env[key] = env[key]
      }

      server.middlewares.use((req, res, next) => {
        // ── GET /api/auth/start ───────────────────────────────────────────────
        if (req.url?.startsWith('/api/auth/start')) {
          const clientId = env.VITE_GITHUB_CLIENT_ID
          if (!clientId || !hasSigningSecret) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'server_misconfigured' }))
            return
          }
          const state = randomBytes(16).toString('hex')
          res.setHeader(
            'Set-Cookie',
            devCookies(
              serializeCookie(STATE_COOKIE, {
                value: signState(state),
                maxAge: STATE_MAX_AGE_S,
                path: '/api/auth',
              }),
            ),
          )

          const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: `http://localhost:5173/api/auth/callback`,
            state,
            // Same least-privilege scope as production (api/auth/start.ts) — a
            // developer's token must not be granted access to private repos.
            scope: 'read:user public_repo',
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
          const clearState = devCookies(clearCookie(STATE_COOKIE))

          if (!state || !signedState || !hasSigningSecret) {
            res.setHeader('Set-Cookie', clearState)
            return redirect('auth=error&msg=invalid_state')
          }
          const expectedState = verifyState(signedState)
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
                res.setHeader('Set-Cookie', clearState)
                return redirect(`auth=error&msg=${oauthErrorCode(data.error)}`)
              }
              const authCookies = makeAuthCookies({
                access_token: data.access_token!,
                expires_in: data.expires_in,
                refresh_token: data.refresh_token,
                refresh_token_expires_in: data.refresh_token_expires_in,
              })
              res.setHeader('Set-Cookie', [...clearState, ...devCookies(authCookies)])
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
          res.setHeader('Set-Cookie', devCookies(clearAuthCookies()))
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
                res.setHeader('Set-Cookie', devCookies(clearAuthCookies()))
                res.end(JSON.stringify({ error: 'refresh_failed' }))
                return
              }
              res.setHeader(
                'Set-Cookie',
                devCookies(
                  makeAuthCookies({
                    access_token: data.access_token!,
                    expires_in: data.expires_in,
                    refresh_token: data.refresh_token,
                    refresh_token_expires_in: data.refresh_token_expires_in,
                  }),
                ),
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

              // Same endpoint allowlist as production, so a developer's token
              // is never more exposed locally than an editor's is on Vercel and
              // an out-of-allowlist call fails in `npm run dev` already.
              const requestUrl = resolveAllowedUrl({ method: method.toUpperCase(), path, body })
              if (!requestUrl) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'path_not_allowed' }))
                return
              }

              if (method.toUpperCase() === 'PATCH') {
                const verdict = await verifyRefUpdate(accessToken, (body as { sha: string }).sha)
                if (verdict !== 'ok') {
                  res.statusCode =
                    verdict === 'conflict' ? 422 : verdict === 'forbidden' ? 403 : 502
                  res.end(
                    JSON.stringify({
                      error:
                        verdict === 'conflict'
                          ? 'ref_not_fast_forward'
                          : verdict === 'forbidden'
                            ? 'ref_update_not_allowed'
                            : 'github_request_failed',
                    }),
                  )
                  return
                }
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

              const ghRes = await fetch(requestUrl, fetchOpts)
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
