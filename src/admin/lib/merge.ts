/**
 * Three-way JSON merge for admin tab data.
 *
 * Given:
 *   original — the state when the user loaded data (common base)
 *   ours     — the user's local edits
 *   theirs   — the newest version published by someone else
 *
 * Strategy:
 *   - Plain objects  → recursive field-level merge
 *   - Arrays         → conservative: if both sides changed the array, it is a
 *                      conflict.  If only one side changed it, take that side.
 *   - Primitives     → standard three-way: ours wins unless only theirs changed;
 *                      if both changed differently it is a conflict.
 *
 * Conflicts are collected in the returned `conflicts` array.  The `merged`
 * value defaults to `theirs` at each conflict site (they published first) so
 * the result is always a valid document even if the user ignores the modal.
 */

import { deepEqual } from './json'

type MergePath = (string | number | { id: string | number })[]

export interface MergeConflict {
  /** JSON path of the conflicting leaf (e.g. ["sections", "header", "title"]) */
  path: MergePath
  /** Human-readable label derived from the path */
  label: string
  ours: unknown
  theirs: unknown
}

export interface MergeResult {
  merged: unknown
  conflicts: MergeConflict[]
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function threeWayMerge(original: unknown, ours: unknown, theirs: unknown): MergeResult {
  const conflicts: MergeConflict[] = []
  const merged = mergeValue(original, ours, theirs, [], conflicts)
  return { merged, conflicts }
}

// ─── Internals ────────────────────────────────────────────────────────────────

function mergeValue(
  original: unknown,
  ours: unknown,
  theirs: unknown,
  path: MergePath,
  conflicts: MergeConflict[],
): unknown {
  const oursDiff = !deepEqual(original, ours)
  const theirsDiff = !deepEqual(original, theirs)

  if (!oursDiff && !theirsDiff) return original // both unchanged
  if (!oursDiff) return theirs // only they changed
  if (!theirsDiff) return ours // only we changed
  if (deepEqual(ours, theirs)) return ours // both changed to same value (no conflict)

  // Both changed differently —

  // Try deep object merge
  if (isPlainObject(original) && isPlainObject(ours) && isPlainObject(theirs)) {
    return mergeObjects(
      original as Record<string, unknown>,
      ours as Record<string, unknown>,
      theirs as Record<string, unknown>,
      path,
      conflicts,
    )
  }

  // For arrays: attempt item-level merge when all items carry an "id" field.
  // This handles the common case of two users independently adding/editing
  // different items in the same array (e.g. two new Gemeinderäte).
  if (
    Array.isArray(original) &&
    Array.isArray(ours) &&
    Array.isArray(theirs) &&
    arraysHaveIds(original) &&
    arraysHaveIds(ours) &&
    arraysHaveIds(theirs)
  ) {
    return mergeArraysById(
      original as IdObject[],
      ours as IdObject[],
      theirs as IdObject[],
      path,
      conflicts,
    )
  }

  // Conservative fallback for arrays without ids or other types
  conflicts.push({ path, label: pathLabel(path), ours, theirs })
  return theirs // default to their published version
}

function mergeObjects(
  original: Record<string, unknown>,
  ours: Record<string, unknown>,
  theirs: Record<string, unknown>,
  path: MergePath,
  conflicts: MergeConflict[],
): Record<string, unknown> {
  const allKeys = new Set([...Object.keys(original), ...Object.keys(ours), ...Object.keys(theirs)])

  const result: Record<string, unknown> = {}
  for (const key of allKeys) {
    result[key] = mergeValue(original[key], ours[key], theirs[key], [...path, key], conflicts)
  }
  return result
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type IdObject = Record<string, unknown> & { id: string | number }

function arraysHaveIds(arr: unknown[]): arr is IdObject[] {
  const ids = new Set<string | number>()
  return arr.every(item => {
    if (!isPlainObject(item)) return false
    const id = (item as Record<string, unknown>).id
    if ((typeof id !== 'string' && typeof id !== 'number') || ids.has(id)) return false
    ids.add(id)
    return true
  })
}

/**
 * Merge two arrays whose items each carry a stable "id" field.
 *
 * Rules (per id):
 *   - Only in ours    → keep (we added it)
 *   - Only in theirs  → keep (they added it)
 *   - In both, unchanged from original → keep original
 *   - In both, only one side changed   → take changed side
 *   - In both, both sides changed differently → deep-merge (recurse)
 *   - In original but removed by one side → keep the deletion
 *   - Ordering: preserve theirs' order, append ours-only items at the end
 */
function mergeArraysById(
  original: IdObject[],
  ours: IdObject[],
  theirs: IdObject[],
  path: MergePath,
  conflicts: MergeConflict[],
): IdObject[] {
  const origById = new Map(original.map(item => [item.id, item]))
  const oursById = new Map(ours.map(item => [item.id, item]))

  const result: IdObject[] = []
  const handled = new Set<string | number>()

  // Walk theirs' order first (they published — respect their ordering)
  for (const theirItem of theirs) {
    const id = theirItem.id
    handled.add(id)
    const orig = origById.get(id)
    const ourItem = oursById.get(id)

    if (!ourItem) {
      // We deleted this item; theirs still has it.
      if (!orig) {
        result.push(theirItem) // new item added by them — keep it
      } else if (!deepEqual(orig, theirItem)) {
        // Delete-vs-edit: we removed it but they changed it. This is a real
        // conflict — surface it instead of silently dropping their edit. We keep
        // their version in the merged result (the modal default) and let the user
        // choose to re-delete it via "Meine Version".
        conflicts.push({
          path: [...path, { id }],
          label: pathLabel([...path, { id }]),
          ours: undefined,
          theirs: theirItem,
        })
        result.push(theirItem)
      }
      // else: they didn't touch it — our delete wins (omit)
    } else {
      // Both sides have it — recursively merge the object
      const base = orig ?? ({} as IdObject)
      const merged = mergeValue(base, ourItem, theirItem, [...path, { id }], conflicts)
      result.push(merged as IdObject)
    }
  }

  // Append items that only we have (we added them, they didn't touch them)
  for (const ourItem of ours) {
    const id = ourItem.id
    if (!handled.has(id)) {
      const originalItem = origById.get(id)
      if (!originalItem) result.push(ourItem)
      else if (!deepEqual(originalItem, ourItem)) {
        conflicts.push({
          path: [...path, { id }],
          label: pathLabel([...path, { id }]),
          ours: ourItem,
          theirs: undefined,
        })
      }
    }
  }

  return result
}

function isPlainObject(v: unknown): boolean {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function pathLabel(path: MergePath): string {
  if (path.length === 0) return 'Root'
  return path
    .map(seg =>
      typeof seg === 'object' ? `ID ${seg.id}` : typeof seg === 'number' ? `[${seg + 1}]` : seg,
    )
    .join(' › ')
}

/** Stable ID selectors survive reordering and earlier delete/edit resolutions. */
export function applyMergeChoice(root: unknown, path: MergePath, value: unknown): unknown {
  if (path.length === 0) return value
  const [head, ...rest] = path
  if (Array.isArray(root)) {
    const index =
      typeof head === 'object' ? root.findIndex(item => item?.id === head.id) : Number(head)
    const next = [...root]
    if (index < 0) {
      if (rest.length === 0 && value !== undefined) next.push(value)
      return next
    }
    if (rest.length === 0 && value === undefined) next.splice(index, 1)
    else next[index] = applyMergeChoice(root[index], rest, value)
    return next
  }
  if (typeof head === 'object') throw new Error('Ungültiger Konfliktpfad')
  const object = (root ?? {}) as Record<string | number, unknown>
  const next = { ...object }
  if (rest.length === 0 && value === undefined) delete next[head]
  else return { ...next, [head]: applyMergeChoice(object[head], rest, value) }
  return next
}
