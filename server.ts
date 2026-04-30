import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import cookieParser from 'cookie-parser'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const distDir = join(__dirname, '..', 'dist')

const app = express()
const PORT = parseInt(process.env.PORT || '3000', 10)

// Middleware
app.use(express.json())
app.use(cookieParser())

// ─── Vercel shim types ────────────────────────────────────────────────────────

interface VercelRes {
  _headers: Record<string, string>
  _status: number
  setHeader(key: string, value: string): this
  status(code: number): this
  json(data: unknown): void
  send(data: unknown): void
  end(data?: unknown): void
}

interface VercelReq {
  method: string
  url: string
  headers: express.Request['headers']
  query: express.Request['query']
  body: unknown
}

// Adapt Vercel-style handler to Express
function vercelToExpress(handlerPath: string) {
  return async (req: express.Request, res: express.Response) => {
    const mod = await import(handlerPath)
    const handler = mod.default

    // Create a Vercel-compatible response wrapper
    const vercelRes: VercelRes = {
      _headers: {},
      _status: 200,
      setHeader(key: string, value: string) {
        this._headers[key] = value
        res.setHeader(key, value)
        return this
      },
      status(code: number) {
        this._status = code
        res.status(code)
        return this
      },
      json(data: unknown) {
        res.json(data)
      },
      send(data: unknown) {
        res.send(data)
      },
      end(data?: unknown) {
        res.end(data)
      },
    }

    const vercelReq: VercelReq = {
      method: req.method,
      url: req.url,
      headers: req.headers,
      query: req.query,
      body: req.body,
    }

    await handler(vercelReq, vercelRes)
  }
}

// API routes — mirror Vercel serverless functions
app.all('/api/ics', vercelToExpress('./api/ics.js'))
app.all('/api/github', vercelToExpress('./api/github.js'))
app.all('/api/admin-presence', vercelToExpress('./api/admin-presence.js'))
app.all('/api/auth/start', vercelToExpress('./api/auth/start.js'))
app.all('/api/auth/callback', vercelToExpress('./api/auth/callback.js'))
app.all('/api/auth/session', vercelToExpress('./api/auth/session.js'))
app.all('/api/auth/refresh', vercelToExpress('./api/auth/refresh.js'))
app.all('/api/auth/logout', vercelToExpress('./api/auth/logout.js'))

// Static files (with caching headers for assets)
app.use(
  '/assets',
  express.static(join(distDir, 'assets'), {
    maxAge: '1y',
    immutable: true,
  }),
)

app.use(
  express.static(distDir, {
    maxAge: '1h',
    index: 'index.html',
  }),
)

// SPA fallback — serve index.html for all non-file routes
app.get('*', (_req, res) => {
  res.sendFile(join(distDir, 'index.html'))
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 SPD Albstadt running on http://0.0.0.0:${PORT}`)
})
