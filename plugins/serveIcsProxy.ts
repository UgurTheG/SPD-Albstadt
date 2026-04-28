import type { Plugin } from 'vite'
import { readFileSync } from 'fs'
import { join } from 'path'

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

export function serveIcsProxy(): Plugin {
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
