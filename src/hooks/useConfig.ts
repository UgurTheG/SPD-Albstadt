import { useData } from './useData'

// ── Shapes of the individual data files ────────────────────────────────────

interface AppFileData {
  icsUrl?: string
  elfsightAppId?: string
  features?: Record<string, never>
}

interface StartseiteFileData {
  heroSlogan?: string
  heroBadge?: string
}

interface KontaktFileData {
  adresse?: string
  email?: string
  telefon?: string
  formspreeUrl?: string
  gruppenbild?: string
  footerBeschreibung?: string
  facebookUrl?: string
  instagramUrl?: string
  buerozeiten?: { tage: string; zeit: string }[]
}

// ── Public interface (same shape as before so all consumers stay unchanged) ─

export interface SiteConfig {
  icsUrl?: string
  elfsightAppId?: string
  heroSlogan?: string
  heroBadge?: string
  footerBeschreibung?: string
  features?: Record<string, never>
  kontakt?: {
    adresse?: string
    email?: string
    telefon?: string
    formspreeUrl?: string
    gruppenbild?: string
  }
  buerozeiten?: { tage: string; zeit: string }[]
  social?: {
    facebookUrl?: string
    instagramUrl?: string
  }
}

export function useConfig(): SiteConfig | null {
  const { data: appData } = useData<AppFileData>('/data/config.json')
  const { data: startseiteData } = useData<StartseiteFileData>('/data/startseite.json')
  const { data: kontaktData } = useData<KontaktFileData>('/data/kontakt.json')

  if (!appData && !startseiteData && !kontaktData) return null

  return {
    ...appData,
    heroSlogan: startseiteData?.heroSlogan,
    heroBadge: startseiteData?.heroBadge,
    footerBeschreibung: kontaktData?.footerBeschreibung,
    kontakt: kontaktData
      ? {
          adresse: kontaktData.adresse,
          email: kontaktData.email,
          telefon: kontaktData.telefon,
          formspreeUrl: kontaktData.formspreeUrl,
          gruppenbild: kontaktData.gruppenbild,
        }
      : undefined,
    buerozeiten: kontaktData?.buerozeiten,
    social: kontaktData
      ? {
          facebookUrl: kontaktData.facebookUrl,
          instagramUrl: kontaktData.instagramUrl,
        }
      : undefined,
  }
}
