import { describe, it, expect } from 'vitest'
import { findRelatedNews, type NewsItem } from '../news'

function news(id: string, fields: Partial<NewsItem> = {}): NewsItem {
  return {
    id,
    datum: '2025-01-01',
    titel: `Titel ${id}`,
    zusammenfassung: '',
    inhalt: '',
    kategorie: 'Ortsverein',
    ...fields,
  }
}

describe('findRelatedNews', () => {
  const items = [
    news('1', { titel: 'Neue Talgangbahn-Haltestelle' }),
    news('2', { zusammenfassung: 'Ausbau der TALGANGBAHN beschlossen' }),
    news('3', { inhalt: 'Die Talgangbahn fährt ab Herbst öfter.' }),
    news('4', { titel: 'Haushalt 2025' }),
  ]

  it('matches title, summary and body case-insensitively', () => {
    expect(findRelatedNews(items, 'talgangbahn', 10).map(n => n.id)).toEqual(['1', '2', '3'])
  })

  it('keeps feed order and caps the result at two by default', () => {
    expect(findRelatedNews(items, 'Talgangbahn').map(n => n.id)).toEqual(['1', '2'])
  })

  it('returns nothing for a blank keyword', () => {
    expect(findRelatedNews(items, '   ')).toEqual([])
  })

  it('tolerates items with missing text fields', () => {
    const partial = { ...news('5'), inhalt: undefined } as unknown as NewsItem
    expect(findRelatedNews([partial], 'Titel 5').map(n => n.id)).toEqual(['5'])
  })
})
