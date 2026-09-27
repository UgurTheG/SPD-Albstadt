import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HelmetProvider } from 'react-helmet-async'
import type { NewsItem } from '@/types/news'
import NewsDetailSheet from '../NewsDetailSheet'

const news: NewsItem = {
  id: '1',
  uuid: '89e3cd97-1c45-4946-a03a-e0d3637eba07',
  datum: '2025-03-15',
  titel: 'Ein Jahr Stadtverband',
  zusammenfassung: 'Der Stadtverband blickt zurück.',
  inhalt: 'Einleitung.\n\n## Talgangbahn\nDie Bahn kommt.\n\n- Wohnen\n- ÖPNV',
  kategorie: 'Ortsverein',
}

function renderSheet(item: NewsItem = news) {
  return render(
    <HelmetProvider>
      <NewsDetailSheet news={item} />
    </HelmetProvider>,
  )
}

describe('NewsDetailSheet', () => {
  it('renders the title as the article heading with a structured body', () => {
    renderSheet()
    expect(screen.getByRole('article')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Ein Jahr Stadtverband' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Talgangbahn' })).toBeInTheDocument()
    expect(screen.getByRole('list')).toHaveTextContent('WohnenÖPNV')
  })

  it('shows date, category and reading time', () => {
    renderSheet()
    expect(screen.getByText('15. März 2025')).toHaveAttribute('dateTime', '2025-03-15')
    expect(screen.getByText('Ortsverein')).toBeInTheDocument()
    expect(screen.getByText(/1 Min\. Lesezeit/)).toBeInTheDocument()
  })

  it('offers sharing at the top and at the end of the article', () => {
    renderSheet()
    expect(screen.getAllByRole('button', { name: 'Beitrag teilen' })).toHaveLength(2)
  })

  it('renders only the summary when there is no body text', () => {
    const { container } = renderSheet({ ...news, inhalt: '' })
    expect(screen.queryByRole('heading', { level: 3 })).toBeNull()
    expect(container.querySelectorAll('p')).toHaveLength(1)
    expect(screen.getByText('Der Stadtverband blickt zurück.')).toBeInTheDocument()
  })
})
