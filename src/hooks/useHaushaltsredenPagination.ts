import { useHaushaltsreden } from './useHaushaltsreden'
import { useItemsPerPageMulti } from './useItemsPerPage'
import { usePagination } from './usePagination'

export interface UseHaushaltsredenPaginationResult {
  /** Subset of years currently shown (paginated window). */
  paginatedJahre: number[]
  /** All years that pass the visibility filter (before pagination). */
  filteredJahre: number[]
  /** Years for which a PDF actually exists, or null while loading. */
  availableYears: Set<number> | null
  /** Number of years currently visible. */
  visibleCount: number
  /** Current page size (2 full grid rows at the current breakpoint). */
  itemsPerPage: number
  hasMore: boolean
  loadMore: () => void
  loadLess: () => void
}

/**
 * Encapsulates all Haushaltsreden visibility + pagination logic for the
 * Fraktion section so the component stays focused on rendering.
 *
 * Page size = 2 full rows at every breakpoint:
 *   xs (< 640)  → 2 cols → 4 items
 *   sm (≥ 640)  → 3 cols → 6 items
 *   md (≥ 768)  → 4 cols → 8 items
 *   lg (≥ 1024) → 5 cols → 10 items
 */
export function useHaushaltsredenPagination(): UseHaushaltsredenPaginationResult {
  const itemsPerPage = useItemsPerPageMulti(
    [
      [1024, 10],
      [768, 8],
      [640, 6],
    ],
    4,
  )

  const { alleJahre, availableYears, disabledYears } = useHaushaltsreden()

  // A year is shown when still loading (availableYears === null), the PDF
  // exists, or it hasn't been explicitly disabled (future/placeholder years).
  const filteredJahre = alleJahre.filter(
    year => availableYears === null || availableYears.has(year) || !disabledYears.has(year),
  )

  const {
    visibleItems: paginatedJahre,
    visibleCount,
    hasMore,
    loadMore,
    loadLess,
  } = usePagination(filteredJahre, itemsPerPage)

  return {
    paginatedJahre,
    filteredJahre,
    availableYears,
    visibleCount,
    itemsPerPage,
    hasMore,
    loadMore,
    loadLess,
  }
}
