import { describe, it, expect } from 'vitest'
import type { TabConfig } from '../../admin/types'
import {
  diffTab,
  applyRevert,
  groupChangeEntries,
  summarizeValue,
  type ChangeEntry,
} from '../../admin/lib/diff'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const arrayTab: TabConfig = {
  key: 'test',
  label: 'Test',
  file: '/data/test.json',
  ghPath: 'public/data/test.json',
  type: 'array',
  fields: [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'value', label: 'Wert', type: 'text' },
  ],
}

const objectTab: TabConfig = {
  key: 'obj',
  label: 'Objekt',
  file: '/data/obj.json',
  ghPath: 'public/data/obj.json',
  type: 'object',
  topFields: [{ key: 'title', label: 'Titel', type: 'text' }],
  sections: [
    {
      key: 'items',
      label: 'Einträge',
      fields: [{ key: 'name', label: 'Name', type: 'text' }],
    },
  ],
}

// ─── summarizeValue ───────────────────────────────────────────────────────────

describe('summarizeValue', () => {
  it('returns "—" for null, undefined, and empty string', () => {
    expect(summarizeValue(null)).toBe('—')
    expect(summarizeValue(undefined)).toBe('—')
    expect(summarizeValue('')).toBe('—')
  })

  it('returns filename for image type', () => {
    expect(summarizeValue('/images/news/foto.webp', 'image')).toBe('foto.webp')
  })

  it('returns count for imagelist', () => {
    expect(summarizeValue(['/a.webp', '/b.webp'], 'imagelist')).toBe('2 Bild(er)')
  })

  it('returns joined strings for stringlist', () => {
    expect(summarizeValue(['Eins', 'Zwei'], 'stringlist')).toBe('Eins, Zwei')
  })

  it('returns "—" for empty stringlist', () => {
    expect(summarizeValue([], 'stringlist')).toBe('—')
  })

  it('truncates long text at 80 chars', () => {
    const long = 'a'.repeat(100)
    const result = summarizeValue(long, 'text')
    expect(result.length).toBeLessThanOrEqual(83) // 80 + '…'
    expect(result.endsWith('…')).toBe(true)
  })

  it('does not truncate when truncate=false', () => {
    const long = 'a'.repeat(100)
    expect(summarizeValue(long, 'text', false)).toBe(long)
  })

  it('converts booleans to string', () => {
    expect(summarizeValue(true)).toBe('true')
    expect(summarizeValue(false)).toBe('false')
  })

  it('returns array length notation', () => {
    expect(summarizeValue([1, 2, 3])).toBe('[3]')
  })

  it('returns object placeholder', () => {
    expect(summarizeValue({ a: 1 })).toBe('{…}')
  })
})

// ─── diffTab — array type ─────────────────────────────────────────────────────

describe('diffTab (array type)', () => {
  it('returns empty array when original and current are identical', () => {
    const data = [{ name: 'Alice', value: 'x' }]
    expect(diffTab(arrayTab, data, data)).toHaveLength(0)
  })

  it('detects an added item', () => {
    const original = [{ name: 'Alice', value: 'x' }]
    const current = [
      { name: 'Alice', value: 'x' },
      { name: 'Bob', value: 'y' },
    ]
    const entries = diffTab(arrayTab, original, current)
    const added = entries.find(e => e.kind === 'added')
    expect(added).toBeDefined()
    expect(added!.itemLabel).toBe('Bob')
  })

  it('detects a removed item', () => {
    const original = [
      { name: 'Alice', value: 'x' },
      { name: 'Bob', value: 'y' },
    ]
    const current = [{ name: 'Alice', value: 'x' }]
    const entries = diffTab(arrayTab, original, current)
    const removed = entries.find(e => e.kind === 'removed')
    expect(removed).toBeDefined()
    expect(removed!.itemLabel).toBe('Bob')
  })

  it('detects a modified field', () => {
    const original = [{ name: 'Alice', value: 'old' }]
    const current = [{ name: 'Alice', value: 'new' }]
    const entries = diffTab(arrayTab, original, current)
    const modified = entries.find(e => e.kind === 'modified')
    expect(modified).toBeDefined()
    expect(modified!.fieldKey).toBe('value')
    expect(modified!.before).toBe('old')
    expect(modified!.after).toBe('new')
  })

  it('detects a swap move (A↔B)', () => {
    const a = { name: 'Alice', value: 'x' }
    const b = { name: 'Bob', value: 'y' }
    const original = [a, b]
    const current = [b, a]
    const entries = diffTab(arrayTab, original, current)
    const moved = entries.find(e => e.kind === 'moved')
    expect(moved).toBeDefined()
    expect(moved!.itemLabel).toContain('↔')
  })

  it('returns empty for haushaltsreden type', () => {
    const hTab: TabConfig = {
      key: 'haushaltsreden',
      label: 'H',
      type: 'haushaltsreden',
      file: null,
      ghPath: null,
    }
    expect(diffTab(hTab, [], [])).toHaveLength(0)
  })
})

// ─── diffTab — object type ────────────────────────────────────────────────────

describe('diffTab (object type)', () => {
  it('detects a changed top-level field', () => {
    const original = { title: 'Old Title', items: [] }
    const current = { title: 'New Title', items: [] }
    const entries = diffTab(objectTab, original, current)
    const modified = entries.find(e => e.fieldKey === 'title')
    expect(modified).toBeDefined()
    expect(modified!.before).toBe('Old Title')
    expect(modified!.after).toBe('New Title')
  })

  it('detects an added item in a section array', () => {
    const original = { title: 'T', items: [] }
    const current = { title: 'T', items: [{ name: 'Alice' }] }
    const entries = diffTab(objectTab, original, current)
    const added = entries.find(e => e.kind === 'added')
    expect(added).toBeDefined()
  })
})

// ─── applyRevert ──────────────────────────────────────────────────────────────

describe('applyRevert', () => {
  it('reverts a modified field to its original value', () => {
    const original = [{ name: 'Alice', value: 'old' }]
    const current = [{ name: 'Alice', value: 'new' }]
    const entry: ChangeEntry = {
      id: '0.value:modified',
      path: [0, 'value'],
      kind: 'modified',
      group: 'Test',
      before: 'old',
      after: 'new',
    }
    const result = applyRevert(arrayTab, original, current, entry) as typeof current
    expect(result[0].value).toBe('old')
  })

  it('removes an added item', () => {
    const original = [{ name: 'Alice', value: 'x' }]
    const current = [
      { name: 'Alice', value: 'x' },
      { name: 'Bob', value: 'y' },
    ]
    const entry: ChangeEntry = {
      id: '1:added',
      path: [1],
      kind: 'added',
      group: 'Test',
      after: { name: 'Bob', value: 'y' },
    }
    const result = applyRevert(arrayTab, original, current, entry) as typeof current
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Alice')
  })

  it('reinserts a removed item at its original index', () => {
    const original = [
      { name: 'Alice', value: 'x' },
      { name: 'Bob', value: 'y' },
    ]
    const current = [{ name: 'Alice', value: 'x' }]
    const entry: ChangeEntry = {
      id: '1:removed:1',
      path: [1],
      kind: 'removed',
      group: 'Test',
      originalIndex: 1,
      before: { name: 'Bob', value: 'y' },
    }
    const result = applyRevert(arrayTab, original, current, entry) as typeof original
    expect(result).toHaveLength(2)
    expect(result[1].name).toBe('Bob')
  })

  it('restores array order for a move', () => {
    const a = { name: 'Alice', value: 'x' }
    const b = { name: 'Bob', value: 'y' }
    const original = [a, b]
    const current = [b, a] // swapped
    const entry: ChangeEntry = {
      id: '0:moved',
      path: [0],
      kind: 'moved',
      group: 'Test',
      movedFrom: 1,
      movedTo: 0,
    }
    const result = applyRevert(arrayTab, original, current, entry) as typeof original
    expect(result[0].name).toBe('Alice')
    expect(result[1].name).toBe('Bob')
  })

  it('reverts a nested modified field', () => {
    const original = { title: 'T', items: [{ name: 'Old' }] }
    const current = { title: 'T', items: [{ name: 'New' }] }
    const entry: ChangeEntry = {
      id: 'items.0.name:modified',
      path: ['items', 0, 'name'],
      kind: 'modified',
      group: 'Einträge',
      before: 'Old',
      after: 'New',
    }
    const result = applyRevert(objectTab, original, current, entry) as typeof original
    expect((result.items[0] as { name: string }).name).toBe('Old')
  })
})

// ─── groupChangeEntries ───────────────────────────────────────────────────────

describe('groupChangeEntries', () => {
  it('returns empty array for empty input', () => {
    expect(groupChangeEntries([])).toEqual([])
  })

  it('groups entries with the same group, item, and kind', () => {
    const entries: ChangeEntry[] = [
      {
        id: '0.name:modified',
        path: [0, 'name'],
        kind: 'modified',
        group: 'Test',
        itemIndex: 0,
        itemLabel: 'Alice',
        fieldKey: 'name',
      },
      {
        id: '0.value:modified',
        path: [0, 'value'],
        kind: 'modified',
        group: 'Test',
        itemIndex: 0,
        itemLabel: 'Alice',
        fieldKey: 'value',
      },
    ]
    const groups = groupChangeEntries(entries)
    expect(groups).toHaveLength(1)
    expect(groups[0].entries).toHaveLength(2)
  })

  it('creates separate groups for different items', () => {
    const entries: ChangeEntry[] = [
      {
        id: 'a',
        path: [0, 'name'],
        kind: 'modified',
        group: 'Test',
        itemIndex: 0,
        fieldKey: 'name',
      },
      {
        id: 'b',
        path: [1, 'name'],
        kind: 'modified',
        group: 'Test',
        itemIndex: 1,
        fieldKey: 'name',
      },
    ]
    const groups = groupChangeEntries(entries)
    expect(groups).toHaveLength(2)
  })

  it('creates separate groups for different kinds', () => {
    const entries: ChangeEntry[] = [
      { id: 'a', path: [0], kind: 'added', group: 'Test', itemIndex: 0 },
      { id: 'b', path: [1], kind: 'removed', group: 'Test', itemIndex: 1 },
    ]
    const groups = groupChangeEntries(entries)
    expect(groups).toHaveLength(2)
    expect(groups.map(g => g.itemKind).sort()).toEqual(['added', 'removed'])
  })
})
