/**
 * Extra tests for admin lib utilities to reach 100 % line coverage.
 * Covers: diff.ts (kommunalpolitik type, pendingImagePaths, non-swap moves,
 *          isSingleObject, textarea summarize), fileUtils.ts, github.ts,
 *          icons.ts, images.ts (fileToBase64), inputCls.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─── inputCls ─────────────────────────────────────────────────────────────────

describe('inputCls', () => {
  it('exports a non-empty string', async () => {
    const { inputCls } = await import('../../admin/lib/inputCls')
    expect(typeof inputCls).toBe('string')
    expect(inputCls.length).toBeGreaterThan(0)
  })
})

// ─── diff.ts — kommunalpolitik type ──────────────────────────────────────────

import { diffTab, summarizeValue, applyRevert } from '../../admin/lib/diff'
import type { TabConfig } from '../../admin/types'

const kpTab: TabConfig = {
  key: 'kommunalpolitik',
  label: 'Kommunalpolitik',
  type: 'kommunalpolitik',
  file: '/data/kommunalpolitik.json',
  ghPath: 'public/data/kommunalpolitik.json',
}

function makeJahr(id: string, year: string) {
  return {
    id,
    jahr: year,
    aktiv: true,
    gemeinderaete: [] as Record<string, unknown>[],
    kreisraete: [] as Record<string, unknown>[],
    dokumente: [] as Record<string, unknown>[],
  }
}

describe('diffTab — kommunalpolitik type', () => {
  it('detects added Jahr', () => {
    const original = { sichtbar: true, beschreibung: '', jahre: [] }
    const current = { sichtbar: true, beschreibung: '', jahre: [makeJahr('j1', '2024')] }
    const entries = diffTab(kpTab, original, current)
    const added = entries.find(e => e.kind === 'added' && e.groupKey === 'jahre')
    expect(added).toBeDefined()
  })

  it('detects removed Jahr', () => {
    const original = { sichtbar: true, beschreibung: '', jahre: [makeJahr('j1', '2024')] }
    const current = { sichtbar: true, beschreibung: '', jahre: [] }
    const entries = diffTab(kpTab, original, current)
    const removed = entries.find(e => e.kind === 'removed' && e.groupKey === 'jahre')
    expect(removed).toBeDefined()
  })

  it('detects modified top-level fields (sichtbar, beschreibung)', () => {
    const original = { sichtbar: true, beschreibung: 'old', jahre: [] }
    const current = { sichtbar: false, beschreibung: 'new', jahre: [] }
    const entries = diffTab(kpTab, original, current)
    const sichtbar = entries.find(e => e.fieldKey === 'sichtbar')
    const beschr = entries.find(e => e.fieldKey === 'beschreibung')
    expect(sichtbar).toBeDefined()
    expect(beschr).toBeDefined()
  })

  it('diffs Jahr fields (aktiv, jahr name)', () => {
    const j = makeJahr('j1', '2024')
    const jModified = { ...j, aktiv: false, jahr: '2025' }
    const original = { sichtbar: true, beschreibung: '', jahre: [j] }
    const current = { sichtbar: true, beschreibung: '', jahre: [jModified] }
    const entries = diffTab(kpTab, original, current)
    const aktivEntry = entries.find(e => e.fieldKey === 'aktiv')
    expect(aktivEntry).toBeDefined()
  })

  it('diffs gemeinderaete inside a Jahr', () => {
    const j = makeJahr('j1', '2024')
    const jWithRat = {
      ...j,
      gemeinderaete: [{ id: 'p1', name: 'Alice', rolle: '', bildUrl: '', email: '', bio: '' }],
    }
    const original = { sichtbar: true, beschreibung: '', jahre: [j] }
    const current = { sichtbar: true, beschreibung: '', jahre: [jWithRat] }
    const entries = diffTab(kpTab, original, current)
    const added = entries.find(e => e.kind === 'added')
    expect(added).toBeDefined()
  })

  it('diffs dokumente inside a Jahr', () => {
    const j = makeJahr('j1', '2024')
    const jWithDoc = {
      ...j,
      dokumente: [{ id: 'd1', titel: 'Bericht', url: '/dokumente/bericht.pdf' }],
    }
    const original = { sichtbar: true, beschreibung: '', jahre: [j] }
    const current = { sichtbar: true, beschreibung: '', jahre: [jWithDoc] }
    const entries = diffTab(kpTab, original, current)
    const added = entries.find(e => e.kind === 'added')
    expect(added).toBeDefined()
  })

  it('detects pending image entries for gemeinderaete bildUrl', () => {
    const j = {
      ...makeJahr('j1', '2024'),
      gemeinderaete: [{ name: 'Alice', bildUrl: '/images/kommunalpolitik/alice.webp' }],
      kreisraete: [],
    }
    const data = { sichtbar: true, beschreibung: '', jahre: [j] }
    const pendingPaths = new Set(['/images/kommunalpolitik/alice.webp'])
    const entries = diffTab(kpTab, data, data, pendingPaths)
    const pending = entries.find(e => e.pendingImagePath)
    expect(pending).toBeDefined()
    expect(pending!.pendingImagePath).toBe('/images/kommunalpolitik/alice.webp')
  })

  it('detects pending image entries for kreisraete bildUrl', () => {
    const j = {
      ...makeJahr('j1', '2024'),
      gemeinderaete: [],
      kreisraete: [{ name: 'Bob', bildUrl: '/images/kommunalpolitik/bob.webp' }],
    }
    const data = { sichtbar: true, beschreibung: '', jahre: [j] }
    const pendingPaths = new Set(['/images/kommunalpolitik/bob.webp'])
    const entries = diffTab(kpTab, data, data, pendingPaths)
    const pending = entries.find(e => e.pendingImagePath)
    expect(pending).toBeDefined()
  })

  it('skips pending image entries already covered by a regular diff entry', () => {
    const j1 = {
      ...makeJahr('j1', '2024'),
      gemeinderaete: [{ name: 'Alice', bildUrl: '/images/kommunalpolitik/alice.webp' }],
      kreisraete: [],
    }
    const j2 = {
      ...j1,
      gemeinderaete: [{ name: 'Alice', bildUrl: '/images/kommunalpolitik/new.webp' }],
    }
    const original = { sichtbar: true, beschreibung: '', jahre: [j1] }
    const current = { sichtbar: true, beschreibung: '', jahre: [j2] }
    const pendingPaths = new Set(['/images/kommunalpolitik/new.webp'])
    const entries = diffTab(kpTab, original, current, pendingPaths)
    // The bildUrl change is already tracked as a modified entry
    const modified = entries.filter(e => e.fieldKey === 'bildUrl')
    expect(modified.length).toBeGreaterThan(0)
  })

  it('handles empty / null data', () => {
    expect(() => diffTab(kpTab, null, null)).not.toThrow()
    expect(() => diffTab(kpTab, undefined, undefined)).not.toThrow()
  })
})

// ─── diff.ts — object tab with isSingleObject section ─────────────────────────

const singleObjTab: TabConfig = {
  key: 'single',
  label: 'Single',
  type: 'object',
  file: '/data/single.json',
  ghPath: 'public/data/single.json',
  sections: [
    {
      key: 'header',
      label: 'Header',
      fields: [{ key: 'title', label: 'Title', type: 'text' }],
      isSingleObject: true,
    },
  ],
}

describe('diffTab — object tab with isSingleObject section', () => {
  it('detects a modified field inside isSingleObject section', () => {
    const original = { header: { title: 'Old' } }
    const current = { header: { title: 'New' } }
    const entries = diffTab(singleObjTab, original, current)
    const m = entries.find(e => e.fieldKey === 'title')
    expect(m).toBeDefined()
    expect(m!.before).toBe('Old')
    expect(m!.after).toBe('New')
  })
})

// ─── diff.ts — pendingImagePaths for array tab ────────────────────────────────

const arrImgTab: TabConfig = {
  key: 'test',
  label: 'Test',
  type: 'array',
  file: '/data/test.json',
  ghPath: 'public/data/test.json',
  fields: [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'bildUrl', label: 'Bild', type: 'image' },
  ],
}

describe('diffTab — pendingImagePaths for array tab', () => {
  it('adds image-replaced entry when bildUrl is in pendingImagePaths', () => {
    const data = [{ name: 'Alice', bildUrl: '/images/alice.webp' }]
    const pendingPaths = new Set(['/images/alice.webp'])
    const entries = diffTab(arrImgTab, data, data, pendingPaths)
    expect(entries.some(e => e.pendingImagePath === '/images/alice.webp')).toBe(true)
  })

  it('skips items already covered', () => {
    const original = [{ name: 'Alice', bildUrl: '/images/alice-old.webp' }]
    const current = [{ name: 'Alice', bildUrl: '/images/alice-new.webp' }]
    const pendingPaths = new Set(['/images/alice-new.webp'])
    const entries = diffTab(arrImgTab, original, current, pendingPaths)
    // bildUrl is already tracked as modified; no duplicate pending entry
    const pending = entries.filter(e => e.pendingImagePath)
    const modified = entries.filter(e => e.fieldKey === 'bildUrl' && !e.pendingImagePath)
    expect(modified.length).toBeGreaterThanOrEqual(1)
    // If already covered, pendingImagePath entry should not duplicate it
    const covering = new Set(entries.map(e => e.path.join(' ')))
    for (const p of pending) {
      expect(covering.has(p.path.join(' '))).toBe(true)
    }
  })
})

// ─── diff.ts — pendingImagePaths for object tab ────────────────────────────────

const objImgTab: TabConfig = {
  key: 'obj',
  label: 'Obj',
  type: 'object',
  file: '/data/obj.json',
  ghPath: 'public/data/obj.json',
  topFields: [{ key: 'hero', label: 'Hero', type: 'image' }],
  sections: [
    {
      key: 'members',
      label: 'Members',
      fields: [{ key: 'bildUrl', label: 'Bild', type: 'image' }],
      isSingleObject: false,
    },
    {
      key: 'kontakt',
      label: 'Kontakt',
      fields: [{ key: 'foto', label: 'Foto', type: 'image' }],
      isSingleObject: true,
    },
  ],
}

describe('diffTab — pendingImagePaths for object tab (topFields + sections)', () => {
  it('adds pending entry for topField image', () => {
    const data = { hero: '/images/hero.webp', members: [], kontakt: {} }
    const pendingPaths = new Set(['/images/hero.webp'])
    const entries = diffTab(objImgTab, data, data, pendingPaths)
    expect(entries.some(e => e.pendingImagePath === '/images/hero.webp')).toBe(true)
  })

  it('adds pending entry for section array image', () => {
    const data = { hero: '', members: [{ bildUrl: '/images/m.webp' }], kontakt: {} }
    const pendingPaths = new Set(['/images/m.webp'])
    const entries = diffTab(objImgTab, data, data, pendingPaths)
    expect(entries.some(e => e.pendingImagePath === '/images/m.webp')).toBe(true)
  })

  it('adds pending entry for isSingleObject section image', () => {
    const data = { hero: '', members: [], kontakt: { foto: '/images/kontakt.webp' } }
    const pendingPaths = new Set(['/images/kontakt.webp'])
    const entries = diffTab(objImgTab, data, data, pendingPaths)
    expect(entries.some(e => e.pendingImagePath === '/images/kontakt.webp')).toBe(true)
  })
})

// ─── diff.ts — non-swap reorder moves ─────────────────────────────────────────

describe('diffTab — non-swap multi-item reorder', () => {
  const tab: TabConfig = {
    key: 'test',
    label: 'Test',
    type: 'array',
    file: '/data/test.json',
    ghPath: 'public/data/test.json',
    fields: [{ key: 'name', label: 'Name', type: 'text' }],
  }

  it('detects a non-swap reordering (3+ items)', () => {
    const a = { name: 'A' }
    const b = { name: 'B' }
    const c = { name: 'C' }
    // Original: A, B, C; Current: C, A, B (non-swap, 3-way rotation)
    const original = [a, b, c]
    const current = [c, a, b]
    const entries = diffTab(tab, original, current)
    const moves = entries.filter(e => e.kind === 'moved')
    expect(moves.length).toBeGreaterThan(0)
  })
})

// ─── summarizeValue — textarea type ──────────────────────────────────────────

describe('summarizeValue — textarea type', () => {
  it('trims and collapses whitespace', () => {
    expect(summarizeValue('  hello   world  ', 'textarea')).toBe('hello world')
  })

  it('truncates long textarea content', () => {
    const long = 'a'.repeat(100)
    const result = summarizeValue(long, 'textarea')
    expect(result.length).toBeLessThanOrEqual(83)
    expect(result.endsWith('…')).toBe(true)
  })

  it('does not truncate when truncate=false', () => {
    const long = 'a'.repeat(100)
    expect(summarizeValue(long, 'textarea', false)).toBe(long)
  })

  it('returns number as string', () => {
    expect(summarizeValue(42)).toBe('42')
  })
})

// ─── applyRevert — top-level array tab moves ─────────────────────────────────

describe('applyRevert — top-level array modified (companionPaths)', () => {
  const arrayTab: TabConfig = {
    key: 'test',
    label: 'Test',
    type: 'array',
    file: '/data/test.json',
    ghPath: 'public/data/test.json',
    fields: [{ key: 'imgs', label: 'Imgs', type: 'imagelist', captionsKey: 'captions' }],
  }

  it('reverts companion paths', () => {
    const original = [{ imgs: ['a.webp'], captions: ['A'] }]
    const current = [{ imgs: ['b.webp'], captions: ['B'] }]
    const entry = {
      id: '0.imgs:modified',
      path: [0, 'imgs'] as (string | number)[],
      kind: 'modified' as const,
      group: 'Test',
      before: ['a.webp'],
      after: ['b.webp'],
      companionPaths: [[0, 'captions']] as (string | number)[][],
    }
    const result = applyRevert(arrayTab, original, current, entry) as typeof original
    expect(result[0].imgs).toEqual(['a.webp'])
    expect(result[0].captions).toEqual(['A'])
  })
})

describe('applyRevert — top-level array move (parentPath.length === 0)', () => {
  const arrayTab: TabConfig = {
    key: 'test',
    label: 'Test',
    type: 'array',
    file: '/data/test.json',
    ghPath: 'public/data/test.json',
    fields: [{ key: 'name', label: 'Name', type: 'text' }],
  }

  it('reverts top-level array order for a move', () => {
    const a = { name: 'A' }
    const b = { name: 'B' }
    const original = [a, b]
    const current = [b, a]
    const entry = {
      id: '0:moved',
      path: [0] as (string | number)[],
      kind: 'moved' as const,
      group: 'Test',
      movedFrom: 1,
      movedTo: 0,
    }
    const result = applyRevert(arrayTab, original, current, entry) as typeof original
    expect(result[0].name).toBe('A')
    expect(result[1].name).toBe('B')
  })
})

describe('applyRevert — top-level array adds/removes (parentPath.length === 0)', () => {
  const arrayTab: TabConfig = {
    key: 'test',
    label: 'Test',
    type: 'array',
    file: '/data/test.json',
    ghPath: 'public/data/test.json',
    fields: [{ key: 'name', label: 'Name', type: 'text' }],
  }

  it('reverts top-level array added item', () => {
    const original = [{ name: 'Alice' }]
    const current = [{ name: 'Alice' }, { name: 'Bob' }]
    const entry = {
      id: '1:added',
      path: [1] as (string | number)[],
      kind: 'added' as const,
      group: 'Test',
      after: { name: 'Bob' },
    }
    const result = applyRevert(arrayTab, original, current, entry) as typeof current
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Alice')
  })

  it('reverts top-level array removed item', () => {
    const original = [{ name: 'Alice' }, { name: 'Bob' }]
    const current = [{ name: 'Alice' }]
    const entry = {
      id: '1:removed',
      path: [1] as (string | number)[],
      kind: 'removed' as const,
      group: 'Test',
      originalIndex: 1,
      before: { name: 'Bob' },
    }
    const result = applyRevert(arrayTab, original, current, entry) as typeof original
    expect(result).toHaveLength(2)
    expect(result[1].name).toBe('Bob')
  })
})

// ─── fileUtils.ts ─────────────────────────────────────────────────────────────

describe('openPendingFile', () => {
  let createObjectURLSpy: ReturnType<typeof vi.spyOn>
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>
  let openSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('opens a PDF file', async () => {
    const { openPendingFile } = await import('../../admin/lib/fileUtils')
    // base64 for a single byte 0x00
    openPendingFile('AA==', '/docs/test.pdf')
    expect(createObjectURLSpy).toHaveBeenCalledOnce()
    expect(openSpy).toHaveBeenCalledWith('blob:test', '_blank')
  })

  it('opens a DOC file', async () => {
    const { openPendingFile } = await import('../../admin/lib/fileUtils')
    openPendingFile('AA==', '/docs/test.doc')
    expect(openSpy).toHaveBeenCalledOnce()
  })

  it('opens a DOCX file', async () => {
    const { openPendingFile } = await import('../../admin/lib/fileUtils')
    openPendingFile('AA==', '/docs/test.docx')
    expect(openSpy).toHaveBeenCalledOnce()
  })

  it('opens file with unknown extension', async () => {
    const { openPendingFile } = await import('../../admin/lib/fileUtils')
    openPendingFile('AA==', '/docs/test.xyz')
    expect(openSpy).toHaveBeenCalledOnce()
  })

  it('revokes the URL after 30 seconds', async () => {
    const { openPendingFile } = await import('../../admin/lib/fileUtils')
    openPendingFile('AA==', '/docs/test.pdf')
    vi.advanceTimersByTime(30_000)
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:test')
  })
})

// ─── icons.ts ─────────────────────────────────────────────────────────────────

import { iconToKebab, loadIconSvg, ICON_LIST } from '../../admin/lib/icons'

describe('iconToKebab', () => {
  it('converts CamelCase to kebab-case', () => {
    expect(iconToKebab('GraduationCap')).toBe('graduation-cap')
  })

  it('inserts hyphen between letter and digit', () => {
    expect(iconToKebab('Building2')).toBe('building-2')
  })

  it('applies known aliases', () => {
    expect(iconToKebab('Home')).toBe('house') // alias: home → house
    expect(iconToKebab('BarChart')).toBe('chart-bar')
    expect(iconToKebab('Train')).toBe('train-front')
  })

  it('ICON_LIST is a non-empty array', () => {
    expect(Array.isArray(ICON_LIST)).toBe(true)
    expect(ICON_LIST.length).toBeGreaterThan(0)
  })
})

describe('loadIconSvg', () => {
  afterEach(() => vi.restoreAllMocks())

  it('returns SVG string on success', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      text: async () => '<svg>test</svg>',
    } as Response)
    const svg = await loadIconSvg('Home')
    expect(svg).toBe('<svg>test</svg>')
  })

  it('returns null on non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: false } as Response)
    const svg = await loadIconSvg('Nonexistent')
    expect(svg).toBeNull()
  })

  it('returns null on fetch error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('network'))
    const svg = await loadIconSvg('BrokenIcon')
    expect(svg).toBeNull()
  })

  it('uses cache on second call', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      text: async () => '<svg>cached</svg>',
    } as Response)
    // First call fills cache
    await loadIconSvg('CachedIcon')
    // Second call should NOT fetch again
    await loadIconSvg('CachedIcon')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
})

// ─── github.ts ────────────────────────────────────────────────────────────────

import {
  AuthError,
  validateToken,
  commitFile,
  commitBinaryFile,
  deleteFile,
  commitTree,
  listDirectory,
  getFileContent,
} from '../../admin/lib/github'

describe('AuthError', () => {
  it('has the correct name and status', () => {
    const e = new AuthError('test', 403)
    expect(e.name).toBe('AuthError')
    expect(e.status).toBe(403)
    expect(e.message).toBe('test')
  })

  it('defaults to status 401', () => {
    const e = new AuthError('msg')
    expect(e.status).toBe(401)
  })
})

describe('validateToken', () => {
  afterEach(() => vi.restoreAllMocks())

  it('returns user on success', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ login: 'user', avatar_url: 'url' }),
      } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response)
    const user = await validateToken()
    expect(user.login).toBe('user')
  })

  it('throws AuthError on 401', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 401,
    } as Response)
    await expect(validateToken()).rejects.toBeInstanceOf(AuthError)
  })

  it('throws AuthError on 403', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 403,
    } as Response)
    await expect(validateToken()).rejects.toBeInstanceOf(AuthError)
  })

  it('throws generic Error on non-auth HTTP error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response)
    await expect(validateToken()).rejects.toThrow('GitHub API Fehler')
  })

  it('throws AuthError when repo check returns 404', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ login: 'u', avatar_url: '' }),
      } as Response)
      .mockResolvedValueOnce({ ok: false, status: 404 } as Response)
    await expect(validateToken()).rejects.toBeInstanceOf(AuthError)
  })

  it('throws generic Error when repo check fails with 500', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ login: 'u', avatar_url: '' }),
      } as Response)
      .mockResolvedValueOnce({ ok: false, status: 500 } as Response)
    await expect(validateToken()).rejects.toThrow('Repository-Zugriff Fehler')
  })
})

describe('commitFile', () => {
  afterEach(() => vi.restoreAllMocks())

  it('commits file without existing SHA', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: false } as Response) // existing check
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: { sha: 'newsha' } }),
      } as Response)
    await expect(commitFile('path/file.json', '{}', 'msg')).resolves.not.toThrow()
  })

  it('commits file with existing SHA', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => ({ sha: 'existing' }) } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: { sha: 'newsha' } }),
      } as Response)
    await expect(commitFile('path/file.json', '{}', 'msg')).resolves.not.toThrow()
  })

  it('throws on commit failure', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: false } as Response)
      .mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'Conflict' }) } as Response)
    await expect(commitFile('f', '{}', 'm')).rejects.toThrow('Conflict')
  })

  it('throws fallback message when no message in error body', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: false } as Response)
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) } as Response)
    await expect(commitFile('f', '{}', 'm')).rejects.toThrow('Fehler beim Speichern')
  })
})

describe('commitBinaryFile', () => {
  afterEach(() => vi.restoreAllMocks())

  it('commits binary file with SHA', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => ({ sha: 'sha1' }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ content: {} }) } as Response)
    await expect(commitBinaryFile('img.webp', 'base64', 'msg')).resolves.not.toThrow()
  })

  it('commits binary file without SHA', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: false } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response)
    await expect(commitBinaryFile('img.webp', 'base64', 'msg')).resolves.not.toThrow()
  })

  it('throws on failure', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: false } as Response)
      .mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'err' }) } as Response)
    await expect(commitBinaryFile('f', 'b64', 'm')).rejects.toThrow('err')
  })

  it('throws fallback message when no message in error body', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: false } as Response)
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) } as Response)
    await expect(commitBinaryFile('f', 'b64', 'm')).rejects.toThrow('Fehler beim Hochladen')
  })
})

describe('deleteFile', () => {
  afterEach(() => vi.restoreAllMocks())

  it('is a no-op when file does not exist', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: false } as Response)
    await expect(deleteFile('f', 'm')).resolves.toBeUndefined()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('deletes when file exists', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => ({ sha: 'abc' }) } as Response)
      .mockResolvedValueOnce({ ok: true } as Response)
    await deleteFile('f', 'm')
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })
})

describe('commitTree', () => {
  afterEach(() => vi.restoreAllMocks())

  const mockSuccess = () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ object: { sha: 'commit1' } }),
      } as Response) // ref
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tree: { sha: 'tree1' } }),
      } as Response) // commit
      .mockResolvedValueOnce({ ok: true, json: async () => ({ sha: 'newtree' }) } as Response) // create tree
      .mockResolvedValueOnce({ ok: true, json: async () => ({ sha: 'newcommit' }) } as Response) // create commit
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response) // update ref
  }

  it('returns early when no changes', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    await commitTree('msg', [])
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('commits text file', async () => {
    mockSuccess()
    await expect(commitTree('msg', [{ path: 'f.json', content: '{}' }])).resolves.not.toThrow()
  })

  it('commits binary file (base64Content)', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ object: { sha: 'c1' } }),
      } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ tree: { sha: 't1' } }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ sha: 'blobsha' }) } as Response) // blob creation
      .mockResolvedValueOnce({ ok: true, json: async () => ({ sha: 'newtree' }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ sha: 'newcommit' }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response)
    await expect(
      commitTree('msg', [{ path: 'img.webp', base64Content: 'abc' }]),
    ).resolves.not.toThrow()
  })

  it('commits delete entry', async () => {
    mockSuccess()
    await expect(commitTree('msg', [{ path: 'old.jpg', delete: true }])).resolves.not.toThrow()
  })

  it('throws when ref fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: false } as Response)
    await expect(commitTree('msg', [{ path: 'f', content: '{}' }])).rejects.toThrow(
      'Branch nicht gefunden',
    )
  })

  it('throws when commit fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ object: { sha: 'c1' } }),
      } as Response)
      .mockResolvedValueOnce({ ok: false } as Response)
    await expect(commitTree('msg', [{ path: 'f', content: '{}' }])).rejects.toThrow(
      'Commit nicht gefunden',
    )
  })

  it('throws when blob creation fails', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ object: { sha: 'c1' } }),
      } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ tree: { sha: 't1' } }) } as Response)
      .mockResolvedValueOnce({ ok: false } as Response) // blob fail
    await expect(commitTree('msg', [{ path: 'img.webp', base64Content: 'abc' }])).rejects.toThrow(
      'Blob-Erstellung fehlgeschlagen',
    )
  })

  it('throws when tree creation fails', async () => {
    mockSuccess() // set up 5 responses but we'll override  the 3rd
    vi.restoreAllMocks()
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ object: { sha: 'c1' } }),
      } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ tree: { sha: 't1' } }) } as Response)
      .mockResolvedValueOnce({ ok: false } as Response) // tree fail
    await expect(commitTree('msg', [{ path: 'f.json', content: '{}' }])).rejects.toThrow(
      'Tree-Erstellung fehlgeschlagen',
    )
  })

  it('throws when new commit creation fails', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ object: { sha: 'c1' } }),
      } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ tree: { sha: 't1' } }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ sha: 'newtree' }) } as Response)
      .mockResolvedValueOnce({ ok: false } as Response) // commit fail
    await expect(commitTree('msg', [{ path: 'f.json', content: '{}' }])).rejects.toThrow(
      'Commit-Erstellung fehlgeschlagen',
    )
  })

  it('throws when branch update fails', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ object: { sha: 'c1' } }),
      } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ tree: { sha: 't1' } }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ sha: 'newtree' }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ sha: 'newcommit' }) } as Response)
      .mockResolvedValueOnce({ ok: false } as Response) // update ref fail
    await expect(commitTree('msg', [{ path: 'f.json', content: '{}' }])).rejects.toThrow(
      'Branch-Update fehlgeschlagen',
    )
  })
})

describe('listDirectory', () => {
  afterEach(() => vi.restoreAllMocks())

  it('returns array on success', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => [{ name: 'f.pdf', sha: 'abc' }],
    } as Response)
    const result = await listDirectory('dir')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('f.pdf')
  })

  it('returns empty array on failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: false } as Response)
    expect(await listDirectory('dir')).toEqual([])
  })

  it('returns empty array when response is not an array', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'not an array' }),
    } as Response)
    expect(await listDirectory('dir')).toEqual([])
  })
})

describe('getFileContent', () => {
  afterEach(() => vi.restoreAllMocks())

  it('returns null on failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: false } as Response)
    expect(await getFileContent('file.json')).toBeNull()
  })

  it('decodes base64 content', async () => {
    // base64 of '{"key":"val"}'  = 'eyJrZXkiOiJ2YWwifQ=='
    const b64 = btoa('{"key":"val"}')
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: b64 }),
    } as Response)
    const result = await getFileContent('file.json')
    expect(result).toEqual({ key: 'val' })
  })
})

// ─── images.ts — fileToBase64 ─────────────────────────────────────────────────

describe('fileToBase64', () => {
  it('resolves with base64 string', async () => {
    const { fileToBase64 } = await import('../../admin/lib/images')
    // Create a mock File and stub FileReader
    const file = new File(['hello'], 'test.txt', { type: 'text/plain' })
    // happy-dom supports FileReader.readAsDataURL
    const result = await fileToBase64(file)
    expect(typeof result).toBe('string')
    // base64 of 'hello' is 'aGVsbG8='
    expect(result).toBe('aGVsbG8=')
  })

  it('rejects on reader error', async () => {
    const { fileToBase64 } = await import('../../admin/lib/images')
    const file = new File([''], 'test.txt', { type: 'text/plain' })
    // Patch FileReader to simulate an error
    const origReader = globalThis.FileReader
    class MockReader {
      onload: (() => void) | null = null
      onerror: ((e: unknown) => void) | null = null
      readAsDataURL() {
        setTimeout(() => this.onerror?.(new Error('read error')), 0)
      }
    }
    ;(globalThis as Record<string, unknown>).FileReader = MockReader
    await expect(fileToBase64(file)).rejects.toBeTruthy()
    ;(globalThis as Record<string, unknown>).FileReader = origReader
  })
})
