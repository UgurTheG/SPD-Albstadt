import { useState } from 'react'

/**
 * Gate a publish behind the orphan-image confirmation flow.
 *
 * `start()` runs the orphan scan: with no orphans it publishes immediately,
 * otherwise it exposes them via `orphans` so the caller can render an
 * OrphanModal wired to `confirm` / `keep` / `cancel`. Used by the per-tab
 * publish flow (useTabPublisher) and the publish-all flow (AdminApp).
 */
export function useOrphanGate(
  findOrphans: () => string[],
  publish: (orphansToDelete?: string[]) => void,
) {
  const [orphans, setOrphans] = useState<string[] | null>(null)

  const start = () => {
    const found = findOrphans()
    if (found.length > 0) {
      setOrphans(found)
      return
    }
    publish()
  }

  const confirm = (toDelete: string[]) => {
    setOrphans(null)
    publish(toDelete.length > 0 ? toDelete : undefined)
  }

  const keep = () => {
    setOrphans(null)
    publish()
  }

  const cancel = () => setOrphans(null)

  return { orphans, start, confirm, keep, cancel }
}
