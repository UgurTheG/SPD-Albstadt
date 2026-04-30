/**
 * Tests for the three-way merge utility, including the new
 * id-based array merge strategy.
 */
import { describe, it, expect } from 'vitest'
import { threeWayMerge } from '../../admin/lib/merge'

// ─── Primitives & plain objects ───────────────────────────────────────────────

describe('threeWayMerge — primitives', () => {
  it('returns original when both sides are unchanged', () => {
    const { merged, conflicts } = threeWayMerge('hello', 'hello', 'hello')
    expect(merged).toBe('hello')
    expect(conflicts).toHaveLength(0)
  })

  it('takes their change when only theirs changed', () => {
    const { merged, conflicts } = threeWayMerge('old', 'old', 'new')
    expect(merged).toBe('new')
    expect(conflicts).toHaveLength(0)
  })

  it('takes our change when only ours changed', () => {
    const { merged, conflicts } = threeWayMerge('old', 'mine', 'old')
    expect(merged).toBe('mine')
    expect(conflicts).toHaveLength(0)
  })

  it('records a conflict when both changed to different values', () => {
    const { merged, conflicts } = threeWayMerge('old', 'mine', 'theirs')
    expect(merged).toBe('theirs') // defaults to theirs
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].ours).toBe('mine')
    expect(conflicts[0].theirs).toBe('theirs')
  })

  it('no conflict when both changed to the same value', () => {
    const { merged, conflicts } = threeWayMerge('old', 'same', 'same')
    expect(merged).toBe('same')
    expect(conflicts).toHaveLength(0)
  })
})

describe('threeWayMerge — plain objects', () => {
  it('merges disjoint field edits without conflict', () => {
    const original = { a: 1, b: 2 }
    const ours = { a: 99, b: 2 } // we changed a
    const theirs = { a: 1, b: 77 } // they changed b
    const { merged, conflicts } = threeWayMerge(original, ours, theirs)
    expect(merged).toEqual({ a: 99, b: 77 })
    expect(conflicts).toHaveLength(0)
  })

  it('records conflict for same field changed differently', () => {
    const original = { title: 'old' }
    const ours = { title: 'mine' }
    const theirs = { title: 'theirs' }
    const { merged, conflicts } = threeWayMerge(original, ours, theirs)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].label).toBe('title')
    expect((merged as Record<string, unknown>).title).toBe('theirs')
  })
})

// ─── Conservative array fallback (no id fields) ───────────────────────────────

describe('threeWayMerge — arrays without ids (conservative)', () => {
  it('keeps our change when only ours changed', () => {
    const original = ['a', 'b']
    const ours = ['a', 'b', 'c']
    const theirs = ['a', 'b']
    const { merged, conflicts } = threeWayMerge(original, ours, theirs)
    expect(merged).toEqual(['a', 'b', 'c'])
    expect(conflicts).toHaveLength(0)
  })

  it('takes their change when only theirs changed', () => {
    const original = ['a']
    const ours = ['a']
    const theirs = ['a', 'x']
    const { merged, conflicts } = threeWayMerge(original, ours, theirs)
    expect(merged).toEqual(['a', 'x'])
    expect(conflicts).toHaveLength(0)
  })

  it('flags conflict when both sides changed array without ids', () => {
    const original = ['a']
    const ours = ['a', 'mine']
    const theirs = ['a', 'theirs']
    const { merged, conflicts } = threeWayMerge(original, ours, theirs)
    expect(conflicts).toHaveLength(1)
    expect(merged).toEqual(['a', 'theirs']) // defaults to theirs
  })
})

// ─── Smart array merge by id ──────────────────────────────────────────────────

describe('threeWayMerge — arrays with id fields', () => {
  const alice = { id: 1, name: 'Alice', role: 'admin' }
  const bob = { id: 2, name: 'Bob', role: 'editor' }
  const carol = { id: 3, name: 'Carol', role: 'viewer' }

  it('both users add different items — no conflict, both kept', () => {
    const original = [alice]
    const ours = [alice, bob] // we added Bob
    const theirs = [alice, carol] // they added Carol
    const { merged, conflicts } = threeWayMerge(original, ours, theirs)
    const result = merged as typeof ours
    expect(conflicts).toHaveLength(0)
    expect(result.find(i => i.id === 1)).toBeDefined() // Alice
    expect(result.find(i => i.id === 2)).toBeDefined() // Bob
    expect(result.find(i => i.id === 3)).toBeDefined() // Carol
  })

  it('both users edit different fields of the same item — no conflict', () => {
    const original = [alice]
    const ours = [{ ...alice, name: 'Alicia' }] // we renamed
    const theirs = [{ ...alice, role: 'superadmin' }] // they changed role
    const { merged, conflicts } = threeWayMerge(original, ours, theirs)
    const result = merged as typeof ours
    expect(conflicts).toHaveLength(0)
    expect(result[0].name).toBe('Alicia')
    expect(result[0].role).toBe('superadmin')
  })

  it('both users edit the same field of the same item — conflict', () => {
    const original = [alice]
    const ours = [{ ...alice, name: 'Alicia' }]
    const theirs = [{ ...alice, name: 'Alexandra' }]
    const { merged: _merged, conflicts } = threeWayMerge(original, ours, theirs)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].ours).toBe('Alicia')
    expect(conflicts[0].theirs).toBe('Alexandra')
  })

  it('we delete an item, they keep it — our delete wins', () => {
    const original = [alice, bob]
    const ours = [alice] // we deleted Bob
    const theirs = [alice, bob] // they kept Bob unchanged
    const { merged, conflicts } = threeWayMerge(original, ours, theirs)
    const result = merged as typeof ours
    expect(conflicts).toHaveLength(0)
    expect(result.find(i => i.id === 2)).toBeUndefined() // Bob removed
  })

  it('they add a new item, we did not touch array — their addition kept', () => {
    const original = [alice]
    const ours = [alice] // unchanged
    const theirs = [alice, bob] // they added Bob
    const { merged, conflicts } = threeWayMerge(original, ours, theirs)
    const result = merged as typeof ours
    expect(conflicts).toHaveLength(0)
    expect(result.find(i => i.id === 2)).toBeDefined() // Bob kept
  })

  it('they added a brand-new item (not in original), we deleted nothing — kept', () => {
    const original = [alice]
    const ours = [alice]
    const theirs = [alice, carol] // carol is new
    const { merged, conflicts } = threeWayMerge(original, ours, theirs)
    const result = merged as typeof ours
    expect(conflicts).toHaveLength(0)
    expect(result.find(i => i.id === 3)).toBeDefined()
  })

  it('preserves theirs ordering, appends our additions at the end', () => {
    const original = [alice, bob]
    const ours = [bob, alice, carol] // we reordered + added Carol
    const theirs = [bob, alice] // they reordered
    const { merged, conflicts } = threeWayMerge(original, ours, theirs)
    const result = merged as typeof ours
    // Their order comes first
    expect(result[0].id).toBe(bob.id)
    expect(result[1].id).toBe(alice.id)
    // Carol appended
    expect(result[2].id).toBe(carol.id)
    expect(conflicts).toHaveLength(0)
  })

  it('empty original with both sides adding different ids — both kept', () => {
    const original: typeof ours = []
    const ours = [alice]
    const theirs = [bob]
    const { merged, conflicts } = threeWayMerge(original, ours, theirs)
    const result = merged as typeof ours
    // Bob comes first (theirs order), then Alice
    expect(result).toHaveLength(2)
    expect(conflicts).toHaveLength(0)
  })
})
