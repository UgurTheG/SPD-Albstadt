import type { VercelRequest, VercelResponse } from './vercel.d.ts'
import { readFileSync } from 'fs'
import { join } from 'path'
import { rateLimit, getClientIP } from './auth/rateLimit.js'

const DEFAULT_ICS_URL = ''
/** Upstream must answer within this window — a slow calendar host must not
 *  pin the function until Vercel's own timeout. */
const UPSTREAM_TIMEOUT_MS = 10_000
/** Calendars are a few kB; anything larger is not a feed we want to relay. */
const MAX_BODY_BYTES = 2 * 1024 * 1024

function normalizeUrl(url: string): string {
  return url.replace(/^[a-zA-Z]+:\/\//, 'https://')
}

function getIcsUrl(): string {
  try {
    const configPath = join(process.cwd(), 'public', 'data', 'config.json')
    const raw = readFileSync(configPath, 'utf-8')
    const config = JSON.parse(raw) as { icsUrl?: string }
    if (config.icsUrl) return normalizeUrl(config.icsUrl)
  } catch {
    /* use default */
  }
  if (!DEFAULT_ICS_URL) throw new Error('No ICS URL configured in config.json')
  return DEFAULT_ICS_URL
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Never cache proxy responses — error codes and feed contents must always be fresh.
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  // Allow cross-origin requests so the frontend on Hostinger can call this endpoint.
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')

  if (req.method === 'OPTIONS') {
    res.status(204).end('')
    return
  }
  if (req.method !== 'GET') {
    res.setHeader('Content-Type', 'application/json')
    res.status(405).json({ error: 'method_not_allowed' })
    return
  }

  // Every request triggers an outbound fetch to the calendar host, so this
  // unauthenticated endpoint must not be usable as a request amplifier.
  // 30 requests / minute per IP is far above what one visitor's page loads need.
  const ip = getClientIP(req.headers as Record<string, string | string[] | undefined>)
  if (!rateLimit(ip, 30, 60_000)) {
    res.setHeader('Content-Type', 'application/json')
    res.status(429).json({ error: 'too_many_requests' })
    return
  }

  try {
    const icsUrl = getIcsUrl()

    const upstream = await fetch(icsUrl, {
      headers: {
        'User-Agent': 'SPD-Albstadt-Website/1.0',
        Accept: 'text/calendar, text/plain, */*',
      },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    })

    if (!upstream.ok) {
      res.setHeader('Content-Type', 'application/json')
      res.status(502).json({ error: `Upstream returned ${upstream.status}` })
      return
    }

    const declared = Number(upstream.headers.get('content-length') ?? 0)
    if (declared > MAX_BODY_BYTES) {
      res.setHeader('Content-Type', 'application/json')
      res.status(502).json({ error: 'upstream_too_large' })
      return
    }

    const bytes = await upstream.arrayBuffer()
    if (bytes.byteLength > MAX_BODY_BYTES) {
      res.setHeader('Content-Type', 'application/json')
      res.status(502).json({ error: 'upstream_too_large' })
      return
    }

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
    res.status(200).end(Buffer.from(bytes))
  } catch {
    // Opaque code only — raw error messages can leak internal hostnames/paths
    res.setHeader('Content-Type', 'application/json')
    res.status(502).json({ error: 'upstream_error' })
  }
}
