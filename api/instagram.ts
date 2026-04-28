import type { VercelRequest, VercelResponse } from './vercel.d.ts'
import { loadInstagramFeedFromUrl, type InstagramFeedResponse } from '../server/instagram.ts'

const CACHE_CONTROL = 'public, max-age=0, s-maxage=900, stale-while-revalidate=43200'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const payload: InstagramFeedResponse = await loadInstagramFeedFromUrl(
    req.url ?? '/api/instagram',
    process.env,
  )

  res.setHeader('Cache-Control', CACHE_CONTROL)
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.status(200).json(payload)
}
