import { describe, it, expect } from 'vitest'
import { collectImagePaths } from '../../admin/lib/images'

// ─── collectImagePaths ────────────────────────────────────────────────────────

describe('collectImagePaths — array tab with image fields', () => {
  const tab = { type: 'array', fields: [{ key: 'bildUrl', type: 'image' }] }

  it('collects image paths from array items', () => {
    const data = [{ bildUrl: '/images/news/a.webp' }, { bildUrl: '/images/news/b.webp' }]
    const paths = collectImagePaths(tab, data as never)
    expect(paths.has('/images/news/a.webp')).toBe(true)
    expect(paths.has('/images/news/b.webp')).toBe(true)
  })

  it('ignores non-/images/ values', () => {
    const data = [{ bildUrl: 'https://external.com/a.jpg' }]
    const paths = collectImagePaths(tab, data as never)
    expect(paths.size).toBe(0)
  })

  it('returns an empty set for an empty array', () => {
    expect(collectImagePaths(tab, [] as never).size).toBe(0)
  })
})

describe('collectImagePaths — array tab with imagelist field', () => {
  const tab = { type: 'array', fields: [{ key: 'galerie', type: 'imagelist' }] }

  it('collects each url from an imagelist', () => {
    const data = [{ galerie: ['/images/a.webp', '/images/b.webp', 'https://skip.me/x.jpg'] }]
    const paths = collectImagePaths(tab, data as never)
    expect(paths.has('/images/a.webp')).toBe(true)
    expect(paths.has('/images/b.webp')).toBe(true)
    expect(paths.size).toBe(2)
  })
})

describe('collectImagePaths — object tab with topFields', () => {
  const tab = {
    type: 'object',
    topFields: [{ key: 'heroImage', type: 'image' }],
  }

  it('scans top-level image fields', () => {
    const data = { heroImage: '/images/hero.webp' }
    const paths = collectImagePaths(tab, data as never)
    expect(paths.has('/images/hero.webp')).toBe(true)
  })
})

describe('collectImagePaths — object tab with sections', () => {
  const tab = {
    type: 'object',
    sections: [
      {
        key: 'mitglieder',
        fields: [{ key: 'bildUrl', type: 'image' }],
        isSingleObject: false,
      },
    ],
  }

  it('scans section array items', () => {
    const data = { mitglieder: [{ bildUrl: '/images/person/x.webp' }] }
    const paths = collectImagePaths(tab, data as never)
    expect(paths.has('/images/person/x.webp')).toBe(true)
  })

  it('handles missing section key gracefully', () => {
    const paths = collectImagePaths(tab, {} as never)
    expect(paths.size).toBe(0)
  })
})

describe('collectImagePaths — object tab with isSingleObject section', () => {
  const tab = {
    type: 'object',
    sections: [
      {
        key: 'kontakt',
        fields: [{ key: 'foto', type: 'image' }],
        isSingleObject: true,
      },
    ],
  }

  it('scans the single-object section', () => {
    const data = { kontakt: { foto: '/images/kontakt/k.webp' } }
    const paths = collectImagePaths(tab, data as never)
    expect(paths.has('/images/kontakt/k.webp')).toBe(true)
  })

  it('skips falsy single-object section values', () => {
    const paths = collectImagePaths(tab, { kontakt: null } as never)
    expect(paths.size).toBe(0)
  })
})

describe('collectImagePaths — kommunalpolitik tab', () => {
  const tab = { type: 'kommunalpolitik' }

  it('collects gemeinderaete and kreisraete images from jahre', () => {
    const data = {
      jahre: [
        {
          jahr: 2026,
          gemeinderaete: [{ bildUrl: '/images/gemeinderaete/a.webp' }],
          kreisraete: [{ bildUrl: '/images/kreisraete/b.webp' }],
          dokumente: [],
        },
      ],
    }
    const paths = collectImagePaths(tab, data as never)
    expect(paths.has('/images/gemeinderaete/a.webp')).toBe(true)
    expect(paths.has('/images/kreisraete/b.webp')).toBe(true)
  })

  it('collects dokument URLs starting with /dokumente/', () => {
    const data = {
      jahre: [
        {
          gemeinderaete: [],
          kreisraete: [],
          dokumente: [{ url: '/dokumente/bericht.pdf' }, { url: 'https://skip.me' }],
        },
      ],
    }
    const paths = collectImagePaths(tab, data as never)
    expect(paths.has('/dokumente/bericht.pdf')).toBe(true)
    expect(paths.size).toBe(1)
  })

  it('handles missing jahre gracefully', () => {
    const paths = collectImagePaths(tab, {} as never)
    expect(paths.size).toBe(0)
  })
})
