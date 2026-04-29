import type { VercelRequest, VercelResponse } from './vercel.d.ts'
import { readFileSync } from 'fs'
import { join } from 'path'

const DEFAULT_ICS_URL = ''

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

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  // Allow cross-origin requests so the frontend on Hostinger can call this endpoint.
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')

  try {
    const icsUrl = getIcsUrl()

    const upstream = await fetch(icsUrl, {
      headers: {
        'User-Agent': 'SPD-Albstadt-Website/1.0',
        Accept: 'text/calendar, text/plain, */*',
      },
    })

    if (!upstream.ok) {
      res.setHeader('Content-Type', 'application/json')
      res.status(502).json({ error: `Upstream returned ${upstream.status}` })
      return
    }

    const body = await upstream.text()

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    res.status(200).end(body)
  } catch (err) {
    res.setHeader('Content-Type', 'application/json')
    res.status(502).json({ error: err instanceof Error ? err.message : 'Unknown error' })
  }
}
