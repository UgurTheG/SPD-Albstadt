import { type Plugin } from 'vite'
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs'
import { resolve } from 'path'
interface ImagePreload {
  href: string
  imagesrcset?: string
  imagesizes?: string
}
interface RouteSEO {
  path: string
  title: string
  description: string
  canonical: string
  imagePreloads?: ImagePreload[]
  chunkName?: string
}
const BASE_URL = 'https://www.spd-albstadt.de'
const ROUTES: RouteSEO[] = [
  {
    path: '/aktuelles',
    title: 'Aktuelles – SPD Albstadt',
    description:
      'Aktuelle Nachrichten, Pressemitteilungen und Neuigkeiten der SPD Albstadt. Bleiben Sie informiert über die Stadtpolitik in Albstadt.',
    canonical: `${BASE_URL}/aktuelles`,
    chunkName: 'Aktuelles',
  },
  {
    path: '/partei',
    title: 'Partei – SPD Albstadt',
    description:
      'Der SPD Ortsverein Albstadt: Vorstand, Mitglieder und Persnlichkeiten. Lernen Sie die Menschen hinter der sozialdemokratischen Politik in Albstadt kennen.',
    canonical: `${BASE_URL}/partei`,
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
  {
    path: '/fraktion',
    title: 'Fraktion – SPD Albstadt',
    description:
      'Die SPD-Gemeinderatsfraktion Albstadt: Mitglieder, Anträge und Haushaltsreden. Unsere Arbeit im Gemeinderat für eine soziale Stadtpolitik.',
    canonical: `${BASE_URL}/fraktion`,
    chunkName: 'Fraktion',
  },
  {
    path: '/kommunalpolitik',
    title: 'Kommunalpolitik – SPD Albstadt',
    description:
      'Kommunalpolitik der SPD Albstadt: Unsere Positionen, Anträge und Initiativen für Albstadt. Für eine lebenswerte Stadt mit sozialer Gerechtigkeit.',
    canonical: `${BASE_URL}/kommunalpolitik`,
    chunkName: 'Kommunalpolitik',
  },
  {
    path: '/historie',
    title: 'Historie – SPD Albstadt',
    description:
      'Die Geschichte der SPD in Albstadt: Von den Anfängen bis heute. Erfahren Sie mehr über die sozialdemokratische Tradition in unserer Stadt.',
    canonical: `${BASE_URL}/historie`,
    chunkName: 'Historie',
  },
  {
    path: '/kontakt',
    title: 'Kontakt – SPD Albstadt',
    description:
      'Kontaktieren Sie die SPD Albstadt: Adresse, Telefonnummer und E-Mail. Wir freuen uns auf Ihre Nachricht und Ihr Engagement.',
    canonical: `${BASE_URL}/kontakt`,
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
  {
    path: '/datenschutz',
    title: 'Datenschutz – SPD Albstadt',
    description:
      'Datenschutzerklärung der SPD Albstadt. Informationen zur Verarbeitung Ihrer personenbezogenen Daten auf unserer Website.',
    canonical: `${BASE_URL}/datenschutz`,
  },
  {
    path: '/impressum',
    title: 'Impressum – SPD Albstadt',
    description:
      'Impressum der SPD Albstadt gemäß § 5 TMG. Angaben zum Verantwortlichen und zur Haftung für Inhalte.',
    canonical: `${BASE_URL}/impressum`,
  },
]
// These chunks are already injected via modulepreload in the main index.html.
const ALREADY_PRELOADED_PREFIXES = [
  'rolldown-runtime',
  'react-vendor',
  'vendor-',
  'framer-motion',
  'lucide-',
  'admin-vendor',
  'index-',
]
// Heavy chunks only loaded on user interaction — never eagerly preload these.
const NEVER_PRELOAD_PREFIXES = ['lightbox', 'calendar', 'AdminApp', 'admin-']
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
function replaceMetaTag(html: string, route: RouteSEO): string {
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${route.title}</title>`)
  html = html.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${route.description}" />`,
  )
  html = html.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${route.canonical}" />`,
  )
  html = html.replace(
    /<link\s+rel="alternate"\s+hreflang="de"\s+href="[^"]*"\s*\/?>/,
    `<link rel="alternate" hreflang="de" href="${route.canonical}" />`,
  )
  html = html.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:url" content="${route.canonical}" />`,
  )
  html = html.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${route.title}" />`,
  )
  html = html.replace(
    /<meta\s+property="og:description"[\s\S]*?\/>/,
    `<meta property="og:description" content="${route.description}" />`,
  )
  html = html.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:title" content="${route.title}" />`,
  )
  html = html.replace(
    /<meta\s+name="twitter:description"[\s\S]*?\/>/,
    `<meta name="twitter:description" content="${route.description}" />`,
  )
  if (route.imagePreloads?.length) {
    const preloadTags = route.imagePreloads
      .map(p => {
        const srcsetAttr = p.imagesrcset ? ` imagesrcset="${p.imagesrcset}"` : ''
        const sizesAttr = p.imagesizes ? ` imagesizes="${p.imagesizes}"` : ''
        return `  <link rel="preload" as="image" href="${p.href}"${srcsetAttr}${sizesAttr} fetchpriority="high" />`
      })
      .join('\n')
    html = html.replace('</head>', `${preloadTags}\n</head>`)
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
      for (const route of ROUTES) {
        const routeDir = resolve(outDir, route.path.slice(1))
        mkdirSync(routeDir, { recursive: true })
        let html = replaceMetaTag(indexHtml, route)
        // Inject modulepreload hints for route-specific lazy chunks.
        // Without this, each lazy chunk requires a separate roundtrip after
        // main JS executes — ~150ms RTT saved per chunk on slow 4G.
        if (route.chunkName) {
          const chunks = findRouteChunks(assetsDir, route.chunkName)
          if (chunks.length > 0) {
            const preloadTags = chunks
              .map(f => `  <link rel="modulepreload" crossorigin href="/assets/${f}">`)
              .join('\n')
            html = html.replace('</head>', `${preloadTags}\n</head>`)
          }
        }
        writeFileSync(resolve(routeDir, 'index.html'), html, 'utf-8')
      }
      console.log('✓ Prerendered', ROUTES.length, 'route HTML shells')
    },
  }
}
