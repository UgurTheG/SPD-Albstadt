import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'
import { applyMeta } from '../prerenderRoutes'

const indexHtml = readFileSync(resolve(import.meta.dirname, '../../index.html'), 'utf-8')

function parse(html: string) {
  return new DOMParser().parseFromString(html, 'text/html')
}

function content(doc: Document, selector: string) {
  return doc.querySelector(selector)?.getAttribute('content')
}

const meta = {
  title: 'Haushalt 2026 – SPD Albstadt',
  description: 'Unsere Rede zum Haushalt',
  canonical: 'https://www.spd-albstadt.de/aktuelles/abc',
}

describe('applyMeta', () => {
  it('replaces title, description, canonical and social tags in index.html', () => {
    const doc = parse(applyMeta(indexHtml, meta))
    expect(doc.title).toBe(meta.title)
    expect(content(doc, 'meta[name="description"]')).toBe(meta.description)
    expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(meta.canonical)
    expect(doc.querySelector('link[rel="alternate"]')?.getAttribute('href')).toBe(meta.canonical)
    expect(content(doc, 'meta[property="og:url"]')).toBe(meta.canonical)
    expect(content(doc, 'meta[property="og:title"]')).toBe(meta.title)
    expect(content(doc, 'meta[property="og:description"]')).toBe(meta.description)
    expect(content(doc, 'meta[name="twitter:title"]')).toBe(meta.title)
    expect(content(doc, 'meta[name="twitter:description"]')).toBe(meta.description)
  })

  it('keeps the default og:type and image when none are given', () => {
    const doc = parse(applyMeta(indexHtml, meta))
    expect(content(doc, 'meta[property="og:type"]')).toBe('website')
    expect(content(doc, 'meta[property="og:image"]')).toContain('gruppenbild')
    expect(content(doc, 'meta[property="og:image:width"]')).toBe('1200')
  })

  it('sets og:type and swaps the image, dropping the default image size', () => {
    const image = 'https://www.spd-albstadt.de/images/news/rede.webp'
    const doc = parse(applyMeta(indexHtml, { ...meta, ogType: 'article', ogImage: image }))
    expect(content(doc, 'meta[property="og:type"]')).toBe('article')
    expect(content(doc, 'meta[property="og:image"]')).toBe(image)
    expect(content(doc, 'meta[property="og:image:alt"]')).toBe(meta.title)
    expect(content(doc, 'meta[name="twitter:image"]')).toBe(image)
    expect(doc.querySelector('meta[property="og:image:width"]')).toBeNull()
    expect(doc.querySelector('meta[property="og:image:height"]')).toBeNull()
  })

  it('escapes quotes and markup and leaves $ patterns literal', () => {
    const title = 'Mehr "Bus" & <Bahn> für $& 5 $'
    const html = applyMeta(indexHtml, { ...meta, title })
    expect(parse(html).title).toBe(title)
    expect(content(parse(html), 'meta[property="og:title"]')).toBe(title)
    expect(html).not.toContain('<Bahn>')
  })

  it('throws when index.html is missing a tag', () => {
    const withoutTitle = indexHtml.replace(/<title>[^<]*<\/title>/, '')
    expect(() => applyMeta(withoutTitle, meta)).toThrow(/prerender-routes/)
  })
})
