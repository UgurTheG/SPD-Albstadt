import type { Plugin } from 'vite'

export function serveOAuthCallback(env: Record<string, string>): Plugin {
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
