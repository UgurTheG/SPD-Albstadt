import {readFileSync} from 'fs'
import {join} from 'path'

const DEFAULT_ICS_URL = 'https://p122-caldav.icloud.com/published/2/MjAwNjQzOTY4MjEyMDA2NMLddxkvT8tcvLgVQ6dehz9MjxtnrIu92Njn-UIJMnCsZGmJiYheC8PfQYwRBU5bm1kz0SaQASNZwa3q6BbwXjg'

function getIcsUrl(): string {
  try {
    const configPath = join(process.cwd(), 'public', 'data', 'config.json')
    const raw = readFileSync(configPath, 'utf-8')
    const config = JSON.parse(raw) as { icsUrl?: string }
    if (config.icsUrl) return config.icsUrl
  } catch { /* use default */
  }
  return DEFAULT_ICS_URL
}

type ApiResponse = {
  setHeader: (name: string, value: string) => void
  status: (code: number) => ApiResponse
  json: (payload: unknown) => void
  end: (body: string) => void
}

export default async function handler(_req: unknown, res: ApiResponse) {
  try {
    const icsUrl = getIcsUrl()

    const upstream = await fetch(icsUrl, {
      headers: {
        'User-Agent': 'SPD-Albstadt-Website/1.0',
        'Accept': 'text/calendar, text/plain, */*',
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
