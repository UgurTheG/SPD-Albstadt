/**
 * Skeleton loading state shown while initial tab data is being fetched.
 * Mirrors the rough shape of the action bar + card grid so the layout
 * doesn't jump when real content arrives.
 */
export default function AdminSkeleton() {
  return (
    <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Daten werden geladen">
      {/* Action bar placeholder */}
      <div className="flex gap-2 mb-6">
        <div className="h-8 w-16 bg-gray-200/70 dark:bg-gray-700/50 rounded-xl" />
        <div className="h-8 w-16 bg-gray-200/70 dark:bg-gray-700/50 rounded-xl" />
        <div className="ml-auto h-8 w-24 bg-gray-200/70 dark:bg-gray-700/50 rounded-xl" />
        <div className="h-8 w-32 bg-spd-red/20 rounded-xl" />
      </div>
      {/* Card skeletons */}
      {[1, 2, 3].map(i => (
        <div
          key={i}
          className="bg-white/60 dark:bg-gray-900/40 border border-gray-200/50 dark:border-gray-700/40 rounded-2xl p-5 space-y-3"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-7 h-7 bg-gray-200/80 dark:bg-gray-700/60 rounded-lg" />
            <div className="h-4 w-32 bg-gray-200/80 dark:bg-gray-700/60 rounded-lg" />
            <div className="ml-auto h-6 w-16 bg-red-100/60 dark:bg-red-900/20 rounded-lg" />
          </div>
          <div className="h-px bg-gray-100 dark:bg-gray-800" />
          {Array.from({ length: i + 1 }).map((_, j) => (
            <div key={j} className="space-y-1.5">
              <div className="h-3 w-20 bg-gray-200/80 dark:bg-gray-700/60 rounded" />
              <div className="h-10 bg-gray-100/80 dark:bg-gray-800/40 rounded-2xl" />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
