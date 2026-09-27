import { type Plugin } from 'vite'
import { writeFileSync } from 'fs'
import { resolve } from 'path'
import { SEO_CONFIG } from '../src/seoConfig'
import { loadContentRoutes } from './contentRoutes'

export function generateSitemap(): Plugin {
  return {
    name: 'generate-sitemap',
    closeBundle() {
      const today = new Date().toISOString().split('T')[0]
      const entries = [
        ...Object.values(SEO_CONFIG),
        ...loadContentRoutes().map(r => ({ ...r, canonical: r.seo.canonical })),
      ]

      const urls = entries
        .map(
          e => `  <url>
    <loc>${e.canonical}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority.toFixed(1)}</priority>
  </url>`,
        )
        .join('\n')

      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`

      const outDir = resolve(process.cwd(), 'dist')
      writeFileSync(resolve(outDir, 'sitemap.xml'), sitemap, 'utf-8')
      console.log('✓ sitemap.xml generated with', entries.length, 'URLs')
    },
  }
}
