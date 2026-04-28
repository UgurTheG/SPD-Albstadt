import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  DRAFT_KEY,
  PENDING_KEY,
  simpleHash,
  persistDirtyState,
  restoreDrafts,
  removeDraft,
  persistPendingUploads,
  restorePendingUploads,
  resetPersistenceState,
} from '../../admin/store/persistence'
import type { PendingUpload } from '../../admin/types'

// Minimal TABS-shaped objects used to exercise persistDirtyState
// (the function checks TABS internally — we import the real module).

describe('simpleHash', () => {
  it('returns the same hash for the same input', () => {
    expect(simpleHash('hello')).toBe(simpleHash('hello'))
  })

  it('returns different hashes for different inputs', () => {
    expect(simpleHash('abc')).not.toBe(simpleHash('xyz'))
  })

  it('handles empty string without throwing', () => {
    expect(typeof simpleHash('')).toBe('string')
  })

  it('is deterministic across calls', () => {
    const h1 = simpleHash(JSON.stringify({ foo: 1, bar: [1, 2, 3] }))
    const h2 = simpleHash(JSON.stringify({ foo: 1, bar: [1, 2, 3] }))
    expect(h1).toBe(h2)
  })
})

describe('persistPendingUploads / restorePendingUploads', () => {
  beforeEach(() => localStorage.clear())

  const upload: PendingUpload = {
    ghPath: 'public/images/test.webp',
    base64: 'abc123',
    message: 'admin: test',
    tabKey: 'news',
  }

  it('persists and restores uploads', () => {
    persistPendingUploads([upload])
    expect(restorePendingUploads()).toEqual([upload])
  })

  it('removes the key when the array is empty', () => {
    persistPendingUploads([upload])
    persistPendingUploads([])
    expect(localStorage.getItem(PENDING_KEY)).toBeNull()
  })

  it('returns [] when nothing is stored', () => {
    expect(restorePendingUploads()).toEqual([])
  })

  it('returns [] when stored value is malformed JSON', () => {
    localStorage.setItem(PENDING_KEY, 'not-json')
    expect(restorePendingUploads()).toEqual([])
  })
})

describe('removeDraft', () => {
  beforeEach(() => localStorage.clear())

  it('removes only the specified tab key', () => {
    const drafts = {
      news: { data: [], originalHash: 'h1' },
      party: { data: {}, originalHash: 'h2' },
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts))

    removeDraft('news')

    const stored = JSON.parse(localStorage.getItem(DRAFT_KEY)!)
    expect(stored.news).toBeUndefined()
    expect(stored.party).toBeDefined()
  })

  it('removes the localStorage key entirely when the last draft is deleted', () => {
    const drafts = { news: { data: [], originalHash: 'h1' } }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts))

    removeDraft('news')

    expect(localStorage.getItem(DRAFT_KEY)).toBeNull()
  })

  it('is a no-op when the key does not exist in drafts', () => {
    const drafts = { party: { data: {}, originalHash: 'h2' } }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts))

    removeDraft('news') // 'news' is not in drafts

    const stored = JSON.parse(localStorage.getItem(DRAFT_KEY)!)
    expect(stored.party).toBeDefined()
  })

  it('is a no-op when localStorage is empty', () => {
    expect(() => removeDraft('news')).not.toThrow()
  })
})

describe('restoreDrafts', () => {
  beforeEach(() => localStorage.clear())

  it('returns state unchanged when localStorage is empty', () => {
    const state = { news: [{ titel: 'live' }] }
    const original = { news: [{ titel: 'live' }] }
    expect(restoreDrafts(state, original)).toEqual(state)
  })

  it('restores a draft when the hash matches the current original', () => {
    const originalData = [{ titel: 'live' }]
    const draftData = [{ titel: 'draft edit' }]
    const hash = simpleHash(JSON.stringify(originalData))

    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ news: { data: draftData, originalHash: hash } }),
    )

    const state = { news: originalData }
    const original = { news: originalData }
    const merged = restoreDrafts(state, original)

    expect(merged.news).toEqual(draftData)
  })

  it('ignores a draft whose hash does not match (server data has changed)', () => {
    const originalData = [{ titel: 'live v1' }]
    const newServerData = [{ titel: 'live v2' }]
    const draftData = [{ titel: 'draft on v1' }]
    const oldHash = simpleHash(JSON.stringify(originalData))

    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ news: { data: draftData, originalHash: oldHash } }),
    )

    // Server has updated: originalState is now newServerData
    const state = { news: newServerData }
    const original = { news: newServerData }
    const merged = restoreDrafts(state, original)

    // Draft should NOT be restored because the hash doesn't match
    expect(merged.news).toEqual(newServerData)
  })

  it('handles malformed JSON in localStorage gracefully', () => {
    localStorage.setItem(DRAFT_KEY, 'not-json')
    const state = { news: [] }
    const original = { news: [] }
    expect(restoreDrafts(state, original)).toEqual(state)
  })
})

describe('persistDirtyState', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    resetPersistenceState()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('writes dirty tabs to localStorage after 1 second debounce', async () => {
    // We need a real tab key that exists in TABS — 'news' has a file
    // The function iterates TABS internally, so set up state that differs from original
    const state: Record<string, unknown> = { news: [{ titel: 'edited' }] }
    const original: Record<string, unknown> = { news: [] }

    persistDirtyState(state, original)
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull() // not yet written

    vi.advanceTimersByTime(1000)
    await Promise.resolve() // flush microtasks

    const stored = localStorage.getItem(DRAFT_KEY)
    expect(stored).not.toBeNull()
    const parsed = JSON.parse(stored!)
    expect(parsed.news).toBeDefined()
    expect(parsed.news.data).toEqual([{ titel: 'edited' }])
  })

  it('removes the key when state matches original (no dirty tabs)', async () => {
    // First write a draft
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ news: { data: [], originalHash: 'x' } }))

    // Now state = original (clean)
    const data = [{ titel: 'same' }]
    persistDirtyState({ news: data }, { news: data })

    vi.advanceTimersByTime(1000)
    await Promise.resolve()

    expect(localStorage.getItem(DRAFT_KEY)).toBeNull()
  })

  it('debounces — only the last call within 1s takes effect', async () => {
    const state1: Record<string, unknown> = { news: [{ titel: 'first' }] }
    const state2: Record<string, unknown> = { news: [{ titel: 'second' }] }
    const original: Record<string, unknown> = { news: [] }

    persistDirtyState(state1, original)
    vi.advanceTimersByTime(500) // mid-debounce
    persistDirtyState(state2, original) // resets timer
    vi.advanceTimersByTime(1000) // now timer fires with state2
    await Promise.resolve()

    const parsed = JSON.parse(localStorage.getItem(DRAFT_KEY)!)
    expect(parsed.news.data).toEqual([{ titel: 'second' }])
  })
})
