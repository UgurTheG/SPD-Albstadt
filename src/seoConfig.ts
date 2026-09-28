// Per-route SEO metadata
// Single source of truth for meta tags used by <SEOHead>, <DeepLinkHead> and the
// build plugins that prerender route HTML shells and the sitemap. The plugins load
// this file through vite.config.ts, where the `@/` alias is not available — keep
// imports relative.

import { getNewsImages, type NewsItem } from './types/news'
import { slugify } from './utils/slugify'
import type { Schwerpunkt } from './components/sections/Partei/types'
import type { TimelineEntry } from './components/sections/Historie/types'

export interface SEOMeta {
  title: string
  description: string
  canonical: string
  ogImage?: string
  ogImageWidth?: number
  ogImageHeight?: number
  changefreq: 'daily' | 'weekly' | 'monthly' | 'yearly'
  priority: number
}

const BASE_URL = 'https://www.spd-albstadt.de'
const DEFAULT_OG_IMAGE = `${BASE_URL}/images/kontakt/gruppenbild.webp`
const DEFAULT_OG_IMAGE_WIDTH = 1200
const DEFAULT_OG_IMAGE_HEIGHT = 630

export const SEO_CONFIG: Record<string, SEOMeta> = {
  '/': {
    title: 'SPD Albstadt – Für eine gerechte Stadtpolitik',
    description:
      'SPD Albstadt – Sozialdemokratische Partei Deutschlands, Ortsverein Albstadt. Aktuelle Nachrichten, Termine, Gemeinderat und Geschichte der SPD in Albstadt.',
    canonical: `${BASE_URL}/`,
    ogImage: DEFAULT_OG_IMAGE,
    ogImageWidth: DEFAULT_OG_IMAGE_WIDTH,
    ogImageHeight: DEFAULT_OG_IMAGE_HEIGHT,
    changefreq: 'weekly',
    priority: 1.0,
  },
  '/aktuelles': {
    title: 'Aktuelles – SPD Albstadt',
    description:
      'Aktuelle Nachrichten, Pressemitteilungen und Neuigkeiten der SPD Albstadt. Bleiben Sie informiert über die Stadtpolitik in Albstadt.',
    canonical: `${BASE_URL}/aktuelles`,
    ogImage: DEFAULT_OG_IMAGE,
    ogImageWidth: DEFAULT_OG_IMAGE_WIDTH,
    ogImageHeight: DEFAULT_OG_IMAGE_HEIGHT,
    changefreq: 'daily',
    priority: 0.9,
  },
  '/partei': {
    title: 'Partei – SPD Albstadt',
    description:
      'Der SPD Ortsverein Albstadt: Vorstand, Mitglieder und Persönlichkeiten. Lernen Sie die Menschen hinter der sozialdemokratischen Politik in Albstadt kennen.',
    canonical: `${BASE_URL}/partei`,
    ogImage: DEFAULT_OG_IMAGE,
    ogImageWidth: DEFAULT_OG_IMAGE_WIDTH,
    ogImageHeight: DEFAULT_OG_IMAGE_HEIGHT,
    changefreq: 'monthly',
    priority: 0.8,
  },
  '/fraktion': {
    title: 'Fraktion – SPD Albstadt',
    description:
      'Die SPD-Gemeinderatsfraktion Albstadt: Mitglieder, Anträge und Haushaltsreden. Unsere Arbeit im Gemeinderat für eine soziale Stadtpolitik.',
    canonical: `${BASE_URL}/fraktion`,
    ogImage: DEFAULT_OG_IMAGE,
    ogImageWidth: DEFAULT_OG_IMAGE_WIDTH,
    ogImageHeight: DEFAULT_OG_IMAGE_HEIGHT,
    changefreq: 'monthly',
    priority: 0.8,
  },
  '/kommunalpolitik': {
    title: 'Kommunalpolitik – SPD Albstadt',
    description:
      'Kommunalpolitik der SPD Albstadt: Unsere Positionen, Anträge und Initiativen für Albstadt. Für eine lebenswerte Stadt mit sozialer Gerechtigkeit.',
    canonical: `${BASE_URL}/kommunalpolitik`,
    ogImage: DEFAULT_OG_IMAGE,
    ogImageWidth: DEFAULT_OG_IMAGE_WIDTH,
    ogImageHeight: DEFAULT_OG_IMAGE_HEIGHT,
    changefreq: 'monthly',
    priority: 0.7,
  },
  '/historie': {
    title: 'Historie – SPD Albstadt',
    description:
      'Die Geschichte der SPD in Albstadt: Von den Anfängen bis heute. Erfahren Sie mehr über die sozialdemokratische Tradition in unserer Stadt.',
    canonical: `${BASE_URL}/historie`,
    ogImage: DEFAULT_OG_IMAGE,
    ogImageWidth: DEFAULT_OG_IMAGE_WIDTH,
    ogImageHeight: DEFAULT_OG_IMAGE_HEIGHT,
    changefreq: 'yearly',
    priority: 0.6,
  },
  '/kontakt': {
    title: 'Kontakt – SPD Albstadt',
    description:
      'Kontaktieren Sie die SPD Albstadt: Adresse, Telefonnummer und E-Mail. Wir freuen uns auf Ihre Nachricht und Ihr Engagement.',
    canonical: `${BASE_URL}/kontakt`,
    ogImage: DEFAULT_OG_IMAGE,
    ogImageWidth: DEFAULT_OG_IMAGE_WIDTH,
    ogImageHeight: DEFAULT_OG_IMAGE_HEIGHT,
    changefreq: 'monthly',
    priority: 0.7,
  },
  '/datenschutz': {
    title: 'Datenschutz – SPD Albstadt',
    description:
      'Datenschutzerklärung der SPD Albstadt. Informationen zur Verarbeitung Ihrer personenbezogenen Daten auf unserer Website.',
    canonical: `${BASE_URL}/datenschutz`,
    ogImage: DEFAULT_OG_IMAGE,
    ogImageWidth: DEFAULT_OG_IMAGE_WIDTH,
    ogImageHeight: DEFAULT_OG_IMAGE_HEIGHT,
    changefreq: 'yearly',
    priority: 0.3,
  },
  '/impressum': {
    title: 'Impressum – SPD Albstadt',
    description:
      'Impressum der SPD Albstadt gemäß § 5 TMG. Angaben zum Verantwortlichen und zur Haftung für Inhalte.',
    canonical: `${BASE_URL}/impressum`,
    ogImage: DEFAULT_OG_IMAGE,
    ogImageWidth: DEFAULT_OG_IMAGE_WIDTH,
    ogImageHeight: DEFAULT_OG_IMAGE_HEIGHT,
    changefreq: 'yearly',
    priority: 0.3,
  },
}

/** Head metadata for a URL that opens a detail sheet (news article, Schwerpunkt, Historie epoch). */
export interface DeepLinkSEO {
  path: string
  canonical: string
  title: string
  description: string
  ogImage?: string
}

function deepLink(path: string, title: string, description: string, image?: string): DeepLinkSEO {
  return {
    path,
    canonical: `${BASE_URL}${path}`,
    title: `${title} – SPD Albstadt`,
    description,
    ogImage: image ? (image.startsWith('http') ? image : `${BASE_URL}${image}`) : undefined,
  }
}

export function newsSEO(news: NewsItem): DeepLinkSEO {
  return deepLink(
    `/aktuelles/${news.uuid ?? news.id}`,
    news.titel,
    news.zusammenfassung,
    getNewsImages(news).urls[0],
  )
}

export function schwerpunktSEO(item: Schwerpunkt): DeepLinkSEO {
  return deepLink(`/partei/${slugify(item.titel)}`, item.titel, item.beschreibung)
}

export function historieSEO(entry: TimelineEntry): DeepLinkSEO {
  return deepLink(
    `/historie/${slugify(entry.jahr)}`,
    `${entry.titel} (${entry.jahr})`,
    entry.beschreibung.slice(0, 160),
    entry.bilder?.[0],
  )
}
