import type { Plugin } from 'vite'
import { loadInstagramFeedFromUrl } from '../server/instagram'
import { INSTAGRAM_PROFILE_URL, INSTAGRAM_USERNAME } from '../src/shared/instagram'

export function serveInstagramApi(env: Record<string, string>): Plugin {
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
