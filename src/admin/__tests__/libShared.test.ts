/**
 * Tests for the shared admin lib helpers:
 * - lib/json.ts — deepEqual, deepClone, getAtPath, setAtPath, setAtPathImmutable
 * - lib/images.ts — collectAllReferencedPaths, resolvePendingPreview
 */
import { describe, it, expect } from 'vitest'
import {
  deepEqual,
  deepClone,
  getAtPath,
  setAtPath,
  setAtPathImmutable,
} from '../../admin/lib/json'
import { collectAllReferencedPaths, resolvePendingPreview } from '../../admin/lib/images'
import type { PendingUpload } from '../../admin/types'

// ─── deepEqual ────────────────────────────────────────────────────────────────

describe('deepEqual', () => {
  it('compares primitives strictly', () => {
    expect(deepEqual(1, 1)).toBe(true)
    expect(deepEqual('a', 'b')).toBe(false)
    expect(deepEqual(1, '1')).toBe(false)
  })

  it('treats null and undefined as distinct from values', () => {
    expect(deepEqual(null, null)).toBe(true)
    expect(deepEqual(undefined, undefined)).toBe(true)
    expect(deepEqual(null, undefined)).toBe(false)
    expect(deepEqual(null, 0)).toBe(false)
  })

  it('compares objects and arrays structurally', () => {
    expect(deepEqual({ a: [1, 2] }, { a: [1, 2] })).toBe(true)
    expect(deepEqual({ a: [1, 2] }, { a: [2, 1] })).toBe(false)
    expect(deepEqual([], [])).toBe(true)
  })
})

// ─── deepClone ────────────────────────────────────────────────────────────────

describe('deepClone', () => {
  it('returns undefined for undefined', () => {
    expect(deepClone(undefined)).toBeUndefined()
  })

  it('produces an independent deep copy', () => {
    const src = { a: { b: [1, 2, 3] } }
    const copy = deepClone(src)
    expect(copy).toEqual(src)
    copy.a.b.push(4)
    expect(src.a.b).toEqual([1, 2, 3])
  })
})

// ─── getAtPath / setAtPath / setAtPathImmutable ───────────────────────────────

describe('getAtPath', () => {
  it('reads nested values by mixed string/number path', () => {
    const root = { jahre: [{ dokumente: [{ url: '/documents/a.pdf' }] }] }
    expect(getAtPath(root, ['jahre', 0, 'dokumente', 0, 'url'])).toBe('/documents/a.pdf')
  })

  it('returns undefined when a segment is missing', () => {
    expect(getAtPath({ a: 1 }, ['b', 'c'])).toBeUndefined()
  })
})

describe('setAtPath', () => {
  it('mutates the target in place', () => {
    const root: Record<string, unknown> = { a: { b: 1 } }
    setAtPath(root, ['a', 'b'], 2)
    expect(root).toEqual({ a: { b: 2 } })
  })

  it('creates intermediate containers based on the next segment type', () => {
    const root: Record<string, unknown> = {}
    setAtPath(root, ['list', 0, 'name'], 'x')
    expect(root).toEqual({ list: [{ name: 'x' }] })
  })
})

describe('setAtPathImmutable', () => {
  it('returns the value itself for an empty path', () => {
    expect(setAtPathImmutable({ a: 1 }, [], 'replaced')).toBe('replaced')
  })

  it('replaces a nested value without mutating the original', () => {
    const root = { a: { b: 1 }, untouched: { c: 2 } }
    const next = setAtPathImmutable(root, ['a', 'b'], 9) as typeof root
    expect(next.a.b).toBe(9)
    expect(root.a.b).toBe(1)
    // Untouched branches are shared, not cloned
    expect(next.untouched).toBe(root.untouched)
  })

  it('preserves arrays along the path', () => {
    const root = { items: [{ v: 1 }, { v: 2 }] }
    const next = setAtPathImmutable(root, ['items', 1, 'v'], 5) as typeof root
    expect(Array.isArray(next.items)).toBe(true)
    expect(next.items[1].v).toBe(5)
    expect(root.items[1].v).toBe(2)
  })
})

// ─── collectAllReferencedPaths ────────────────────────────────────────────────

describe('collectAllReferencedPaths', () => {
  it('collects image paths across multiple tabs', () => {
    const state = {
      news: [{ titel: 'a', bildUrl: '/images/news/a.webp' }],
      party: {
        vorstand: [{ name: 'B', bildUrl: '/images/vorstand/b.webp' }],
      },
    }
    const paths = collectAllReferencedPaths(state)
    expect(paths.has('/images/news/a.webp')).toBe(true)
    expect(paths.has('/images/vorstand/b.webp')).toBe(true)
  })

  it('skips tabs with no loaded data', () => {
    expect(collectAllReferencedPaths({}).size).toBe(0)
  })
})

// ─── resolvePendingPreview ────────────────────────────────────────────────────

describe('resolvePendingPreview', () => {
  const uploads: PendingUpload[] = [
    { ghPath: 'public/images/news/x.webp', base64: 'QUJD', message: 'm' },
  ]

  it('returns a data URI for a pending upload path', () => {
    expect(resolvePendingPreview(uploads, '/images/news/x.webp')).toBe(
      'data:image/webp;base64,QUJD',
    )
  })

  it('returns the URL unchanged when no upload matches', () => {
    expect(resolvePendingPreview(uploads, '/images/news/other.webp')).toBe(
      '/images/news/other.webp',
    )
  })

  it('passes falsy URLs through unchanged', () => {
    expect(resolvePendingPreview(uploads, '')).toBe('')
  })
})
