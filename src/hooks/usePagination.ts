import { useState } from 'react'

export interface UsePaginationResult<T> {
  visibleItems: T[]
  visibleCount: number
  hasMore: boolean
  loadMore: () => void
  loadLess: () => void
  reset: () => void
}

/**
 * Generic pagination hook using an "extra pages" multiplier.
 *
 * The visible window self-adjusts when `itemsPerPage` changes (e.g. on
 * breakpoint transitions) — no setState-inside-effect needed.
 *
 * Call `reset()` whenever the underlying item list changes due to filtering
 * so the user is taken back to the first page.
 */
export function usePagination<T>(items: T[] | null, itemsPerPage: number): UsePaginationResult<T> {
  const [extraPages, setExtraPages] = useState(0)

  const visibleCount = (1 + extraPages) * itemsPerPage
  const visibleItems = items?.slice(0, visibleCount) ?? []
  const hasMore = items ? visibleCount < items.length : false

  function loadMore() {
    setExtraPages(p => p + 1)
  }

  function loadLess() {
    setExtraPages(p => Math.max(0, p - 1))
  }

  function reset() {
    setExtraPages(0)
  }

  return { visibleItems, visibleCount, hasMore, loadMore, loadLess, reset }
}
