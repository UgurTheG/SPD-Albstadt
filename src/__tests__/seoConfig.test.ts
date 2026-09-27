import { describe, it, expect } from 'vitest'
import { historieSEO, newsSEO, schwerpunktSEO } from '../seoConfig'
import type { NewsItem } from '../types/news'

const news: NewsItem = {
  id: '7',
  uuid: '0255c6ac-b740-498c-8810-8c73afb4bfc5',
  datum: '2025-03-15',
  titel: 'Neue Doppelspitze',
  zusammenfassung: 'Kurzfassung',
  inhalt: 'Text',
  kategorie: 'Ortsverein',
}

describe('newsSEO', () => {
  it('links to the article by uuid', () => {
    const seo = newsSEO(news)
    expect(seo.path).toBe('/aktuelles/0255c6ac-b740-498c-8810-8c73afb4bfc5')
    expect(seo.canonical).toBe(
      'https://www.spd-albstadt.de/aktuelles/0255c6ac-b740-498c-8810-8c73afb4bfc5',
    )
    expect(seo.title).toBe('Neue Doppelspitze – SPD Albstadt')
    expect(seo.description).toBe('Kurzfassung')
  })

  it('falls back to the id when there is no uuid', () => {
    expect(newsSEO({ ...news, uuid: undefined }).path).toBe('/aktuelles/7')
  })

  it('uses the first image as an absolute og:image URL', () => {
    const seo = newsSEO({ ...news, bildUrls: ['/images/news/a.webp', '/images/news/b.webp'] })
    expect(seo.ogImage).toBe('https://www.spd-albstadt.de/images/news/a.webp')
  })

  it('keeps absolute image URLs unchanged', () => {
    expect(newsSEO({ ...news, bildUrl: 'https://cdn.example.org/a.webp' }).ogImage).toBe(
      'https://cdn.example.org/a.webp',
    )
  })

  it('has no og:image without images', () => {
    expect(newsSEO(news).ogImage).toBeUndefined()
  })
})

describe('schwerpunktSEO', () => {
  it('links to the slugified title', () => {
    const seo = schwerpunktSEO({
      titel: 'Mobilität und ÖPNV',
      beschreibung: 'Bus und Bahn',
      icon: 'Bus',
    })
    expect(seo.path).toBe('/partei/mobilitaet-und-oepnv')
    expect(seo.title).toBe('Mobilität und ÖPNV – SPD Albstadt')
    expect(seo.description).toBe('Bus und Bahn')
    expect(seo.ogImage).toBeUndefined()
  })
})

describe('historieSEO', () => {
  const entry = {
    jahr: '1890–1918',
    titel: 'Gründung',
    beschreibung: 'x'.repeat(300),
    bilder: ['/images/historie/1890.webp'],
  }

  it('links to the slugified epoch and includes it in the title', () => {
    const seo = historieSEO(entry)
    expect(seo.path).toBe('/historie/1890-1918')
    expect(seo.title).toBe('Gründung (1890–1918) – SPD Albstadt')
  })

  it('truncates the description to 160 characters', () => {
    expect(historieSEO(entry).description).toHaveLength(160)
  })

  it('uses the first image as og:image', () => {
    expect(historieSEO(entry).ogImage).toBe('https://www.spd-albstadt.de/images/historie/1890.webp')
  })
})
