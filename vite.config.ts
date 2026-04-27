import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'fs'
import { join } from 'path'
import { loadInstagramFeedFromUrl } from './server/instagram'
import { INSTAGRAM_PROFILE_URL, INSTAGRAM_USERNAME } from './src/shared/instagram.ts'

function getIcsUrl(): string {
  try {
    const raw = readFileSync(join(process.cwd(), 'public', 'data', 'config.json'), 'utf-8')
    const config = JSON.parse(raw) as { icsUrl?: string }
    if (config.icsUrl) return config.icsUrl.replace(/^[a-zA-Z]+:\/\//, 'https://')
  } catch {
    /* */
  }
  throw new Error('No ICS URL configured in config.json')
}

function serveIcsProxy(): Plugin {
  return {
    name: 'serve-ics-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url !== '/api/ics') {
          next()
          return
        }

        void fetch(getIcsUrl(), {
          headers: {
            'User-Agent': 'SPD-Albstadt-Website/1.0',
            Accept: 'text/calendar, text/plain, */*',
          },
        })
          .then(async upstream => {
            if (!upstream.ok) {
              res.statusCode = 502
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: `Upstream ${upstream.status}` }))
              return
            }
            const body = await upstream.text()
            res.statusCode = 200
            res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
            res.setHeader('Cache-Control', 'no-store')
            res.end(body)
          })
          .catch(err => {
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown' }))
          })
      })
    },
  }
}

function serveInstagramApi(env: Record<string, string>): Plugin {
  return {
    name: 'serve-instagram-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api/instagram')) {
          next()
          return
        }

        void loadInstagramFeedFromUrl(req.url, env)
          .then(payload => {
            res.statusCode = 200
            res.setHeader('Cache-Control', 'no-store')
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify(payload))
          })
          .catch(() => {
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(
              JSON.stringify({
                username: INSTAGRAM_USERNAME,
                profileUrl: INSTAGRAM_PROFILE_URL,
                source: 'fallback',
                fallbackReason: 'upstream_error',
                items: [],
                fetchedAt: new Date().toISOString(),
              }),
            )
          })
      })
    },
  }
}

function serveOAuthCallback(env: Record<string, string>): Plugin {
  return {
    name: 'serve-oauth-callback',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api/auth/callback')) {
          next()
          return
        }

        const url = new URL(req.url, 'http://localhost')
        const code = url.searchParams.get('code')
        const state = url.searchParams.get('state') ?? ''

        function redirect(fragment: string) {
          res.statusCode = 302
          res.setHeader('Location', `/admin${fragment}`)
          res.end()
        }

        if (!code) return redirect('#error=missing_code')

        const clientId = env.VITE_GITHUB_CLIENT_ID
        const clientSecret = env.GITHUB_CLIENT_SECRET

        if (!clientId || !clientSecret) return redirect('#error=server_misconfigured')

        void fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
        })
          .then(
            r =>
              r.json() as Promise<{
                access_token?: string
                error?: string
                error_description?: string
              }>,
          )
          .then(data => {
            if (!data.access_token) {
              const msg = data.error_description ?? data.error ?? 'token_exchange_failed'
              return redirect(`#error=${encodeURIComponent(msg)}`)
            }
            let fragment = `#token=${encodeURIComponent(data.access_token)}`
            if (state) fragment += `&state=${encodeURIComponent(state)}`
            redirect(fragment)
          })
          .catch(() => redirect('#error=token_exchange_failed'))
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      serveIcsProxy(),
      serveInstagramApi(env),
      serveOAuthCallback(env),
      react(),
      tailwindcss(),
    ],
  }
})
