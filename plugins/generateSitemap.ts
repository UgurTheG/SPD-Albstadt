import { type Plugin } from 'vite'
import { writeFileSync } from 'fs'
import { resolve } from 'path'

interface SitemapRoute {
  path: string
  changefreq: string
  priority: number
}

const BASE_URL = 'https://www.spd-albstadt.de'

const ROUTES: SitemapRoute[] = [
  { path: '/', changefreq: 'weekly', priority: 1.0 },
  { path: '/aktuelles', changefreq: 'daily', priority: 0.9 },
  { path: '/partei', changefreq: 'monthly', priority: 0.8 },
  { path: '/fraktion', changefreq: 'monthly', priority: 0.8 },
  { path: '/kommunalpolitik', changefreq: 'monthly', priority: 0.7 },
  { path: '/historie', changefreq: 'yearly', priority: 0.6 },
  { path: '/kontakt', changefreq: 'monthly', priority: 0.7 },
  { path: '/datenschutz', changefreq: 'yearly', priority: 0.3 },
  { path: '/impressum', changefreq: 'yearly', priority: 0.3 },
]

export function generateSitemap(): Plugin {
  return {
    name: 'generate-sitemap',
    closeBundle() {
      const today = new Date().toISOString().split('T')[0]

      const urls = ROUTES.map(
        r => `  <url>
    <loc>${BASE_URL}${r.path === '/' ? '/' : r.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority.toFixed(1)}</priority>
  </url>`,
      ).join('\n')

      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`

      const outDir = resolve(process.cwd(), 'dist')
      writeFileSync(resolve(outDir, 'sitemap.xml'), sitemap, 'utf-8')
      console.log('✓ sitemap.xml generated with', ROUTES.length, 'URLs')
    },
  }
}
