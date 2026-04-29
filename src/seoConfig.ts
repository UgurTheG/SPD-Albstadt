// Per-route SEO metadata
// Single source of truth for meta tags used by <SEOHead> and sitemap generation.

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

export const SEO_ROUTES = Object.keys(SEO_CONFIG)
export const BASE_URL_EXPORT = BASE_URL
