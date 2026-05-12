import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Extra padding-bottom class — defaults to `pb-8 sm:pb-9` */
  pb?: string
}

/**
 * Red gradient hero header used at the top of slide-out sheets.
 * Includes the radial highlight and a `relative` content wrapper.
 */
export function SheetHero({ children, pb = 'pb-8 sm:pb-9' }: Props) {
  return (
    <div
      className={`bg-linear-to-br from-spd-red via-spd-red to-spd-red-dark px-5 sm:px-6 pt-6 sm:pt-8 ${pb} relative overflow-hidden`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(255,255,255,0.12),transparent_50%)]" />
      <div className="relative">{children}</div>
    </div>
  )
}
