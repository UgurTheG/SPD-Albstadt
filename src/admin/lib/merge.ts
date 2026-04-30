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

export interface MergeConflict {
  /** JSON path of the conflicting leaf (e.g. ["sections", "header", "title"]) */
  path: (string | number)[]
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
  path: (string | number)[],
  conflicts: MergeConflict[],
): unknown {
  const oursDiff = !deepEq(original, ours)
  const theirsDiff = !deepEq(original, theirs)

  if (!oursDiff && !theirsDiff) return original // both unchanged
  if (!oursDiff) return theirs // only they changed
  if (!theirsDiff) return ours // only we changed
  if (deepEq(ours, theirs)) return ours // both changed to same value (no conflict)

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

  // For arrays: if both sides changed them differently, record conflict
  // (conservative — avoids unpredictable splice interactions)
  conflicts.push({ path, label: pathLabel(path), ours, theirs })
  return theirs // default to their published version
}

function mergeObjects(
  original: Record<string, unknown>,
  ours: Record<string, unknown>,
  theirs: Record<string, unknown>,
  path: (string | number)[],
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

function deepEq(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a == null || b == null) return a === b
  if (typeof a !== typeof b) return false
  if (typeof a === 'object') return JSON.stringify(a) === JSON.stringify(b)
  return false
}

function isPlainObject(v: unknown): boolean {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function pathLabel(path: (string | number)[]): string {
  if (path.length === 0) return 'Root'
  return path.map(seg => (typeof seg === 'number' ? `[${seg + 1}]` : seg)).join(' › ')
}
