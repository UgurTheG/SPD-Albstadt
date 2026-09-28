import { readFileSync } from 'fs'
import { resolve } from 'path'
import type { NewsItem } from '../src/types/news'
import type { PartyData } from '../src/components/sections/Partei/types'
import type { HistoryData } from '../src/components/sections/Historie/types'
import {
  historieSEO,
  newsSEO,
  schwerpunktSEO,
  type DeepLinkSEO,
  type SEOMeta,
} from '../src/seoConfig'

export interface ContentRoute {
  seo: DeepLinkSEO
  /** Lazy section chunk to modulepreload in the route's HTML shell. */
  chunkName: string
  changefreq: SEOMeta['changefreq']
  priority: number
}

function readData<T>(root: string, file: string): T {
  return JSON.parse(readFileSync(resolve(root, 'public/data', file), 'utf-8'))
}

/**
 * Every detail-sheet URL backed by content in public/data/. Each admin publish
 * is a commit to main, so the next deploy picks up new and renamed entries.
 */
export function loadContentRoutes(root = process.cwd()): ContentRoute[] {
  const news = readData<NewsItem[]>(root, 'news.json')
  const party = readData<PartyData>(root, 'party.json')
  const history = readData<HistoryData>(root, 'history.json')

  const routes = [
    ...news.map((item): ContentRoute => ({
      seo: newsSEO(item),
      chunkName: 'Aktuelles',
      changefreq: 'monthly',
      priority: 0.6,
    })),
    ...party.schwerpunkte.map((item): ContentRoute => ({
      seo: schwerpunktSEO(item),
      chunkName: 'Partei',
      changefreq: 'monthly',
      priority: 0.5,
    })),
    ...history.timeline.map((entry): ContentRoute => ({
      seo: historieSEO(entry),
      chunkName: 'Historie',
      changefreq: 'yearly',
      priority: 0.4,
    })),
  ]

  // An item published before its title or year is filled in has an empty slug;
  // its shell would overwrite the section's own. The sheet opens the first
  // match, so a duplicate slug keeps the first entry too.
  const seen = new Set<string>()
  return routes.filter(({ seo }) => {
    const slug = seo.path.split('/')[2]
    if (!slug || seen.has(seo.path)) return false
    seen.add(seo.path)
    return true
  })
}
