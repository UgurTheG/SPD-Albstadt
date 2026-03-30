import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { loadInstagramFeedFromUrl } from './server/instagram'
import { INSTAGRAM_PROFILE_URL, INSTAGRAM_USERNAME } from './src/shared/instagram.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Serve /admin/ from public/admin/index.html instead of falling through to the SPA
function serveAdmin(): Plugin {
  return {
    name: 'serve-admin',
    configureServer(server) {
      server.middlewares.use((req: { url?: string }, res: { setHeader: (k: string, v: string) => void; end: (s: string) => void }, next: () => void) => {
        if (req.url === '/admin' || req.url === '/admin/') {
          const file = path.resolve(__dirname, 'public/admin/index.html')
          if (fs.existsSync(file)) {
            res.setHeader('Content-Type', 'text/html')
            res.end(fs.readFileSync(file, 'utf-8'))
            return
          }
        }
        next()
      })
    },
  }
}

const ICS_CALENDAR_URL = 'https://p122-caldav.icloud.com/published/2/MjAwNjQzOTY4MjEyMDA2NMLddxkvT8tcvLgVQ6dehz9MjxtnrIu92Njn-UIJMnCsZGmJiYheC8PfQYwRBU5bm1kz0SaQASNZwa3q6BbwXjg'

function serveIcsProxy(): Plugin {
  return {
    name: 'serve-ics-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url !== '/api/ics') { next(); return }

        void fetch(ICS_CALENDAR_URL, {
          headers: { 'User-Agent': 'SPD-Albstadt-Website/1.0', Accept: 'text/calendar, text/plain, */*' },
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
            res.end(JSON.stringify({
              username: INSTAGRAM_USERNAME,
              profileUrl: INSTAGRAM_PROFILE_URL,
              source: 'fallback',
              fallbackReason: 'upstream_error',
              items: [],
              fetchedAt: new Date().toISOString(),
            }))
          })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [serveAdmin(), serveIcsProxy(), serveInstagramApi(env), react(), tailwindcss()],
  }
})
