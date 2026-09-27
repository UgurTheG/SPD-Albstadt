import { afterEach, describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HelmetProvider } from 'react-helmet-async'
import { SWRConfig } from 'swr'
import { SchwerpunktSheet } from '../SchwerpunktSheet'
import type { NewsItem } from '@/types/news'
import type { Schwerpunkt } from '../types'

const news: NewsItem[] = [
  {
    id: '1',
    datum: '2026-02-01',
    titel: 'Neue Kitaplätze in Ebingen',
    zusammenfassung: 'Der Gemeinderat stimmt zu.',
    inhalt: '',
    kategorie: 'Gemeinderat',
  },
  {
    id: '2',
    datum: '2026-03-01',
    titel: 'Haushaltsrede 2026',
    zusammenfassung: 'Unsere Schwerpunkte für den Haushalt.',
    inhalt: '',
    kategorie: 'Haushalt',
  },
]

const item: Schwerpunkt = {
  titel: 'Bildung und Jugend',
  beschreibung: 'Gute Bildung für alle.',
  icon: 'GraduationCap',
  newsSchlagwort: 'Kita',
}

function renderSheet() {
  return render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <HelmetProvider>
        <SchwerpunktSheet item={item} onClose={() => {}} />
      </HelmetProvider>
    </SWRConfig>,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('SchwerpunktSheet', () => {
  it('lists news articles matching the Schwerpunkt keyword', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(news))
    renderSheet()

    expect(await screen.findByText('Verwandte Artikel')).toBeInTheDocument()
    expect(screen.getByText('Neue Kitaplätze in Ebingen')).toBeInTheDocument()
    expect(screen.queryByText('Haushaltsrede 2026')).not.toBeInTheDocument()
  })
})
