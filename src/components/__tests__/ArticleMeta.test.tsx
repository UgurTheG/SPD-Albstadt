import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { HelmetProvider } from 'react-helmet-async'
import ArticleMeta from '../ArticleMeta'

function meta(selector: string) {
  return document.head.querySelector(selector)?.getAttribute('content')
}

function renderMeta(props: Parameters<typeof ArticleMeta>[0]) {
  render(
    <HelmetProvider>
      <ArticleMeta {...props} />
    </HelmetProvider>,
  )
}

describe('ArticleMeta', () => {
  it('sets title, description and the canonical deep link', () => {
    renderMeta({ title: 'Haushalt 2025', description: 'Unsere Rede.', path: '/aktuelles/abc' })

    expect(document.title).toBe('Haushalt 2025 – SPD Albstadt')
    expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://www.spd-albstadt.de/aktuelles/abc',
    )
    expect(meta('meta[property="og:url"]')).toBe('https://www.spd-albstadt.de/aktuelles/abc')
    expect(meta('meta[property="og:type"]')).toBe('article')
    expect(meta('meta[name="description"]')).toBe('Unsere Rede.')
  })

  it('uses a summary card and no image tags without an image', () => {
    renderMeta({ title: 'T', description: 'D', path: '/partei/x' })

    expect(meta('meta[name="twitter:card"]')).toBe('summary')
    expect(document.head.querySelector('meta[property="og:image"]')).toBeNull()
  })

  it('makes a site-relative image absolute and uses a large card', () => {
    renderMeta({ title: 'T', description: 'D', path: '/a', image: '/images/news/a.webp' })

    expect(meta('meta[property="og:image"]')).toBe('https://www.spd-albstadt.de/images/news/a.webp')
    expect(meta('meta[name="twitter:card"]')).toBe('summary_large_image')
  })

  it('keeps an absolute image URL unchanged', () => {
    renderMeta({ title: 'T', description: 'D', path: '/a', image: 'https://cdn.example/a.jpg' })

    expect(meta('meta[name="twitter:image"]')).toBe('https://cdn.example/a.jpg')
  })
})
