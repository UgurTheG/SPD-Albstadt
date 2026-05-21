import type { VercelRequest, VercelResponse } from './vercel.d.ts'

/**
 * Proxies iCloud calendar attachment downloads.
 * The frontend calls `/api/ics-attachment?url=<encoded-url>` and this
 * endpoint fetches the file from gateway.icloud.com, forwarding MIME type
 * and content to the browser. Only iCloud gateway URLs are allowed.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Cache-Control', 'no-store')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  const url = req.query['url']
  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'missing_url' })
    return
  }

  // Only allow proxying iCloud gateway attachment URLs
  if (!url.startsWith('https://gateway.icloud.com/caldav/')) {
    res.status(403).json({ error: 'url_not_allowed' })
    return
  }

  try {
    const upstream = await fetch(url, {
      headers: {
        'User-Agent': 'SPD-Albstadt-Website/1.0',
      },
    })

    if (!upstream.ok) {
      res.status(502).json({ error: `upstream_${upstream.status}` })
      return
    }

    const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream'
    const buffer = Buffer.from(await upstream.arrayBuffer())

    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Length', buffer.length)
    res.status(200).end(buffer)
  } catch {
    res.status(502).json({ error: 'fetch_failed' })
  }
}
