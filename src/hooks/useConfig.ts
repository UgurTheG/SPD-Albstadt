import {useData} from './useData'

export interface SiteConfig {
    icsUrl?: string
    features?: {
        instagramFeed?: boolean
        fraktionNews?: boolean
    }
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
    const {data} = useData<SiteConfig>('/data/config.json')
    return data
}

