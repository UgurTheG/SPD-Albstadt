import { describe, it, expect } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { HelmetProvider } from 'react-helmet-async'
import DeepLinkHead from '../DeepLinkHead'

describe('DeepLinkHead', () => {
  it('sets the document title and article meta tags', async () => {
    render(
      <HelmetProvider>
        <DeepLinkHead
          seo={{
            path: '/partei/bildung',
            canonical: 'https://www.spd-albstadt.de/partei/bildung',
            title: 'Bildung – SPD Albstadt',
            description: 'Kitas und Schulen',
          }}
        />
      </HelmetProvider>,
    )

    await waitFor(() => expect(document.title).toBe('Bildung – SPD Albstadt'))
    expect(document.head.querySelector('meta[property="og:type"]')?.getAttribute('content')).toBe(
      'article',
    )
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://www.spd-albstadt.de/partei/bildung',
    )
    expect(document.head.querySelector('meta[property="og:image"]')).toBeNull()
  })
})
