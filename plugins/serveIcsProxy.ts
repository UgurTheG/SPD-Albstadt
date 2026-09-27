import type { Plugin } from 'vite'
import { readFileSync } from 'fs'
import { join } from 'path'
import { fetchCalendar } from '../server/fetchCalendar'
import { isAllowedIcsUrl } from '../api/ics'

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

        void Promise.resolve()
          .then(() => {
            const url = getIcsUrl()
            if (!isAllowedIcsUrl(url)) throw new Error('ics_url_not_allowed')
            return fetchCalendar(url, 2 * 1024 * 1024)
          })
          .then(body => {
            res.statusCode = 200
            res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
            res.setHeader('Cache-Control', 'no-store')
            res.end(body)
          })
          .catch(() => {
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'upstream_error' }))
          })
      })
    },
  }
}
