/**
 * Renders `count` pulse-skeleton rectangles as direct children.
 * Place it inside an existing grid container so it inherits the parent's
 * column / gap classes without duplicating them.
 *
 * @param count        - Number of skeleton items to render.
 * @param itemClassName - Extra Tailwind classes applied to each item (e.g. `"h-40"`, `"h-64"`).
 */
export function SkeletonGrid({
  count,
  itemClassName = 'h-40',
}: {
  count: number
  itemClassName?: string
}) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse bg-gray-100 dark:bg-gray-800 rounded-2xl ${itemClassName}`}
        />
      ))}
    </>
  )
}
