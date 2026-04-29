import { type Plugin } from 'vite'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve } from 'path'

/**
 * Generates prerendered HTML shells for each route at build time.
 * These replace the generic index.html meta tags with per-route SEO tags,
 * so crawlers that don't execute JS still get correct titles, descriptions, and OG data.
 *
 * This is NOT full SSR — the page content is still rendered client-side.
 * But for SEO, the <head> is what matters most.
 */

interface RouteSEO {
  path: string
  title: string
  description: string
  canonical: string
}

const BASE_URL = 'https://www.spd-albstadt.de'

const ROUTES: RouteSEO[] = [
  {
    path: '/aktuelles',
    title: 'Aktuelles – SPD Albstadt',
    description:
      'Aktuelle Nachrichten, Pressemitteilungen und Neuigkeiten der SPD Albstadt. Bleiben Sie informiert über die Stadtpolitik in Albstadt.',
    canonical: `${BASE_URL}/aktuelles`,
  },
  {
    path: '/partei',
    title: 'Partei – SPD Albstadt',
    description:
      'Der SPD Ortsverein Albstadt: Vorstand, Mitglieder und Persönlichkeiten. Lernen Sie die Menschen hinter der sozialdemokratischen Politik in Albstadt kennen.',
    canonical: `${BASE_URL}/partei`,
  },
  {
    path: '/fraktion',
    title: 'Fraktion – SPD Albstadt',
    description:
      'Die SPD-Gemeinderatsfraktion Albstadt: Mitglieder, Anträge und Haushaltsreden. Unsere Arbeit im Gemeinderat für eine soziale Stadtpolitik.',
    canonical: `${BASE_URL}/fraktion`,
  },
  {
    path: '/kommunalpolitik',
    title: 'Kommunalpolitik – SPD Albstadt',
    description:
      'Kommunalpolitik der SPD Albstadt: Unsere Positionen, Anträge und Initiativen für Albstadt. Für eine lebenswerte Stadt mit sozialer Gerechtigkeit.',
    canonical: `${BASE_URL}/kommunalpolitik`,
  },
  {
    path: '/historie',
    title: 'Historie – SPD Albstadt',
    description:
      'Die Geschichte der SPD in Albstadt: Von den Anfängen bis heute. Erfahren Sie mehr über die sozialdemokratische Tradition in unserer Stadt.',
    canonical: `${BASE_URL}/historie`,
  },
  {
    path: '/kontakt',
    title: 'Kontakt – SPD Albstadt',
    description:
      'Kontaktieren Sie die SPD Albstadt: Adresse, Telefonnummer und E-Mail. Wir freuen uns auf Ihre Nachricht und Ihr Engagement.',
    canonical: `${BASE_URL}/kontakt`,
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

function replaceMetaTag(html: string, route: RouteSEO): string {
  // Replace <title>
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${route.title}</title>`)

  // Replace meta description
  html = html.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${route.description}" />`,
  )

  // Replace canonical
  html = html.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${route.canonical}" />`,
  )

  // Replace hreflang
  html = html.replace(
    /<link\s+rel="alternate"\s+hreflang="de"\s+href="[^"]*"\s*\/?>/,
    `<link rel="alternate" hreflang="de" href="${route.canonical}" />`,
  )

  // Replace OG tags
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

  // Replace Twitter tags
  html = html.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:title" content="${route.title}" />`,
  )
  html = html.replace(
    /<meta\s+name="twitter:description"[\s\S]*?\/>/,
    `<meta name="twitter:description" content="${route.description}" />`,
  )

  return html
}

export function prerenderRoutes(): Plugin {
  return {
    name: 'prerender-routes',
    closeBundle() {
      const outDir = resolve(process.cwd(), 'dist')
      const indexHtml = readFileSync(resolve(outDir, 'index.html'), 'utf-8')

      for (const route of ROUTES) {
        const routeDir = resolve(outDir, route.path.slice(1)) // e.g. dist/aktuelles
        mkdirSync(routeDir, { recursive: true })
        const html = replaceMetaTag(indexHtml, route)
        writeFileSync(resolve(routeDir, 'index.html'), html, 'utf-8')
      }

      console.log('✓ Prerendered', ROUTES.length, 'route HTML shells')
    },
  }
}
