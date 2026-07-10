/**
 * Shared JSON value helpers for the admin layer.
 * Single canonical home for deep equality, cloning, and path access —
 * previously duplicated across diff.ts, merge.ts, and ConflictMergeModal.
 */

export type JsonPath = (string | number)[]

/**
 * Deep structural equality via JSON serialisation. Sufficient for the admin's
 * JSON-shaped data, where compared values originate from the same parse and
 * therefore share key order.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a == null || b == null) return a === b
  if (typeof a !== typeof b) return false
  if (typeof a === 'object') return JSON.stringify(a) === JSON.stringify(b)
  return false
}

/** `structuredClone` that passes `undefined` through unchanged. */
export function deepClone<T>(v: T): T {
  return v === undefined ? v : structuredClone(v)
}

export function getAtPath(root: unknown, path: JsonPath): unknown {
  let cur: unknown = root
  for (const seg of path) {
    if (cur == null) return undefined
    cur = (cur as Record<string | number, unknown>)[seg as never]
  }
  return cur
}

/**
 * Mutates `root` in place, creating intermediate containers as needed
 * (arrays for numeric path segments, objects otherwise).
 */
export function setAtPath(root: unknown, path: JsonPath, value: unknown): void {
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

/**
 * Returns a copy of `root` with the element at `path` removed — array
 * elements are spliced out, object keys deleted. Containers along the path
 * are shallow-copied, everything else is shared. An empty path returns
 * `undefined` (the root itself is removed).
 */
export function deleteAtPathImmutable(root: unknown, path: JsonPath): unknown {
  if (path.length === 0) return undefined
  const [head, ...rest] = path as [string | number, ...JsonPath]
  if (Array.isArray(root)) {
    const next = [...(root as unknown[])]
    if (rest.length === 0) {
      if (typeof head === 'number') next.splice(head, 1)
      return next
    }
    ;(next as Record<number, unknown>)[head as number] = deleteAtPathImmutable(
      (root as Record<number, unknown>)[head as number],
      rest,
    )
    return next
  }
  const next = { ...(root as Record<string, unknown>) }
  if (rest.length === 0) {
    delete next[head as string]
    return next
  }
  next[head as string] = deleteAtPathImmutable(
    (root as Record<string, unknown>)[head as string],
    rest,
  )
  return next
}

/**
 * Returns a copy of `root` with the value at `path` replaced — containers
 * along the path are shallow-copied, everything else is shared. An empty
 * path returns `value` itself.
 */
export function setAtPathImmutable(root: unknown, path: JsonPath, value: unknown): unknown {
  if (path.length === 0) return value
  const next = Array.isArray(root)
    ? [...(root as unknown[])]
    : { ...(root as Record<string, unknown>) }
  const [head, ...rest] = path as [string | number, ...JsonPath]
  ;(next as Record<string | number, unknown>)[head] = setAtPathImmutable(
    (root as Record<string | number, unknown>)[head],
    rest,
    value,
  )
  return next
}
