import { describe, expect, it } from 'vitest'
import { applyMergeChoice, threeWayMerge } from '../merge'

describe('merge choices identify array items by stable ID', () => {
  it.each(['1', 'news-uuid', 1])('edits the matching item for ID %s after reordering', id => {
    const original = [
      { id, titel: 'old' },
      { id: 'other', titel: 'untouched' },
    ]
    const ours = [{ id, titel: 'ours' }, original[1]]
    const theirs = [original[1], { id, titel: 'theirs' }]
    const { merged, conflicts } = threeWayMerge(original, ours, theirs)
    expect(conflicts).toHaveLength(1)
    expect(applyMergeChoice(merged, conflicts[0].path, conflicts[0].ours)).toEqual([
      original[1],
      ours[0],
    ])
    expect(merged).toEqual(theirs)
  })

  it('does not resurrect remote deletions when a different item changes locally', () => {
    const original = [
      { id: 'a', titel: 'removed' },
      { id: 'b', titel: 'old' },
    ]
    const ours = [original[0], { id: 'b', titel: 'local edit' }]
    expect(threeWayMerge(original, ours, [original[1]])).toEqual({
      merged: [ours[1]],
      conflicts: [],
    })
  })

  it('surfaces edit-versus-delete and can restore the edited item', () => {
    const original = [
      { id: 'a', titel: 'old' },
      { id: 'b', titel: 'keep' },
    ]
    const ours = [{ id: 'a', titel: 'edited' }, original[1]]
    const { merged, conflicts } = threeWayMerge(original, ours, [original[1]])
    expect(merged).toEqual([original[1]])
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].theirs).toBeUndefined()
    expect(applyMergeChoice(merged, conflicts[0].path, conflicts[0].ours)).toEqual([
      original[1],
      ours[0],
    ])
    expect(applyMergeChoice(merged, conflicts[0].path, undefined)).toEqual(merged)
  })

  it('deletes an item without shifting the target of later conflict choices', () => {
    const original = {
      items: [
        { id: 'a', title: 'old' },
        { id: 'b', title: 'old' },
      ],
    }
    const ours = { items: [{ id: 'b', title: 'ours' }] }
    const theirs = {
      items: [
        { id: 'a', title: 'edited' },
        { id: 'b', title: 'theirs' },
      ],
    }
    const { merged, conflicts } = threeWayMerge(original, ours, theirs)
    expect(conflicts).toHaveLength(2)
    const resolved = conflicts.reduce(
      (draft, conflict) => applyMergeChoice(draft, conflict.path, conflict.ours),
      merged,
    )
    expect(resolved).toEqual(ours)
    expect(JSON.stringify(resolved)).not.toContain('null')
  })

  it('keeps duplicate IDs in a whole-array conflict rather than silently collapsing them', () => {
    const original = [
      { id: 'a', title: 'one' },
      { id: 'a', title: 'two' },
    ]
    const ours = [{ id: 'a', title: 'ours' }, original[1]]
    const theirs = [original[0], { id: 'a', title: 'theirs' }]
    const { merged, conflicts } = threeWayMerge(original, ours, theirs)
    expect(conflicts).toHaveLength(1)
    expect(applyMergeChoice(merged, conflicts[0].path, conflicts[0].ours)).toEqual(ours)
  })
})
