import type {FieldConfig, TabConfig} from '../types'

export type ChangePath = (string | number)[]

export type ChangeKind = 'modified' | 'added' | 'removed' | 'moved'

export interface ChangeEntry {
    id: string
    path: ChangePath
    kind: ChangeKind
    group: string
    groupKey?: string
    itemIndex?: number
    itemLabel?: string
    fieldKey?: string
    fieldLabel?: string
    fieldType?: FieldConfig['type']
    before?: unknown
    after?: unknown
    // For removed items, the original array index we'd re-insert at
    originalIndex?: number
    // For moved items
    movedFrom?: number
    movedTo?: number
}

const eq = (a: unknown, b: unknown): boolean => {
    if (a === b) return true
    if (a == null || b == null) return a === b
    if (typeof a !== typeof b) return false
    if (typeof a === 'object') return JSON.stringify(a) === JSON.stringify(b)
    return false
}

function itemLabel(fields: FieldConfig[], item: Record<string, unknown> | undefined, fallbackIndex: number): string {
    if (!item) return `#${fallbackIndex + 1}`
    const byKey = (k: string) => typeof item[k] === 'string' && (item[k] as string).trim()
        ? (item[k] as string).trim() : undefined
    const preferred = byKey('name') || byKey('titel') || byKey('jahr')
    if (preferred) return preferred
    // fall back to the first text-like field that has a value
    for (const f of fields) {
        if (f.type === 'text' || f.type === 'email' || f.type === 'url') {
            const v = byKey(f.key)
            if (v) return v
        }
    }
    return `#${fallbackIndex + 1}`
}

function diffFields(
    fields: FieldConfig[],
    original: Record<string, unknown> | undefined,
    current: Record<string, unknown> | undefined,
    basePath: ChangePath,
    group: string,
    groupKey: string | undefined,
    itemIdx: number | undefined,
    itemLbl: string | undefined,
    out: ChangeEntry[],
) {
    const orig = original ?? {}
    const curr = current ?? {}
    for (const f of fields) {
        const before = orig[f.key]
        const after = curr[f.key]
        if (eq(before, after)) continue
        const fieldPath: ChangePath = [...basePath, f.key]
        out.push({
            id: fieldPath.join('.') + ':modified',
            path: fieldPath,
            kind: 'modified',
            group,
            groupKey,
            itemIndex: itemIdx,
            itemLabel: itemLbl,
            fieldKey: f.key,
            fieldLabel: f.label,
            fieldType: f.type,
            before, after,
        })
    }
}

function diffArray(
    fields: FieldConfig[],
    original: Record<string, unknown>[] | undefined,
    current: Record<string, unknown>[] | undefined,
    basePath: ChangePath,
    group: string,
    groupKey: string | undefined,
    out: ChangeEntry[],
) {
    const orig = Array.isArray(original) ? original : []
    const curr = Array.isArray(current) ? current : []

    // Build a mapping: for each current index, find matching original index by content
    const origUsed = new Set<number>()
    const currToOrig = new Map<number, number>() // currIdx -> origIdx

    // First pass: find exact matches by content
    for (let ci = 0; ci < curr.length; ci++) {
        for (let oi = 0; oi < orig.length; oi++) {
            if (origUsed.has(oi)) continue
            if (eq(orig[oi], curr[ci])) {
                currToOrig.set(ci, oi)
                origUsed.add(oi)
                break
            }
        }
    }

    // Emit moved entries for items that exist in both but changed position
    // Detect swaps (A↔B) and merge into a single entry
    const movedEmitted = new Set<number>() // current indices already handled as moves
    const movedPairs = new Map<number, number>() // ci -> oi for moved items
    for (const [ci, oi] of currToOrig) {
        if (ci !== oi) movedPairs.set(ci, oi)
    }
    const swapEmitted = new Set<number>()
    for (const [ci, oi] of movedPairs) {
        if (swapEmitted.has(ci)) continue
        // Check if this is a swap: ci came from oi, and oi's position now has ci's original
        const partner = movedPairs.get(oi)
        if (partner === ci) {
            // It's a swap: emit one entry for the pair, skip the other
            const cA = curr[ci] as Record<string, unknown> | undefined
            const cB = curr[oi] as Record<string, unknown> | undefined
            const labelA = itemLabel(fields, cA, ci)
            const labelB = itemLabel(fields, cB, oi)
            const path: ChangePath = [...basePath, Math.min(ci, oi)]
            out.push({
                id: path.join('.') + ':moved:' + oi + '<->' + ci,
                path,
                kind: 'moved',
                group,
                groupKey,
                itemIndex: Math.min(ci, oi),
                itemLabel: `${labelA} ↔ ${labelB}`,
                movedFrom: oi,
                movedTo: ci,
                before: oi,
                after: ci,
            })
            swapEmitted.add(ci)
            swapEmitted.add(oi)
            movedEmitted.add(ci)
            movedEmitted.add(oi)
        }
    }
    // Emit remaining (non-swap) moves as a single "reordered" entry
    const remainingMoves: Array<[number, number]> = [] // [ci, oi]
    for (const [ci, oi] of movedPairs) {
        if (swapEmitted.has(ci)) continue
        remainingMoves.push([ci, oi])
        movedEmitted.add(ci)
    }
    if (remainingMoves.length > 0) {
        // Collect labels for all involved items
        const labels = remainingMoves.map(([ci]) => {
            const c = curr[ci] as Record<string, unknown> | undefined
            return itemLabel(fields, c, ci)
        })
        const path: ChangePath = [...basePath, remainingMoves[0][0]]
        out.push({
            id: path.join('.') + ':moved:reorder',
            path,
            kind: 'moved',
            group,
            groupKey,
            itemIndex: remainingMoves[0][0],
            itemLabel: labels.join(', '),
            movedFrom: remainingMoves[0][1],
            movedTo: remainingMoves[0][0],
            before: remainingMoves.map(([, oi]) => oi),
            after: remainingMoves.map(([ci]) => ci),
        })
    }

    // For items at the same index that are not exact matches and not moves, diff fields
    const common = Math.min(orig.length, curr.length)
    for (let i = 0; i < common; i++) {
        if (movedEmitted.has(i)) continue
        if (currToOrig.has(i) && currToOrig.get(i) === i) continue // unchanged
        const o = orig[i] as Record<string, unknown> | undefined
        const c = curr[i] as Record<string, unknown> | undefined
        if (eq(o, c)) continue
        diffFields(fields, o, c, [...basePath, i], group, groupKey, i, itemLabel(fields, c, i), out)
    }
    // added
    for (let i = 0; i < curr.length; i++) {
        if (movedEmitted.has(i)) continue
        if (currToOrig.has(i)) continue // matched to an original
        if (i < common) continue // handled above as modified
        const c = curr[i] as Record<string, unknown> | undefined
        const path: ChangePath = [...basePath, i]
        out.push({
            id: path.join('.') + ':added',
            path,
            kind: 'added',
            group,
            groupKey,
            itemIndex: i,
            itemLabel: itemLabel(fields, c, i),
            after: c,
        })
    }
    // removed
    for (let i = 0; i < orig.length; i++) {
        if (origUsed.has(i)) continue
        if (i < common) continue // handled above as modified
        const o = orig[i] as Record<string, unknown> | undefined
        const path: ChangePath = [...basePath, i]
        out.push({
            id: path.join('.') + ':removed:' + i,
            path,
            kind: 'removed',
            group,
            groupKey,
            itemIndex: i,
            originalIndex: i,
            itemLabel: itemLabel(fields, o, i),
            before: o,
        })
    }
}

export function diffTab(
    tab: TabConfig,
    original: unknown,
    current: unknown,
): ChangeEntry[] {
    const out: ChangeEntry[] = []
    if (tab.type === 'haushaltsreden') return out

    if (tab.type === 'array' && tab.fields) {
        diffArray(
            tab.fields,
            original as Record<string, unknown>[] | undefined,
            current as Record<string, unknown>[] | undefined,
            [],
            tab.label,
            undefined,
            out,
        )
        return out
    }

    const orig = (original ?? {}) as Record<string, unknown>
    const curr = (current ?? {}) as Record<string, unknown>

    if (tab.topFields) {
        diffFields(tab.topFields, orig, curr, [], 'Allgemein', undefined, undefined, undefined, out)
    }
    if (tab.sections) {
        for (const sec of tab.sections) {
            if (sec.isSingleObject) {
                diffFields(
                    sec.fields,
                    orig[sec.key] as Record<string, unknown> | undefined,
                    curr[sec.key] as Record<string, unknown> | undefined,
                    [sec.key],
                    sec.label,
                    sec.key,
                    undefined,
                    undefined,
                    out,
                )
            } else {
                diffArray(
                    sec.fields,
                    orig[sec.key] as Record<string, unknown>[] | undefined,
                    curr[sec.key] as Record<string, unknown>[] | undefined,
                    [sec.key],
                    sec.label,
                    sec.key,
                    out,
                )
            }
        }
    }
    return out
}

// Apply a single revert: given the current value at tab root, produce a new
// value where the change at `entry` has been rolled back to `originalRoot`.
export function applyRevert(
    _tab: TabConfig,
    originalRoot: unknown,
    currentRoot: unknown,
    entry: ChangeEntry,
): unknown {
    const next = clone(currentRoot)
    if (entry.kind === 'modified') {
        const beforeValue = getAtPath(originalRoot, entry.path)
        setAtPath(next, entry.path, clone(beforeValue))
        return next
    }
    if (entry.kind === 'moved') {
        // Restore the original array order
        const parentPath = entry.path.slice(0, -1)
        const origArr = getAtPath(originalRoot, parentPath) as unknown[]
        if (Array.isArray(origArr)) {
            setAtPath(next, parentPath, clone(origArr))
        }
        return next
    }
    if (entry.kind === 'added') {
        // remove the element at the array path
        const parentPath = entry.path.slice(0, -1)
        const idx = entry.path[entry.path.length - 1] as number
        const arr = getAtPath(next, parentPath) as unknown
        if (Array.isArray(arr)) arr.splice(idx, 1)
        return next
    }
    if (entry.kind === 'removed') {
        // reinsert at the original index (clamped)
        const parentPath = entry.path.slice(0, -1)
        const idx = entry.originalIndex ?? (entry.path[entry.path.length - 1] as number)
        let arr = getAtPath(next, parentPath) as unknown
        if (!Array.isArray(arr)) {
            // initialize empty array at that path
            arr = []
            setAtPath(next, parentPath, arr)
        }
        (arr as unknown[]).splice(Math.min(idx, (arr as unknown[]).length), 0, clone(entry.before))
        return next
    }
    return next
}

function clone<T>(v: T): T {
    return v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T)
}

function getAtPath(root: unknown, path: ChangePath): unknown {
    let cur: unknown = root
    for (const seg of path) {
        if (cur == null) return undefined
        cur = (cur as Record<string | number, unknown>)[seg as never]
    }
    return cur
}

function setAtPath(root: unknown, path: ChangePath, value: unknown): void {
    if (path.length === 0) return
    let cur: unknown = root
    for (let i = 0; i < path.length - 1; i++) {
        const seg = path[i]
        const next = (cur as Record<string | number, unknown>)[seg as never]
        if (next == null) {
            const followSeg = path[i + 1]
            const created: unknown = typeof followSeg === 'number' ? [] : {}
            ;(cur as Record<string | number, unknown>)[seg as never] = created as never
            cur = created
        } else {
            cur = next
        }
    }
    const last = path[path.length - 1]
    ;(cur as Record<string | number, unknown>)[last as never] = value as never
}

export function summarizeValue(v: unknown, type?: FieldConfig['type'], truncate = true): string {
    if (v == null || v === '') return '—'
    if (type === 'image' && typeof v === 'string') return v.split('/').pop() || String(v)
    if (type === 'imagelist' && Array.isArray(v)) return `${v.length} Bild(er)`
    if (type === 'stringlist' && Array.isArray(v)) return v.length ? v.join(', ') : '—'
    if (type === 'textarea' && typeof v === 'string') {
        const t = v.trim().replace(/\s+/g, ' ')
        return truncate && t.length > 80 ? t.slice(0, 80) + '…' : t
    }
    if (typeof v === 'string') return truncate && v.length > 80 ? v.slice(0, 80) + '…' : v
    if (typeof v === 'number' || typeof v === 'boolean') return String(v)
    if (Array.isArray(v)) return `[${v.length}]`
    if (typeof v === 'object') return '{…}'
    return String(v)
}
