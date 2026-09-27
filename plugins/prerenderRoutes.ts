import { type Plugin } from 'vite'
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs'
import { resolve } from 'path'
import { SEO_CONFIG } from '../src/seoConfig'
import { loadContentRoutes } from './contentRoutes'
interface ImagePreload {
  href: string
  imagesrcset?: string
  imagesizes?: string
}
interface ShellMeta {
  title: string
  description: string
  canonical: string
  ogType?: 'article'
  ogImage?: string
}
interface RouteShell {
  path: string
  meta: ShellMeta
  chunkName?: string
  imagePreloads?: ImagePreload[]
}
// Titles and descriptions come from SEO_CONFIG; this only adds what the HTML
// shell of each section route needs on top.
const SECTION_EXTRAS: Record<string, Pick<RouteShell, 'chunkName' | 'imagePreloads'>> = {
  '/aktuelles': { chunkName: 'Aktuelles' },
  '/partei': {
    chunkName: 'Partei',
    imagePreloads: [
      {
        href: '/images/abgeordnete/robin-mesarosch-sm.webp',
        imagesrcset:
          '/images/abgeordnete/robin-mesarosch-sm.webp 280w, /images/abgeordnete/robin-mesarosch.webp 450w',
        imagesizes: '(max-width: 640px) 8rem, 15rem',
      },
    ],
  },
  '/fraktion': { chunkName: 'Fraktion' },
  '/kommunalpolitik': { chunkName: 'Kommunalpolitik' },
  '/historie': { chunkName: 'Historie' },
  '/kontakt': {
    chunkName: 'Kontakt',
    imagePreloads: [
      {
        href: '/images/kontakt/gruppenbild-640.webp',
        imagesrcset:
          '/images/kontakt/gruppenbild-640.webp 640w, /images/kontakt/gruppenbild-800.webp 800w, /images/kontakt/gruppenbild.webp 1200w',
        imagesizes: '(max-width: 1024px) 100vw, 40vw',
      },
    ],
  },
}
function routeShells(): RouteShell[] {
  const sections = Object.entries(SEO_CONFIG)
    .filter(([path]) => path !== '/')
    .map(([path, seo]) => ({ path, meta: seo, ...SECTION_EXTRAS[path] }))
  const deepLinks = loadContentRoutes().map(({ seo, chunkName }) => ({
    path: seo.path,
    meta: { ...seo, ogType: 'article' as const },
    chunkName,
  }))
  return [...sections, ...deepLinks]
}
// These chunks are already injected via modulepreload in the main index.html.
const ALREADY_PRELOADED_PREFIXES = [
  'rolldown-runtime',
  'react-vendor',
  'vendor-',
  'framer-motion',
  'lucide-',
  'index-',
]
// Heavy chunks only loaded on user interaction — never eagerly preload these.
const NEVER_PRELOAD_PREFIXES = ['LazyLightboxWrapper', 'calendar', 'AdminApp', 'admin-']
/**
 * Scans dist/assets/ for the lazy JS chunk matching `chunkName` and returns
 * all filenames (primary + direct static sub-imports) that should be
 * modulepreloaded in the route's HTML to eliminate extra RTTs.
 */
function findRouteChunks(assetsDir: string, chunkName: string): string[] {
  const allFiles = readdirSync(assetsDir)
  const primary = allFiles.find(f => f.startsWith(chunkName + '-') && f.endsWith('.js'))
  if (!primary) return []
  const chunks = new Set<string>([primary])
  const content = readFileSync(resolve(assetsDir, primary), 'utf-8')
  const refs = content.match(/"\.\/([A-Za-z0-9_.-]+-[A-Za-z0-9_.-]+\.js)"/g) ?? []
  for (const ref of refs) {
    const fname = ref.slice(3, -1)
    if (ALREADY_PRELOADED_PREFIXES.some(p => fname.startsWith(p))) continue
    if (NEVER_PRELOAD_PREFIXES.some(p => fname.startsWith(p))) continue
    if (!allFiles.includes(fname)) continue
    chunks.add(fname)
  }
  return [...chunks]
}
function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
function metaTag(attr: 'name' | 'property', key: string): RegExp {
  return new RegExp(`<meta\\s+${attr}="${key}"\\s+content="[^"]*"\\s*/?>`)
}
/**
 * Rewrites the head tags of the built index.html for one route. Throws when a
 * tag is missing so a change to index.html can't silently break link previews.
 */
export function applyMeta(html: string, meta: ShellMeta): string {
  const title = escapeAttr(meta.title)
  const description = escapeAttr(meta.description)
  const canonical = escapeAttr(meta.canonical)
  const replacements: [RegExp, string][] = [
    [/<title>[^<]*<\/title>/, `<title>${title}</title>`],
    [metaTag('name', 'description'), `<meta name="description" content="${description}" />`],
    [
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
      `<link rel="canonical" href="${canonical}" />`,
    ],
    [
      /<link\s+rel="alternate"\s+hreflang="de"\s+href="[^"]*"\s*\/?>/,
      `<link rel="alternate" hreflang="de" href="${canonical}" />`,
    ],
    [metaTag('property', 'og:url'), `<meta property="og:url" content="${canonical}" />`],
    [metaTag('property', 'og:title'), `<meta property="og:title" content="${title}" />`],
    [
      metaTag('property', 'og:description'),
      `<meta property="og:description" content="${description}" />`,
    ],
    [metaTag('name', 'twitter:title'), `<meta name="twitter:title" content="${title}" />`],
    [
      metaTag('name', 'twitter:description'),
      `<meta name="twitter:description" content="${description}" />`,
    ],
  ]
  if (meta.ogType) {
    replacements.push([
      metaTag('property', 'og:type'),
      `<meta property="og:type" content="${meta.ogType}" />`,
    ])
  }
  if (meta.ogImage) {
    const image = escapeAttr(meta.ogImage)
    replacements.push(
      [metaTag('property', 'og:image'), `<meta property="og:image" content="${image}" />`],
      [metaTag('property', 'og:image:alt'), `<meta property="og:image:alt" content="${title}" />`],
      [metaTag('name', 'twitter:image'), `<meta name="twitter:image" content="${image}" />`],
    )
    // The default image's dimensions don't apply to the replacement.
    html = html
      .replace(new RegExp(`\\s*${metaTag('property', 'og:image:width').source}`), '')
      .replace(new RegExp(`\\s*${metaTag('property', 'og:image:height').source}`), '')
  }
  for (const [pattern, tag] of replacements) {
    if (!pattern.test(html)) throw new Error(`prerender-routes: index.html has no ${pattern}`)
    // Function replacement so `$` in content isn't read as a substitution pattern.
    html = html.replace(pattern, () => tag)
  }
  return html
}
export function prerenderRoutes(): Plugin {
  return {
    name: 'prerender-routes',
    closeBundle() {
      const outDir = resolve(process.cwd(), 'dist')
      const assetsDir = resolve(outDir, 'assets')
      const indexHtml = readFileSync(resolve(outDir, 'index.html'), 'utf-8')
      const chunksByName = new Map<string, string[]>()
      const shells = routeShells()
      for (const shell of shells) {
        const routeDir = resolve(outDir, shell.path.slice(1))
        mkdirSync(routeDir, { recursive: true })
        let html = applyMeta(indexHtml, shell.meta)
        const headTags: string[] = []
        for (const p of shell.imagePreloads ?? []) {
          const srcsetAttr = p.imagesrcset ? ` imagesrcset="${p.imagesrcset}"` : ''
          const sizesAttr = p.imagesizes ? ` imagesizes="${p.imagesizes}"` : ''
          headTags.push(
            `  <link rel="preload" as="image" href="${p.href}"${srcsetAttr}${sizesAttr} fetchpriority="high" />`,
          )
        }
        // Inject modulepreload hints for route-specific lazy chunks.
        // Without this, each lazy chunk requires a separate roundtrip after
        // main JS executes — ~150ms RTT saved per chunk on slow 4G.
        if (shell.chunkName) {
          if (!chunksByName.has(shell.chunkName)) {
            chunksByName.set(shell.chunkName, findRouteChunks(assetsDir, shell.chunkName))
          }
          for (const f of chunksByName.get(shell.chunkName) ?? []) {
            headTags.push(`  <link rel="modulepreload" crossorigin href="/assets/${f}">`)
          }
        }
        if (headTags.length > 0) html = html.replace('</head>', `${headTags.join('\n')}\n</head>`)
        writeFileSync(resolve(routeDir, 'index.html'), html, 'utf-8')
      }
      console.log('✓ Prerendered', shells.length, 'route HTML shells')
    },
  }
}
