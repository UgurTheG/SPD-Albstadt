import { afterEach, describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { SWRConfig } from 'swr'
import type { NewsItem } from '@/types/news'
import { SchwerpunktSheet } from '../SchwerpunktSheet'
import type { Schwerpunkt } from '../types'

const NEWS: NewsItem[] = [
  {
    id: '7',
    uuid: 'abc-123',
    datum: '2025-03-15',
    titel: 'Talgangbahn kommt voran',
    zusammenfassung: 'Neue Haltestellen geplant.',
    inhalt: '',
    kategorie: 'Gemeinderat',
  },
]

const ITEM: Schwerpunkt = {
  titel: 'Mobilität und ÖPNV',
  beschreibung: 'Bus und Bahn für alle.',
  icon: 'Bus',
  newsSchlagwort: 'Talgangbahn',
}

function renderSheet() {
  return render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <HelmetProvider>
        <MemoryRouter>
          <SchwerpunktSheet item={ITEM} onClose={() => {}} />
        </MemoryRouter>
      </HelmetProvider>
    </SWRConfig>,
  )
}

describe('SchwerpunktSheet – Verwandte Artikel', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('lists matching articles from news.json (a top-level array) as links', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () => new Response(JSON.stringify(NEWS), { status: 200 }),
    )
    renderSheet()

    expect(await screen.findByText('Verwandte Artikel')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /Talgangbahn kommt voran/ })
    expect(link).toHaveAttribute('href', '/aktuelles/abc-123')
  })

  it('renders no section when nothing matches', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () => new Response(JSON.stringify([]), { status: 200 }),
    )
    renderSheet()

    expect(await screen.findByText('Mobilität und ÖPNV')).toBeInTheDocument()
    expect(screen.queryByText('Verwandte Artikel')).not.toBeInTheDocument()
  })
})
