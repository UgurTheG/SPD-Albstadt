interface HaushaltsredenPaginationProps {
  /** Total number of visible (non-hidden) years. */
  total: number
  /** How many are currently rendered. */
  visibleCount: number
  /** Number of items shown per page (first "page"). */
  itemsPerPage: number
  /** Whether more items are available to load. */
  hasMore: boolean
  onLoadMore: () => void
  onLoadLess: () => void
}

/**
 * "Mehr laden / Weniger" pagination bar for the Haushaltsreden grid.
 * Only rendered when the total exceeds one page.
 */
export function HaushaltsredenPagination({
  total,
  visibleCount,
  itemsPerPage,
  hasMore,
  onLoadMore,
  onLoadLess,
}: HaushaltsredenPaginationProps) {
  if (total <= itemsPerPage) return null

  return (
    <div className="flex items-center justify-between pt-4">
      <span className="text-xs text-gray-400 dark:text-gray-500">
        {Math.min(visibleCount, total)} von {total} Haushaltsreden
      </span>
      <div className="flex gap-2">
        {visibleCount > itemsPerPage && (
          <button
            onClick={onLoadLess}
            className="text-xs font-semibold text-gray-400 hover:text-spd-red transition-colors px-3 py-1.5 rounded-lg hover:bg-spd-red/5"
          >
            ↑ Weniger
          </button>
        )}
        {hasMore && (
          <button
            onClick={onLoadMore}
            className="text-xs font-semibold text-spd-red border border-spd-red/30 hover:bg-spd-red hover:text-white transition-all px-3 py-1.5 rounded-lg"
          >
            Mehr laden ↓
          </button>
        )}
      </div>
    </div>
  )
}
