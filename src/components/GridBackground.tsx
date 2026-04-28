/**
 * Decorative grid-line SVG background with two soft radial blobs.
 * Designed to sit inside a `relative overflow-hidden` section.
 *
 * @param id - Unique ID for the SVG <pattern> element. Change it when
 *             the component is rendered more than once on the same page
 *             to prevent pattern-ref collisions.
 */
export function GridBackground({ id = 'grid-bg' }: { id?: string }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.04] dark:opacity-[0.06] text-spd-red dark:text-white"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id={id} width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
      </svg>
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-spd-red/5 dark:bg-white/5" />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-spd-red/5 dark:bg-white/5" />
    </div>
  )
}
